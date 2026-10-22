import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const SHELL = { white: '#f2f1ec', cream: '#e9dfc2', blue: '#b9d3e6', pink: '#eec7cf', charcoal: '#4a4d52' } as const;
const LEVEL = { silent: 0.6, murmur: 3.2, crying: 6.6 } as const;

export default defineThing({
  questions: {
    sound: choice('What is it hearing right now?', {
      silent: 'Silence: one small green light, the room asleep.',
      murmur: 'Murmuring and rustling: the green lights rise and fall.',
      crying: 'Full cry: every light lit, peaking into red.',
    }),
    kind: choice('What kind of monitor is it?', {
      audio: 'A slim audio handset with a speaker grille and an arc of lights.',
      video: 'A video monitor with a small night-vision screen.',
      vintage: 'A chunky 1990s walkie-talkie style unit with a long telescopic aerial.',
    }),
    shell: choice('What colour is the plastic?', {
      white: 'Clean appliance white.',
      cream: 'Cream, like old computer plastic.',
      blue: 'Powder blue.',
      pink: 'Pale pink.',
      charcoal: 'Charcoal grey.',
    }),
    pose: choice('Where is the handset?', {
      docked: 'Upright in its charging base.',
      lying: 'Lying face up beside the base, carried around and put down.',
      pair: 'In its base with the nursery unit standing next to it, the whole set together.',
    }),
    screen: choice('If it has a screen, what does it show?', {
      sleeping: 'A grainy shape asleep behind cot bars.',
      empty: 'An empty cot, sheets flat.',
      noise: 'Static: no signal from the other room.',
    }),
    battery: noul('Is the low-battery light on?'),
    dummy: noul('Is a baby dummy (pacifier) lying next to it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tone = new THREE.Color(SHELL[a.shell]).lerp(new THREE.Color('#d8c88f'), a.shell === 'charcoal' ? 0 : mood.wear * 0.35);
    const shell = s.material(tone, { roughness: 0.42 });
    const dark = s.material('#2c2f33', { roughness: 0.5 });
    const hex = `#${tone.getHexString()}`;
    const ink = a.shell === 'charcoal' ? '#c9ccd0' : '#6b6f75';

    const [w, h, d] = a.kind === 'audio' ? [0.064, 0.128, 0.03] : a.kind === 'video' ? [0.125, 0.084, 0.024] : [0.074, 0.15, 0.042];
    const unit = new THREE.Group();
    const u = <T extends THREE.Object3D>(node: T) => { unit.add(node); return node; };
    u(s.mesh(new RoundedBoxGeometry(w, h, d, 5, a.kind === 'vintage' ? 0.008 : 0.012), shell, [0, h / 2, 0]));

    // Front face: speaker grille or screen, painted.
    const face = document.createElement('canvas');
    face.width = Math.round(512 * w / Math.max(w, h)); face.height = Math.round(512 * h / Math.max(w, h));
    const g = face.getContext('2d')!;
    const W = face.width, H = face.height;
    g.fillStyle = hex; g.fillRect(0, 0, W, H);
    let glow: THREE.Texture | null = null;
    if (a.kind === 'video') {
      const view = document.createElement('canvas'); view.width = 256; view.height = 176;
      const v = view.getContext('2d')!;
      v.fillStyle = '#26302c'; v.fillRect(0, 0, 256, 176);
      if (a.screen === 'noise') {
        for (let i = 0; i < 2600; i++) { const q = random() * 200 + 40; v.fillStyle = `rgb(${q},${q},${q})`; v.fillRect(random() * 256, random() * 176, 3, 2); }
        v.fillStyle = '#fff'; v.font = 'bold 22px monospace'; v.fillText('NO SIGNAL', 66, 96);
      } else {
        v.fillStyle = '#4c5c55'; v.fillRect(20, 60, 216, 96);
        v.fillStyle = '#9fb3a8'; v.fillRect(28, 78, 200, 70);
        if (a.screen === 'sleeping') {
          v.fillStyle = '#dfeee6'; v.beginPath(); v.ellipse(140, 112, 52, 24, 0.1, 0, 7); v.fill();
          v.beginPath(); v.arc(82, 104, 19, 0, 7); v.fill();
          v.fillStyle = '#26302c'; v.fillRect(72, 104, 9, 3);
        }
        v.fillStyle = '#1c2421'; for (let x = 20; x < 240; x += 24) v.fillRect(x, 52, 7, 124);
        v.fillRect(12, 44, 232, 10);
        v.fillStyle = '#e6f2ea'; v.font = '14px monospace'; v.fillText('02:47', 200, 20); v.fillText('● REC'.replace('REC', '21°C'), 10, 20);
      }
      glow = new THREE.CanvasTexture(view); glow.colorSpace = THREE.SRGBColorSpace;
      g.fillStyle = '#17191b'; g.fillRect(W * 0.05, H * 0.2, W * 0.74, H * 0.72);
      g.fillStyle = ink; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(W * 0.9, H * (0.38 + i * 0.2), W * 0.035, 0, 7); g.fill(); }
    } else {
      const cx = W / 2, cy = H * (a.kind === 'vintage' ? 0.56 : 0.6), R = W * (a.kind === 'vintage' ? 0.36 : 0.33);
      g.fillStyle = a.shell === 'charcoal' ? '#1d1f22' : '#3a3d42';
      if (a.kind === 'vintage') { for (let y = -4; y <= 4; y++) g.fillRect(cx - R, cy + y * R * 0.22 - R * 0.045, R * 2, R * 0.09); }
      else for (let ring = 0; ring < 5; ring++) for (let i = 0; i < Math.max(1, ring * 6); i++) { const q = i / Math.max(1, ring * 6) * Math.PI * 2; g.beginPath(); g.arc(cx + Math.cos(q) * ring * R / 4.4, cy + Math.sin(q) * ring * R / 4.4, R * 0.07, 0, 7); g.fill(); }
      g.fillStyle = ink; g.font = `bold ${W * 0.085}px sans-serif`; g.textAlign = 'center';
      g.fillText(a.kind === 'vintage' ? 'NURSERY  CH A' : 'babylink', cx, H * 0.95);
      g.beginPath(); g.arc(W * 0.5, H * 0.87, W * 0.06, 0, 7); g.fill();
    }
    if (mood.wear > 0.5) { g.strokeStyle = 'rgba(90,80,60,0.35)'; g.lineWidth = 2; for (let i = 0; i < mood.wear * 14; i++) { g.beginPath(); const x = random() * W, y = random() * H; g.moveTo(x, y); g.lineTo(x + (random() - 0.5) * 60, y + (random() - 0.5) * 60); g.stroke(); } }
    const faceMap = new THREE.CanvasTexture(face); faceMap.colorSpace = THREE.SRGBColorSpace;
    u(s.mesh(new THREE.PlaneGeometry(w - 0.012, h - 0.012), new THREE.MeshStandardMaterial({ map: faceMap, roughness: 0.45 }), [0, h / 2, d / 2 + 0.0004]));
    if (glow) u(s.mesh(new THREE.PlaneGeometry(w * 0.7, h * 0.66), new THREE.MeshStandardMaterial({ color: '#ffffff', map: glow, emissive: '#ffffff', emissiveMap: glow, emissiveIntensity: 0.9, roughness: 0.2 }), [-w * 0.08, h * 0.44, d / 2 + 0.0008]));

    // The row of level lights.
    const lights: THREE.MeshStandardMaterial[] = [];
    const hues = ['#35d05a', '#35d05a', '#35d05a', '#7fd838', '#f0c22a', '#f58a22', '#f0352b'];
    const span = a.kind === 'video' ? w * 0.6 : w * 0.72;
    hues.forEach((hue, i) => {
      const material = new THREE.MeshStandardMaterial({ color: '#30332f', emissive: hue, emissiveIntensity: 0, roughness: 0.3 });
      lights.push(material);
      const t = i / (hues.length - 1) - 0.5;
      const y = a.kind === 'video' ? h * 0.89 : h * (a.kind === 'vintage' ? 0.86 : 0.24) + (a.kind === 'audio' ? -Math.cos(t * Math.PI) * 0.006 + 0.004 : 0);
      u(s.mesh(new RoundedBoxGeometry(span / 9.5, a.kind === 'video' ? 0.007 : 0.013, 0.003, 2, 0.001), material, [t * span + (a.kind === 'video' ? -w * 0.08 : 0), y, d / 2 + 0.001]));
    });
    if (a.kind === 'audio') { // audio handset carries its lights above the grille
      unit.children.slice(-7).forEach((led) => { led.position.y = h * 0.86 - Math.abs(led.position.x) * 0.25; });
    }
    const tints = hues.map((hue) => new THREE.Color(hue));

    // Aerial, side buttons, belt clip.
    const ax = w / 2 - 0.012;
    if (a.kind === 'vintage') {
      u(s.cylinder(0.005, 0.006, 0.03, [ax, h + 0.015, -0.005], dark, 10));
      const reach = mix(0.07, 0.16, random());
      u(s.rod([ax, h + 0.03, -0.005], [ax + 0.012, h + 0.03 + reach, -0.005], 0.0022, s.material('#b9bcc0', { metalness: 0.8, roughness: 0.3 })));
      u(s.ball([0.004, 0.004, 0.004], [ax + 0.012, h + 0.032 + reach, -0.005], dark, 8));
      u(s.cylinder(0.011, 0.011, 0.008, [-w / 2 + 0.016, h + 0.004, 0], dark, 14));
      u(s.box([0.03, 0.07, 0.008], [0, h * 0.6, -d / 2 - 0.004], dark));
    } else {
      u(s.cylinder(0.0055, 0.007, 0.036, [ax, h + 0.016, -0.003], dark, 12));
      u(s.ball([0.0058, 0.004, 0.0058], [ax, h + 0.034, -0.003], dark, 10));
    }
    for (const y of [0.55, 0.72]) u(s.box([0.004, h * 0.1, d * 0.4], [-w / 2 - 0.001, h * y, 0], dark));
    const low = new THREE.MeshStandardMaterial({ color: '#40332f', emissive: '#ff3a1e', emissiveIntensity: a.battery ? 2 : 0 });
    u(s.mesh(new THREE.SphereGeometry(0.0028, 8, 6), low, [-w / 2 + 0.011, a.kind === 'video' ? h * 0.1 : h * 0.955, d / 2 + 0.0008]));

    // Charging base.
    const bw = w + 0.03, bd = d + 0.04;
    s.mesh(new RoundedBoxGeometry(bw, 0.022, bd, 4, 0.008), shell, [0, 0.011, 0]);
    s.box([bw * 0.8, 0.012, d + 0.008], [0, 0.021, -0.002], dark);
    s.box([bw * 0.86, 0.03, 0.01], [0, 0.03, -d / 2 - 0.012], shell);
    s.mesh(new THREE.SphereGeometry(0.003, 8, 6), new THREE.MeshStandardMaterial({ color: '#333', emissive: a.pose === 'lying' ? '#000000' : '#ff9a2a', emissiveIntensity: 1.6 }), [bw / 2 - 0.012, 0.022, bd / 2 - 0.006]);
    const turn = random() < 0.5 ? -1 : 1;
    s.tube([[0, 0.008, -bd / 2], [0, 0.004, -bd / 2 - 0.03], [turn * 0.03, 0.004, -bd / 2 - 0.06], [turn * 0.075, 0.004, -bd / 2 - 0.05], [turn * 0.1, 0.004, -bd / 2 - 0.075 - random() * 0.02]], 0.0022, dark);

    s.root.add(unit);
    if (a.pose === 'lying') {
      unit.rotation.set(-Math.PI / 2 + 0.02, 0, (random() - 0.5) * 1.2, 'YXZ');
      unit.rotation.y = (random() - 0.5) * 1.0;
      unit.position.set(-(bw / 2 + Math.max(w, h) / 2 + 0.005), d / 2 + 0.0005, 0.04);
      unit.rotation.z = 0;
    } else {
      unit.position.set(0, 0.016, 0.002); unit.rotation.x = -0.14;
    }

    if (a.pose === 'pair') {
      // The nursery-end unit: a camera on a stalk for video, a squat transmitter with a night light otherwise.
      const x = bw / 2 + 0.07, z = -0.01;
      if (a.kind === 'video') {
        s.cylinder(0.03, 0.034, 0.012, [x, 0.006, z], shell, 20);
        s.cylinder(0.007, 0.007, 0.06, [x, 0.04, z], shell, 10);
        s.ball([0.03, 0.03, 0.03], [x, 0.09, z], shell, 20);
        const lens = s.cylinder(0.013, 0.013, 0.012, [x - 0.012, 0.086, z + 0.024], dark, 16);
        lens.rotation.set(1.35, 0, 0.45);
        s.mesh(new THREE.SphereGeometry(0.003, 8, 6), new THREE.MeshStandardMaterial({ color: '#300', emissive: '#ff2a2a', emissiveIntensity: 1.5 }), [x + 0.012, 0.1, z + 0.024]);
      } else {
        s.mesh(new RoundedBoxGeometry(0.07, 0.085, 0.045, 4, 0.014), shell, [x, 0.0425, z]);
        s.cylinder(0.02, 0.02, 0.004, [x, 0.04, z + 0.023], dark, 18).rotation.x = Math.PI / 2;
        s.ball([0.022, 0.012, 0.018], [x, 0.088, z], new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd77a', emissiveIntensity: 0.9, roughness: 0.4 }), 14);
        s.cylinder(0.005, 0.006, 0.03, [x + 0.022, 0.1, z - 0.008], dark, 10);
      }
    }

    if (a.dummy) {
      const px = a.pose === 'pair' ? -(bw / 2 + 0.06) : bw / 2 + 0.06, pz = 0.03 + random() * 0.03;
      const colour = s.material(new THREE.Color().setHSL(random(), 0.5, 0.68), { roughness: 0.35 });
      const turnY = random() * 6;
      const dummy = new THREE.Group(); dummy.position.set(px, 0, pz); dummy.rotation.y = turnY; s.root.add(dummy);
      const shield = s.cylinder(0.021, 0.021, 0.004, [0, 0.021, 0], colour, 20); shield.rotation.x = Math.PI / 2; shield.scale.x = 1.25; dummy.add(shield);
      dummy.add(s.ball([0.008, 0.008, 0.013], [0, 0.021, 0.014], s.material('#e9d7ae', { roughness: 0.3, transparent: true, opacity: 0.85 }), 10));
      const ring = s.ring(0.014, 0.0028, [0, 0.016, -0.012], colour); ring.rotation.x = 0.6; dummy.add(ring);
    }

    // Light the row for the still frame, then keep it moving.
    const base = LEVEL[a.sound], speed = mix(0.6, 3.2, mood.energy), jitter = random() * 10;
    const show = (level: number) => {
      lights.forEach((material, i) => { const on = i < level ? Math.min(1, level - i) : 0; material.emissiveIntensity = 0.03 + on * 1.25; material.color.set('#30332f').lerp(tints[i], on); });
    };
    show(base + (a.sound === 'silent' ? 0.4 : 0.6));
    return s.finish({
      update: (_dt, time) => {
        const t = time * speed + jitter;
        const wave = Math.sin(t * 2.1) * 0.5 + Math.sin(t * 5.3 + 1) * 0.3 + Math.sin(t * 11.7) * 0.2;
        show(Math.max(a.sound === 'silent' ? (Math.sin(t * 0.7) > 0.93 ? 2 : 1) : 1, base + wave * (a.sound === 'silent' ? 0 : a.sound === 'murmur' ? 2 : 0.9)));
        if (a.battery) low.emissiveIntensity = Math.sin(time * 4) > 0 ? 2.2 : 0.1;
      },
    });
  },
});
