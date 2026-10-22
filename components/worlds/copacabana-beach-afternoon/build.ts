import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
const paint = (w: number, h: number, draw: (c: Ctx) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const PARASOLS = {
  rainbow: [['#d8322c', '#f6f1e4'], ['#2b6fb8', '#f6f1e4'], ['#f2c21c', '#f6f1e4'], ['#2e8b57', '#f6f1e4'], ['#f07a1c', '#f6f1e4']],
  yellow: [['#f2c21c', '#f6f1e4'], ['#f2c21c', '#f6f1e4'], ['#f0b020', '#fbf3dc']],
  blue: [['#2b6fb8', '#f6f1e4'], ['#1f5fa8', '#f6f1e4'], ['#4a8fd0', '#f6f1e4']],
  rental: [['#2e8b57', '#f6f1e4'], ['#3a9a62', '#f6f1e4']],
  furled: [['#9c968a', '#b9b2a4']],
} as const;

export default defineWorld({
  questions: {
    tide: choice('What is the sea doing?', {
      low: 'Low tide: a wide band of wet, mirror-flat sand before the water.',
      mid: 'Half tide, a steady line of small surf.',
      high: 'High tide: the foam runs right up to the parasols.',
      rough: 'A rough sea: big white surf, a churned brown edge, a red flag planted.',
    }),
    parasols: choice('What are the parasols like?', {
      rainbow: 'Striped parasols in every colour, scattered all over the sand.',
      yellow: 'Matching yellow-and-white parasols in tidy rows, one vendor’s pitch.',
      blue: 'Blue-and-white parasols, crisp and nautical.',
      rental: 'Faded green rental parasols, most of them leaning.',
      furled: 'Parasols furled and tied: the day is ending or never began.',
    }),
    backdrop: choice('What stands behind the promenade?', {
      blocks: 'A long wall of white apartment blocks with balconies.',
      hotel: 'The blocks with one grand old hotel, cream with a copper roof, in the middle.',
      hills: 'The blocks with a bare rounded granite peak rising beyond the far end.',
      low: 'No blocks: only kiosks, palms and open sky, the beach seen the other way.',
    }),
    kiosk: choice('What does the kiosk on the promenade sell?', {
      coco: 'Green coconuts with straws: ÁGUA DE COCO.',
      caipirinha: 'Limes and ice: CAIPIRINHA.',
      acai: 'Purple bowls: AÇAÍ.',
      closed: 'Closed, the shutter down and a chair chained to the post.',
      none: 'No kiosk at all.',
    }),
    dressing: choice('What is strewn across the sand?', {
      towels: 'Towels, sarongs and bags wherever people dropped them.',
      football: 'A football pitch marked out with two small goals and a scuffed centre line.',
      castles: 'A row of sandcastles and moats left by a day of children.',
      storm: 'The morning’s storm line: seaweed, bottles and driftwood in a tangled ribbon.',
      empty: 'Nothing but raked sand and footprints: early, or closed.',
    }),
    palms: choice('What trees stand on the sand?', {
      leaning: 'A few coconut palms leaning out toward the sea.',
      tall: 'Tall straight royal palms along the promenade.',
      almond: 'Round-crowned beach almond trees giving real shade.',
      none: 'No trees, just sky.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const W = 16, D = 13;
    const heroZ = 3.0;
    const wl = heroZ + { low: 1.9, mid: 1.0, high: 0.35, rough: 0.55 }[a.tide];
    const promZ = -3.9;
    const sky = new THREE.Color('#d7e9f3').lerp(new THREE.Color('#f2e3cc'), mood.warmth * 0.55).lerp(new THREE.Color('#cfd3d2'), (1 - mood.cheer) * 0.3);
    const { art: s, world } = diorama(context, {
      background: `#${sky.getHexString()}`, floor: null, width: W, depth: D, pitch: 30, yaw: 24, maxHeight: 3.2, radius: 1.5,
      slots: [[0, heroZ], [-3.9, 1.3], [4.3, 0.5], [-2.1, -1.6], [2.7, -2.2], [0.9, -0.3, 0, 0.9], [-5.6, 3.2, 0, 0.85]],
    });
    const slots: [number, number][] = [[0, heroZ], [-3.9, 1.3], [4.3, 0.5], [-2.1, -1.6], [2.7, -2.2], [0.9, -0.3], [-5.6, 3.2]];
    const clear = (x: number, z: number, gap = 1.5) => slots.every(([sx, sz]) => Math.hypot(sx - x, sz - z) > gap);
    const dirty = mood.wear;
    const crowd = mood.density;

    // Sand: a painted plane with speckle, trails of footprints everywhere and a wet, darker band by the water.
    const sandMap = paint(1024, 1024, (c) => {
      c.fillStyle = '#ead9ad'; c.fillRect(0, 0, 1024, 1024);
      for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '120,100,60' : '255,250,230'},${0.06 + random() * 0.14})`; c.fillRect(random() * 1024, random() * 1024, 1 + random() * 2, 1 + random() * 2); }
      const toV = (z: number) => ((z + D / 2) / D) * 1024;
      const sandTop = toV(promZ), wetTop = toV(wl - 0.35);
      const trails = Math.round(28 + crowd * 40);
      for (let t = 0; t < trails; t++) {
        let x = random() * 1024, y = sandTop + random() * (wetTop - sandTop);
        let heading = random() * Math.PI * 2;
        const steps = 14 + Math.floor(random() * 30);
        for (let i = 0; i < steps; i++) {
          heading += (random() - 0.5) * 0.5;
          x += Math.cos(heading) * 20; y += Math.sin(heading) * 20;
          if (x < 0 || x > 1024 || y < sandTop || y > wetTop + 40) break;
          const side = i % 2 ? 5 : -5;
          c.save(); c.translate(x + Math.cos(heading + Math.PI / 2) * side, y + Math.sin(heading + Math.PI / 2) * side); c.rotate(heading);
          c.fillStyle = `rgba(105,85,50,${0.22 + random() * 0.18})`; c.beginPath(); c.ellipse(0, 0, 7, 4, 0, 0, 7); c.fill(); c.restore();
        }
      }
      for (let i = 0; i < Math.round(dirty * 50); i++) { c.fillStyle = `rgba(90,80,60,${0.08 + random() * 0.14})`; c.beginPath(); c.ellipse(random() * 1024, sandTop + random() * (wetTop - sandTop), 6 + random() * 24, 4 + random() * 10, random() * 3, 0, 7); c.fill(); }
      // The wet band darkens toward the water.
      const wet = c.createLinearGradient(0, wetTop, 0, 1024);
      wet.addColorStop(0, 'rgba(150,120,70,0)'); wet.addColorStop(0.25, 'rgba(150,120,70,0.45)'); wet.addColorStop(1, 'rgba(120,95,55,0.6)');
      c.fillStyle = wet; c.fillRect(0, wetTop, 1024, 1024 - wetTop);
    });
    const ground = s.mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: sandMap, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.castShadow = false;
    world.ground = ground;
    s.box([W, 0.3, D], [0, -0.16, 0], s.material('#d9c69a')).castShadow = false;

    // Sea: a ripple-painted plane, a foam edge that runs in and out, a brown churned line when rough.
    const rough = a.tide === 'rough';
    const seaColour = rough ? '#4f8f9c' : '#48b2c9';
    const seaMap = paint(512, 256, (c) => {
      c.fillStyle = seaColour; c.fillRect(0, 0, 512, 256);
      const deep = c.createLinearGradient(0, 0, 0, 256);
      deep.addColorStop(0, 'rgba(20,80,130,0.5)'); deep.addColorStop(1, rough ? 'rgba(170,150,110,0.35)' : 'rgba(255,255,255,0.12)');
      c.fillStyle = deep; c.fillRect(0, 0, 512, 256);
      c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = rough ? 3 : 1.6;
      for (let i = 0; i < (rough ? 90 : 50); i++) {
        const x = random() * 512, y = random() * 256, r = 10 + random() * 30;
        c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + r, y - r * 0.4, x + r * 1.5, y + r * 0.4, x + r * 2.2, y + (random() - 0.5) * r * 0.5); c.stroke();
      }
      if (rough) for (let i = 0; i < 30; i++) { c.fillStyle = `rgba(255,255,255,${0.3 + random() * 0.4})`; c.beginPath(); c.ellipse(random() * 512, 60 + random() * 160, 20 + random() * 40, 4 + random() * 6, 0, 0, 7); c.fill(); }
    });
    const seaDepth = D / 2 - wl + 0.6;
    const sea = s.mesh(new THREE.PlaneGeometry(W, seaDepth), new THREE.MeshStandardMaterial({ map: seaMap, roughness: rough ? 0.5 : 0.12, metalness: 0.05, emissive: '#2a8fa8', emissiveIntensity: mix(0.05, 0.2, mood.cheer) }), [0, 0.012, wl + seaDepth / 2 - 0.6]);
    sea.rotation.x = -Math.PI / 2;
    sea.castShadow = false;
    const foamMap = paint(1024, 128, (c) => {
      c.clearRect(0, 0, 1024, 128);
      for (let x = 0; x < 1024; x += 6) {
        const edge = 50 + Math.sin(x * 0.02) * 16 + Math.sin(x * 0.071) * 8;
        for (let k = 0; k < 4; k++) { c.fillStyle = `rgba(255,255,255,${0.9 - k * 0.2})`; c.beginPath(); c.arc(x + random() * 6, edge + k * 14 + random() * 8, 6 + random() * 8 + k * 2, 0, 7); c.fill(); }
        c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x, edge + 60, 6, 70);
      }
    });
    const foamSize = rough ? 1.8 : a.tide === 'low' ? 0.8 : 1.1;
    const foam = s.mesh(new THREE.PlaneGeometry(W, foamSize), new THREE.MeshStandardMaterial({ map: foamMap, transparent: true, depthWrite: false, roughness: 0.6, emissive: '#ffffff', emissiveIntensity: 0.15 }), [0, 0.02, wl + 0.1]);
    foam.rotation.x = -Math.PI / 2;
    foam.castShadow = foam.receiveShadow = false;
    if (rough) {
      s.rod([5.2, 0, wl - 1.3], [5.25, 1.7, wl - 1.3], 0.03, s.material('#f4f1e8'));
      s.box([0.6, 0.4, 0.02], [5.55, 1.5, wl - 1.3], s.material('#d42620', { side: THREE.DoubleSide }));
    }

    // The promenade: Burle Marx waves in black and white portuguese stone, a kerb down to the sand.
    const waveMap = paint(1024, 128, (c) => {
      c.fillStyle = '#efe9dc'; c.fillRect(0, 0, 1024, 128);
      c.fillStyle = '#1e1f22';
      for (let band = 0; band < 3; band++) {
        const base = 12 + band * 42;
        c.beginPath(); c.moveTo(0, base);
        for (let x = 0; x <= 1024; x += 8) c.lineTo(x, base + Math.sin(x / 70 + band) * 13);
        for (let x = 1024; x >= 0; x -= 8) c.lineTo(x, base + 22 + Math.sin(x / 70 + band + 0.5) * 13);
        c.closePath(); c.fill();
      }
      for (let i = 0; i < 600; i++) { c.fillStyle = `rgba(0,0,0,${0.04 + random() * 0.06})`; c.fillRect(random() * 1024, random() * 128, 3, 3); }
    });
    waveMap.wrapS = THREE.RepeatWrapping; waveMap.repeat.x = 3;
    const promDepth = 1.5, promH = 0.26;
    s.box([W, promH, promDepth], [0, promH / 2, promZ - promDepth / 2], s.material('#d9d2c2')).castShadow = false;
    const prom = s.mesh(new THREE.PlaneGeometry(W, promDepth), new THREE.MeshStandardMaterial({ map: waveMap, roughness: 0.75 }), [0, promH + 0.002, promZ - promDepth / 2]);
    prom.rotation.x = -Math.PI / 2;
    prom.castShadow = false;
    s.box([W, 0.06, 0.1], [0, promH + 0.03, promZ - 0.05], s.material('#c9c2b2'));
    // Lamp posts and a bench along the kerb.
    const iron = s.material('#3a3d42', { metalness: 0.4, roughness: 0.6 });
    for (const x of [-6.5, -2.2, 2.2, 6.5]) {
      s.rod([x, promH, promZ - 0.3], [x, promH + 2.6, promZ - 0.3], 0.035, iron);
      s.ball([0.12, 0.16, 0.12], [x, promH + 2.72, promZ - 0.3], new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: '#ffe2a8', emissiveIntensity: mix(0.1, 1.2, Math.abs(mood.daylight - 0.5) * 2) }), 10).castShadow = false;
    }
    for (const x of [-4.4, 4.4]) {
      s.box([1.4, 0.05, 0.4], [x, promH + 0.45, promZ - 0.6], s.material('#9a7a4e'));
      s.box([1.4, 0.35, 0.05], [x, promH + 0.68, promZ - 0.8], s.material('#9a7a4e'));
      for (const sx of [-0.6, 0.6]) s.box([0.06, 0.45, 0.4], [x + sx, promH + 0.22, promZ - 0.6], iron);
    }

    // The backdrop: apartment blocks with balconies, a hotel, a granite peak.
    const backZ = promZ - promDepth - 0.9;
    const windowMap = (tone: string) => paint(256, 512, (c) => {
      c.fillStyle = tone; c.fillRect(0, 0, 256, 512);
      for (let row = 0; row < 12; row++) {
        const y = 22 + row * 40;
        for (let col = 0; col < 5; col++) {
          const x = 14 + col * 48;
          c.fillStyle = random() < 0.15 ? '#f6e9b8' : '#3b4c5c'; c.fillRect(x, y, 34, 22);
          c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x + 2, y + 2, 12, 8);
        }
        c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(0, y + 24, 256, 5);
        c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(0, y + 29, 256, 3);
      }
      for (let i = 0; i < Math.round(dirty * 30); i++) { c.fillStyle = `rgba(60,50,40,${0.08 + random() * 0.15})`; c.fillRect(random() * 256, random() * 512, 3 + random() * 5, 20 + random() * 80); }
    });
    const facades = [windowMap('#f4f0e6'), windowMap('#ece4d2'), windowMap('#f7f3ec')];
    const block = (x: number, w: number, h: number, depth: number, tone: number) => {
      const map = facades[tone].clone();
      map.repeat.set(w / 2.2, h / 4.6); map.wrapS = map.wrapT = THREE.RepeatWrapping; map.needsUpdate = true;
      const wall = new THREE.MeshStandardMaterial({ color: ['#f4f0e6', '#ece4d2', '#f7f3ec'][tone], roughness: 0.85 });
      const front = new THREE.MeshStandardMaterial({ map, roughness: 0.8 });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), [wall, wall, wall, wall, front, wall]);
      mesh.position.set(x, h / 2, backZ - depth / 2);
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
      s.box([w + 0.1, 0.08, depth + 0.1], [x, h + 0.04, backZ - depth / 2], s.material('#cfc8b8'));
      return mesh;
    };
    if (a.backdrop !== 'low') {
      let x = -W / 2 - 0.3;
      let index = 0;
      let hotelDone = false;
      while (x < W / 2 + 0.5) {
        const w = 1.5 + random() * 1.3;
        const centre = x + w / 2;
        if (a.backdrop === 'hotel' && !hotelDone && x + w > -1.75) {
          hotelDone = true;
          // The grand hotel: cream, a copper mansard roof, a canopy over the door and flags.
          const hw = 3.2, hh = 3.4;
          const hotel = block(0, hw, hh, 2.2, 1);
          (hotel.material as THREE.Material[])[4] = new THREE.MeshStandardMaterial({ map: facades[1], roughness: 0.8 });
          const copper = s.material('#4f8a78', { metalness: 0.3, roughness: 0.5 });
          const roof = s.mesh(new THREE.CylinderGeometry(0.2, hw * 0.72, 0.9, 4), copper, [0, hh + 0.5, backZ - 1.1]);
          roof.rotation.y = Math.PI / 4;
          roof.scale.z = 0.7;
          s.box([1.4, 0.06, 0.8], [0, 1.0, backZ + 0.4], copper);
          for (const sx of [-0.6, 0.6]) s.rod([sx, 0.26, backZ + 0.75], [sx, 1.0, backZ + 0.75], 0.03, iron);
          for (const sx of [-1.1, 0, 1.1]) { s.rod([sx, hh, backZ + 0.1], [sx, hh + 1.1, backZ + 0.1], 0.02, iron); s.box([0.4, 0.25, 0.01], [sx + 0.21, hh + 0.95, backZ + 0.1], s.material(['#d42620', '#f2c21c', '#2b6fb8'][index % 3], { side: THREE.DoubleSide })); }
          x = hw / 2 + 0.25;
          index++;
          continue;
        }
        block(centre, w, 3.0 + random() * 1.8 + (a.backdrop === 'hills' && centre > 0 ? centre * 0.05 : 0), 1.6 + random() * 0.6, index % 3);
        x += w + 0.22;
        index++;
      }
      if (a.backdrop === 'hills') {
        const granite = s.material('#6d7a6a', { roughness: 0.95 });
        const peak = s.lathe([[0, 0], [1.6, 0], [1.5, 1.2], [1.2, 3.2], [0.8, 5.6], [0.35, 7.2], [0, 7.6]], granite, [W / 2 + 0.4, 0, backZ - 3.2]);
        peak.scale.set(1.3, 1, 1);
        s.lathe([[0, 0], [3.2, 0], [2.8, 1.4], [1.8, 3.4], [0.6, 4.6], [0, 4.8]], s.material('#5b6f5c', { roughness: 0.95 }), [W / 2 - 3.5, 0, backZ - 4.2]).scale.set(1.6, 1, 0.8);
      }
    } else {
      // Open sky instead: a low wall, palms and the promenade kiosks only.
      s.box([W, 0.9, 0.3], [0, promH + 0.45, backZ + 0.5], s.material('#e9e2d2'));
      for (let i = -7; i <= 7; i += 2) s.box([0.12, 1.1, 0.34], [i, promH + 0.55, backZ + 0.5], s.material('#d9d2c2'));
    }

    // The kiosk on the promenade.
    if (a.kiosk !== 'none') {
      const kx = 5.4, kz = promZ - 0.95, kw = 1.9, kd = 1.3, kh = 2.2;
      const closed = a.kiosk === 'closed';
      const body = s.material(closed ? '#b9b2a4' : ['#f4f1e8', '#f7e6b8', '#dfeee8'][Math.floor(random() * 3)], { roughness: 0.8 });
      s.box([kw, kh, kd], [kx, promH + kh / 2, kz], body);
      s.box([kw + 0.3, 0.12, kd + 0.3], [kx, promH + kh + 0.05, kz], s.material('#c9343a'));
      if (!closed) {
        s.box([kw - 0.3, 0.9, 0.1], [kx, promH + 1.3, kz + kd / 2], s.material('#2a2f36'));
        s.box([kw - 0.2, 0.08, 0.5], [kx, promH + 0.9, kz + kd / 2 + 0.2], s.material('#9a7a4e'));
        const awningMap = paint(128, 32, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f6f1e4' : '#c9343a'; c.fillRect(i * 16, 0, 16, 32); } });
        awningMap.wrapS = THREE.RepeatWrapping; awningMap.repeat.x = 2;
        const awning = s.mesh(new THREE.PlaneGeometry(kw + 0.2, 0.9), new THREE.MeshStandardMaterial({ map: awningMap, side: THREE.DoubleSide, roughness: 0.9 }), [kx, promH + kh - 0.1, kz + kd / 2 + 0.42]);
        awning.rotation.x = -Math.PI / 2 + 0.35;
        const text = { coco: 'ÁGUA DE COCO', caipirinha: 'CAIPIRINHA', acai: 'AÇAÍ' }[a.kiosk as 'coco'];
        s.label(text, kw - 0.2, 0.32, [kx, promH + kh - 0.25, kz + kd / 2 + 0.006], '#1f3d7a', '#f7f2e4');
        const goods = { coco: '#5aa04a', caipirinha: '#9bd14a', acai: '#5b2a6b' }[a.kiosk as 'coco'];
        s.scatter(new THREE.SphereGeometry(1, 10, 8), s.material(goods, { roughness: 0.6 }), Array.from({ length: 8 }, (_u, i) => ({ at: [kx - 0.6 + (i % 4) * 0.3 + (random() - 0.5) * 0.05, promH + 1.02 + Math.floor(i / 4) * 0.14, kz + kd / 2 + 0.2 + (random() - 0.5) * 0.1] as const, size: a.kiosk === 'caipirinha' ? 0.06 : 0.1 })));
        s.box([0.5, 0.5, 0.4], [kx + kw / 2 + 0.45, promH + 0.25, kz + 0.2], s.material('#2d6fb6', { roughness: 0.45 }));
      } else {
        s.box([kw - 0.3, 0.95, 0.04], [kx, promH + 1.3, kz + kd / 2 + 0.02], s.material('#8a8f94', { metalness: 0.5, roughness: 0.5 }));
        for (let i = 0; i < 8; i++) s.box([kw - 0.3, 0.015, 0.05], [kx, promH + 0.85 + i * 0.12, kz + kd / 2 + 0.045], s.material('#5a5f64'));
        s.label('FECHADO', 0.7, 0.2, [kx, promH + 1.3, kz + kd / 2 + 0.05], '#f7f2e4', '#8a3a3a');
      }
    }

    // Parasols: a striped cone on a pole, leaning a little more as the day and the wear go on.
    const parasolSpots: [number, number][] = [];
    const wanted = a.parasols === 'yellow' ? Math.round(8 + crowd * 10) : Math.round(4 + crowd * 9);
    const grid: [number, number][] = [];
    for (let row = 0; row < 3; row++) for (let col = 0; col < 7; col++) grid.push([-7.2 + col * 2.4 + (random() - 0.5) * 0.3, -2.6 + row * 2.1 + (random() - 0.5) * 0.3]);
    for (let tries = 0; tries < 200 && parasolSpots.length < wanted; tries++) {
      const [x, z] = a.parasols === 'yellow' ? (grid[tries] ?? [99, 99]) : [(random() - 0.5) * (W - 1.5), mix(promZ + 0.9, wl - 1.4, random())];
      if (!clear(x, z, 1.7) || parasolSpots.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.9) || z > wl - 1.2) continue;
      parasolSpots.push([x, z]);
    }
    const furled = a.parasols === 'furled';
    const schemes = PARASOLS[a.parasols];
    const cloths = schemes.map(([p, q]) => {
      const map = paint(256, 16, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? q : p; c.fillRect(i * 32, 0, 32, 16); } });
      const cloth = new THREE.MeshStandardMaterial({ map, roughness: 0.85, side: THREE.DoubleSide });
      cloth.color.lerp(new THREE.Color('#9c968a'), dirty * 0.4 + (a.parasols === 'rental' ? 0.2 : 0));
      return cloth;
    });
    const poleMaterial = s.material('#e9e4d4');
    const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.022, 0.022, 2.2, 8), poleMaterial, Math.max(1, parasolSpots.length));
    poles.castShadow = true;
    poles.count = parasolSpots.length;
    s.root.add(poles);
    const canopies: THREE.Mesh[] = [];
    parasolSpots.forEach(([x, z], i) => {
      const lean = (random() - 0.5) * 0.25 * (a.parasols === 'rental' ? 2 : 1) + (random() - 0.5) * dirty * 0.2;
      const matrix = new THREE.Matrix4().makeRotationZ(lean).setPosition(x, 1.1, z);
      poles.setMatrixAt(i, matrix);
      const canopy = new THREE.Mesh(furled ? new THREE.ConeGeometry(0.1, 1.2, 8, 1, true) : new THREE.ConeGeometry(0.95, 0.38, 10, 1, true), cloths[i % cloths.length]);
      canopy.position.set(x - Math.sin(lean) * (furled ? 1.5 : 1.95), furled ? 1.5 : 1.95, z);
      canopy.rotation.z = lean;
      canopy.castShadow = true;
      s.root.add(canopy);
      canopies.push(canopy);
    });
    poles.instanceMatrix.needsUpdate = true;

    // Palms: curved trunks, a crown of frond planes, a few coconuts.
    const frondMap = paint(256, 64, (c) => {
      c.clearRect(0, 0, 256, 64);
      c.fillStyle = '#3f8a3c';
      c.beginPath(); c.moveTo(0, 32);
      for (let x = 0; x <= 256; x += 8) c.lineTo(x, 32 - (x < 60 ? x * 0.25 : 15 + (random() - 0.5) * 10) * (1 - x / 300));
      for (let x = 256; x >= 0; x -= 8) c.lineTo(x, 32 + (x < 60 ? x * 0.25 : 15 + (random() - 0.5) * 10) * (1 - x / 300));
      c.closePath(); c.fill();
      c.fillStyle = '#2f6b2e'; c.fillRect(0, 30, 256, 4);
    });
    const frondMaterial = new THREE.MeshStandardMaterial({ map: frondMap, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 });
    const palmSpots: [number, number][] = a.palms === 'none' ? [] : a.palms === 'tall' ? [[-6.8, promZ + 1.2], [-2.6, promZ + 1.0], [1.6, promZ + 1.1], [6.4, promZ + 1.4]] : [[-6.6, promZ + 1.6], [-1.2, promZ + 0.9], [6.9, promZ + 2.2]];
    const frondGeometry = new THREE.PlaneGeometry(1.9, 0.45);
    frondGeometry.translate(0.95, 0, 0);
    const fronds = new THREE.InstancedMesh(frondGeometry, frondMaterial, Math.max(1, palmSpots.length * 9));
    fronds.castShadow = true;
    let frond = 0;
    const trunkMaterial = s.material('#8d7250', { roughness: 0.95 });
    const crowns: THREE.Object3D[] = [];
    for (const [px, pz] of palmSpots) {
      if (a.palms === 'almond') {
        const h = 2.6 + random() * 0.8;
        s.rod([px, 0, pz], [px + 0.1, h, pz], 0.1, trunkMaterial, 0.14);
        const leaf = s.material('#4f8f3e', { roughness: 0.9 });
        for (let i = 0; i < 3; i++) {
          const spread = 1.6 - i * 0.35;
          const crown = s.ball([spread, 0.35, spread], [px + (random() - 0.5) * 0.4, h - 0.4 + i * 0.55, pz + (random() - 0.5) * 0.4], leaf, 10);
          crowns.push(crown);
        }
        continue;
      }
      const tall = a.palms === 'tall';
      const h = tall ? 5.2 + random() * 1.2 : 3.2 + random() * 1.0;
      const leanX = tall ? (random() - 0.5) * 0.3 : (random() - 0.5) * 0.8;
      const leanZ = tall ? 0.1 : 0.9 + random() * 0.6;
      const top: [number, number, number] = [px + leanX, h, pz + leanZ];
      s.tube([[px, -0.1, pz], [px + leanX * 0.3, h * 0.45, pz + leanZ * 0.25], top], tall ? 0.13 : 0.11, trunkMaterial);
      const crown = new THREE.Group();
      crown.position.set(...top);
      s.root.add(crown);
      crowns.push(crown);
      for (let i = 0; i < 9; i++) {
        const angle = (i / 9) * Math.PI * 2 + random() * 0.4;
        const droop = -0.35 - random() * 0.5;
        const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(random() * 0.6 - 0.3, angle, droop, 'YXZ')).setPosition(top[0], top[1], top[2]);
        fronds.setMatrixAt(frond++, m);
      }
      s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#5aa04a'), Array.from({ length: 4 }, () => ({ at: [top[0] + (random() - 0.5) * 0.3, top[1] - 0.2, top[2] + (random() - 0.5) * 0.3] as const, size: 0.11 })));
    }
    fronds.count = frond;
    fronds.instanceMatrix.needsUpdate = true;
    if (frond) s.root.add(fronds);

    // What the day has left on the sand.
    if (a.dressing === 'towels' || (a.dressing === 'empty' && crowd > 0.85)) {
      const towelGeometry = new THREE.PlaneGeometry(1, 1);
      towelGeometry.rotateX(-Math.PI / 2);
      const count = Math.round(6 + crowd * 22);
      const towels = new THREE.InstancedMesh(towelGeometry, new THREE.MeshStandardMaterial({ roughness: 0.95 }), count);
      const tones = ['#d8322c', '#2b6fb8', '#f2c21c', '#f4f1e8', '#2e8b57', '#ee6fa0', '#1d1d1f', '#f07a1c'];
      let placed = 0;
      for (let tries = 0; tries < 400 && placed < count; tries++) {
        const x = (random() - 0.5) * (W - 1.2), z = mix(promZ + 0.6, wl - 1.0, random());
        if (!clear(x, z, 1.3) || parasolSpots.some(([px, pz]) => Math.hypot(px - x, pz - z) < 0.6)) continue;
        const m = new THREE.Matrix4().makeRotationY(random() * Math.PI).setPosition(x, 0.006, z);
        m.scale(new THREE.Vector3(0.7 + random() * 0.3, 1, 1.4 + random() * 0.4));
        towels.setMatrixAt(placed, m);
        towels.setColorAt(placed, new THREE.Color(tones[Math.floor(random() * tones.length)]).lerp(new THREE.Color('#b9b2a4'), dirty * 0.35));
        placed++;
      }
      towels.count = placed;
      towels.instanceMatrix.needsUpdate = true;
      if (towels.instanceColor) towels.instanceColor.needsUpdate = true;
      towels.receiveShadow = true;
      s.root.add(towels);
      s.scatter(new THREE.BoxGeometry(1, 1, 1), s.material('#c9b27e', { roughness: 0.95 }), Array.from({ length: Math.round(placed * 0.5) }, () => ({ at: [(random() - 0.5) * (W - 2), 0.1, mix(promZ + 0.8, wl - 1.2, random())] as const, size: 0.22 + random() * 0.1 })));
    } else if (a.dressing === 'football') {
      const chalk = s.material('#c8b07c', { roughness: 1 });
      const px = 2.2, pz = 0.2;
      s.box([0.05, 0.012, 6], [px, 0.003, pz], chalk);
      for (const gx of [px - 4.2, px + 4.2]) {
        if (!clear(gx, pz, 0.8)) continue;
        for (const dz of [-0.9, 0.9]) s.rod([gx, 0, pz + dz], [gx, 1.1, pz + dz], 0.03, s.material('#f4f1e8'));
        s.rod([gx, 1.1, pz - 0.9], [gx, 1.1, pz + 0.9], 0.03, s.material('#f4f1e8'));
      }
      s.ball([0.11, 0.11, 0.11], [px + 0.7, 0.11, pz + 1.4], s.material('#f4f1e8'), 10);
    } else if (a.dressing === 'castles') {
      const castleSand = s.material('#d9c28e', { roughness: 1 });
      let built = 0;
      for (let tries = 0; tries < 60 && built < 5; tries++) {
        const x = (random() - 0.5) * (W - 3), z = mix(0.2, wl - 1.4, random());
        if (!clear(x, z, 1.4)) continue;
        s.ball([0.45, 0.14, 0.45], [x, 0, z], castleSand, 12);
        for (let i = 0; i < 3; i++) { const t = i * 2.1; s.cylinder(0.09, 0.11, 0.22, [x + Math.sin(t) * 0.22, 0.2, z + Math.cos(t) * 0.22], castleSand, 10); }
        s.ring(0.62, 0.04, [x, 0, z], s.material('#bfa06c', { roughness: 1 })).rotation.x = Math.PI / 2;
        built++;
      }
    } else if (a.dressing === 'storm') {
      const lineZ = wl - 1.1;
      s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material('#3f5a30', { roughness: 1 }), Array.from({ length: 160 }, () => ({ at: [(random() - 0.5) * W, 0.02, lineZ + (random() - 0.5) * 0.7 + Math.sin(random() * 6) * 0.2] as const, size: 0.06 + random() * 0.1 }))).scale.y = 0.4;
      s.scatter(new THREE.CylinderGeometry(1, 1, 3, 8), s.material('#8fc4c0', { roughness: 0.3, transparent: true, opacity: 0.8 }), Array.from({ length: 14 }, () => ({ at: [(random() - 0.5) * W, 0.04, lineZ + (random() - 0.5) * 0.8] as const, size: 0.04 }))).rotation.z = Math.PI / 2;
      for (let i = 0; i < 4; i++) s.rod([(random() - 0.5) * W, 0.05, lineZ + (random() - 0.5) * 0.6], [(random() - 0.5) * W, 0.08, lineZ + (random() - 0.5) * 0.6], 0.05, s.material('#9a8a70', { roughness: 1 }), 0.03);
    } else {
      // Raked sand: faint parallel lines.
      for (let i = 0; i < 9; i++) s.box([W - 2, 0.004, 0.02], [0, 0.002, promZ + 1.2 + i * 0.5], s.material('#dcc89a')).castShadow = false;
    }

    // A few bits that belong to everyone: a bin, a shower post, a beach-chair stack by the kiosk.
    s.cylinder(0.25, 0.22, 0.8, [-7.0, 0.4, promZ + 0.5], s.material('#2f74c0', { roughness: 0.6 }), 12);
    s.rod([-4.9, 0, promZ + 0.5], [-4.9, 2.4, promZ + 0.5], 0.04, iron);
    s.box([0.35, 0.06, 0.25], [-4.9, 2.4, promZ + 0.6], iron);

    const energy = mood.energy;
    const foamBase = foam.position.z;
    return {
      ...world,
      update(_dt: number, time: number) {
        foam.position.z = foamBase + Math.sin(time * mix(0.4, 1.2, energy)) * mix(0.08, 0.35, energy) * (rough ? 1.6 : 1);
        (foam.material as THREE.MeshStandardMaterial).opacity = 0.75 + Math.sin(time * 0.9) * 0.15;
        for (const [i, canopy] of canopies.entries()) canopy.rotation.z = (canopy.userData.lean ??= canopy.rotation.z) + Math.sin(time * 1.1 + i) * 0.015 * energy;
        for (const [i, crown] of crowns.entries()) crown.rotation.z = Math.sin(time * 0.8 + i) * 0.03 * energy;
      },
    };
  },
});
