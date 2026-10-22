import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];
const IRIS = { brown: ['#5a3418', '#a0672c'], blue: ['#1f4f8a', '#7fb4e0'], green: ['#3d5a2a', '#a3b85a'], grey: ['#4a545c', '#aab6bd'], amber: ['#8a4a10', '#e8a83a'] } as const;

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    vessel: choice('What are the eyes served on?', {
      plate: 'A shallow gold plate with a broad rim.',
      chalice: 'A stemmed gold chalice, the eyes resting in the cup.',
      saucer: 'A plain fired-clay saucer, a village offering.',
      tray: 'An oval silver tray with handles and a martyr\'s palm frond laid across it.',
    }),
    eyes: choice('What are the eyes made of?', {
      wood: 'Painted wood: matte, bold, a little crude, like a statue\'s.',
      glass: 'Blown glass, glossy and perfect, like a doll-maker\'s.',
      real: 'Startlingly real: wet, veined, faintly pink at the back.',
      buns: 'Sweet round buns with white icing and a dark cherry pupil, as baked for her feast day.',
    }),
    iris: choice('What colour are the irises?', {
      brown: 'Warm brown.', blue: 'Clear blue.', green: 'Olive green.', grey: 'Pale grey.', amber: 'Bright amber, almost gold.',
    }),
    gaze: choice('Where do the eyes look?', {
      heaven: 'Straight up to heaven, serene.',
      viewer: 'Directly at whoever is looking, unblinking.',
      apart: 'Rolled apart in different directions, loose and unsettling.',
    }),
    surrounding: choice('What surrounds the vessel?', {
      bare: 'Nothing. The dish alone.',
      candles: 'A ring of small burning candles.',
      flowers: 'A wreath of small flowers and leaves.',
      blood: 'Drops and a thin trail of blood, the martyrdom still fresh.',
      coins: 'Scattered coins left by the grateful.',
    }),
    finish: choice('What finish does the vessel have?', {
      fresh: 'Fresh and bright, newly gilded or polished.',
      flaking: 'Old polychrome flaking away in patches to red bole and white gesso.',
      sooty: 'Dulled and darkened by centuries of candle smoke.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    // Vessel surface: one painted map carries gilt, flakes or soot.
    const baseColour = { plate: '#e2b33c', chalice: '#e2b33c', saucer: '#b9683f', tray: '#d5d9db' }[a.vessel];
    const skin = paint(256, 256, (ctx) => {
      ctx.fillStyle = baseColour;
      ctx.fillRect(0, 0, 256, 256);
      const blot = (colour: string, count: number, size: number) => {
        ctx.fillStyle = colour;
        for (let i = 0; i < count; i++) {
          const x = random() * 256, y = random() * 256;
          ctx.beginPath();
          for (let k = 0; k < 7; k++) {
            const angle = k / 7 * Math.PI * 2, r = size * (0.4 + random());
            ctx.lineTo(x + Math.cos(angle) * r * 1.6, y + Math.sin(angle) * r);
          }
          ctx.fill();
        }
      };
      if (a.finish === 'flaking') {
        blot(a.vessel === 'saucer' ? '#7a4a34' : a.vessel === 'tray' ? '#55524d' : '#a23a26', 26 + mood.wear * 40, 13);
        blot('#ece5d3', 16 + mood.wear * 30, 8);
      } else if (a.finish === 'sooty') {
        ctx.fillStyle = 'rgba(40,30,22,0.45)';
        ctx.fillRect(0, 0, 256, 256);
        blot('rgba(20,16,12,0.13)', 60, 14);
      } else blot('rgba(255,250,220,0.25)', 20, 10);
      blot('rgba(60,45,30,0.12)', mood.wear * 30, 9);
    });
    const metallic = a.vessel !== 'saucer';
    const vesselMat = new THREE.MeshStandardMaterial({ map: skin, metalness: metallic && a.finish === 'fresh' ? 0.45 : metallic ? 0.2 : 0, roughness: a.finish === 'fresh' ? (metallic ? 0.28 : 0.7) : 0.75, side: THREE.DoubleSide, emissive: baseColour, emissiveIntensity: a.finish === 'fresh' && metallic ? 0.14 : 0.02 });

    let rest = 0.014; // height the eyes sit on
    let rimX = 0.165, rimZ = 0.165, spread = 0.047;
    const plate: [number, number][] = [[0, 0.004], [0.05, 0.004], [0.056, 0], [0.064, 0], [0.068, 0.008], [0.1, 0.013], [0.158, 0.03], [0.165, 0.034], [0.158, 0.038], [0.1, 0.021], [0.068, 0.015], [0, 0.013]];
    if (a.vessel === 'plate') {
      s.lathe(plate, vesselMat);
      const bead = s.material('#f0c95a', { metalness: 0.4, roughness: 0.3 });
      if (a.finish !== 'sooty') s.scatter(new THREE.SphereGeometry(1, 8, 6), bead, Array.from({ length: 36 }, (_u, i) => ({ at: [Math.cos(i / 36 * 6.283) * 0.14, 0.031, Math.sin(i / 36 * 6.283) * 0.14] as P3, size: 0.004 })));
    } else if (a.vessel === 'chalice') {
      s.lathe([[0, 0], [0.07, 0], [0.073, 0.006], [0.052, 0.016], [0.022, 0.032], [0.014, 0.07], [0.032, 0.086], [0.014, 0.102], [0.016, 0.126], [0.05, 0.15], [0.078, 0.2], [0.086, 0.245], [0.088, 0.25], [0.082, 0.25], [0.072, 0.2], [0.045, 0.158], [0, 0.146]], vesselMat);
      s.cylinder(0.074, 0.07, 0.006, [0, 0.214, 0], s.material('#5a0f18', { roughness: 0.25 }), 28);
      for (let i = 0; i < 6; i++) s.ball([0.006, 0.006, 0.006], [Math.cos(i / 6 * 6.283) * 0.033, 0.086, Math.sin(i / 6 * 6.283) * 0.033], s.material(i % 2 ? '#b3202a' : '#2f5fae', { roughness: 0.2 }), 10);
      rest = 0.217; rimX = rimZ = 0.075; spread = 0.037;
    } else if (a.vessel === 'saucer') {
      const dish = s.lathe(plate.map(([x, y]) => [x * 0.82, y * 1.35] as [number, number]), vesselMat);
      dish.rotation.y = random() * 6;
      rest = 0.018; rimX = rimZ = 0.135; spread = 0.043;
    } else {
      const tray = s.lathe(plate.map(([x, y]) => [x, y * 0.8] as [number, number]), vesselMat);
      tray.scale.x = 1.45;
      rimX = 0.24; rimZ = 0.165; rest = 0.012; spread = 0.05;
      for (const side of [-1, 1]) {
        const handle = s.ring(0.035, 0.006, [side * 0.245, 0.03, 0], vesselMat, Math.PI);
        handle.rotation.set(-Math.PI / 2 + 0.5 * 0, 0, -side * Math.PI / 2);
        handle.rotation.x = -1.1;
      }
      // The martyr's palm, laid across the back of the tray.
      const green = s.material(a.finish === 'fresh' ? '#6f8f3a' : '#a39a55', { roughness: 0.8, side: THREE.DoubleSide });
      const stem = (t: number): P3 => [mix(-0.2, 0.2, t), 0.03 + Math.sin(t * Math.PI) * 0.012, -0.075 + Math.sin(t * 2.6) * 0.02];
      s.tube([0, 0.25, 0.5, 0.75, 1].map(stem), 0.003, green);
      for (let i = 2; i < 22; i++) {
        const t = i / 22, [x, y, z] = stem(t), length = 0.07 * Math.sin(t * Math.PI) ** 0.5 + 0.02;
        for (const side of [-1, 1]) {
          const leaf = s.box([0.011, 0.0015, length], [x + length * 0.25, y + 0.003, z + side * length * 0.45], green);
          leaf.rotation.y = side * -0.5 + (random() - 0.5) * 0.15;
          leaf.rotation.x = side * -0.12;
        }
      }
    }

    // The eyes.
    const r = a.eyes === 'buns' ? 0.044 : 0.036;
    const [deep, bright] = IRIS[a.iris];
    const eyeMap = paint(512, 256, (ctx) => {
      ctx.fillStyle = a.eyes === 'wood' ? '#efe7d2' : a.eyes === 'real' ? '#f1e9e2' : '#f6f5f1';
      ctx.fillRect(0, 0, 512, 256);
      if (a.eyes === 'real') {
        const g = ctx.createLinearGradient(0, 90, 0, 256);
        g.addColorStop(0, 'rgba(214,120,110,0)');
        g.addColorStop(1, 'rgba(200,90,90,0.75)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 512, 256);
        ctx.strokeStyle = 'rgba(170,30,35,0.75)';
        for (let v = 0; v < 26; v++) {
          let x = random() * 512, y = 250;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          const top = 60 + random() * 70;
          while (y > top) { x += (random() - 0.5) * 22; y -= 6 + random() * 12; ctx.lineTo(x, y); ctx.lineWidth *= 0.93; }
          ctx.stroke();
        }
      }
      const irisEnd = a.eyes === 'wood' ? 50 : 44, pupilEnd = a.eyes === 'wood' ? 24 : 19;
      ctx.fillStyle = '#1a1310';
      ctx.fillRect(0, 0, 512, irisEnd + 4);
      const g = ctx.createLinearGradient(0, pupilEnd, 0, irisEnd);
      g.addColorStop(0, bright);
      g.addColorStop(1, deep);
      ctx.fillStyle = g;
      ctx.fillRect(0, pupilEnd, 512, irisEnd - pupilEnd);
      if (a.eyes !== 'wood') {
        for (let i = 0; i < 90; i++) {
          ctx.strokeStyle = random() < 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.25)';
          ctx.lineWidth = 2 + random() * 3;
          const x = random() * 512;
          ctx.beginPath(); ctx.moveTo(x, pupilEnd); ctx.lineTo(x + (random() - 0.5) * 8, irisEnd); ctx.stroke();
        }
      }
      ctx.fillStyle = '#0b0908';
      ctx.fillRect(0, 0, 512, pupilEnd);
    });
    const eyeMat = new THREE.MeshStandardMaterial({ map: eyeMap, roughness: a.eyes === 'wood' ? 0.8 : a.eyes === 'glass' ? 0.06 : 0.16, emissive: '#ffffff', emissiveMap: eyeMap, emissiveIntensity: 0.1 });
    const eyes: THREE.Object3D[] = [];
    for (const side of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(side * spread, rest + r * (a.eyes === 'buns' ? 0.62 : 0.97), 0.008);
      if (a.eyes === 'buns') {
        const crust = s.material('#c98a3c', { roughness: 0.75 });
        const bun = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 14), crust);
        bun.scale.y = 0.66;
        const icing = new THREE.Mesh(new THREE.SphereGeometry(r * 0.74, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), new THREE.MeshStandardMaterial({ color: '#fbf7ee', roughness: 0.35 }));
        icing.scale.y = 0.72;
        icing.position.y = r * 0.2;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.3, r * 0.07, 6, 20), new THREE.MeshStandardMaterial({ color: bright, roughness: 0.4 }));
        ring.rotation.x = Math.PI / 2;
        ring.position.y = r * 0.665;
        const cherry = new THREE.Mesh(new THREE.SphereGeometry(r * 0.25, 12, 8), new THREE.MeshStandardMaterial({ color: '#3a0d14', roughness: 0.15 }));
        cherry.position.y = r * 0.68;
        eye.add(bun, icing, ring, cherry);
        // sugar crystals
        for (let k = 0; k < 14; k++) {
          const angle = random() * 6.283, d = r * (0.42 + random() * 0.25);
          const grain = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.003), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.3 }));
          grain.position.set(Math.cos(angle) * d, r * 0.6 - d * 0.35, Math.sin(angle) * d);
          eye.add(grain);
        }
      } else {
        const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 36, 24), eyeMat);
        eye.add(ball);
        if (a.eyes !== 'wood') {
          const cornea = new THREE.Mesh(new THREE.SphereGeometry(r * 0.52, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.4), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, roughness: 0.02, depthWrite: false }));
          cornea.position.y = r * 0.62;
          eye.add(cornea);
        }
      }
      const tilt = new THREE.Euler(0, 0, 0, 'YXZ');
      if (a.gaze === 'heaven') tilt.set(0.3 + (random() - 0.5) * 0.08, side * -0.25, 0);
      else if (a.gaze === 'viewer') tilt.set(0.95, side * -0.06 + 0.25, 0);
      else tilt.set(0.5 + random() * 0.5, side * (1.1 + random() * 0.6), 0);
      if (a.eyes === 'buns') { tilt.x *= 0.3; tilt.z = side * 0.08; }
      eye.rotation.copy(tilt);
      eye.traverse((node) => { node.castShadow = true; });
      s.root.add(eye);
      eyes.push(eye);
    }

    // Surroundings on the ground around the vessel.
    const ringR = (angle: number, pad: number): P3 => [Math.cos(angle) * (rimX + pad), 0, Math.sin(angle) * (rimZ + pad)];
    const footR = a.vessel === 'chalice' ? 0.075 : rimX;
    const flames: THREE.Mesh[] = [];
    if (a.surrounding === 'candles') {
      const count = 6 + Math.floor(mood.density * 5);
      const waxMat = new THREE.MeshStandardMaterial({ color: '#f1e6c8', roughness: 0.45, emissive: '#e8b060', emissiveIntensity: 0.3 });
      const flameMat = new THREE.MeshStandardMaterial({ color: '#ffe09a', emissive: '#ffae3a', emissiveIntensity: 2.4 });
      for (let i = 0; i < count; i++) {
        const angle = i / count * 6.283 + 0.3;
        const pad = a.vessel === 'chalice' ? 0.05 : 0.04;
        const [x, , z] = a.vessel === 'chalice' ? [Math.cos(angle) * (footR + pad), 0, Math.sin(angle) * (footR + pad)] : ringR(angle, pad);
        const h = 0.03 + random() * 0.06 * (1 - mood.wear * 0.5);
        s.cylinder(0.008, 0.009, h, [x, h / 2, z], waxMat, 10);
        s.cylinder(0.014, 0.016, 0.002, [x, 0.001, z], waxMat, 10);
        const flame = s.ball([0.005, 0.012, 0.005], [x, h + 0.013, z], flameMat, 8);
        flame.castShadow = false;
        flames.push(flame);
      }
    } else if (a.surrounding === 'flowers') {
      const petalColours = mood.cheer > 0.5 ? ['#f6f1e4', '#f2c84b', '#e9869a'] : ['#f6f1e4', '#b3202a', '#7b4b8f'];
      const petals: { at: P3; size: number; color: string }[] = [], hearts: { at: P3; size: number; color: string }[] = [], leaves: { at: P3; size: number }[] = [];
      const count = 14 + Math.floor(mood.density * 12);
      for (let i = 0; i < count; i++) {
        const angle = i / count * 6.283 + random() * 0.2;
        const pad = 0.03 + random() * 0.025;
        const c: P3 = a.vessel === 'chalice' ? [Math.cos(angle) * (footR + pad), 0, Math.sin(angle) * (footR + pad)] : ringR(angle, pad);
        const size = 0.011 + random() * 0.006, colour = petalColours[Math.floor(random() * petalColours.length)];
        for (let p = 0; p < 6; p++) petals.push({ at: [c[0] + Math.cos(p / 6 * 6.283) * size, 0.012 + random() * 0.004, c[2] + Math.sin(p / 6 * 6.283) * size], size: size * 0.75, color: colour });
        hearts.push({ at: [c[0], 0.017, c[2]], size: size * 0.55, color: '#e2a92f' });
        leaves.push({ at: [c[0] * 1.08 + (random() - 0.5) * 0.02, 0.005, c[2] * 1.08 + (random() - 0.5) * 0.02], size: 0.016 + random() * 0.008 });
      }
      const flat = new THREE.SphereGeometry(1, 8, 6);
      flat.scale(1, 0.45, 1);
      s.scatter(flat, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }), petals);
      s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }), hearts);
      const leaf = new THREE.SphereGeometry(1, 8, 6);
      leaf.scale(1, 0.2, 0.55);
      s.scatter(leaf, s.material('#4d7a3a', { roughness: 0.8 }), leaves);
    } else if (a.surrounding === 'blood') {
      const blood = new THREE.MeshStandardMaterial({ color: '#8c0d16', roughness: 0.12, emissive: '#4a0508', emissiveIntensity: 0.3 });
      for (const side of [-1, 1]) s.ball([r * 0.8, 0.003, r * 0.7], [side * spread, rest + 0.002, 0.012], blood, 14);
      for (let i = 0; i < 9; i++) {
        const angle = 0.3 + random() * 2.4, d = random() ** 0.6;
        const size = 0.004 + random() * 0.009;
        if (a.vessel === 'chalice') s.ball([size, 0.002, size], [Math.cos(angle) * (0.03 + d * 0.12), 0.002, Math.sin(angle) * (0.03 + d * 0.12)], blood, 10);
        else s.ball([size, 0.002, size * (0.7 + random() * 0.6)], [Math.cos(angle) * rimX * (0.45 + d * 0.5), rest + 0.004 + d * 0.016, Math.sin(angle) * rimZ * (0.45 + d * 0.5)], blood, 10);
      }
      // a trail leaving the vessel toward the viewer
      let x = rimX * 0.3, z = (a.vessel === 'chalice' ? footR : rimZ) + 0.012;
      for (let i = 0; i < 7; i++) {
        const size = 0.011 - i * 0.001 + random() * 0.004;
        s.ball([size, 0.002, size * 1.3], [x, 0.002, z], blood, 10);
        x += (random() - 0.4) * 0.025; z += 0.016 + random() * 0.014;
      }
      if (a.vessel === 'chalice') s.rod([0.06, 0.25, 0.062], [0.057, 0.16 + random() * 0.04, 0.05], 0.004, blood, 0.002);
    } else if (a.surrounding === 'coins') {
      const gold = s.material('#c9983a', { metalness: 0.45, roughness: 0.35 }), silver = s.material('#c5c9cc', { metalness: 0.45, roughness: 0.3 });
      const count = 7 + Math.floor(mood.density * 12);
      for (let i = 0; i < count; i++) {
        const angle = random() * 6.283, pad = 0.025 + random() * 0.05;
        const [x, , z] = a.vessel === 'chalice' ? [Math.cos(angle) * (footR + pad), 0, Math.sin(angle) * (footR + pad)] : ringR(angle, pad);
        const coin = s.cylinder(0.009 + random() * 0.004, 0.011, 0.0018, [x, 0.001 + (random() < 0.2 ? 0.002 : 0), z], random() < 0.6 ? gold : silver, 14);
        coin.rotation.y = random() * 3;
      }
    }

    const still = eyes.map((eye) => eye.rotation.clone());
    return s.finish({
      update: (_dt, time) => {
        flames.forEach((flame, i) => { flame.scale.y = 0.012 * (1 + Math.sin(time * (7 + mood.energy * 12) + i * 1.7) * 0.18 * (0.4 + mood.energy)); });
        // The slightest movement: the eyes drift as if following something.
        if (a.eyes !== 'buns') eyes.forEach((eye, i) => {
          eye.rotation.x = still[i].x + Math.sin(time * 0.6) * 0.06 * mood.energy;
          eye.rotation.y = still[i].y + Math.sin(time * 0.43 + 1) * 0.12 * mood.energy;
        });
      },
    });
  },
});
// v2
