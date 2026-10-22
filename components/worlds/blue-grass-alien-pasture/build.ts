import * as THREE from 'three';
import { type Placeable, choice, clamp01, defineWorld, disposeTree, mix, score } from '@conjure/kit';
import { Batch, type P3, vary } from './pasture-kit';

const PITCH = THREE.MathUtils.degToRad(16);
const EXTENT = 13; // half the width of the natural frame, metres
const LIFT = EXTENT - 4.5; // the frame's bottom edge sits 4.5 m below the origin's row
const X = 38, Z_FAR = -36, Z_NEAR = 44;
/** [x, z, size]: the hero in the open middle of the near field, the rest toward the corners. */
const SLOTS = [[1, 3, 1.25], [-7.6, -1.6, 1], [7.8, -2.6, 0.95], [-6.8, 7.6, 0.85], [7, 7.4, 0.82]] as const;
const SKIES = {
  mint: ['#c4e2c8', '#eef6e2'],
  lemon: ['#dfe39c', '#f7f3d0'],
  lilac: ['#d2c6e6', '#f2e8ee'],
  teal: ['#86bcb6', '#d8efd9'],
  peach: ['#efc9b0', '#f9e6cf'],
} as const;

const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export default defineWorld({
  questions: {
    sky: choice('What colour is the sky?', {
      mint: 'Pale mint green, washed and cool, fading to white at the horizon.',
      lemon: 'A lemon-yellow haze, bright and faintly sickly.',
      lilac: 'Pale lilac, soft and dreamlike.',
      teal: 'Clear deep teal overhead shading to a green horizon, cold and thin.',
      peach: 'Dusty peach and salmon, a warm alien air.',
    }),
    hanging: choice('What hangs in the sky?', {
      ringed: 'A huge ringed planet low on the horizon, banded and tilted, half sunk behind the hills.',
      moons: 'Two moons by day, one large and pale, one small and rose-coloured.',
      crescent: 'An enormous crescent world filling a quarter of the sky, its night side a faint shadow.',
      nothing: 'Nothing but high thin streaks of cloud.',
    }),
    light: choice('What lights the pasture?', {
      sun: 'A small cool white sun; the hour follows the scene.',
      night: 'Night: the sun long down, the grass lit blue by the sky and a glowing band along the horizon.',
    }),
    stains: score('How far do the green stains spread?', [
      'A few dark spots by the fence',
      'Splashes and a drag trail across the near field',
      'Dark green soaking the pasture and running downhill to the fence',
    ]),
    fence: choice('What state is the bone-post fence line?', {
      intact: 'Intact, three tight wires, the posts marching evenly over the hills.',
      broken: 'Broken through: posts knocked flat and wire curled back where something went through.',
      bare: 'The wire long gone, only a line of pale posts like vertebrae over the hill.',
      beacons: 'A sensor fence: every post topped with a small red light.',
    }),
    far: choice('What stands far off on the hills?', {
      dome: 'A white dome homestead with a silo, a mast and a lit window.',
      rig: 'A skeletal drill rig with a slow red beacon.',
      herd: 'A distant herd of six-legged grazers strung along a hillside.',
      wreck: 'The wreck of a cargo lander nose-down in a far slope, still smoking.',
      nothing: 'Nothing: empty hills to the horizon.',
    }),
    flora: choice('What grows among the grass?', {
      none: 'Only the blue grass.',
      puffballs: 'Pale puffballs on stalks, scattered like mushrooms.',
      lanterns: 'Bulb-flowers that glow softly from within.',
      spines: 'Tall dark spines standing out of the grass in clumps.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const night = a.light === 'night';
    const dusk = mood.daylight >= 0.5, side = dusk ? 1 : -1;
    const lift = night ? 0 : Math.sin(Math.PI * mood.daylight); // 0 at the ends of the day, 1 at noon
    const glow = night ? 1 : 0;
    const css = (c: THREE.Color, alpha = 1) => `rgba(${Math.round(c.r ** (1 / 2.2) * 255)},${Math.round(c.g ** (1 / 2.2) * 255)},${Math.round(c.b ** (1 / 2.2) * 255)},${alpha})`;

    // Palette: blue-violet grass under a pale alien sky; the mood shifts hue, cheer and wear.
    const [topHex, horizonHex] = SKIES[a.sky];
    const lowSun = night ? 0 : 1 - lift;
    const horizon = new THREE.Color(horizonHex).lerp(new THREE.Color('#f6c7a0'), lowSun * 0.25 * (0.4 + mood.warmth));
    const skyTop = new THREE.Color(topHex).lerp(new THREE.Color('#9aa0a8'), (1 - mood.cheer) * 0.18);
    if (night) {
      horizon.lerp(new THREE.Color('#a8e8c4'), 0.6);
      skyTop.lerp(new THREE.Color('#2f3a62'), 0.85);
    }
    const haze = night ? horizon.clone().lerp(new THREE.Color('#5d6a96'), 0.55) : horizon.clone();
    const grass = new THREE.Color('#5048c0').offsetHSL((mood.warmth - 0.5) * 0.07, (mood.cheer - 0.5) * 0.16, 0).lerp(new THREE.Color('#8f8aa4'), mood.wear * 0.18);
    if (night) grass.lerp(new THREE.Color('#353d7e'), 0.5);
    const blood = new THREE.Color('#1d4a2b'), bloodRim = new THREE.Color('#3f7a3c');
    const bone = new THREE.Color('#ece6d4');
    const far = (z: number) => clamp01((4 - z) / 40) * (night ? 0.8 : 0.65); // 0 near the viewer, 1 at the horizon

    // Lights.
    root.add(new THREE.HemisphereLight(night ? '#7f95cc' : skyTop.clone().lerp(new THREE.Color('#ffffff'), 0.4), night ? '#2c2650' : '#4d4470', night ? 0.75 : 0.7));
    const key = new THREE.DirectionalLight(
      night ? new THREE.Color('#b8d4ff') : new THREE.Color('#eef4ff').lerp(new THREE.Color('#ffd9b0'), mood.warmth * 0.55 * (0.5 + lowSun * 0.5)),
      night ? 1.25 : mix(3.3, 2.5, lift),
    );
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.05;
    key.shadow.bias = -0.0004;
    key.shadow.radius = 4;
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight(night ? '#9fe8c0' : '#e2ecf6', night ? 0.5 : 0.4);
    fill.position.set(-side * 6, 4, -14);
    root.add(fill);

    // Terrain: a flat near field for the cast, rolling up into humped hills behind.
    const humps = [
      { x: -14, z: -15, rx: 9, rz: 4.5, h: 1.9 },
      { x: 7, z: -19, rx: 10, rz: 5, h: 2.6 },
      { x: -3, z: -27, rx: 12, rz: 6, h: 3.4 },
      { x: 20, z: -28, rx: 10, rz: 6, h: 3.8 },
      { x: -25, z: -29, rx: 10, rz: 6, h: 4.2 },
    ].map((k) => ({ ...k, x: k.x + (random() - 0.5) * 4, z: k.z + (random() - 0.5) * 2, h: k.h * mix(0.8, 1.2, random()) }));
    const p1 = random() * 6, p2 = random() * 6;
    const heightAt = (x: number, z: number) => {
      const back = smooth(-5, -16, z);
      if (back <= 0) return 0;
      let y = 0.6 + 0.5 * Math.sin(x * 0.15 + p1) + 0.3 * Math.sin(x * 0.29 - z * 0.17 + p2) + smooth(-16, -36, z) * 1.6;
      for (const k of humps) y += k.h * Math.exp(-(((x - k.x) / k.rx) ** 2) - (((z - k.z) / k.rz) ** 2));
      return y * back;
    };

    // Where the far dressing stands: on one of the back hills.
    const fx = (random() < 0.5 ? -1 : 1) * mix(3, 8, random()), fz = mix(-27, -24, random());
    humps.push({ x: fx, z: fz - 1, rx: 7, rz: 4, h: 1.6 });
    const fy = heightAt(fx, fz);

    // The fence line: a curve across the middle distance and up over the hills.
    const fencePts = [[-36, 1], [-24, -4], [-13, -9], [-3, -11.5], [7, -15], [16, -21], [26, -27], [38, -32]].map(([x, z], i) => new THREE.Vector3(x, 0, z + (i ? (random() - 0.5) * 1.6 : 0)));
    const fenceCurve = new THREE.CatmullRomCurve3(fencePts);
    const fenceLength = fenceCurve.getLength();
    const postCount = Math.round(fenceLength / 2.9);
    const postsAt = fenceCurve.getSpacedPoints(postCount).map((p) => new THREE.Vector3(p.x, heightAt(p.x, p.z), p.z));
    // Where something went through: the span nearest the left-middle of the frame.
    const breach = postsAt.reduce((best, p, i) => (Math.abs(p.x + 4) < Math.abs(postsAt[best].x + 4) ? i : best), 0);

    // Stains: a pool in the near field, a drag trail to the fence, more as they spread.
    const blobs: { x: number; z: number; r: number; k: number }[] = [];
    const trails: { pts: [number, number][]; width: number }[] = [];
    const breachAt = postsAt[breach];
    for (let i = 0; i < 4 + Math.round(a.stains * 4); i++) {
      const p = postsAt[Math.max(0, Math.min(postsAt.length - 1, breach + Math.round((random() - 0.5) * 6)))];
      blobs.push({ x: p.x + (random() - 0.5) * 2.4, z: p.z + 0.6 + random() * 1.4, r: mix(0.25, 0.7, random()), k: random() * 9 });
    }
    if (a.stains > 0.25) {
      const pool = { x: mix(-4.5, -1.5, random()), z: mix(0.5, 3.5, random()) };
      blobs.push({ ...pool, r: mix(1.1, 2.2, a.stains), k: random() * 9 });
      const pts: [number, number][] = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        pts.push([mix(pool.x, breachAt.x + 0.6, t) + Math.sin(t * 7 + p1) * 0.9 * (1 - t), mix(pool.z, breachAt.z + 1.0, t)]);
      }
      trails.push({ pts, width: mix(0.35, 0.8, a.stains) });
      for (let i = 0; i < 10; i++) {
        const [x, z] = pts[Math.floor(random() * pts.length)];
        blobs.push({ x: x + (random() - 0.5) * 2.2, z: z + (random() - 0.5) * 1.4, r: mix(0.12, 0.35, random()), k: random() * 9 });
      }
    }
    if (a.stains > 0.65) {
      // Soaked: wide blotches across the near field, and runs coming down off the hill to the fence.
      for (let i = 0; i < Math.round(mix(3, 8, a.stains)); i++) blobs.push({ x: mix(-12, 12, random()), z: mix(-6, 10, random()), r: mix(0.8, 2.1, random()), k: random() * 9 });
      for (let i = 0; i < 3; i++) {
        const sx = breachAt.x + mix(-8, 10, random()), sz = mix(-20, -16, random());
        const pts: [number, number][] = [];
        for (let k = 0; k <= 6; k++) pts.push([sx + (random() - 0.5) * 1.2 + k * 0.2, mix(sz, breachAt.z + 1.5 + (random() - 0.5) * 2, k / 6)]);
        trails.push({ pts, width: mix(0.25, 0.5, random()) });
      }
    }
    const blobR = (b: { r: number; k: number }, t: number) => b.r * (1 + 0.28 * Math.sin(t * 3 + b.k) + 0.16 * Math.sin(t * 5 + b.k * 2) + 0.08 * Math.sin(t * 11 + b.k * 3));
    const soaked = (x: number, z: number) =>
      blobs.some((b) => Math.hypot(x - b.x, z - b.z) < blobR(b, Math.atan2(z - b.z, x - b.x)) * 1.05) ||
      trails.some((tr) => tr.pts.some(([px, pz]) => Math.hypot(px - x, pz - z) < tr.width * 0.9));

    // The painted ground.
    const SIZE = 2048, canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext('2d')!;
    const cx = (x: number) => ((x + X) / (2 * X)) * SIZE, cz = (z: number) => ((z - Z_FAR) / (Z_NEAR - Z_FAR)) * SIZE, cs = SIZE / (2 * X);
    const fade = ctx.createLinearGradient(0, 0, 0, SIZE);
    fade.addColorStop(0, css(grass.clone().lerp(haze, 0.38)));
    fade.addColorStop(0.3, css(grass.clone().lerp(haze, 0.14)));
    fade.addColorStop(0.55, css(grass));
    fade.addColorStop(1, css(grass.clone().offsetHSL(0, 0, -0.04)));
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 4200; i++) {
      const x = (random() - 0.5) * 2 * X, z = mix(Z_FAR, Z_NEAR, random()), f = far(z);
      const tone = random() < 0.1 ? grass.clone().lerp(new THREE.Color('#b3a8b8'), 0.4 + mood.wear * 0.3) : vary(grass, random, 0.2);
      ctx.fillStyle = css(tone.lerp(haze, f * 0.45), mix(0.55, 0.3, f));
      ctx.beginPath();
      ctx.ellipse(cx(x), cz(z), mix(1.4, 0.4, random()) * cs, mix(0.45, 0.14, random()) * cs, (random() - 0.5) * 0.3, 0, 6.3);
      ctx.fill();
    }
    // A worn cattle track from the near field to the fence.
    ctx.lineCap = ctx.lineJoin = 'round';
    const track: [number, number][] = [[9, 20], [6.5, 12], [9.5, 4], [6, -4], [breachAt.x + 14, breachAt.z - 2]];
    const trackPts = new THREE.CatmullRomCurve3(track.map(([x, z]) => new THREE.Vector3(x, 0, z))).getPoints(40);
    ctx.strokeStyle = css(grass.clone().lerp(new THREE.Color('#c2b3c4'), 0.45 + mood.wear * 0.2), 0.7);
    for (let i = 1; i < trackPts.length; i++) {
      ctx.lineWidth = 0.9 * cs * mix(1, 0.6, far(trackPts[i].z));
      ctx.beginPath(); ctx.moveTo(cx(trackPts[i - 1].x), cz(trackPts[i - 1].z)); ctx.lineTo(cx(trackPts[i].x), cz(trackPts[i].z)); ctx.stroke();
    }
    // The stains, painted dark with a lighter wet rim.
    const paintBlob = (b: { x: number; z: number; r: number; k: number }, scale: number, colour: THREE.Color, alpha: number) => {
      ctx.fillStyle = css(colour.clone().lerp(haze, far(b.z) * 0.35), alpha);
      ctx.beginPath();
      for (let i = 0; i <= 36; i++) {
        const t = (i / 36) * 6.283, r = blobR(b, t) * scale;
        ctx.lineTo(cx(b.x + Math.cos(t) * r), cz(b.z + Math.sin(t) * r));
      }
      ctx.fill();
    };
    for (const b of blobs) paintBlob(b, 1.12, bloodRim, 0.55);
    for (const tr of trails)
      for (const [pass, colour] of [[1.5, bloodRim], [1, blood]] as const) {
        ctx.strokeStyle = css(colour, pass > 1 ? 0.5 : 0.92);
        for (let i = 1; i < tr.pts.length; i++) {
          ctx.lineWidth = tr.width * cs * pass * mix(1.2, 0.7, i / tr.pts.length);
          ctx.beginPath(); ctx.moveTo(cx(tr.pts[i - 1][0]), cz(tr.pts[i - 1][1])); ctx.lineTo(cx(tr.pts[i][0]), cz(tr.pts[i][1])); ctx.stroke();
        }
      }
    for (const b of blobs) paintBlob(b, 1, blood, 0.95);
    if (a.far === 'wreck') {
      // Scorched ground and a furrow ploughed downhill by the wreck.
      ctx.fillStyle = css(new THREE.Color('#2b2433').lerp(haze, 0.3), 0.85);
      ctx.beginPath(); ctx.ellipse(cx(fx), cz(fz), 3.2 * cs, 1.7 * cs, 0, 0, 6.3); ctx.fill();
      ctx.strokeStyle = css(new THREE.Color('#5a4a52').lerp(haze, 0.3), 0.8);
      ctx.lineWidth = 0.9 * cs;
      ctx.beginPath(); ctx.moveTo(cx(fx), cz(fz)); ctx.lineTo(cx(fx - side * 6), cz(fz + 4)); ctx.stroke();
    }
    const groundMap = new THREE.CanvasTexture(canvas);
    groundMap.colorSpace = THREE.SRGBColorSpace;
    groundMap.anisotropy = 8;
    const plane = new THREE.PlaneGeometry(2 * X, Z_NEAR - Z_FAR, 150, 150);
    plane.rotateX(-Math.PI / 2);
    plane.translate(0, 0, (Z_NEAR + Z_FAR) / 2);
    const gp = plane.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < gp.count; i++) gp.setY(i, heightAt(gp.getX(i), gp.getZ(i)));
    plane.computeVertexNormals();
    const ground = new THREE.Mesh(plane, new THREE.MeshStandardMaterial({ map: groundMap, roughness: 1 }));
    ground.receiveShadow = true;
    root.add(ground);

    // Glossy wet stain sheets on the flat near field, so fresh blood catches the light.
    const wet = new THREE.MeshStandardMaterial({ color: blood.clone().multiplyScalar(0.85), roughness: mix(0.12, 0.6, mood.wear), metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2 });
    const sheets: THREE.BufferGeometry[] = [];
    for (const b of blobs) {
      if (b.z < -4.5) continue;
      const shape = new THREE.Shape();
      for (let i = 0; i <= 30; i++) {
        const t = (i / 30) * 6.283, r = blobR(b, t) * 0.82;
        if (i) shape.lineTo(b.x + Math.cos(t) * r, -(b.z + Math.sin(t) * r)); else shape.moveTo(b.x + Math.cos(t) * r, -(b.z + Math.sin(t) * r));
      }
      const g = new THREE.ShapeGeometry(shape);
      g.rotateX(-Math.PI / 2);
      g.translate(0, 0.02, 0);
      sheets.push(g);
    }
    if (sheets.length) {
      const merged = new Batch();
      for (const g of sheets) merged.add(g, '#ffffff');
      const m = merged.mesh();
      m.material.dispose();
      m.material = wet;
      m.castShadow = false;
      root.add(m);
    }

    // Standing grass: blue-violet blades in one draw call, paling with distance, soaked dark where it bled.
    const clear = (x: number, z: number, pad: number) => SLOTS.every(([sx, sz, size]) => Math.hypot(x - sx, z - sz) > pad * size);
    const tufts = Math.round(mix(2400, 4200, mood.density));
    const fringe = 70;
    const blade = new THREE.ConeGeometry(0.5, 1, 4);
    blade.translate(0, 0.5, 0);
    const field = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ roughness: 0.9 }), tufts + fringe);
    const dummy = new THREE.Object3D();
    let placed = 0;
    for (let i = 0; i < tufts + fringe; i++) {
      const front = i >= tufts;
      const wide = random() < 0.25;
      const x = (random() - 0.5) * 2 * (front ? 18 : wide ? 34 : 19), z = front ? mix(14.5, 17.5, random()) : mix(-33, 16, random() ** 0.85);
      if (!front && !clear(x, z, 1.3)) continue;
      const f = far(z), bled = !front && soaked(x, z);
      const h = (front ? mix(0.9, 1.8, random()) : mix(0.3, 0.85, random())) * mix(1, 0.7, f) * (bled ? 0.75 : 1);
      dummy.position.set(x, heightAt(x, z), z);
      dummy.rotation.set((random() - 0.5) * 0.5, random() * 3, (random() - 0.5) * 0.5);
      dummy.scale.set(mix(0.1, 0.2, random()) * (front ? 1.5 : 1), h, mix(0.1, 0.2, random()));
      dummy.updateMatrix();
      field.setMatrixAt(placed, dummy.matrix);
      const tone = bled ? blood.clone().lerp(bloodRim, random() * 0.5) : vary(grass, random, 0.2).offsetHSL(0, 0, front ? -0.12 : 0.03);
      field.setColorAt(placed++, tone.lerp(haze, f * 0.4));
    }
    field.count = placed;
    field.instanceMatrix.needsUpdate = true;
    if (field.instanceColor) field.instanceColor.needsUpdate = true;
    field.castShadow = false;
    field.receiveShadow = true;
    root.add(field);

    // The bone-post fence: knobbed pale posts with three wires, climbing the hills.
    const set = new Batch();
    const glowParts: { at: THREE.Vector3; size: number }[] = [];
    const lean = mix(0.03, 0.22, mood.wear);
    const tops: THREE.Vector3[] = [];
    postsAt.forEach((p, i) => {
      const f = far(p.z), tone = bone.clone().lerp(haze, f * 0.35);
      const knocked = a.fence === 'broken' && (i === breach || i === breach + 1);
      const h = 1.85 * mix(0.92, 1.08, random());
      const dir = new THREE.Vector3((random() - 0.5) * 2, 0, (random() - 0.5) * 2).normalize();
      const tilt = knocked ? Math.PI / 2 - 0.08 : (random() - 0.5) * 2 * lean;
      const top = p.clone().add(new THREE.Vector3(0, h, 0).applyAxisAngle(new THREE.Vector3(dir.z, 0, -dir.x), tilt));
      if (knocked) top.y = p.y + 0.12;
      const base: P3 = [p.x, p.y - 0.15, p.z];
      set.shaped([base, [mix(p.x, top.x, 0.5), mix(p.y, top.y, 0.5), mix(p.z, top.z, 0.5)], [top.x, top.y, top.z]], (t) => 0.13 * (t < 0.12 ? 1.35 - t * 2.5 : t > 0.86 ? 1 + (t - 0.86) * 3 : 1 - Math.sin(t * Math.PI) * 0.12), tone, 7);
      const across = new THREE.Vector3().subVectors(top, p).cross(new THREE.Vector3(1, 0, 0)).normalize().multiplyScalar(0.07);
      for (const s of [-1, 1]) set.ball([0.12, 0.1, 0.12], [top.x + across.x * s, top.y - 0.02 + across.y * s, top.z + across.z * s], tone, undefined, 8);
      tops.push(top);
      if (a.fence === 'beacons' && !knocked) glowParts.push({ at: top.clone().add(new THREE.Vector3(0, 0.12, 0)), size: 0.09 });
    });
    if (a.fence !== 'bare') {
      const wire = new THREE.Color('#4a4458').lerp(haze, 0.15);
      for (let i = 0; i < postsAt.length - 1; i++) {
        const broken = a.fence === 'broken' && i >= breach - 1 && i <= breach + 1;
        for (const level of [0.32, 0.62, 0.92]) {
          const at = (j: number) => postsAt[j].clone().lerp(tops[j], level);
          const p0 = at(i), p1 = at(i + 1);
          if (broken) {
            // Snapped and curled back toward the standing post.
            const keep = i === breach - 1 ? p0 : i === breach + 1 ? p1 : null;
            if (!keep) continue;
            const dx = i === breach - 1 ? 1 : -1;
            set.tube([[keep.x, keep.y, keep.z], [keep.x + dx * 0.7, keep.y - 0.1, keep.z + 0.25], [keep.x + dx * 1.0, keep.y - 0.5, keep.z - 0.2], [keep.x + dx * 0.7, Math.max(keep.y - 0.9, postsAt[i].y + 0.05), keep.z + 0.3]], 0.025, 0.025, wire, 5);
            continue;
          }
          const sag = mix(0.04, 0.3, mood.wear);
          const mid: P3 = [(p0.x + p1.x) / 2, (p0.y + p1.y) / 2 - sag, (p0.z + p1.z) / 2];
          set.tube([[p0.x, p0.y, p0.z], mid, [p1.x, p1.y, p1.z]], 0.024, 0.024, wire, 4);
        }
      }
    }
    // A second, older line of posts along the far crest.
    for (let i = 0; i < 18; i++) {
      const x = mix(-30, 30, i / 17) + (random() - 0.5) * 0.6, z = -31 + Math.sin(i * 0.5 + p2) * 1.5;
      const y = heightAt(x, z), tone = bone.clone().lerp(haze, 0.55);
      set.rod([x, y - 0.1, z], [x + (random() - 0.5) * 0.2, y + 1.5, z], 0.1, 0.09, tone, 6);
      set.ball([0.12, 0.09, 0.12], [x, y + 1.5, z], tone, undefined, 6);
    }

    // Far dressing on a hill crest.
    const farTone = (c: string, k = 0.35) => new THREE.Color(c).lerp(haze, k);
    const lit: THREE.Mesh[] = [];
    const lamp = (colour: string, intensity: number) => new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: intensity, roughness: 0.4 });
    const smoke: { mesh: THREE.Mesh; phase: number }[] = [];
    // Built at full size, then shrunk about its footing: in a flat view, distance has to be told by size.
    const farB = new Batch(), farG = new THREE.Group();
    const farK = ({ dome: 0.72, rig: 0.62, wreck: 0.5, herd: 1, nothing: 1 } as const)[a.far];
    farG.scale.setScalar(farK);
    farG.position.set(fx * (1 - farK), fy * (1 - farK), fz * (1 - farK));
    root.add(farG);
    if (a.far === 'dome') {
      const shell = new THREE.Mesh(new THREE.SphereGeometry(2.9, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: farTone('#f1efe8', 0.25), roughness: 0.6, flatShading: true }));
      shell.position.set(fx, fy - 0.2, fz);
      shell.castShadow = shell.receiveShadow = true;
      farG.add(shell);
      farB.drum(3.1, 0.5, [fx, fy, fz], farTone('#9a9aa6'), undefined, 16);
      farB.box([1.6, 1.8, 2.0], [fx + 1.2, fy + 0.7, fz + 2.8], farTone('#d8d6cf'));
      farB.drum(0.9, 4.6, [fx - 4.4, fy + 2.0, fz - 0.5], farTone('#c9c6bc'), undefined, 12);
      farB.cone(1.0, 1.0, [fx - 4.4, fy + 4.8, fz - 0.5], farTone('#a8a59c'), undefined, 12);
      farB.rod([fx + 3.6, fy, fz - 1.5], [fx + 3.6, fy + 7, fz - 1.5], 0.06, 0.03, farTone('#6f6c78'), 5);
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.1), lamp('#ffd27a', mix(0.4, 2.2, glow)));
      win.position.set(fx + 1.2, fy + 0.9, fz + 3.82);
      farG.add(win);
      lit.push(win);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), lamp('#ff4a3a', mix(0.6, 2.4, glow)));
      tip.position.set(fx + 3.6, fy + 7.1, fz - 1.5);
      farG.add(tip);
      lit.push(tip);
    } else if (a.far === 'rig') {
      const steel = farTone('#5b5866', 0.3), H = 11;
      const feet: [number, number][] = [[-1.6, -1.6], [1.6, -1.6], [1.6, 1.6], [-1.6, 1.6]];
      for (const [dx, dz] of feet) farB.rod([fx + dx, fy - 0.2, fz + dz], [fx + dx * 0.25, fy + H, fz + dz * 0.25], 0.09, 0.07, steel, 5);
      for (let k = 1; k < 6; k++) {
        const y0 = (k - 1) / 5 * H, y1 = k / 5 * H, s0 = mix(1, 0.25, y0 / H), s1 = mix(1, 0.25, y1 / H);
        for (let e = 0; e < 4; e++) {
          const [ax, az] = feet[e], [bx, bz] = feet[(e + 1) % 4];
          farB.rod([fx + ax * s0, fy + y0, fz + az * s0], [fx + bx * s1, fy + y1, fz + bz * s1], 0.04, 0.04, steel, 4);
          farB.rod([fx + ax * s1, fy + y1, fz + az * s1], [fx + bx * s1, fy + y1, fz + bz * s1], 0.04, 0.04, steel, 4);
        }
      }
      farB.box([1.4, 0.8, 1.4], [fx, fy + H + 0.3, fz], steel);
      farB.box([3.2, 2.2, 2.4], [fx + 3.6, fy + 1, fz + 1], farTone('#8b6f5a', 0.3));
      farB.rod([fx, fy + 0.3, fz], [fx + 5, fy + 0.3, fz + 4], 0.18, 0.18, farTone('#6c6878'), 6);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), lamp('#ff3b2e', mix(0.8, 2.6, glow)));
      beacon.position.set(fx, fy + H + 0.95, fz);
      farG.add(beacon);
      lit.push(beacon);
    } else if (a.far === 'herd') {
      const n = Math.round(mix(5, 12, mood.density));
      const hides = ['#5f6b78', '#8c4a2e', '#e3dccb', '#5f6b78'];
      for (let i = 0; i < n; i++) {
        const x = -side * 4 - 8 + i * mix(1.8, 2.8, random()), z = mix(-20, -17, random()), y = heightAt(x, z), s = 0.95;
        const tone = farTone(hides[Math.floor(random() * hides.length)], 0.4), dirn = random() < 0.5 ? 1 : -1;
        set.ball([1.1 * s, 0.55 * s, 0.55 * s], [x, y + 1.05 * s, z], tone, undefined, 8);
        for (let k = 0; k < 4; k++) set.ball([0.24 * s, 0.14 * s, 0.34 * s], [x + (k - 1.5) * 0.45 * s, y + 1.56 * s, z], farTone('#e8e2d2', 0.4), undefined, 6);
        for (const lx of [-0.7, 0, 0.7]) for (const lz of [-0.28, 0.28]) set.rod([x + lx * s, y + 0.8 * s, z + lz * s], [x + lx * s, y, z + lz * s], 0.09 * s, 0.07 * s, tone, 4);
        set.rod([x + dirn * 1.0 * s, y + 1.15 * s, z], [x + dirn * 1.6 * s, y + 0.35 * s, z], 0.17 * s, 0.1 * s, tone, 5);
      }
    } else if (a.far === 'wreck') {
      // Nose-down: the hull's lower end buried in the slope, the finned tail in the air.
      const hull = farTone('#d9d6cc', 0.3), stripe = farTone('#c25a2c', 0.3);
      const tilt: P3 = [0.25, random() * 3, -0.6 * side];
      const euler = new THREE.Euler(...tilt), centre = new THREE.Vector3(fx, fy + 1.6, fz);
      const along = (d: number, ox = 0, oz = 0): P3 => centre.clone().add(new THREE.Vector3(ox, d, oz).applyEuler(euler)).toArray() as unknown as P3;
      farB.drum(1.7, 9, along(0), hull, tilt, 16);
      farB.drum(1.74, 0.7, along(1.5), stripe, tilt, 16);
      farB.drum(1.2, 1.2, along(5, 0, 0), farTone('#6c6878', 0.3), tilt, 12, 1.6);
      for (const [ox, oz] of [[2.0, 0], [-2.0, 0], [0, 2.0]] as const) farB.box([ox ? 0.16 : 2.2, 2.4, oz ? 0.16 : 2.2].map((v, i) => i === 1 ? v : Math.max(v, 0.16)) as unknown as P3, along(3.2, ox, oz), stripe, tilt);
      for (let i = 0; i < 7; i++) farB.blob([0.6, 0.35, 0.5], [fx + (random() - 0.5) * 6, fy + 0.1, fz + (random() - 0.5) * 3], farTone('#3a3440', 0.3), [0, random() * 3, 0], 0);
      const puff = new THREE.MeshStandardMaterial({ color: farTone('#b4b0bc', 0.3), transparent: true, opacity: 0.28, depthWrite: false, roughness: 1 });
      for (let i = 0; i < 7; i++) {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), puff);
        farG.add(mesh);
        smoke.push({ mesh, phase: i / 7 });
      }
    }
    if (!farB.empty) farG.add(farB.mesh({ roughness: 0.85 }));
    const farX = fx, farY = fy, farZ = fz;

    // Flora among the grass.
    const flora: { at: P3; size: number }[] = [];
    if (a.flora !== 'none') {
      const n = Math.round(mix(40, 110, mood.density) * (a.flora === 'spines' ? 0.4 : 1));
      for (let i = 0, guard = 0; i < n && guard < 600; guard++) {
        const x = (random() - 0.5) * 40, z = mix(-24, 14, random() ** 0.9);
        if (!clear(x, z, 2.2)) continue;
        i++;
        const y = heightAt(x, z), f = far(z), s = mix(1, 0.7, f);
        if (a.flora === 'puffballs') {
          const tone = farTone('#efe8dc', f * 0.4);
          set.rod([x, y, z], [x, y + 0.35 * s, z], 0.03, 0.025, farTone('#8a83a0', f * 0.4), 4);
          set.ball([0.16 * s, 0.14 * s, 0.16 * s], [x, y + 0.45 * s, z], tone, undefined, 8);
          if (random() < 0.4) set.ball([0.1 * s, 0.09 * s, 0.1 * s], [x + 0.2, y + 0.12 * s, z + 0.1], tone, undefined, 6);
        } else if (a.flora === 'lanterns') {
          const stalk = mix(0.6, 1.2, random()) * s;
          set.tube([[x, y, z], [x + 0.06, y + stalk * 0.6, z], [x + 0.15, y + stalk, z + 0.05]], 0.03, 0.02, farTone('#3d4d4a', f * 0.4), 4);
          flora.push({ at: [x + 0.17, y + stalk - 0.06, z + 0.05], size: 0.2 * s });
        } else {
          for (let k = 0; k < 3 + Math.floor(random() * 3); k++) {
            const h = mix(0.8, 2.4, random()) * s, ox = (random() - 0.5) * 0.8, oz = (random() - 0.5) * 0.6;
            set.cone(0.09 * s, h, [x + ox, y + h / 2 - 0.05, z + oz], farTone('#2d2540', f * 0.45), [(random() - 0.5) * 0.35, 0, (random() - 0.5) * 0.35], 5);
          }
        }
      }
    }
    // A few pale stones and an old jawbone in the near field for scale.
    for (let i = 0; i < 12; i++) {
      const x = (random() - 0.5) * 30, z = mix(-6, 13, random());
      if (!clear(x, z, 2.6)) continue;
      const s = mix(0.12, 0.34, random());
      set.blob([s * 1.3, s * 0.7, s], [x, s * 0.25, z], vary('#a59fb0', random, 0.08), [random(), random() * 3, 0], 0);
    }

    if (!set.empty) root.add(set.mesh({ roughness: 0.85 }));
    const bulbs = new THREE.MeshStandardMaterial({ color: '#d6ff9e', emissive: '#b8ff6a', emissiveIntensity: mix(0.35, 1.8, glow), roughness: 0.4 });
    const beaconMat = new THREE.MeshStandardMaterial({ color: '#ff4436', emissive: '#ff2a1a', emissiveIntensity: mix(0.6, 2.2, glow), roughness: 0.4 });
    const instanced = (points: { at: P3; size: number }[], material: THREE.Material) => {
      if (!points.length) return;
      const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), material, points.length);
      const m = new THREE.Matrix4();
      points.forEach((p, i) => mesh.setMatrixAt(i, m.makeScale(p.size, p.size * 1.25, p.size).setPosition(...p.at)));
      mesh.instanceMatrix.needsUpdate = true;
      root.add(mesh);
    };
    instanced(flora, bulbs);
    instanced(glowParts.map((g) => ({ at: g.at.toArray() as unknown as P3, size: g.size })), beaconMat);

    // Drifting spores, catching the light; more of them and quicker with the scene's energy.
    const sporeCount = Math.round(mix(12, 60, mood.energy * 0.5 + mood.density * 0.5));
    const spores = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: '#f4f1e6', emissive: night ? '#c8ffd8' : '#000000', emissiveIntensity: night ? 1.2 : 0, roughness: 1 }), sporeCount);
    spores.castShadow = false;
    const sporeSeeds = Array.from({ length: sporeCount }, () => ({ x: (random() - 0.5) * 30, y: mix(0.6, 5, random()), z: mix(-12, 14, random()), s: mix(0.025, 0.05, random()), ph: random() * 6.3 }));
    root.add(spores);

    // The sky: one painted sheet behind everything, skipped by the solid passes.
    const SHEET_W = 64, SHEET_H = 52, centreY = LIFT; // the sheet is centred on the camera's axis
    const SW = 1024, SH = Math.round(SW * SHEET_H / SHEET_W);
    const sheet = document.createElement('canvas');
    sheet.width = SW; sheet.height = SH;
    const sky = sheet.getContext('2d')!;
    const px = (xs: number) => ((xs + SHEET_W / 2) / SHEET_W) * SW, py = (ys: number) => ((centreY + SHEET_H / 2 - ys) / SHEET_H) * SH, pm = SW / SHEET_W;
    const horizonY = py(11.5);
    const grad = sky.createLinearGradient(0, py(LIFT + EXTENT + 1), 0, horizonY);
    grad.addColorStop(0, css(skyTop));
    grad.addColorStop(0.45, css(skyTop.clone().lerp(horizon, 0.45)));
    grad.addColorStop(1, css(horizon));
    sky.fillStyle = grad;
    sky.fillRect(0, 0, SW, SH);
    if (night) {
      const band = sky.createLinearGradient(0, horizonY - 7 * pm, 0, horizonY + pm);
      band.addColorStop(0, css(horizon, 0));
      band.addColorStop(1, css(new THREE.Color('#d8ffe4'), 0.9));
      sky.fillStyle = band;
      sky.fillRect(0, horizonY - 7 * pm, SW, 8 * pm);
      for (let i = 0; i < 260; i++) {
        sky.fillStyle = `rgba(255,255,255,${mix(0.3, 0.9, random())})`;
        const r = random() < 0.08 ? 1.6 : 0.9;
        sky.beginPath(); sky.arc(random() * SW, random() * (horizonY - 9 * pm), r, 0, 6.3); sky.fill();
      }
    }
    // The sun, low or high with the hour.
    const sunX = px(side * mix(10, 6, lift)), sunY = py(mix(13.5, 21, lift));
    if (!night) {
      const halo = sky.createRadialGradient(sunX, sunY, 4, sunX, sunY, 70);
      halo.addColorStop(0, 'rgba(255,255,250,0.95)');
      halo.addColorStop(1, 'rgba(255,255,250,0)');
      sky.fillStyle = halo;
      sky.fillRect(0, 0, SW, SH);
      sky.fillStyle = '#fffef6';
      sky.beginPath(); sky.arc(sunX, sunY, 9, 0, 6.3); sky.fill();
    }
    // Thin streaks of cloud.
    sky.lineCap = 'round';
    for (let i = 0; i < (a.hanging === 'nothing' ? 26 : 10); i++) {
      const y = mix(py(26), horizonY - 30, random()), x = random() * SW, len = mix(60, 220, random());
      sky.strokeStyle = css(night ? new THREE.Color('#8f9cc4') : new THREE.Color('#ffffff').lerp(new THREE.Color('#e0c8e8'), 0.4), night ? 0.35 : 0.55);
      sky.lineWidth = mix(1.5, 5, random());
      sky.beginPath(); sky.moveTo(x, y); sky.quadraticCurveTo(x + len * 0.5, y - mix(2, 8, random()), x + len, y - mix(4, 14, random())); sky.stroke();
    }
    // What hangs in the sky.
    const lightDir = night ? -side : side; // which way the lit limb faces
    const body = (bx: number, by: number, r: number, base: THREE.Color, bands: THREE.Color | null, litAmount: number) => {
      sky.save();
      sky.beginPath(); sky.arc(bx, by, r, 0, 6.3); sky.clip();
      sky.fillStyle = css(base);
      sky.fillRect(bx - r, by - r, r * 2, r * 2);
      if (bands) for (let i = 0; i < 9; i++) {
        sky.fillStyle = css(bands, mix(0.2, 0.5, random()));
        const y = by - r + (i + random() * 0.6) * (r * 2 / 9);
        sky.fillRect(bx - r, y, r * 2, mix(0.04, 0.12, random()) * r * 2);
      }
      // Terminator: the side away from the light falls into the sky's colour.
      const shade = sky.createLinearGradient(bx + lightDir * r, by, bx - lightDir * r, by);
      shade.addColorStop(0, css(skyTop, 0));
      shade.addColorStop(mix(0.65, 0.2, 1 - litAmount), css(skyTop, 0));
      shade.addColorStop(1, css(skyTop.clone().lerp(new THREE.Color('#2a2c44'), night ? 0.5 : 0.15), 0.88));
      sky.fillStyle = shade;
      sky.fillRect(bx - r, by - r, r * 2, r * 2);
      sky.restore();
    };
    if (a.hanging === 'ringed') {
      const bx = px(-side * mix(3, 7, random())), by = py(15.6), r = 5.2 * pm;
      const tiltR = -0.2 * side;
      const ring = (front: boolean) => {
        for (const [k, width, alpha] of [[1.45, 0.16, 0.75], [1.62, 0.22, 0.85], [1.86, 0.1, 0.5], [2.05, 0.2, 0.7], [2.3, 0.06, 0.4]] as const) {
          sky.strokeStyle = css(new THREE.Color('#efe6d2').lerp(horizon, 0.25), alpha * (night ? 0.75 : 1));
          sky.lineWidth = width * r;
          sky.beginPath();
          sky.ellipse(bx, by, r * k, r * k * 0.2, tiltR, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
          sky.stroke();
        }
      };
      ring(false);
      body(bx, by, r, new THREE.Color('#d9c7a8').lerp(horizon, 0.2), new THREE.Color('#a27d63'), night ? 0.35 : 0.85);
      ring(true);
    } else if (a.hanging === 'moons') {
      body(px(-side * 6), py(16.2), 2.6 * pm, new THREE.Color('#eceee6'), new THREE.Color('#c9cfc4'), night ? 0.7 : 0.9);
      body(px(-side * 0.5), py(18.6), 1.05 * pm, new THREE.Color('#e7b9b0'), null, 0.8);
    } else if (a.hanging === 'crescent') {
      const toward = side; // the lit limb faces the middle of the frame
      const bx = px(-side * 8), by = py(16.5), r = 7.5 * pm;
      sky.save();
      sky.beginPath(); sky.arc(bx, by, r, 0, 6.3); sky.clip();
      sky.fillStyle = css(skyTop.clone().lerp(horizon, 0.4).lerp(new THREE.Color('#6a7096'), night ? 0.35 : 0.14), 0.9);
      sky.fillRect(bx - r, by - r, r * 2, r * 2);
      for (let i = 0; i < 7; i++) {
        sky.fillStyle = css(new THREE.Color('#7d86a8'), 0.08);
        sky.fillRect(bx - r, by - r + (i + random()) * r * 0.28, r * 2, r * 0.06);
      }
      const lit = sky.createLinearGradient(bx + toward * r, by, bx + toward * r * 0.55, by);
      lit.addColorStop(0, css(new THREE.Color('#fbf6e6')));
      lit.addColorStop(1, css(new THREE.Color('#e9dcc0').lerp(horizon, 0.3)));
      sky.fillStyle = lit;
      sky.beginPath(); sky.arc(bx, by, r, 0, 6.3); sky.arc(bx - toward * r * 0.26, by + r * 0.06, r * 0.99, 0, 6.3, true); sky.fill('evenodd');
      sky.restore();
    }
    const skyMap = new THREE.CanvasTexture(sheet);
    skyMap.colorSpace = THREE.SRGBColorSpace;
    const dome = new THREE.Mesh(new THREE.PlaneGeometry(SHEET_W, SHEET_H), new THREE.MeshBasicMaterial({ map: skyMap, depthWrite: false, toneMapped: false, fog: false }));
    dome.renderOrder = -10;
    root.add(dome);

    // Far ridges, flat hazy silhouettes behind the last hill.
    const ridge = (z: number, height: number, tone: THREE.Color, rough: number) => {
      const shape = new THREE.Shape(), ph = random() * 20;
      shape.moveTo(-X - 10, -2);
      for (let i = 0; i <= 100; i++) {
        const u = i / 100, x = mix(-X - 10, X + 10, u);
        const y = 0.5 + 0.28 * Math.sin(u * 6 + ph) + 0.16 * Math.sin(u * 15 + ph * 2) + rough * 0.06 * Math.sin(u * 47 + ph * 3);
        shape.lineTo(x, Math.max(0.05, y) * height);
      }
      shape.lineTo(X + 10, -2);
      const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: tone, toneMapped: false }));
      mesh.position.z = z;
      root.add(mesh);
    };
    const violet = grass.clone().lerp(new THREE.Color('#8d93c8'), 0.4);
    ridge(Z_FAR - 9, 4.2, violet.clone().lerp(horizon, night ? 0.4 : 0.68), 0);
    ridge(Z_FAR - 5, 3.2, violet.clone().lerp(horizon, night ? 0.25 : 0.5), 0.6);

    // Camera: a fixed wide frame, low enough that the sky and what hangs in it take the top third.
    const camera = new THREE.OrthographicCamera(-EXTENT, EXTENT, EXTENT, -EXTENT, 0.1, 500);
    const toCamera = new THREE.Vector3(0, Math.sin(PITCH), Math.cos(PITCH));
    camera.position.copy(toCamera).multiplyScalar(150);
    camera.lookAt(0, 0, 0);
    camera.translateY(LIFT);
    camera.updateMatrixWorld(true);
    dome.quaternion.copy(camera.quaternion);
    dome.position.copy(camera.position).addScaledVector(toCamera, -400);

    const sunDir = night ? new THREE.Vector3(-side * 0.7, 0.55, -0.45).normalize() : new THREE.Vector3(side * 0.82, mix(0.3, 0.75, lift), -0.35).normalize();
    key.target.position.set(0, 0, -6);
    key.position.copy(key.target.position).addScaledVector(sunDir, 80);
    const shadow = key.shadow.camera;
    shadow.left = shadow.bottom = -32;
    shadow.right = shadow.top = 32;
    shadow.near = 1;
    shadow.far = 180;
    shadow.updateProjectionMatrix();

    const place = (items: readonly Placeable[]) => {
      items.forEach((item, index) => {
        const [x, z, size] = SLOTS[index % SLOTS.length];
        const natural = Math.max(item.height, item.radius * 2, 0.1);
        // Sizes are compressed, not equalised: a beast still dwarfs a rancher, but both read.
        let scale = ((1.9 * natural ** 0.6) / natural) * size;
        scale = Math.min(scale, (item.hero ? 4.6 : 3.4) / Math.max(item.radius, 0.05), (item.hero ? 7.5 : 6) / Math.max(item.height, 0.05));
        item.holder.scale.setScalar(scale);
        const px2 = x + (random() - 0.5) * 0.8, pz2 = z + (random() - 0.5) * 0.8;
        item.holder.position.set(px2, heightAt(px2, pz2), pz2);
        item.holder.rotation.y = side * -0.25 + (random() - 0.5) * 0.6;
        item.holder.updateMatrixWorld(true);
      });
    };

    const pace = mix(0.25, 1.4, mood.energy);
    const m4 = new THREE.Matrix4();
    const drift = (time: number) => {
      sporeSeeds.forEach((sp, i) => {
        const t = time * pace;
        const x = ((sp.x + t * 0.6 + 15) % 30 + 30) % 30 - 15;
        spores.setMatrixAt(i, m4.makeScale(sp.s, sp.s, sp.s).setPosition(x, sp.y + Math.sin(t * 0.8 + sp.ph) * 0.4, sp.z + Math.cos(t * 0.5 + sp.ph) * 0.3));
      });
      spores.instanceMatrix.needsUpdate = true;
      for (const puff of smoke) {
        const u = (puff.phase + time * 0.04 * pace) % 1;
        puff.mesh.position.set(farX + u * 5 * side + 1.5, farY + 4.5 + u * 9, farZ - u * 2);
        puff.mesh.scale.setScalar(mix(0.7, 2.4, u));
      }
    };
    drift(0);

    return {
      object: root,
      camera,
      background: grass.clone().offsetHSL(0, 0, -0.04),
      capacity: SLOTS.length,
      ground,
      keyLight: key,
      place,
      update(_dt, time) {
        drift(time);
        const blink = 0.5 + 0.5 * Math.sin(time * 2.2 * pace);
        beaconMat.emissiveIntensity = mix(0.6, 2.2, glow) * (0.35 + 0.65 * blink);
        bulbs.emissiveIntensity = mix(0.35, 1.8, glow) * (0.85 + 0.15 * Math.sin(time * 0.9));
        for (const m of lit) if (m.geometry.type === 'SphereGeometry') (m.material as THREE.MeshStandardMaterial).emissiveIntensity = mix(0.6, 2.6, glow) * (0.3 + 0.7 * (Math.sin(time * 1.4 * pace) > 0.2 ? 1 : 0.15));
      },
      dispose() {
        key.shadow.map?.dispose();
        disposeTree(root);
      },
    };
  },
});
