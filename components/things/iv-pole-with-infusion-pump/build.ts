import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

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
    hanging: choice('What is hanging from the hooks?', {
      saline: 'One clear bag of saline, the ordinary drip.',
      piggyback: 'A large clear bag and a small second bag piggybacked beside it.',
      blood: 'A dark red bag of blood.',
      chemo: 'A bag inside an amber light-proof sleeve with a purple hazard label.',
      feed: 'A squat bottle of beige liquid feed hung upside down.',
      bare: 'Nothing. The hooks are empty and the stand is waiting or finished with.',
    }),
    level: score('If there is fluid, how much is left?', ['Nearly run dry, the bag collapsed', 'A third left', 'Half', 'Just hung and full']),
    pump: choice('What is clamped to the pole?', {
      gravity: 'No machine: just a roller clamp on the line, an old-fashioned gravity drip.',
      single: 'One volumetric pump box with a keypad and display.',
      stacked: 'Two pumps stacked and a syringe driver under them, an intensive-care tree.',
    }),
    display: choice('If there is a pump, what is its display doing?', {
      running: 'Steady green figures, counting millilitres.',
      alarm: 'Flashing red: occlusion, or the bag has run out, and it is beeping.',
      standby: 'A dim amber standby glow.',
      off: 'Dark. Unplugged.',
    }),
    line: choice('Where does the line go?', {
      coiled: 'Looped up in a neat coil over a hook, capped, not connected to anyone.',
      trailing: 'Down and away across the floor toward someone out of sight.',
      dangling: 'Hanging straight down, the end swinging free a hand above the floor.',
    }),
    company: choice('What else has ended up on the stand?', {
      nothing: 'Nothing; it is clinically bare.',
      gown: 'A dressing gown draped over the pump and pole.',
      drawing: 'A child\'s felt-tip drawing taped to the pole.',
      teddy: 'A small teddy strapped to the pole with tape, a children\'s ward mascot.',
      carrier: 'A plastic carrier bag of belongings hooked on beside the drip.',
      handle: 'A push handle ring with a call bell and a paper sick bowl in a basket.',
    }),
    base: choice('What kind of base does it roll on?', {
      star: 'A chrome five-star base on grey twin casters.',
      weighted: 'A heavy black domed base with hidden wheels.',
      enamel: 'An old cream-enamelled four-leg base with small steel castors.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const chrome = s.material('#d9dee0', { metalness: 0.9, roughness: 0.2 + mood.wear * 0.2 });
    const grey = s.material('#8e9598', { roughness: 0.5 });
    const dark = s.material('#24282b', { roughness: 0.55 });
    const cream = s.material('#e9e4d2', { roughness: 0.4 });
    const tubing = new THREE.MeshStandardMaterial({ color: '#e9f1f0', roughness: 0.25, transparent: true, opacity: 0.85 });
    const H = 1.95 + random() * 0.15;

    // ---- Base ------------------------------------------------------------------------------
    const frame = a.base === 'enamel' ? cream : chrome;
    if (a.base === 'weighted') {
      s.lathe([[0, 0.02], [0.26, 0.02], [0.265, 0.04], [0.2, 0.075], [0.06, 0.13], [0, 0.13]], dark);
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + 0.3;
        s.ball([0.028, 0.028, 0.028], [Math.cos(angle) * 0.21, 0.028, Math.sin(angle) * 0.21], grey, 10);
      }
    } else {
      const legs = a.base === 'enamel' ? 4 : 5, reach = 0.3;
      s.cylinder(0.035, 0.05, 0.1, [0, 0.135, 0], frame, 16);
      const spin = random() * 6;
      for (let i = 0; i < legs; i++) {
        const angle = (i / legs) * Math.PI * 2 + spin;
        const x = Math.cos(angle) * reach, z = Math.sin(angle) * reach;
        s.rod([0, 0.12, 0], [x, 0.085, z], 0.02, frame, 0.014);
        const swivel = random() * 6;
        s.cylinder(0.012, 0.012, 0.03, [x, 0.07, z], grey, 8);
        for (const side of [-1, 1]) {
          const wheel = s.cylinder(0.03, 0.03, 0.014, [x + Math.cos(swivel) * side * 0.012, 0.03, z + Math.sin(swivel) * side * 0.012], a.base === 'enamel' ? chrome : grey, 14);
          wheel.rotation.set(0, -swivel, Math.PI / 2, 'YXZ');
        }
      }
    }
    // ---- Pole ------------------------------------------------------------------------------
    s.cylinder(0.016, 0.016, 1.05, [0, 0.16 + 0.525, 0], frame, 14);
    s.cylinder(0.024, 0.024, 0.06, [0, 1.2, 0], dark, 14);
    s.rod([0.02, 1.2, 0], [0.07, 1.2, 0], 0.008, dark);
    s.ball([0.02, 0.02, 0.02], [0.08, 1.2, 0], dark, 10);
    s.cylinder(0.011, 0.011, H - 1.2, [0, 1.2 + (H - 1.2) / 2, 0], chrome, 12);
    // Rust freckles on a neglected stand.
    for (let i = 0; i < mood.wear * 14; i++) s.ball([0.017, 0.012 + random() * 0.02, 0.017], [0, 0.2 + random() * 0.95, 0], s.material('#8a5a34', { roughness: 0.9 }), 6);
    // Four ram's-horn hooks.
    const hooks: P3[] = [];
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const c = Math.cos(angle), n = Math.sin(angle);
      const pts: P3[] = [[0, H - 0.02, 0], [c * 0.07, H + 0.015, n * 0.07], [c * 0.14, H - 0.01, n * 0.14], [c * 0.165, H - 0.055, n * 0.165], [c * 0.14, H - 0.085, n * 0.14], [c * 0.115, H - 0.06, n * 0.115]];
      s.tube(pts, 0.006, chrome);
      hooks.push([c * 0.14, H - 0.085, n * 0.14]);
    }
    s.ball([0.02, 0.02, 0.02], [0, H, 0], chrome, 10);
    const front = hooks.reduce((best, hook) => (hook[2] + hook[0] * 0.3 > best[2] + best[0] * 0.3 ? hook : best));
    const second = hooks.find((hook) => hook !== front && hook[2] > 0) ?? hooks[1];
    const spare = hooks.find((hook) => hook !== front && hook !== second)!;

    // ---- Bags ------------------------------------------------------------------------------
    const drips: { mesh: THREE.Mesh; top: number; fall: number; offset: number }[] = [];
    const level = mix(0.08, 0.95, a.level) * mix(0.85, 1, random());
    const bag = (hook: P3, w: number, h: number, fluid: string, shell: string, opacity: number, sleeve?: string): P3 => {
      const [x, hy, z] = hook;
      const top = hy - 0.03, mid = top - h / 2;
      s.box([0.03, 0.045, 0.004], [x, hy - 0.012, z], s.material(shell, { roughness: 0.3 }));
      const skin = new THREE.MeshStandardMaterial({ color: shell, roughness: 0.2, transparent: true, opacity });
      const body = s.mesh(new RoundedBoxGeometry(w, h, 0.045, 4, 0.02), skin, [x, mid, z]);
      body.scale.z = mix(0.45, 1, level);
      if (!sleeve) {
        const filled = h * 0.92 * level;
        const liquid = s.mesh(new RoundedBoxGeometry(w * 0.9, filled, 0.036, 3, Math.min(0.016, filled * 0.4)), new THREE.MeshStandardMaterial({ color: fluid, roughness: 0.15, transparent: true, opacity: 0.9, emissive: fluid, emissiveIntensity: 0.12 }), [x, top - h + 0.01 + filled / 2, z]);
        liquid.scale.z = mix(0.5, 1, level);
        const tag = s.mesh(new THREE.PlaneGeometry(w * 0.7, h * 0.36), new THREE.MeshStandardMaterial({ roughness: 0.6, transparent: true, opacity: 0.92, map: paint(96, 64, (ctx) => {
          ctx.fillStyle = '#fbfbf6'; ctx.fillRect(0, 0, 96, 64);
          ctx.fillStyle = fluid === '#7d1016' ? '#b3201a' : '#2a62a8'; ctx.fillRect(0, 0, 96, 14);
          ctx.fillStyle = '#333';
          for (let line = 0; line < 5; line++) ctx.fillRect(6, 22 + line * 8, 40 + random() * 44, 3);
        }) }), [x, mid + h * 0.12, z + 0.024]);
        tag.castShadow = false;
      } else {
        s.mesh(new RoundedBoxGeometry(w * 1.12, h * 1.05, 0.05, 3, 0.012), s.material(sleeve, { roughness: 0.5 }), [x, mid, z]);
        s.label('CYTOTOXIC', w * 0.9, h * 0.2, [x, mid + 0.02, z + 0.027], '#f7e94a', '#6a2c8f');
      }
      for (const dx of [-0.02, 0.02]) s.cylinder(0.007, 0.007, 0.03, [x + dx, top - h - 0.012, z], s.material('#3b7fc4'), 8);
      // Drip chamber with a drop that falls in update().
      const cy = top - h - 0.085;
      s.cylinder(0.005, 0.005, 0.05, [x + 0.02, top - h - 0.045, z], tubing, 6);
      s.cylinder(0.014, 0.012, 0.07, [x + 0.02, cy, z], new THREE.MeshStandardMaterial({ color: '#eef6f6', roughness: 0.1, transparent: true, opacity: 0.5 }), 12);
      s.cylinder(0.011, 0.01, 0.025, [x + 0.02, cy - 0.02, z], new THREE.MeshStandardMaterial({ color: fluid, roughness: 0.2 }), 10);
      const drop = s.ball([0.004, 0.006, 0.004], [x + 0.02, cy + 0.03, z], new THREE.MeshStandardMaterial({ color: fluid, roughness: 0.1 }), 8);
      drop.castShadow = false;
      drips.push({ mesh: drop, top: cy + 0.03, fall: 0.04, offset: random() });
      return [x + 0.02, cy - 0.035, z];
    };

    let lineStart: P3 | null = null;
    if (a.hanging === 'saline') lineStart = bag(front, 0.17, 0.28, '#bfe3ee', '#f3f8f8', 0.5);
    else if (a.hanging === 'piggyback') {
      lineStart = bag(front, 0.17, 0.28, '#bfe3ee', '#f3f8f8', 0.5);
      const small = bag(second, 0.09, 0.13, '#e9d77a', '#f6f6ee', 0.5);
      s.tube([small, [small[0], small[1] - 0.12, small[2]], [(small[0] + lineStart[0]) / 2, lineStart[1] - 0.22, (small[2] + lineStart[2]) / 2], [lineStart[0], lineStart[1] - 0.12, lineStart[2]]], 0.0035, tubing);
    } else if (a.hanging === 'blood') lineStart = bag(front, 0.15, 0.23, '#7d1016', '#f1dede', 0.55);
    else if (a.hanging === 'chemo') lineStart = bag(front, 0.17, 0.27, '#d08a2a', '#f3f8f8', 0.5, '#b8742a');
    else if (a.hanging === 'feed') {
      const [x, hy, z] = front;
      s.ring(0.022, 0.004, [x, hy - 0.02, z], grey);
      s.lathe([[0, -0.23], [0.018, -0.23], [0.018, -0.2], [0.03, -0.2], [0.055, -0.17], [0.055, -0.02], [0.05, 0], [0, 0]], s.material('#eadfc6', { roughness: 0.35 }), [x, hy - 0.04, z]);
      s.cylinder(0.0556, 0.0556, 0.09, [x, hy - 0.13, z], s.material('#3d7fb5', { roughness: 0.6 }), 20);
      s.cylinder(0.022, 0.022, 0.03, [x, hy - 0.28, z], s.material('#8e4fa8'), 12);
      lineStart = [x, hy - 0.295, z];
    }

    // ---- Pump ------------------------------------------------------------------------------
    const flashers: THREE.MeshStandardMaterial[] = [];
    const screen = (text: string) => {
      const tone = { running: ['#06180c', '#58ff8a'], alarm: ['#3a0505', '#ff4b3a'], standby: ['#1b1405', '#ffb23a'], off: ['#15191b', '#22282b'] }[a.display];
      const map = paint(128, 64, (ctx) => {
        ctx.fillStyle = tone[0]; ctx.fillRect(0, 0, 128, 64);
        ctx.fillStyle = tone[1];
        ctx.font = 'bold 34px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (a.display !== 'off') ctx.fillText(a.display === 'alarm' ? 'OCCL' : a.display === 'standby' ? '- - -' : text, 64, 28);
        if (a.display === 'running') { ctx.font = '13px monospace'; ctx.fillText('mL/h', 96, 54); ctx.fillRect(8, 50, 40 + random() * 30, 5); }
      });
      const material = new THREE.MeshStandardMaterial({ map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: a.display === 'off' ? 0.05 : 1.1, roughness: 0.3 });
      if (a.display === 'alarm') flashers.push(material);
      return material;
    };
    const shell = s.material(['#e8ebe9', '#dfe6ee', '#e9e4d2'][Math.floor(random() * 3)], { roughness: 0.45 });
    const accent = s.material(['#2a7fb8', '#2f9a8a', '#e07a2a'][Math.floor(random() * 3)], { roughness: 0.5 });
    const pumpBox = (y: number, rate: string) => {
      s.box([0.05, 0.07, 0.07], [0, y, 0.0], dark);
      s.rod([0, y, -0.03], [0, y, -0.075], 0.008, dark);
      s.cylinder(0.025, 0.025, 0.02, [0, y, -0.08], dark, 10).rotation.x = Math.PI / 2;
      s.mesh(new RoundedBoxGeometry(0.17, 0.2, 0.11, 3, 0.018), shell, [0.02, y, 0.085]);
      s.mesh(new THREE.PlaneGeometry(0.085, 0.045), screen(rate), [-0.012, y + 0.055, 0.1405]);
      s.box([0.1, 0.012, 0.004], [-0.012, y + 0.09, 0.141], accent);
      for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) s.box([0.022, 0.016, 0.006], [-0.042 + col * 0.03, y - 0.005 - row * 0.026, 0.141], row === 2 && col === 0 ? s.material('#3aa655') : row === 2 && col === 2 ? s.material('#c9382e') : grey);
      // Door with the tubing channel down the right-hand side.
      s.box([0.045, 0.19, 0.012], [0.078, y, 0.142], s.material('#c9d2d3', { roughness: 0.4 }));
      s.box([0.008, 0.19, 0.016], [0.078, y, 0.146], dark);
      const lamp = new THREE.MeshStandardMaterial({ color: a.display === 'alarm' ? '#ff3b2e' : a.display === 'off' ? '#3a3f42' : '#49e07a', emissive: a.display === 'alarm' ? '#ff2a1a' : a.display === 'off' ? '#000000' : '#35d968', emissiveIntensity: 1.4 });
      if (a.display === 'alarm') flashers.push(lamp);
      s.box([0.03, 0.012, 0.02], [0.02, y + 0.106, 0.1], lamp);
      return [0.078, y, 0.15] as P3;
    };
    let through: P3[] = [];
    let lowest = 1.05;
    if (a.pump === 'single') {
      const door = pumpBox(1.38, String(25 + Math.floor(random() * 20) * 5));
      through = [[door[0], door[1] + 0.11, door[2]], [door[0], door[1] - 0.11, door[2]]];
      lowest = 1.27;
    } else if (a.pump === 'stacked') {
      const door = pumpBox(1.5, String(25 + Math.floor(random() * 20) * 5));
      pumpBox(1.28, String(5 + Math.floor(random() * 15)));
      through = [[door[0], door[1] + 0.11, door[2]], [door[0], door[1] - 0.33, door[2]]];
      // Syringe driver: a long low box with a syringe laid along its top.
      s.box([0.05, 0.05, 0.07], [0, 1.08, 0], dark);
      s.mesh(new RoundedBoxGeometry(0.3, 0.09, 0.1, 3, 0.015), shell, [0.03, 1.08, 0.085]);
      s.mesh(new THREE.PlaneGeometry(0.07, 0.035), screen('2.5'), [-0.06, 1.08, 0.136]);
      const syringe = s.cylinder(0.014, 0.014, 0.15, [0.05, 1.14, 0.1], new THREE.MeshStandardMaterial({ color: '#f1f6f5', roughness: 0.15, transparent: true, opacity: 0.6 }), 12);
      syringe.rotation.z = Math.PI / 2;
      s.cylinder(0.012, 0.012, 0.08, [0.02, 1.14, 0.1], s.material('#e6dba0', { roughness: 0.2 }), 10).rotation.z = Math.PI / 2;
      s.box([0.012, 0.045, 0.045], [0.16, 1.14, 0.1], accent);
      lowest = 1.03;
      // Mains flex looped to the pole.
      s.tube([[0, 1.0, -0.03], [-0.08, 0.86, -0.05], [-0.03, 0.72, -0.07], [0.05, 0.82, -0.05], [0.0, 0.95, -0.04]], 0.006, dark);
    }

    // ---- The line --------------------------------------------------------------------------
    if (lineStart) {
      const pts: P3[] = [lineStart];
      const jitter = () => (random() - 0.5) * 0.04;
      if (through.length) {
        pts.push([through[0][0] + 0.0, through[0][1] + 0.06, through[0][2]], through[0], through[1], [through[1][0], through[1][1] - 0.08, through[1][2] + 0.01]);
      } else {
        const cy = lineStart[1] - 0.3;
        pts.push([lineStart[0], cy + 0.1, lineStart[2]], [lineStart[0], cy, lineStart[2]]);
        // Roller clamp.
        s.box([0.022, 0.05, 0.016], [lineStart[0], cy + 0.05, lineStart[2]], s.material('#f3f1e8'));
        s.cylinder(0.01, 0.01, 0.018, [lineStart[0], cy + 0.06, lineStart[2] + 0.006], s.material('#3b7fc4'), 10).rotation.z = Math.PI / 2;
      }
      const last = pts[pts.length - 1];
      if (a.line === 'coiled') {
        // Sag down, come back up and wind three loops that hang from the spare hook.
        const [hx, hy, hz] = spare;
        pts.push([last[0] + 0.05, lowest - 0.25, last[2] + 0.03], [(last[0] + hx) / 2, lowest - 0.38, (last[2] + hz) / 2 + 0.05], [hx * 1.1, lowest + 0.1, hz * 1.1], [hx, hy - 0.06, hz]);
        const loops = 3, r = 0.075;
        const out = new THREE.Vector3(hx, 0, hz).normalize(), across = new THREE.Vector3(-out.z, 0, out.x);
        for (let i = 1; i <= loops * 10; i++) {
          const angle = (i / 10) * Math.PI * 2;
          const side = Math.sin(angle) * r, drop = (1 - Math.cos(angle)) * r + 0.005;
          const creep = (i / (loops * 10) - 0.5) * 0.03;
          pts.push([hx + across.x * side + out.x * creep, hy - drop, hz + across.z * side + out.z * creep]);
        }
        const end = pts[pts.length - 1];
        s.cylinder(0.006, 0.006, 0.03, [end[0], end[1] - 0.012, end[2]], s.material('#d24a3a'), 8);
      } else if (a.line === 'trailing') {
        const heading = 0.4 + random() * 0.8, reach = 0.5 + random() * 0.15;
        const dx = Math.cos(heading), dz = Math.sin(heading);
        pts.push([last[0] + dx * 0.05 + jitter(), 0.75, last[2] + dz * 0.05], [last[0] + dx * 0.12, 0.3, last[2] + dz * 0.12 + jitter()], [dx * 0.3, 0.02, dz * 0.3], [dx * reach * 0.7 + jitter() * 3, 0.006, dz * reach * 0.7 + jitter() * 3], [dx * reach, 0.006, dz * reach]);
      } else {
        const sway = jitter() * 2;
        pts.push([last[0] + sway, 0.9, last[2] + 0.02], [last[0] + sway * 2, 0.5, last[2] + 0.03 + jitter()], [last[0] + sway * 3, 0.24, last[2] + 0.02]);
        const end = pts[pts.length - 1];
        s.cylinder(0.007, 0.004, 0.035, [end[0], end[1] - 0.015, end[2]], s.material('#3b7fc4'), 8);
      }
      s.tube(pts, 0.0042, tubing);
    }

    // ---- Company ---------------------------------------------------------------------------
    const tapeY = a.pump === 'stacked' ? 0.74 : 0.92;
    if (a.company === 'gown') {
      const towel = s.material(new THREE.Color('#5d7fa8').lerp(new THREE.Color('#c98a7a'), mood.warmth * 0.8), { roughness: 0.98 });
      const yTop = 1.72;
      s.mesh(new RoundedBoxGeometry(0.3, 0.1, 0.16, 3, 0.045), towel, [-0.02, yTop, -0.05]).rotation.z = 0.08;
      s.mesh(new RoundedBoxGeometry(0.22, 0.85, 0.07, 3, 0.03), towel, [-0.1, yTop - 0.44, -0.1]).rotation.set(0.04, 0.3, 0.05);
      s.mesh(new RoundedBoxGeometry(0.2, 0.7, 0.07, 3, 0.03), towel, [0.1, yTop - 0.37, -0.09]).rotation.set(0.05, -0.35, -0.06);
      s.mesh(new RoundedBoxGeometry(0.1, 0.5, 0.06, 3, 0.028), towel, [-0.23, yTop - 0.3, -0.06]).rotation.z = -0.25;
      s.tube([[0.12, yTop - 0.45, -0.05], [0.16, yTop - 0.7, -0.03], [0.13, yTop - 0.95, -0.04]], 0.012, towel);
    } else if (a.company === 'drawing') {
      const sheet = s.mesh(new THREE.PlaneGeometry(0.21, 0.297), new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide, map: paint(128, 180, (ctx) => {
        ctx.fillStyle = '#fbfaf3'; ctx.fillRect(0, 0, 128, 180);
        ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.strokeStyle = '#f2b918'; ctx.beginPath(); ctx.arc(98, 28, 14, 0, 7); ctx.stroke();
        for (let ray = 0; ray < 8; ray++) { ctx.beginPath(); ctx.moveTo(98 + Math.cos(ray) * 20, 28 + Math.sin(ray) * 20); ctx.lineTo(98 + Math.cos(ray) * 28, 28 + Math.sin(ray) * 28); ctx.stroke(); }
        ctx.strokeStyle = '#3aa64a'; ctx.beginPath(); ctx.moveTo(4, 160); ctx.lineTo(124, 156); ctx.stroke();
        const people = 2 + Math.floor(random() * 2);
        for (let i = 0; i < people; i++) {
          const px = 26 + i * 32, tall = 46 + random() * 30;
          ctx.strokeStyle = ['#d2392f', '#2b62b8', '#8b4a9c'][i % 3];
          ctx.beginPath(); ctx.arc(px, 156 - tall, 10, 0, 7); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(px, 166 - tall); ctx.lineTo(px, 140); ctx.moveTo(px - 12, 150 - tall * 0.6); ctx.lineTo(px + 12, 150 - tall * 0.6); ctx.moveTo(px, 140); ctx.lineTo(px - 9, 157); ctx.moveTo(px, 140); ctx.lineTo(px + 9, 157); ctx.stroke();
        }
        ctx.strokeStyle = '#d2392f'; ctx.beginPath(); ctx.moveTo(18, 30); ctx.bezierCurveTo(4, 12, 30, 8, 30, 24); ctx.bezierCurveTo(30, 8, 56, 12, 42, 30); ctx.lineTo(30, 44); ctx.closePath(); ctx.stroke();
      }) }), [0.0, tapeY, 0.02]);
      sheet.rotation.z = (random() - 0.5) * 0.2;
      for (const y of [tapeY + 0.13, tapeY - 0.12]) s.box([0.06, 0.03, 0.004], [0, y, 0.023], s.material('#e9e2c4', { roughness: 0.6 }));
    } else if (a.company === 'teddy') {
      const fur = s.material(new THREE.Color('#b98452').lerp(new THREE.Color('#e9c46a'), mood.cheer * 0.6), { roughness: 0.98 });
      const ink = s.material('#191613');
      const y = tapeY + 0.03, z = 0.06;
      s.ball([0.06, 0.07, 0.05], [0, y, z], fur);
      s.ball([0.05, 0.047, 0.047], [0, y + 0.1, z + 0.01], fur);
      s.ball([0.024, 0.02, 0.02], [0, y + 0.09, z + 0.05], s.material('#ead9b8', { roughness: 0.95 }), 10);
      for (const side of [-1, 1]) {
        s.ball([0.02, 0.02, 0.01], [side * 0.04, y + 0.14, z], fur, 10);
        s.ball([0.006, 0.006, 0.005], [side * 0.019, y + 0.112, z + 0.052], ink, 8);
        s.ball([0.02, 0.05, 0.02], [side * 0.07, y + 0.01, z + 0.01], fur, 10).rotation.z = side * 0.9;
        s.ball([0.022, 0.05, 0.022], [side * 0.035, y - 0.085, z + 0.015], fur, 10);
      }
      s.cylinder(0.064, 0.064, 0.035, [0, y, z - 0.012], s.material('#f1eee0', { roughness: 0.7 }), 16);
    } else if (a.company === 'carrier') {
      const [x, hy, z] = spare;
      const plastic = s.material(['#f2f2ee', '#f0d04a', '#4a8fd0', '#e86a3a'][Math.floor(random() * 4)], { roughness: 0.35 });
      s.tube([[x, hy + 0.005, z], [x - 0.03, hy - 0.12, z], [x - 0.07, hy - 0.2, z]], 0.005, plastic);
      s.tube([[x, hy + 0.005, z], [x + 0.03, hy - 0.12, z], [x + 0.07, hy - 0.2, z]], 0.005, plastic);
      const body = s.mesh(new RoundedBoxGeometry(0.26, 0.3, 0.16, 4, 0.07), plastic, [x, hy - 0.34, z]);
      body.rotation.y = Math.atan2(x, z);
      s.ball([0.07, 0.04, 0.05], [x + 0.02, hy - 0.2, z], s.material('#6a7f9c', { roughness: 0.95 }), 10);
    } else if (a.company === 'handle') {
      s.ring(0.13, 0.009, [0, 1.0, 0], chrome).rotation.x = Math.PI / 2;
      for (const angle of [0.6, 2.7, 4.6]) s.rod([0, 1.0, 0], [Math.cos(angle) * 0.13, 1.0, Math.sin(angle) * 0.13], 0.005, chrome);
      const basket = s.material('#c4cacb', { metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide });
      s.mesh(new THREE.CylinderGeometry(0.09, 0.075, 0.09, 14, 1, true), basket, [0, 0.82, 0.11]);
      s.cylinder(0.075, 0.075, 0.006, [0, 0.776, 0.11], basket, 14);
      s.lathe([[0, 0], [0.05, 0.004], [0.075, 0.05], [0.08, 0.052]], s.material('#b9ad98', { roughness: 0.95, side: THREE.DoubleSide }), [0.005, 0.8, 0.11]);
      s.tube([[0.02, 1.0, 0.13], [0.07, 0.9, 0.17], [0.1, 0.7, 0.16], [0.08, 0.62, 0.15]], 0.004, s.material('#e9e6dc'));
      s.mesh(new RoundedBoxGeometry(0.035, 0.09, 0.025, 2, 0.01), s.material('#e9e6dc'), [0.08, 0.58, 0.15]);
      s.cylinder(0.01, 0.01, 0.006, [0.08, 0.6, 0.164], s.material('#d5452f', { emissive: '#d5452f', emissiveIntensity: 0.4 }), 10).rotation.x = Math.PI / 2;
    }

    const rate = mix(0.25, 2.2, mood.energy) * (a.display === 'off' && a.pump !== 'gravity' ? 0 : 1);
    return s.finish({
      update: (_dt, time) => {
        for (const drip of drips) {
          const phase = (time * rate + drip.offset) % 1;
          drip.mesh.visible = rate > 0;
          drip.mesh.position.y = drip.top - phase * phase * drip.fall;
        }
        const on = Math.floor(time * mix(1.5, 4, mood.energy)) % 2 === 0;
        for (const material of flashers) material.emissiveIntensity = on ? 1.6 : 0.15;
      },
    });
  },
});
