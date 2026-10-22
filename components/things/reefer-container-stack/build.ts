import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { corrugate, halo, lamp, paint, shade, skin, weather, write } from './paint';

const SCHEMES = {
  blue: 'White boxes with a deep blue stripe and line name.',
  orange: 'White boxes with an orange stripe, a German line.',
  green: 'White boxes with a bottle-green stripe.',
  red: 'White boxes with a red stripe, a South American fruit line.',
  steel: 'Bare ribbed stainless steel, older and unbranded.',
  mixed: 'Every box from a different line, whatever turned up.',
} as const;
const SCHEME_PAINT = {
  blue: ['#ecece6', '#1f4f86', 'NORDHAV'], orange: ['#ecece6', '#e0661c', 'HANSA SUD'], green: ['#e9ece4', '#1f6b4a', 'EVERJADE'],
  red: ['#efebe4', '#c22a22', 'FRIGO SUR'], steel: ['#b4babb', '#3a4046', 'POLAR'],
} as const;
const CARGO = {
  bananas: ['BANANAS', '+13°C', '#e9c21c'], fish: ['FROZEN FISH', '-25°C', '#3b8fc4'], pharma: ['PHARMA · DO NOT OPEN', '+4°C', '#c22a6a'],
  flowers: ['CUT FLOWERS', '+2°C', '#d85fa0'], meat: ['CHILLED MEAT', '-1°C', '#b8322a'], blank: ['', '-18°C', '#888888'],
} as const;

export default defineThing({
  questions: {
    height: choice('How high is the stack?', {
      one: 'A single box on the ground, plugged in alone.',
      two: 'Two high.',
      three: 'Three high, the usual reefer stack.',
      four: 'Four high, a humming white wall.',
    }),
    length: choice('How long are the boxes?', { twenty: 'Short twenty-foot boxes, stubby and dense.', forty: 'Long forty-foot boxes.' }),
    scheme: choice('What shipping-line colours do they wear?', SCHEMES),
    cargo: choice('What do the stencilled labels say is inside?', {
      bananas: 'Bananas, with a yellow sticker.',
      fish: 'Frozen fish.',
      pharma: 'Pharmaceuticals, with a DO NOT OPEN warning.',
      flowers: 'Cut flowers racing to market.',
      meat: 'Chilled meat.',
      blank: 'Nothing. The labels have been peeled off or were never there.',
    }),
    leak: choice('What is coming out of the end faces?', {
      nothing: 'Nothing: dry and clean.',
      meltwater: 'Clear meltwater dripping into a spreading puddle.',
      rust: 'Brown rust-water streaks and a stained patch on the ground.',
      frost: 'Thick white frost and icicles hanging from the units.',
      blood: 'A thin pinkish-red trickle pooling underneath.',
      glow: 'Something faintly luminous green seeping out, which is not on the manifest.',
    }),
    power: choice('Are they plugged in and running?', {
      running: 'All plugged in and humming, green lights, fans turning.',
      alarm: 'Running, but one unit shows a red alarm light and an error on its display.',
      unplugged: 'Unplugged: cables coiled on the ground, units dark and silent, the cargo warming.',
    }),
    gantry: noul('Is there a steel access gantry with ladder and walkways across the unit ends?'),
    ajar: noul('Has one of the boxes been left with a rear door ajar, cold fog rolling out?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const count = { one: 1, two: 2, three: 3, four: 4 }[a.height];
    const len = a.length === 'twenty' ? 6.06 : 12.19;
    const W = 2.44, H = 2.9, zEnd = len / 2;
    const dusk = Math.min(1, Math.abs(mood.daylight - 0.5) * 2);
    const steel = s.material('#8b9296', { metalness: 0.6, roughness: 0.4 });
    const dark = s.material('#24282b');
    const running = a.power !== 'unplugged';
    const alarmIndex = a.power === 'alarm' ? Math.floor(random() * count) : -1;
    const schemeKeys = ['blue', 'orange', 'green', 'red', 'steel'] as const;
    const [cargoText, temp, cargoColour] = CARGO[a.cargo];
    const leakColour = { nothing: '', meltwater: 'rgba(120,140,150,0.55)', rust: 'rgba(122,59,28,0.85)', frost: 'rgba(255,255,255,0.95)', blood: 'rgba(176,40,48,0.8)', glow: 'rgba(110,255,120,0.95)' }[a.leak];
    const fans: THREE.Object3D[] = [];
    const blinkers: THREE.MeshStandardMaterial[] = [];

    for (let level = 0; level < count; level++) {
      const y0 = level * H;
      const scheme = a.scheme === 'mixed' ? schemeKeys[Math.floor(random() * schemeKeys.length)] : a.scheme;
      const [bodyColour, accent, name] = SCHEME_PAINT[scheme];
      const dx = (random() - 0.5) * 0.08, dz = (random() - 0.5) * 0.1;
      const sideTex = () => paint(len > 8 ? 1024 : 512, 256, (ctx, w, h) => {
        corrugate(ctx, w, h, bodyColour, Math.round(len * 6));
        ctx.fillStyle = accent; ctx.fillRect(0, h * 0.84, w, h * 0.08);
        write(ctx, name, w * 0.36, h * 0.4, h * 0.32, accent, 'bold SIZEpx sans-serif', w * 0.5);
        // Snowflake mark and cargo sticker.
        ctx.strokeStyle = accent; ctx.lineWidth = 6;
        for (let i = 0; i < 3; i++) { const t = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(w * 0.8 + Math.cos(t) * h * 0.16, h * 0.4 + Math.sin(t) * h * 0.16); ctx.lineTo(w * 0.8 - Math.cos(t) * h * 0.16, h * 0.4 - Math.sin(t) * h * 0.16); ctx.stroke(); }
        if (cargoText) {
          ctx.fillStyle = cargoColour; ctx.fillRect(w * 0.06, h * 0.62, w * 0.3, h * 0.16);
          write(ctx, cargoText, w * 0.21, h * 0.705, h * 0.085, '#ffffff', 'bold SIZEpx sans-serif', w * 0.28);
        } else { ctx.fillStyle = shade(bodyColour, -0.12); ctx.fillRect(w * 0.06, h * 0.62, w * 0.2, h * 0.16); }
        weather(ctx, w, h, random, mood.wear);
      });
      const unitTex = paint(256, 300, (ctx, w, h) => {
        ctx.fillStyle = shade(bodyColour, -0.08); ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = shade(bodyColour, -0.3); ctx.fillRect(14, 14, w - 28, h - 28);
        ctx.fillStyle = shade(bodyColour, 0.02); ctx.fillRect(20, 20, w - 40, h - 40);
        // Louvred lower half, hatch seams.
        ctx.strokeStyle = 'rgba(40,46,52,0.55)'; ctx.lineWidth = 2;
        for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(30, h * 0.6 + i * 9); ctx.lineTo(w * 0.52, h * 0.6 + i * 9); ctx.stroke(); }
        ctx.strokeRect(26, h * 0.56, w * 0.5, h * 0.36);
        write(ctx, name, w * 0.3, h * 0.5, 16, accent, 'bold SIZEpx sans-serif', w * 0.4);
        if (cargoText) { ctx.fillStyle = cargoColour; ctx.fillRect(w * 0.08, 26, w * 0.34, 26); write(ctx, cargoText.split(' ·')[0], w * 0.25, 40, 13, '#fff', 'bold SIZEpx sans-serif', w * 0.32); }
        weather(ctx, w, h, random, mood.wear * 0.9);
        if (leakColour) {
          for (let i = 0; i < 9; i++) {
            const x = 30 + random() * (w - 60), y = h * (0.45 + random() * 0.3), run = h - y;
            const g = ctx.createLinearGradient(0, y, 0, h);
            g.addColorStop(0, leakColour); g.addColorStop(1, leakColour.replace(/[\d.]+\)$/, '0.25)'));
            ctx.fillStyle = g; ctx.fillRect(x, y, 3 + random() * 7, run);
          }
          if (a.leak === 'frost') { ctx.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(random() * w, h * (0.3 + random() * 0.7), 6 + random() * 16, 0, Math.PI * 2); ctx.fill(); } }
        }
      });
      const doorTex = paint(256, 300, (ctx, w, h) => {
        corrugate(ctx, w, h, bodyColour, 4);
        ctx.strokeStyle = shade(bodyColour, -0.5); ctx.lineWidth = 5; ctx.strokeRect(6, 6, w - 12, h - 12);
        ctx.beginPath(); ctx.moveTo(w / 2, 6); ctx.lineTo(w / 2, h - 6); ctx.stroke();
        ctx.strokeStyle = '#8f979b'; ctx.lineWidth = 6;
        for (const x of [0.2, 0.38, 0.62, 0.8]) { ctx.beginPath(); ctx.moveTo(w * x, 12); ctx.lineTo(w * x, h - 12); ctx.stroke(); }
        weather(ctx, w, h, random, mood.wear);
      });
      const side = skin(sideTex()), side2 = skin(sideTex());
      const top = new THREE.MeshStandardMaterial({ color: shade(bodyColour, -0.1), roughness: 0.8 });
      const isAjar = a.ajar && level === 0;
      const box = s.mesh(new THREE.BoxGeometry(W, H, len), [side, side2, top, top, skin(unitTex), isAjar ? new THREE.MeshStandardMaterial({ color: '#0d1114' }) : skin(doorTex)] as unknown as THREE.Material, [dx, y0 + H / 2, dz]);
      box.name = 'reefer';
      for (const x of [-W / 2 + 0.09, W / 2 - 0.09]) for (const z of [-zEnd + 0.09, zEnd - 0.09]) for (const y of [0.06, H - 0.06]) s.box([0.2, 0.14, 0.2], [dx + x, y0 + y, dz + z], steel);

      // The refrigeration unit: fan cowl, compressor, controller with its little display.
      const z = dz + zEnd;
      s.cylinder(0.56, 0.56, 0.08, [dx + 0.42, y0 + 2.08, z + 0.03], dark, 24).rotation.x = Math.PI / 2;
      s.ring(0.56, 0.035, [dx + 0.42, y0 + 2.08, z + 0.07], steel);
      const fan = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.015), steel);
        blade.position.set(Math.cos(i * 1.2566) * 0.25, Math.sin(i * 1.2566) * 0.25, 0);
        blade.rotation.z = i * 1.2566;
        fan.add(blade);
      }
      fan.position.set(dx + 0.42, y0 + 2.08, z + 0.085);
      fan.rotation.z = random() * 6;
      s.root.add(fan);
      fans.push(fan);
      s.box([0.9, 0.9, 0.16], [dx + 0.6, y0 + 0.75, z + 0.06], dark);
      s.cylinder(0.26, 0.26, 0.5, [dx + 0.55, y0 + 0.62, z + 0.2], s.material('#3b4044', { metalness: 0.5 }), 14);
      s.box([0.62, 0.5, 0.14], [dx - 0.6, y0 + 2.2, z + 0.07], s.material('#d9dcda'));
      const isAlarm = level === alarmIndex;
      const display = paint(128, 64, (ctx, w, h) => {
        ctx.fillStyle = running ? '#07140c' : '#1c1f21'; ctx.fillRect(0, 0, w, h);
        if (running) write(ctx, isAlarm ? 'ERR' : temp, w / 2, h / 2 + 2, 34, isAlarm ? '#ff3a2a' : '#5dff8a', 'bold SIZEpx monospace', w * 0.9);
      });
      const screen = s.mesh(new THREE.PlaneGeometry(0.44, 0.2), new THREE.MeshStandardMaterial({ map: display, emissiveMap: display, emissive: '#ffffff', emissiveIntensity: running ? 1.2 : 0 }), [dx - 0.6, y0 + 2.28, z + 0.145]);
      screen.castShadow = false;
      const led = lamp(isAlarm ? '#ff2a1a' : '#3cf07a', running ? mix(1.2, 2.6, dusk) : 0.02);
      if (!running) led.color.set('#3a3d3f');
      s.box([0.1, 0.1, 0.03], [dx - 0.8, y0 + 2.05, z + 0.145], led);
      if (isAlarm) {
        blinkers.push(led);
        s.ball([0.22, 0.22, 0.1], [dx - 0.8, y0 + 2.05, z + 0.2], halo('#ff3020', 0.3), 10).castShadow = false;
      }
      // Power cable: plugged in to the socket post, or coiled on the ground.
      const cable = s.material(['#e8771c', '#1d1d1d', '#d6b21a'][Math.floor(random() * 3)], { roughness: 0.8 });
      const from: [number, number, number] = [dx - 0.95, y0 + 0.5, z + 0.05];
      if (running) {
        const px = -W / 2 - 0.55, sag = 0.3 + random() * 0.5;
        s.tube([from, [from[0] - 0.05, from[1] - 0.2, z + 0.3], [mix(from[0], px, 0.6), Math.max(0.5, y0 * 0.5 + 0.9 - sag), z + 0.45 + level * 0.08], [px, 1.05, z + 0.3]], 0.03, cable);
      } else if (level === 0) {
        for (let i = 0; i < 4; i++) s.ring(0.32 - i * 0.02, 0.03, [dx - 0.5, 0.04 + i * 0.05, z + 0.75], cable).rotation.x = Math.PI / 2;
        s.tube([from, [from[0], 0.3, z + 0.3], [dx - 0.5, 0.06, z + 0.45]], 0.03, cable);
      } else s.tube([from, [from[0] + 0.03, from[1] - 0.5, z + 0.12], [from[0] - 0.05, from[1] - 1.4 - random(), z + 0.1]], 0.03, cable);

      if (a.leak === 'frost') {
        const icicles = Array.from({ length: 7 + Math.floor(random() * 6) }, () => ({ at: [dx + (random() - 0.5) * 2.1, y0 + 0.02, z + 0.06] as [number, number, number], size: 0.5 + random() * 1.1 }));
        s.scatter(new THREE.ConeGeometry(0.035, 0.36, 6).rotateX(Math.PI).translate(0, -0.18, 0), s.material('#eaf6fb', { roughness: 0.15 }), icicles);
      }
    }

    // Socket post the cables run to.
    const px = -W / 2 - 0.55, pz = zEnd + 0.3;
    s.box([0.3, 1.25, 0.3], [px, 0.625, pz], s.material('#e3b11b'));
    s.box([0.36, 0.06, 0.36], [px, 1.28, pz], dark);
    for (let i = 0; i < 3; i++) s.cylinder(0.05, 0.05, 0.04, [px + 0.16, 0.5 + i * 0.25, pz], s.material('#2a55a8'), 10).rotation.z = Math.PI / 2;
    s.box([0.06, 0.06, 0.02], [px, 1.1, pz + 0.155], lamp(running ? '#3cf07a' : '#ff9a1a', mix(0.8, 2, dusk)));

    // What has collected on the ground.
    if (a.leak !== 'nothing') {
      const tint = { meltwater: '#6f7d85', rust: '#6b3a1f', frost: '#f1f6f8', blood: '#8f2630', glow: '#63f27a' }[a.leak];
      const material = a.leak === 'glow' ? lamp(tint, 1.4) : new THREE.MeshStandardMaterial({ color: tint, roughness: a.leak === 'frost' ? 0.9 : 0.08, metalness: a.leak === 'frost' ? 0 : 0.3 });
      for (let i = 0; i < 3; i++) {
        const pool = s.cylinder(1, 1, 0.014, [(random() - 0.5) * 1.4, 0.007, zEnd + 0.5 + random() * 0.7], material, 22);
        pool.scale.set(0.5 + random() * 0.8, 1, 0.35 + random() * 0.5);
        pool.castShadow = false;
      }
      if (a.leak === 'glow') s.ball([1.6, 0.5, 1.1], [0, 0.1, zEnd + 0.8], halo('#63f27a', 0.2), 12).castShadow = false;
    }
    if (a.ajar) {
      const door = s.box([W / 2 - 0.04, H - 0.2, 0.06], [W / 2 + 0.3, H / 2, -zEnd - 0.5], s.material('#e6e6e0'));
      door.rotation.y = -1.0;
      for (const y of [0.5, 2.4]) s.rod([W / 2 + 0.3, y, -zEnd - 0.5], [W / 2 + 0.3, y, -zEnd - 0.5 + 0.001], 0.03, steel);
      for (let i = 0; i < 7; i++) s.ball([0.9 + random() * 0.8, 0.3 + random() * 0.3, 0.8 + random() * 0.7], [(random() - 0.5) * 1.8, 0.15 + random() * 0.3, -zEnd - 0.4 - random() * 1.8], halo('#ffffff', 0.35), 10).castShadow = false;
    }
    if (a.gantry) {
      const gz = zEnd + 0.9;
      const posts = [-W / 2 - 0.2, W / 2 + 0.2];
      const top = count * H - H + 1.1;
      for (const x of posts) s.box([0.1, top, 0.1], [x, top / 2, gz + 0.5], steel);
      for (let level = 1; level < count; level++) {
        const y = level * H - 0.05;
        s.box([W + 0.6, 0.06, 0.8], [0, y, gz + 0.1], s.material('#5d656a', { metalness: 0.5 }));
        s.rod([posts[0], y + 1.1, gz + 0.5], [posts[1], y + 1.1, gz + 0.5], 0.03, s.material('#e3b11b'));
        s.rod([posts[0], y + 0.55, gz + 0.5], [posts[1], y + 0.55, gz + 0.5], 0.025, s.material('#e3b11b'));
      }
      const lx = W / 2 + 0.2;
      const ladderTop = Math.max(1, (count - 1) * H);
      for (const dzz of [-0.22, 0.22]) s.rod([lx, 0, gz + dzz], [lx, ladderTop + 1, gz + dzz], 0.025, steel);
      s.scatter(new THREE.BoxGeometry(0.04, 0.04, 0.44), steel, Array.from({ length: Math.floor(ladderTop / 0.3) }, (_u, i) => ({ at: [lx, 0.3 + i * 0.3, gz] as [number, number, number], size: 1 })));
    }
    // Things left at the foot, by how crowded the scene is.
    if (mood.density > 0.55) {
      s.box([1.2, 0.14, 1.0], [W / 2 + 0.9, 0.07, zEnd - 1.5], s.material('#b98f55'));
      if (mood.density > 0.8) s.cylinder(0.29, 0.29, 0.88, [W / 2 + 0.8, 0.44, zEnd - 0.3], s.material('#2a55a8'), 16);
    }

    const speed = running ? mix(4, 22, mood.energy) : 0;
    return s.finish({
      update: (dt, time) => {
        for (const fan of fans) fan.rotation.z += dt * speed;
        for (const led of blinkers) led.emissiveIntensity = Math.sin(time * 6) > 0 ? 3 : 0.1;
      },
    });
  },
});
