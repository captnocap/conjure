import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const WORDS = { emergency: 'EMERGENCY', help: 'HELP', sos: 'SOS', assistance: 'ASSISTANCE', security: 'SECURITY' } as const;

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    form: choice('What kind of help point is it?', {
      tower: 'A tall square tower, twice head height, the campus blue-light phone.',
      column: 'A slim round column with a glowing collar.',
      roadside: 'A squat box on a steel post, like a motorway SOS phone.',
      totem: 'A wide flat totem with an information panel above the button, a station platform help point.',
    }),
    colour: choice('What colour is it?', {
      blue: 'Deep emergency blue.',
      yellow: 'High-visibility yellow.',
      orange: 'Motorway orange.',
      red: 'Fire-point red.',
      steel: 'Brushed stainless steel with a coloured stripe.',
    }),
    word: choice('What is lettered down its side?', {
      emergency: 'EMERGENCY',
      help: 'HELP',
      sos: 'SOS',
      assistance: 'ASSISTANCE',
      security: 'SECURITY',
    }),
    state: choice('What is happening at it right now?', {
      idle: 'Nothing. It waits, softly lit, as it has every night.',
      ringing: 'The button has just been pressed: the beacon is strobing and the panel is lit red, calling.',
      bagged: 'Out of service: a bin bag taped over the panel.',
      ripped: 'Vandalised: the panel hangs open with wires spilling out.',
      flowers: 'Working, with bunches of flowers and a candle left at its foot.',
    }),
    beacon: choice('What is on top?', {
      strobe: 'A blue strobe beacon in a wire cage.',
      globe: 'A big frosted globe that glows steadily.',
      bar: 'A flat lit sign box that says HELP on every side.',
      none: 'Nothing but a flat cap.',
    }),
    camera: noul('Does a camera dome hang from an arm near the top?'),
    solar: noul('Is there a small solar panel angled on top?'),
    plate: noul('Does it carry a location plate telling you where you are?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tint = { blue: '#1f4fb0', yellow: '#e8c21f', orange: '#ee6a1c', red: '#c8281e', steel: '#b4bbbd' }[a.colour];
    const ink = a.colour === 'yellow' ? '#16181a' : a.colour === 'steel' ? '#1f4fb0' : '#f6f5ee';
    const body = s.material(tint, { metalness: a.colour === 'steel' ? 0.7 : 0.15, roughness: a.colour === 'steel' ? 0.35 : 0.5 });
    const dark = s.material('#1c1f22'), steel = s.material('#c6cccd', { metalness: 0.8, roughness: 0.3 });
    const live = a.state !== 'bagged' && a.state !== 'ripped';
    const ringing = a.state === 'ringing';
    const lightTint = ringing ? '#ff3a2a' : '#3f8cff';
    const glowMats: THREE.MeshStandardMaterial[] = [];
    const glow = (colour: string, power: number) => { const m = new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: live ? power * mix(0.7, 1.2, mood.cheer) : 0.04, roughness: 0.4 }); glowMats.push(m); return m; };

    const lettering = (text: string, vertical: boolean, w: number, h: number) => paint(vertical ? 96 : 512, vertical ? 512 : 128, (ctx) => {
      ctx.fillStyle = tint; ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (vertical) { const size = Math.min(74, 480 / text.length); ctx.font = `bold ${size}px sans-serif`; [...text].forEach((ch, i) => ctx.fillText(ch, 48, 256 + (i - (text.length - 1) / 2) * size * 1.02, 84)); }
      else { ctx.font = 'bold 96px sans-serif'; ctx.fillText(text, 256, 68, 480); }
      ctx.fillStyle = `rgba(60,50,40,${mood.wear * 0.5})`;
      for (let i = 0; i < mood.wear * 90; i++) ctx.fillRect(random() * 512, random() * 512, 2 + random() * 8, 2 + random() * 5);
      void w; void h;
    });
    const word = WORDS[a.word];
    const face = (map: THREE.Texture, w: number, h: number, at: [number, number, number], turn = 0) => {
      const m = s.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.55 }), at);
      m.rotation.y = turn; m.castShadow = false;
      return m;
    };

    // Body by form. `front` is the z of the face that carries the panel, `panelY` its height.
    let top = 2.7, front = 0.15, panelY = 1.22, half = 0.17;
    s.cylinder(0.3, 0.32, 0.08, [0, 0.04, 0], s.material('#a6a59d', { roughness: 0.95 }), 20);
    if (a.form === 'tower') {
      top = 2.7; half = 0.17; front = 0.15;
      s.box([0.34, 2.62, 0.3], [0, 0.08 + 1.31, 0], body);
      const band = glow(lightTint, 1.6);
      s.box([0.35, 0.16, 0.31], [0, 2.42, 0], band);
      const map = lettering(word, true, 0.2, 1.0);
      for (const side of [-1, 1]) face(map, 0.19, 1.0, [side * 0.171, 1.72, 0], side * Math.PI / 2);
      face(map, 0.19, 0.78, [0, 1.92, front + 0.001]);
    } else if (a.form === 'column') {
      top = 2.5; half = 0.13; front = 0.13;
      s.cylinder(0.13, 0.13, 2.42, [0, 0.08 + 1.21, 0], body, 28);
      s.cylinder(0.16, 0.16, 0.05, [0, 0.105, 0], dark, 28);
      s.cylinder(0.145, 0.145, 0.22, [0, 2.2, 0], glow(lightTint, 1.6), 28);
      const map = lettering(word, true, 0.2, 1.0);
      for (const turn of [0.9, -0.9, Math.PI]) { const m = s.mesh(new THREE.CylinderGeometry(0.1315, 0.1315, 0.86, 12, 1, true, -0.45, 0.9), new THREE.MeshStandardMaterial({ map, roughness: 0.55 }), [0, 1.62, 0]); m.rotation.y = turn; }
      s.box([0.2, 0.44, 0.06], [0, panelY, 0.11], body);
    } else if (a.form === 'roadside') {
      top = 1.78; half = 0.24; front = 0.14; panelY = 1.38;
      s.cylinder(0.045, 0.045, 1.2, [0, 0.68, 0], steel, 14);
      s.box([0.48, 0.66, 0.28], [0, 1.45, 0], body);
      s.box([0.52, 0.04, 0.34], [0, 1.8, 0.01], body).rotation.x = 0.12;
      face(lettering(word, false, 0.44, 0.11), 0.44, 0.11, [0, 1.7, front + 0.001]);
      for (const side of [-1, 1]) face(lettering('SOS', false, 0.24, 0.06), 0.26, 0.065, [side * 0.241, 1.6, 0], side * Math.PI / 2);
      s.box([0.5, 0.03, 0.3], [0, 1.2, 0], glow(lightTint, 1.2));
    } else {
      top = 2.3; half = 0.3; front = 0.09; panelY = 1.12;
      s.box([0.6, 2.22, 0.18], [0, 0.08 + 1.11, 0], body);
      s.box([0.61, 0.1, 0.19], [0, 2.2, 0], glow(lightTint, 1.5));
      face(lettering(word, false, 0.52, 0.13), 0.52, 0.13, [0, 2.05, front + 0.001]);
      const info = paint(256, 256, (ctx) => {
        ctx.fillStyle = '#f4f2ea'; ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#1f4fb0'; ctx.beginPath(); ctx.arc(52, 52, 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 44px serif'; ctx.textAlign = 'center'; ctx.fillText('i', 52, 68);
        ctx.fillStyle = '#2a2d30'; for (let i = 0; i < 9; i++) ctx.fillRect(i < 2 ? 96 : 22, 40 + i * 22, (i < 2 ? 140 : 212) - random() * 60, 8);
      });
      face(info, 0.46, 0.46, [0, 1.68, front + 0.001]);
    }

    // The panel: plate, red button with a lit ring, speaker grille, indicator.
    const panel = new THREE.Group();
    panel.position.set(0, panelY, front);
    s.root.add(panel);
    const put = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => { const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); m.castShadow = true; panel.add(m); return m; };
    const pw = a.form === 'column' ? 0.17 : 0.25;
    const grille = paint(64, 64, (ctx) => { ctx.fillStyle = '#c6cccd'; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = '#1a1c1e'; for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) { ctx.beginPath(); ctx.arc(8 + x * 9.6, 8 + y * 9.6, 2.6, 0, Math.PI * 2); ctx.fill(); } });
    const plate = put(new THREE.BoxGeometry(pw, 0.4, 0.012), steel, 0, 0, 0.036 - (a.form === 'column' ? 0 : 0.03));
    const pz = plate.position.z + 0.007;
    put(new THREE.PlaneGeometry(pw * 0.62, pw * 0.62), new THREE.MeshStandardMaterial({ map: grille, roughness: 0.4, metalness: 0.5 }), 0, 0.09, pz);
    const ring = glow(ringing ? '#ff2a1a' : '#ff5a48', ringing ? 2.4 : 0.7);
    const ringMesh = put(new THREE.CylinderGeometry(0.058, 0.058, 0.012, 24), ring, 0, -0.09, pz + 0.005); ringMesh.rotation.x = Math.PI / 2;
    const button = put(new THREE.CylinderGeometry(0.042, 0.046, 0.035, 24), s.material('#d3281c', { roughness: 0.35 }), 0, -0.09, pz + (ringing ? 0.012 : 0.022)); button.rotation.x = Math.PI / 2;
    put(new THREE.BoxGeometry(0.02, 0.02, 0.006), glow(ringing ? '#ff2a1a' : '#39e06a', 2), pw / 2 - 0.03, 0.175, pz);
    const push = paint(128, 32, (ctx) => { ctx.fillStyle = '#c8281e'; ctx.fillRect(0, 0, 128, 32); ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('PUSH FOR HELP', 64, 23, 120); });
    put(new THREE.PlaneGeometry(pw * 0.86, pw * 0.2), new THREE.MeshStandardMaterial({ map: push, roughness: 0.6 }), 0, -0.172, pz);

    if (a.state === 'bagged') {
      const bag = s.material('#191a1c', { roughness: 0.35 });
      const sack = s.mesh(new THREE.SphereGeometry(1, 14, 10), bag, [0, panelY - 0.02, front + 0.03]);
      sack.scale.set(pw * 0.75 + 0.06, 0.3, 0.09);
      for (let i = 0; i < 6; i++) s.mesh(new THREE.TetrahedronGeometry(0.06 + random() * 0.05), bag, [(random() - 0.5) * pw, panelY - 0.26 - random() * 0.1, front + 0.03]).rotation.set(random() * 3, random() * 3, 0);
      const tape = s.material('#e8c21f', { roughness: 0.5 });
      for (const y of [0.2, -0.16]) s.box([half * 2 + 0.03, 0.045, 0.03], [0, panelY + y, front + 0.012], tape).rotation.z = (random() - 0.5) * 0.15;
      s.label('OUT OF SERVICE', 0.3, 0.08, [0, panelY + 0.02, front + 0.125], '#16181a', '#f2efe2').rotation.z = (random() - 0.5) * 0.3;
    } else if (a.state === 'ripped') {
      plate.rotation.set(0.5, 0, mix(0.2, 0.5, random())); plate.position.y -= 0.12; plate.position.z += 0.07;
      button.visible = ringMesh.visible = false;
      s.box([pw * 0.8, 0.32, 0.01], [0, panelY, front + 0.004], dark);
      const wires = ['#d8362a', '#e8c21f', '#2f74c4', '#f2f2ea', '#2fa35a'];
      for (let i = 0; i < 5; i++) { const x = (i - 2) * 0.03; s.tube([[x, panelY + 0.05, front], [x + (random() - 0.5) * 0.1, panelY - 0.1, front + 0.08 + random() * 0.05], [x + (random() - 0.5) * 0.14, panelY - 0.3 - random() * 0.2, front + 0.04]], 0.006, s.material(wires[i])); }
      const tagMap = paint(128, 128, (ctx) => { ctx.clearRect(0, 0, 128, 128); ctx.strokeStyle = ['#f2f2ea', '#111', '#e23bd0'][Math.floor(random() * 3)]; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); let x = 12, y = 70; ctx.moveTo(x, y); for (let k = 0; k < 9; k++) { x += 12; y += (k % 2 ? -1 : 1) * (22 + random() * 26); ctx.lineTo(x, y); } ctx.stroke(); });
      s.mesh(new THREE.PlaneGeometry(half * 1.7, half * 1.7), new THREE.MeshStandardMaterial({ map: tagMap, transparent: true, alphaTest: 0.4, roughness: 0.8 }), [0, panelY - 0.55, front + 0.004]);
    } else if (a.state === 'flowers') {
      const stems = s.material('#3f7a45');
      const petals = ['#f2f2ea', '#e8c21f', '#d8362a', '#e98ab0', '#b48ad8'];
      for (let b = 0; b < 2 + Math.round(mood.density * 3); b++) {
        const g = new THREE.Group();
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.36, 10, 1, true), s.material(['#b98a5a', '#e9b8c8', '#cfe3ea', '#e6dcbc'][Math.floor(random() * 4)], { roughness: 0.9 })); cone.rotation.z = Math.PI; cone.position.y = 0.18; (cone.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide; g.add(cone);
        const tint2 = petals[Math.floor(random() * petals.length)];
        for (let i = 0; i < 7; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 6), s.material(i % 3 ? tint2 : petals[Math.floor(random() * 5)])); f.position.set((random() - 0.5) * 0.17, 0.37 + random() * 0.07, (random() - 0.5) * 0.17); g.add(f); }
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), stems); leaf.position.y = 0.33; leaf.scale.y = 0.4; g.add(leaf);
        g.traverse((n) => { n.castShadow = true; });
        const t = mix(-1.1, 1.1, random());
        g.position.set(Math.sin(t) * (half + 0.2), 0.08, Math.cos(t) * (front + 0.2));
        g.rotation.order = 'YXZ'; g.rotation.y = t; g.rotation.x = -0.32 - random() * 0.15; g.rotation.z = (random() - 0.5) * 0.5;
        g.scale.setScalar(mix(1.1, 1.5, random()));
        s.root.add(g);
      }
      s.cylinder(0.035, 0.035, 0.09, [-half - 0.02, 0.045, front + 0.3], s.material('#d8362a', { transparent: false, roughness: 0.3 }), 12);
      s.ball([0.012, 0.022, 0.012], [-half - 0.02, 0.105, front + 0.3], glow('#ffc24a', 2.5), 8);
      s.label('WE MISS YOU', 0.2, 0.13, [half * 0.4, 0.07, front + 0.34], '#2a2d30', '#f6f3e6').rotation.x = -1.1;
    }

    // Beacon.
    let lamp: THREE.MeshStandardMaterial | null = null;
    if (a.beacon === 'strobe') {
      lamp = glow(ringing ? '#5aa2ff' : '#2f7dff', ringing ? 3 : 1.3);
      s.cylinder(0.09, 0.1, 0.04, [0, top + 0.02, 0], dark, 18);
      s.cylinder(0.065, 0.065, 0.15, [0, top + 0.115, 0], lamp, 18);
      s.ball([0.065, 0.04, 0.065], [0, top + 0.19, 0], lamp, 14);
      for (let i = 0; i < 6; i++) { const t = i / 6 * Math.PI * 2; s.rod([Math.cos(t) * 0.085, top + 0.04, Math.sin(t) * 0.085], [Math.cos(t) * 0.03, top + 0.25, Math.sin(t) * 0.03], 0.005, steel); }
      s.ring(0.083, 0.005, [0, top + 0.12, 0], steel).rotation.x = Math.PI / 2;
      top += 0.25;
    } else if (a.beacon === 'globe') {
      lamp = glow(ringing ? '#ff6a5a' : '#bcd6ff', 1.2);
      s.cylinder(0.05, 0.07, 0.06, [0, top + 0.03, 0], dark, 16);
      s.ball([0.16, 0.16, 0.16], [0, top + 0.2, 0], lamp, 20);
      top += 0.36;
    } else if (a.beacon === 'bar') {
      const map = paint(256, 96, (ctx) => { ctx.fillStyle = ringing ? '#c8281e' : '#1f4fb0'; ctx.fillRect(0, 0, 256, 96); ctx.fillStyle = '#fff'; ctx.font = 'bold 76px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('HELP', 128, 52); });
      lamp = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: live ? 1 : 0.05 });
      glowMats.push(lamp);
      s.box([0.5, 0.2, 0.14], [0, top + 0.12, 0], dark);
      for (const z of [0.071, -0.071]) s.mesh(new THREE.PlaneGeometry(0.47, 0.17), lamp, [0, top + 0.12, z]).rotation.y = z < 0 ? Math.PI : 0;
      top += 0.22;
    } else s.box([half * 2 + 0.03, 0.03, 0.2], [0, top + 0.015, 0], dark);

    if (a.solar) {
      s.rod([0, top - 0.05, -0.08], [0, top + 0.26, -0.16], 0.016, steel);
      const cells = paint(64, 64, (ctx) => { ctx.fillStyle = '#16264a'; ctx.fillRect(0, 0, 64, 64); ctx.strokeStyle = '#8fa6d0'; ctx.lineWidth = 1; for (let i = 0; i <= 4; i++) { ctx.strokeRect(i * 16, 0, 0.5, 64); ctx.strokeRect(0, i * 16, 64, 0.5); } });
      const panelMesh = s.box([0.46, 0.02, 0.34], [0, top + 0.28, -0.16], new THREE.MeshStandardMaterial({ map: cells, roughness: 0.2, metalness: 0.4 }));
      panelMesh.rotation.x = 0.5;
    }
    if (a.camera) {
      const y = Math.min(top, a.form === 'roadside' ? 1.74 : 2.5) - 0.12, dir = random() < 0.5 ? -1 : 1;
      s.rod([dir * half * 0.8, y, 0], [dir * (half + 0.3), y + 0.04, 0.02], 0.016, steel);
      s.cylinder(0.075, 0.075, 0.04, [dir * (half + 0.3), y + 0.02, 0.02], s.material('#eceee8'), 16);
      s.ball([0.065, 0.065, 0.065], [dir * (half + 0.3), y - 0.01, 0.02], s.material('#121416', { roughness: 0.15 }), 16);
    }
    if (a.plate) {
      const code = `${['P', 'LEVEL ', 'ZONE ', 'GATE '][Math.floor(random() * 4)]}${1 + Math.floor(random() * 8)}${['A', 'B', 'C', ''][Math.floor(random() * 4)]}`;
      const map = paint(256, 128, (ctx) => { ctx.fillStyle = '#f4f2ea'; ctx.fillRect(0, 0, 256, 128); ctx.fillStyle = '#16181a'; ctx.textAlign = 'center'; ctx.font = 'bold 24px sans-serif'; ctx.fillText('YOU ARE AT', 128, 36); ctx.font = 'bold 58px sans-serif'; ctx.fillText(code, 128, 100, 236); });
      const y = a.form === 'roadside' ? 1.02 : panelY - 0.42;
      if (a.form === 'roadside') s.box([0.3, 0.16, 0.012], [0, y, 0.05], steel);
      face(map, 0.28, 0.14, [0, y, (a.form === 'roadside' ? 0.058 : front + (a.form === 'column' ? 0.012 : 0.002))]);
    }
    // Grime climbing from the foot.
    if (mood.wear > 0.4) {
      const rust = s.material('#6e4a33', { roughness: 1 });
      for (let i = 0; i < (mood.wear - 0.4) * 16; i++) { const t = random() * Math.PI * 2, r = a.form === 'roadside' ? 0.047 : half + 0.004; s.box([0.03 + random() * 0.05, 0.05 + random() * 0.2, 0.004], [Math.sin(t) > 0 ? (random() - 0.5) * half * 1.6 : (random() - 0.5) * half * 1.6, 0.12 + random() * 0.25, a.form === 'roadside' ? r : (Math.sin(t) > 0 ? front + 0.002 : -front - 0.002)], rust); }
    }

    const base = glowMats.map((m) => m.emissiveIntensity);
    const lampIndex = lamp ? glowMats.indexOf(lamp) : -1;
    const ringIndex = glowMats.indexOf(ring);
    return s.finish({
      update: live ? (_dt, time) => {
        const rate = mix(1.5, 9, mood.energy);
        if (ringing) {
          const flash = Math.sin(time * rate * 2) > 0.3 ? 1.3 : 0.15;
          if (lampIndex >= 0) glowMats[lampIndex].emissiveIntensity = base[lampIndex] * flash;
          glowMats[ringIndex].emissiveIntensity = base[ringIndex] * (0.6 + 0.4 * Math.sin(time * rate));
        } else if (lampIndex >= 0 && a.beacon === 'strobe') glowMats[lampIndex].emissiveIntensity = base[lampIndex] * (0.8 + 0.2 * Math.sin(time * rate * 0.3));
      } : undefined,
    });
  },
});
