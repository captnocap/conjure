import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
const canvasTexture = (size: number, draw: (ctx: Ctx, w: number, h: number) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d')!, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const COLOURS = {
  white: { body: '#ece9e0', grille: '#d9d6cc', blade: '#d8d2c0', metal: false },
  avocado: { body: '#7f8c3c', grille: '#6b7a30', blade: '#c9c38a', metal: false },
  steel: { body: '#9aa0a3', grille: '#c5c9cb', blade: '#8b9093', metal: true },
  gold: { body: '#c99a3a', grille: '#b2872f', blade: '#e4d7a4', metal: false },
  black: { body: '#2a2b2d', grille: '#3c3e41', blade: '#4a4b4e', metal: false },
  brown: { body: '#6b4a32', grille: '#8a6a4a', blade: '#c9b08a', metal: false },
} as const;

export default defineThing({
  questions: {
    colour: choice('What colour is the fan?', {
      white: 'Plain white plastic, yellowed a little with age.',
      avocado: 'Avocado green plastic with a cream grille, straight out of 1974.',
      steel: 'Grey painted steel with a chromed wire grille, a heavy old shop fan.',
      gold: 'Harvest gold plastic, the colour of a 1970s kitchen.',
      black: 'Black plastic, cheap and modern.',
      brown: 'Chocolate brown with a tan grille, from a wood-panelled den.',
    }),
    size: choice('How big is it?', {
      desk: 'A small 9-inch box fan for a desk or a windowsill.',
      standard: 'The standard 20-inch box fan, the one everybody owns.',
      shop: 'A huge 30-inch industrial fan on folding legs.',
    }),
    speed: score('What speed is the dial set to?', ['Off, the dial at 0', 'Low', 'Medium', 'High, roaring']),
    aim: choice('Where is it aimed?', {
      ahead: 'Straight ahead across the floor.',
      up: 'Tipped back on its feet, blowing at the ceiling.',
      left: 'Turned to blow off to its left.',
      right: 'Turned to blow off to its right.',
    }),
    state: choice('What state is it in?', {
      running: 'Plugged in and humming, cord trailing away across the floor.',
      unplugged: 'Unplugged and silent, the cord wound round its feet.',
      'knocked-over': 'Knocked flat on its back, blades pointing at the ceiling.',
      taped: 'Held together with duct tape at the corners, grille cracked, still going.',
    }),
    ribbon: noul('Is there a ribbon or strip of tape tied to the grille, streaming in the air?'),
    cordSide: choice('If the cord trails away, which way does it go?', {
      left: 'Off to the left, toward a socket.',
      right: 'Off to the right.',
      back: 'Straight behind it, out of sight.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * random();
    const palette = COLOURS[a.colour];
    const W = { desk: 0.26, standard: 0.53, shop: 0.8 }[a.size];
    const D = W * 0.2;
    const running = a.state !== 'unplugged' && a.speed > 0.05;
    const shop = a.size === 'shop';

    const body = s.material(palette.body, palette.metal ? { metalness: 0.55, roughness: 0.45 } : { roughness: 0.55 });
    const dark = s.material('#26272a', { roughness: 0.6 });
    const bladeMat = s.material(palette.blade, { roughness: 0.5, side: THREE.DoubleSide });

    const fan = new THREE.Group();
    s.root.add(fan);
    const add = (mesh: THREE.Mesh) => { s.root.remove(mesh); fan.add(mesh); return mesh; };

    // ---- Frame: four bars, corner caps, feet.
    const bar = W * 0.06;
    const frameY = shop ? 0.16 : 0.02;
    const cy = frameY + W / 2;
    add(s.box([W, bar, D], [0, frameY + bar / 2, 0], body));
    add(s.box([W, bar, D], [0, frameY + W - bar / 2, 0], body));
    add(s.box([bar, W, D], [-W / 2 + bar / 2, cy, 0], body));
    add(s.box([bar, W, D], [W / 2 - bar / 2, cy, 0], body));
    for (const x of [-1, 1]) for (const z of [-1, 1]) add(s.box([bar * 1.1, bar * 1.1, D * 0.2], [x * (W / 2 - bar / 2), frameY + W - bar / 2, z * D / 2], body));
    // Feet: a pair of plastic feet, or folding steel legs on the shop fan.
    if (shop) {
      const steel = s.material('#7a7f82', { metalness: 0.6, roughness: 0.4 });
      for (const x of [-1, 1]) {
        add(s.rod([x * (W / 2 - bar), frameY + bar, -D * 0.1], [x * (W / 2 - bar * 0.5), 0, -D * 1.6], 0.012, steel));
        add(s.rod([x * (W / 2 - bar), frameY + bar, D * 0.1], [x * (W / 2 - bar * 0.5), 0, D * 1.6], 0.012, steel));
        add(s.box([0.06, 0.012, D * 3.4], [x * (W / 2 - bar * 0.5), 0.006, 0], steel));
      }
    } else for (const x of [-1, 1]) add(s.box([bar * 1.6, frameY + 0.004, D * 1.5], [x * (W / 2 - bar), (frameY + 0.004) / 2, 0], dark));
    // Carry handle slot and the speed dial on top.
    add(s.box([W * 0.28, bar * 0.4, D * 0.5], [0, frameY + W - bar * 0.2, -D * 0.1], dark));
    const dialSize = W * 0.05;
    const dial = add(s.cylinder(dialSize, dialSize, bar * 0.5, [W * 0.3, frameY + W + bar * 0.2, 0], dark, 16));
    const pointer = add(s.box([dialSize * 0.3, bar * 0.2, dialSize * 1.2], [W * 0.3, frameY + W + bar * 0.5, 0], s.material('#f2efe6')));
    pointer.rotation.y = mix(0.4, -2.4, a.speed);
    void dial;
    for (let i = 0; i < 4; i++) add(s.box([bar * 0.14, bar * 0.06, bar * 0.14], [W * 0.3 + Math.sin(mix(0.4, -2.4, i / 3)) * dialSize * 1.5, frameY + W + bar * 0.02, Math.cos(mix(0.4, -2.4, i / 3)) * dialSize * 1.5], s.material('#f2efe6')));

    // ---- Grilles painted on transparent canvases: rings and spokes in front, a grid behind.
    const dust = mood.wear;
    const grilleTexture = (front: boolean) => canvasTexture(512, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = palette.grille;
      ctx.lineCap = 'round';
      if (front) {
        ctx.lineWidth = 7;
        for (let r = 36; r < 250; r += 24) { ctx.beginPath(); ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2); ctx.stroke(); }
        ctx.lineWidth = 9;
        for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(w / 2 + Math.cos(t) * 30, h / 2 + Math.sin(t) * 30); ctx.lineTo(w / 2 + Math.cos(t) * 256, h / 2 + Math.sin(t) * 256); ctx.stroke(); }
        ctx.fillStyle = palette.grille;
        ctx.beginPath(); ctx.arc(w / 2, h / 2, 38, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = palette.metal ? '#5a5e60' : '#1e1f21';
        ctx.beginPath(); ctx.arc(w / 2, h / 2, 26, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = palette.metal ? '#d0d3d4' : '#ece9e0';
        ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(shop ? 'AIRKING' : 'BREEZE', w / 2, h / 2, 46);
      } else {
        ctx.lineWidth = 6;
        for (let i = 0; i <= 20; i++) { const p = i / 20 * w; ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, h); ctx.moveTo(0, p); ctx.lineTo(w, p); ctx.stroke(); }
      }
      // Dust: grey fuzz caught on the leading edges, thicker with wear.
      if (dust > 0.15) {
        ctx.strokeStyle = `rgba(150,140,120,${0.5 * dust})`;
        ctx.lineWidth = 11;
        const rings = Math.round(dust * 12);
        for (let i = 0; i < rings; i++) {
          const r = 40 + random() * 210, t0 = random() * Math.PI * 2;
          ctx.beginPath(); ctx.arc(w / 2, h / 2, r, t0, t0 + 0.4 + random() * 1.4); ctx.stroke();
        }
        ctx.fillStyle = `rgba(120,110,95,${0.35 * dust})`;
        for (let i = 0; i < dust * 160; i++) ctx.fillRect(random() * w, random() * h, 3 + random() * 6, 2 + random() * 3);
      }
      if (a.state === 'taped') {
        ctx.strokeStyle = 'rgba(40,40,45,0.85)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(w * 0.1, h * 0.2); ctx.lineTo(w * 0.35, h * 0.45); ctx.lineTo(w * 0.3, h * 0.7); ctx.lineTo(w * 0.5, h * 0.9); ctx.stroke();
      }
    });
    const grille = (front: boolean) => new THREE.MeshStandardMaterial({
      map: grilleTexture(front), alphaTest: 0.5, side: THREE.DoubleSide, roughness: palette.metal ? 0.35 : 0.6, metalness: palette.metal ? 0.7 : 0,
    });
    const inner = W - bar * 2;
    const frontGrille = add(s.mesh(new THREE.PlaneGeometry(inner, inner), grille(true), [0, cy, D / 2 - 0.004]));
    const backGrille = add(s.mesh(new THREE.PlaneGeometry(inner, inner), grille(false), [0, cy, -D / 2 + 0.004]));
    frontGrille.castShadow = backGrille.castShadow = false;

    // ---- Motor and five pitched blades on a hub.
    const motor = add(s.cylinder(W * 0.07, W * 0.08, D * 0.5, [0, cy, -D * 0.15], dark, 18));
    motor.rotation.x = Math.PI / 2;
    const hub = new THREE.Group();
    hub.position.set(0, cy, D * 0.12);
    fan.add(hub);
    const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(W * 0.06, W * 0.06, D * 0.2, 16), bladeMat);
    hubCap.rotation.x = Math.PI / 2;
    hubCap.castShadow = true;
    hub.add(hubCap);
    const shape = new THREE.Shape();
    const r0 = W * 0.06, r1 = W * 0.44, half = W * 0.11;
    shape.moveTo(-half * 0.35, r0);
    shape.quadraticCurveTo(-half * 1.25, r0 + (r1 - r0) * 0.55, -half * 0.6, r1);
    shape.quadraticCurveTo(0, r1 + W * 0.02, half * 0.7, r1 * 0.96);
    shape.quadraticCurveTo(half * 1.05, r0 + (r1 - r0) * 0.4, half * 0.35, r0);
    shape.closePath();
    const bladeGeometry = new THREE.ExtrudeGeometry(shape, { depth: 0.003, bevelEnabled: false });
    for (let i = 0; i < 5; i++) {
      const arm = new THREE.Group();
      arm.rotation.z = i / 5 * Math.PI * 2;
      const blade = new THREE.Mesh(bladeGeometry, bladeMat);
      blade.rotation.y = 0.5;
      blade.castShadow = true;
      arm.add(blade);
      hub.add(arm);
    }

    // ---- Duct tape over the corners, for the taped state.
    if (a.state === 'taped') {
      const tape = s.material('#8d9094', { roughness: 0.35, metalness: 0.2 });
      for (const [x, y] of [[-1, 1], [1, 1], [1, -1]]) {
        const strip = add(s.box([W * 0.22, W * 0.07, 0.003], [x * (W / 2 - bar * 0.8), frameY + W / 2 + y * (W / 2 - bar * 0.9), D / 2 + 0.002], tape));
        strip.rotation.z = (random() - 0.5) * 0.5;
        const side = add(s.box([0.003, W * 0.07, D * 0.9], [x * (W / 2 + 0.002), frameY + W / 2 + y * (W / 2 - bar * 0.9), 0], tape));
        side.rotation.x = (random() - 0.5) * 0.2;
      }
    }

    // ---- Ribbon tied to the grille, streaming forward when the air moves.
    const ribbons: THREE.Mesh[] = [];
    if (a.ribbon) {
      const tint = ['#d8263c', '#f2e24a', '#3a8fe8', '#f4f1e6', '#e8853a'][Math.floor(random() * 5)];
      const cloth = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.8, side: THREE.DoubleSide });
      const count = 1 + Math.floor(random() * 3);
      for (let i = 0; i < count; i++) {
        const length = W * rnd(0.45, 0.75);
        const geometry = new THREE.PlaneGeometry(length, W * 0.035, 14, 1);
        geometry.translate(length / 2, 0, 0);
        const ribbon = new THREE.Mesh(geometry, cloth);
        ribbon.castShadow = true;
        const t = rnd(-0.6, 0.6);
        ribbon.position.set(Math.sin(t) * W * 0.2, cy + Math.cos(t) * W * 0.2, D / 2 + 0.01);
        ribbon.rotation.set(0, -Math.PI / 2, 0);
        ribbon.userData.phase = random() * 6;
        ribbon.userData.base = Float32Array.from(geometry.attributes.position.array);
        fan.add(ribbon);
        ribbons.push(ribbon);
      }
    }

    // ---- The cord: trailing away, or wound round the feet.
    const cord = s.material('#1c1c1e', { roughness: 0.7 });
    const plug = (at: [number, number, number], turn: number) => {
      const housing = s.box([0.035, 0.022, 0.045], at, s.material('#2a2a2c'));
      housing.rotation.y = turn;
      for (const x of [-0.008, 0.008]) s.box([0.003, 0.01, 0.012], [at[0] + Math.cos(turn) * x, at[1], at[2] - Math.sin(turn) * x + 0.025], s.material('#c9b06a', { metalness: 0.8, roughness: 0.3 }));
    };
    const exit: [number, number, number] = [-W / 2 + bar, frameY + bar * 0.6, -D / 2];
    if (a.state === 'unplugged') {
      for (let i = 0; i < 4; i++) {
        const loop = s.ring(W * 0.16, 0.0045, [-W * 0.1 + i * 0.012, 0.0075 + i * 0.009, -D * 0.9], cord);
        loop.rotation.x = Math.PI / 2;
        loop.rotation.z = random() * 0.4;
      }
      plug([-W * 0.1 + W * 0.17, 0.011, -D * 0.9 + W * 0.05], 0.4);
    } else {
      const dir = a.cordSide === 'left' ? -1 : a.cordSide === 'right' ? 1 : 0;
      const reach = W * rnd(1.0, 1.5);
      const end: [number, number, number] = [exit[0] + dir * reach, 0.005, dir === 0 ? -D - reach * 0.9 : -D * 1.3 - rnd(0, W * 0.3)];
      const middle: [number, number, number] = [mix(exit[0], end[0], 0.5) + (random() - 0.5) * W * 0.3, 0.005, mix(exit[2], end[2], 0.45) - (random() - 0.5) * W * 0.3];
      s.tube([exit, [exit[0] - 0.02, 0.01, exit[2] - W * 0.1], middle, end], 0.0045, cord);
      plug(end, Math.atan2(end[0] - middle[0], end[2] - middle[2]) + Math.PI);
    }

    // ---- Stance: a slight backward lean, aimed, or knocked flat.
    if (a.state === 'knocked-over') {
      fan.rotation.x = -Math.PI / 2 + 0.04;
      fan.rotation.y = (random() - 0.5) * 0.6;
    } else {
      fan.rotation.x = a.aim === 'up' ? -0.5 : -0.08 - random() * 0.05;
      fan.rotation.y = a.aim === 'left' ? 0.55 : a.aim === 'right' ? -0.55 : (random() - 0.5) * 0.15;
    }

    // ---- Motion: the blades spin with the dial and the room's energy; ribbons stream.
    const rate = running ? mix(3, 26, a.speed) * mix(0.55, 1.25, mood.energy) : 0;
    const gust = running ? mix(0.4, 1, a.speed) : 0.08;
    return s.finish({
      update(dt, time) {
        hub.rotation.z -= dt * rate;
        for (const ribbon of ribbons) {
          const phase = ribbon.userData.phase as number;
          const base = ribbon.userData.base as Float32Array;
          const at = ribbon.geometry.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < at.count; i++) {
            const x = base[i * 3];
            const along = x / (W * 0.75);
            // Local x runs forward from the grille, y is up, z is sideways. Still air lets it hang.
            const hang = running ? 0 : 1;
            at.setX(i, x * (1 - hang * 0.72));
            at.setY(i, base[i * 3 + 1] + Math.sin(time * (6 + gust * 8) + phase - along * 9) * along * W * 0.05 * gust - along * along * W * (0.04 + hang * 0.6));
            at.setZ(i, Math.cos(time * (5 + gust * 6) + phase - along * 7) * along * W * 0.04 * gust);
          }
          at.needsUpdate = true;
          ribbon.geometry.computeVertexNormals();
        }
      },
    });
  },
});
