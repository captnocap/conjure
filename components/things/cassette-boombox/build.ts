import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const paint = (width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const TAPE_TITLES = {
  crush: ['FOR YOU', 'SONGS 4 U', 'listen to side B', 'DON\'T LAUGH', 'us ♥'],
  summer: ['SUMMER MIX', 'BEACH TAPE', 'ROAD TRIP', 'JULY vol.2', 'WINDOWS DOWN'],
  radio: ['OFF THE RADIO', 'TOP 40 wk 12', 'DO NOT ERASE', 'LATE SHOW', 'CHART 3'],
  heartbreak: ['SAD SONGS', 'NEVER AGAIN', 'RAIN', 'FOR NOBODY', '3 A.M.'],
  party: ['PARTY!!', 'DANCE MIX', 'LOUD', 'BREAKS vol.1', 'FRIDAY'],
} as const;

export default defineThing({
  questions: {
    body: choice('What does the boombox look like?', {
      silver: 'Brushed silver plastic with chrome trim, the early-eighties original.',
      black: 'Big matte black slab with chrome speaker rings, a street-corner ghetto blaster.',
      red: 'Glossy fire-engine red, bought to be noticed.',
      pastel: 'Pink and turquoise with rounded corners, a bedroom radio for a twelve-year-old.',
      sport: 'Yellow and grey rubber-edged sports model, splashproof and loud.',
      graffiti: 'Black body spray-painted over in clashing colours by its owner.',
    }),
    state: choice('What is it doing right now?', {
      playing: 'Playing loud: reels turning, the play key down, level lights jumping.',
      open: 'The tape door hangs open with a cassette half pulled out, mid-swap.',
      chewed: 'It has eaten a tape: brown ribbon spills out of the open door in a tangle.',
      recording: 'Recording off the radio: the red key down, a finger\'s width from pause.',
      silent: 'Switched off and closed, waiting.',
    }),
    aerial: score('How far is the aerial pulled out?', ['Folded flat along the top', 'Half out', 'Fully extended and angled at the window']),
    speakers: choice('What are the speakers like?', {
      woofers: 'One huge bare woofer cone each side.',
      twoway: 'A woofer with a small tweeter above it each side.',
      grilles: 'Cones hidden behind perforated metal grilles.',
      rings: 'Woofers ringed with lights that pulse to the music.',
    }),
    stickers: choice('What has been stuck on it?', {
      none: 'Nothing, it is kept clean.',
      bands: 'Black and white band stickers and a tour-date strip.',
      skate: 'Skate and surf shop stickers, bolts and stars.',
      hearts: 'Puffy hearts, stars and smileys.',
      name: 'An embossed label-maker strip with the owner\'s name, and a price sticker never peeled.',
    }),
    tapes: score('How many mixtapes are piled beside it?', ['None', 'One, the important one', 'A small stack', 'A sliding heap of a dozen']),
    labels: choice('If there are mixtapes, what is written on them?', {
      crush: 'Tapes made for someone: careful lettering and a small heart.',
      summer: 'Summer and road-trip mixes.',
      radio: 'Songs taped off the radio, DO NOT ERASE.',
      heartbreak: 'Sad songs for after it ended.',
      party: 'Party and dance mixes in capital letters.',
    }),
    size: score('How big is it?', ['A compact bedroom radio-cassette', 'A proper shoulder-carried boombox', 'A monstrous three-foot ghetto blaster']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const big = mix(0.0, 1.0, a.size);
    const W = mix(0.46, 0.86, big), H = mix(0.25, 0.4, big), D = mix(0.12, 0.2, big);
    const u = H / 0.3; // detail scale
    const front = D / 2;
    const live = a.state === 'playing' || a.state === 'recording';

    const palette = {
      silver: ['#b9bdc0', '#2a2c30', '#e6e8ea'], black: ['#1f2023', '#101113', '#d9dde0'], red: ['#c8202a', '#1c1c1f', '#e6e8ea'],
      pastel: ['#f29ac0', '#3cc0c4', '#fff4f8'], sport: ['#f2c81e', '#4a4f55', '#2a2c30'], graffiti: ['#232428', '#101113', '#c9cdd0'],
    }[a.body];
    const body = s.material(palette[0], { roughness: a.body === 'red' ? 0.25 : 0.5, metalness: a.body === 'silver' ? 0.45 : 0.05 });
    const panel = s.material(palette[1], { roughness: 0.6 });
    const trim = s.material(palette[2], { metalness: a.body === 'pastel' ? 0 : 0.85, roughness: 0.25 });
    const dark = s.material('#0e0f11', { roughness: 0.8 });
    const cone = s.material('#2b2c30', { roughness: 0.9 });

    // Cabinet.
    s.mesh(new RoundedBoxGeometry(W, H, D, 3, a.body === 'pastel' ? 0.04 * u : 0.014 * u), body, [0, H / 2 + 0.008, 0]);
    s.box([W * 0.36, H * 0.86, 0.006], [0, H / 2 + 0.008, front], panel);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.05 * u, 0.012, 0.02 * u], [x * W * 0.38, 0.006, z * D * 0.3], dark);
    if (a.body === 'sport') for (const x of [-1, 1]) s.mesh(new RoundedBoxGeometry(0.03 * u, H * 1.03, D * 1.08, 2, 0.01), panel, [x * (W / 2 - 0.006), H / 2 + 0.008, 0]);
    if (a.body === 'graffiti') {
      const spray = paint(256, 128, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < 26; i++) {
          ctx.strokeStyle = ['#ff3ea0', '#3af0e0', '#ffe23a', '#7dff3a', '#ff7a1c', '#ffffff'][Math.floor(random() * 6)];
          ctx.lineWidth = 3 + random() * 9; ctx.lineCap = 'round'; ctx.globalAlpha = 0.85;
          ctx.beginPath();
          let x = random() * w, y = random() * h;
          ctx.moveTo(x, y);
          for (let j = 0; j < 3; j++) { x += (random() - 0.5) * 90; y += (random() - 0.5) * 60; ctx.quadraticCurveTo(x + (random() - 0.5) * 60, y + (random() - 0.5) * 60, x, y); }
          ctx.stroke();
        }
      });
      const tag = new THREE.MeshStandardMaterial({ map: spray, transparent: true, roughness: 0.6 });
      s.mesh(new THREE.PlaneGeometry(W * 0.98, D * 0.96), tag, [0, H + 0.0085, 0]).rotation.x = -Math.PI / 2;
      for (const x of [-1, 1]) s.mesh(new THREE.PlaneGeometry(W * 0.3, H * 0.96), tag, [x * W * 0.34, H / 2 + 0.008, front + 0.0012]).castShadow = false;
    }

    // Speakers.
    const R = Math.min(W * 0.145, H * 0.36);
    const sx = W / 2 - R - 0.022 * u, sy = a.speakers === 'twoway' ? H * 0.4 : H * 0.47;
    const cones: THREE.Object3D[] = [];
    const speaker = (x: number, y: number, r: number, hidden: boolean) => {
      const group = new THREE.Group();
      group.position.set(x, y, front);
      group.rotation.x = Math.PI / 2;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.09, 10, 40), trim);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.002;
      group.add(ring);
      if (hidden) {
        const mesh = paint(128, 128, (ctx) => {
          ctx.fillStyle = '#3a3c40'; ctx.fillRect(0, 0, 128, 128);
          ctx.fillStyle = '#0c0c0e';
          for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { ctx.beginPath(); ctx.arc(4 + i * 8 + (j % 2) * 4, 4 + j * 8, 2.6, 0, 7); ctx.fill(); }
        });
        const grille = new THREE.Mesh(new THREE.CircleGeometry(r * 0.96, 36), new THREE.MeshStandardMaterial({ map: mesh, metalness: 0.5, roughness: 0.5 }));
        grille.rotation.x = -Math.PI / 2;
        grille.position.y = 0.004;
        group.add(grille);
      } else {
        const profile = [[r * 0.97, 0.001], [r * 0.88, r * 0.07], [r * 0.78, 0.004], [r * 0.3, 0.002], [0.001, 0.002]].map(([px, py]) => new THREE.Vector2(px, py));
        const paper = new THREE.Mesh(new THREE.LatheGeometry(profile, 32), cone);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), s.material(a.body === 'pastel' ? palette[1] : '#6a6e75', { roughness: 0.35, metalness: 0.3 }));
        cap.position.y = 0.002;
        cap.scale.y = 0.45;
        const moving = new THREE.Group();
        moving.add(paper, cap);
        group.add(moving);
        cones.push(moving);
      }
      group.traverse((n) => { n.castShadow = n.receiveShadow = true; });
      s.root.add(group);
    };
    const lamps: THREE.MeshStandardMaterial[] = [];
    for (const side of [-1, 1]) {
      speaker(side * sx, sy, R, a.speakers === 'grilles');
      if (a.speakers === 'twoway') speaker(side * (sx + R * 0.35), sy + R * 1.42, R * 0.3, false);
      if (a.speakers === 'rings') {
        const lampMaterial = new THREE.MeshStandardMaterial({ color: '#ff5a3a', emissive: side < 0 ? '#ff3a6a' : '#3ac8ff', emissiveIntensity: live ? 1.2 : 0.08 });
        lamps.push(lampMaterial);
        const bulbs = [];
        for (let i = 0; i < 14; i++) bulbs.push({ at: [side * sx + Math.cos(i / 14 * 6.283) * R * 1.17, sy + Math.sin(i / 14 * 6.283) * R * 1.17, front + 0.003] as const, size: R * 0.05 });
        s.scatter(new THREE.SphereGeometry(1, 8, 6), lampMaterial, bulbs).castShadow = false;
      }
    }

    // Centre stack: tuner strip, level lights, twin decks, keys.
    const cw = W * 0.34;
    const dial = paint(256, 48, (ctx, w, h) => {
      ctx.fillStyle = '#e9e2c4'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1c1c1c'; ctx.font = 'bold 11px monospace';
      for (let i = 0; i < 40; i++) ctx.fillRect(10 + i * 6, i % 5 === 0 ? 22 : 28, 1.5, i % 5 === 0 ? 14 : 8);
      ['FM 88', '92', '96', '100', '104', '108'].forEach((text, i) => ctx.fillText(text, 6 + i * 42, 14));
      ctx.fillStyle = '#d8202c'; ctx.fillRect(20 + random() * 200, 2, 3, h - 4);
    });
    s.mesh(new THREE.PlaneGeometry(cw * 0.94, H * 0.12), new THREE.MeshStandardMaterial({ map: dial, roughness: 0.4, emissive: '#fff2c0', emissiveMap: dial, emissiveIntensity: live ? 0.5 : 0 }), [0, H * 0.84, front + 0.0045]);
    const leds: THREE.MeshStandardMaterial[] = [];
    for (let i = 0; i < 8; i++) {
      const hot = i > 5;
      const led = new THREE.MeshStandardMaterial({ color: hot ? '#5a1614' : '#1c4a20', emissive: hot ? '#ff3020' : '#40ff50', emissiveIntensity: 0 });
      leds.push(led);
      s.box([cw * 0.085, H * 0.035, 0.004], [(-3.5 + i) * cw * 0.115, H * 0.73, front + 0.005], led).castShadow = false;
    }
    const doorW = cw * 0.44, doorH = H * 0.3, doorY = H * 0.47;
    const reels: THREE.Object3D[] = [];
    const cassette = (shell: string) => {
      const group = new THREE.Group();
      const shellMesh = new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.9, doorH * 0.78, 0.009 * u), s.material(shell, { roughness: 0.4 }));
      group.add(shellMesh);
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(doorW * 0.8, doorH * 0.22), s.material('#f1ead6'));
      strip.position.set(0, doorH * 0.22, 0.0047 * u);
      group.add(strip);
      for (const x of [-1, 1]) {
        const reel = new THREE.Group();
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(doorH * 0.13, doorH * 0.13, 0.002, 6), s.material('#f4f4f0'));
        hub.rotation.x = Math.PI / 2;
        const spool = new THREE.Mesh(new THREE.CylinderGeometry(doorH * (x < 0 ? 0.24 : 0.17), doorH * (x < 0 ? 0.24 : 0.17), 0.001, 20), s.material('#3a2618'));
        spool.rotation.x = Math.PI / 2;
        spool.position.z = -0.0006;
        reel.add(spool, hub);
        reel.position.set(x * doorW * 0.22, -doorH * 0.06, 0.0052 * u);
        group.add(reel);
        reels.push(reel);
      }
      group.traverse((n) => { n.castShadow = true; });
      return group;
    };
    const shells = ['#2a2a2e', '#e8e4d8', '#c8343a', '#3a6ac0', '#e8c63a', '#5a5e62'];
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const clear = new THREE.MeshPhysicalMaterial({ color: '#cfe0e8', transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false });
    [-1, 1].forEach((side) => {
      const x = side * cw * 0.25;
      const opened = side < 0 && (a.state === 'open' || a.state === 'chewed');
      s.box([doorW, doorH, 0.004], [x, doorY, front + 0.003], dark);
      const door = new THREE.Group();
      door.position.set(x, doorY - doorH / 2, front + 0.006);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.006), panel);
      frame.position.y = doorH / 2;
      const windowPane = new THREE.Mesh(new THREE.PlaneGeometry(doorW * 0.8, doorH * 0.6), clear);
      windowPane.position.set(0, doorH * 0.5, 0.0035);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH * 0.12, 0.009), trim);
      lip.position.set(0, doorH * 0.94, 0.001);
      frame.geometry.dispose();
      // The frame is a border so the tape shows through the middle.
      const border = new THREE.Group();
      for (const [bw, bh, bx, by] of [[doorW, doorH * 0.16, 0, doorH * 0.08], [doorW, doorH * 0.16, 0, doorH * 0.92], [doorW * 0.1, doorH, -doorW * 0.45, doorH / 2], [doorW * 0.1, doorH, doorW * 0.45, doorH / 2]] as const) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.006), panel);
        bar.position.set(bx, by, 0);
        border.add(bar);
      }
      door.add(border, windowPane, lip);
      const loaded = !(side > 0 && random() < 0.35) || live;
      if (loaded) {
        const tape = cassette(pick(shells));
        tape.position.set(0, doorH * (opened && a.state === 'open' ? 0.85 : 0.5), -0.006 * u);
        if (opened && a.state === 'open') tape.rotation.z = (random() - 0.5) * 0.3;
        door.add(tape);
      }
      if (opened) door.rotation.x = mix(0.5, 0.75, random());
      door.traverse((n) => { n.castShadow = true; });
      s.root.add(door);
      if (opened && a.state === 'chewed') {
        const ribbon = s.material('#3b2416', { roughness: 0.25, metalness: 0.3 });
        for (let strand = 0; strand < 3; strand++) {
          const points: [number, number, number][] = [[x + (strand - 1) * 0.01, doorY + doorH * 0.1, front + 0.03 * u]];
          let px = x, pz = front + 0.05 * u;
          const steps = 7 + strand * 2;
          for (let i = 1; i <= steps; i++) {
            px += (random() - 0.5) * 0.11 * u; pz += random() * 0.05 * u;
            const fall = Math.max(0.004, doorY * (1 - i / 3));
            points.push([px, fall + (i > 3 ? random() * 0.035 * u : 0), pz]);
          }
          const tube = s.tube(points, 0.0035 * u, ribbon);
          tube.scale.z = 1;
        }
      }
      // Keys along the top front edge above this deck.
      const pressed = a.state === 'playing' ? 1 : a.state === 'recording' ? 0 : -1;
      for (let i = 0; i < 5; i++) {
        if (mood.wear > 0.8 && side > 0 && i === 3) continue; // a key snapped off long ago
        const down = (i === pressed || (a.state === 'recording' && i === 1)) && side < 0;
        const keyMaterial = i === 0 ? s.material('#c8242c') : trim;
        s.mesh(new RoundedBoxGeometry(doorW * 0.17, 0.02 * u, 0.034 * u, 1, 0.003), keyMaterial, [x + (i - 2) * doorW * 0.2, H + 0.008 + (down ? 0.001 : 0.009 * u), front - 0.022 * u]);
      }
    });
    // Knobs and sliders under the decks.
    for (let i = 0; i < 4; i++) {
      const knob = s.cylinder(0.011 * u, 0.012 * u, 0.012 * u, [(-1.5 + i) * cw * 0.22, H * 0.16, front + 0.009], trim, 14);
      knob.rotation.x = Math.PI / 2;
    }

    // Handle and aerial.
    const hy = H + 0.008;
    s.tube([[-W * 0.36, hy - 0.01, -D * 0.1], [-W * 0.355, hy + 0.05 * u, -D * 0.1], [-W * 0.3, hy + 0.07 * u, -D * 0.1], [W * 0.3, hy + 0.07 * u, -D * 0.1], [W * 0.355, hy + 0.05 * u, -D * 0.1], [W * 0.36, hy - 0.01, -D * 0.1]], 0.011 * u, panel);
    const reach = a.aerial;
    const base = new THREE.Vector3(W * 0.42, hy + 0.006, -D * 0.34);
    const direction = reach < 0.12 ? new THREE.Vector3(-1, 0.0, 0) : new THREE.Vector3(mix(-0.9, 0.35, reach) + (random() - 0.5) * 0.2, 1, (random() - 0.5) * 0.3).normalize();
    s.cylinder(0.008 * u, 0.008 * u, 0.012, [base.x, hy + 0.004, base.z], trim, 10);
    const sections = reach < 0.12 ? 1 : Math.max(2, Math.round(reach * 5));
    let from = base.clone(), radius = 0.006 * u;
    for (let i = 0; i < sections; i++) {
      const length = (reach < 0.12 ? W * 0.5 : W * 0.24);
      if (i === sections - 1 && sections > 2 && mood.wear > 0.55) direction.applyAxisAngle(new THREE.Vector3(0, 0, 1), -0.7); // bent tip
      const to = from.clone().addScaledVector(direction, length);
      s.rod(from.toArray() as [number, number, number], to.toArray() as [number, number, number], radius, trim);
      from = to; radius *= 0.74;
    }
    s.ball([0.006 * u, 0.006 * u, 0.006 * u], from.toArray() as [number, number, number], trim, 8);

    // Stickers.
    if (a.stickers !== 'none') {
      const sticker = (w: number, h: number, at: [number, number, number], draw: (ctx: CanvasRenderingContext2D, cw: number, ch: number) => void, top = false) => {
        const texture = paint(160, Math.round(160 * h / w), (ctx, tw, th) => { ctx.clearRect(0, 0, tw, th); draw(ctx, tw, th); });
        const mesh = s.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: texture, transparent: true, alphaTest: 0.4, roughness: 0.5 }), at);
        mesh.castShadow = false;
        if (top) mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.z = (random() - 0.5) * 0.5;
      };
      const text = (ctx: CanvasRenderingContext2D, word: string, w: number, h: number, ink: string, paper: string) => {
        ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `bold ${Math.min(h * 0.7, w / word.length * 1.5)}px monospace`;
        ctx.fillText(word, w / 2, h / 2, w * 0.92);
      };
      const star = (ctx: CanvasRenderingContext2D, w: number, h: number, fill: string, points = 5) => {
        ctx.fillStyle = fill; ctx.beginPath();
        for (let i = 0; i < points * 2; i++) { const r = (i % 2 ? 0.2 : 0.48) * Math.min(w, h), t = i / (points * 2) * 6.283 - 1.571; ctx.lineTo(w / 2 + Math.cos(t) * r, h / 2 + Math.sin(t) * r); }
        ctx.fill();
      };
      const heart = (ctx: CanvasRenderingContext2D, w: number, h: number, fill: string) => {
        ctx.fillStyle = fill; ctx.beginPath();
        ctx.moveTo(w / 2, h * 0.9); ctx.bezierCurveTo(-w * 0.2, h * 0.4, w * 0.25, -h * 0.1, w / 2, h * 0.3); ctx.bezierCurveTo(w * 0.75, -h * 0.1, w * 1.2, h * 0.4, w / 2, h * 0.9); ctx.fill();
      };
      const spots: [number, number, number][] = [
        [-sx - R * 0.6, H * 0.9, front + 0.002], [sx + R * 0.55, H * 0.1, front + 0.002], [-sx + R * 0.7, H * 0.1, front + 0.002], [sx - R * 0.2, H * 0.92, front + 0.002],
      ];
      const tops: [number, number, number][] = [[-W * 0.28, H + 0.0095, D * 0.1], [W * 0.2, H + 0.0095, D * 0.12], [W * 0.02, H + 0.0095, -D * 0.28]];
      const count = Math.round(mix(2, 7, mood.density));
      const all = [...spots.map((at) => ({ at, top: false })), ...tops.map((at) => ({ at, top: true }))].slice(0, a.stickers === 'name' ? 2 : count);
      all.forEach(({ at, top }, index) => {
        const k = u * mix(0.8, 1.2, random());
        if (a.stickers === 'bands') {
          const word = pick(['RIOT', 'NOISE', 'STATIC', 'THE DREGS', 'VOID', 'TOUR 87', 'LOUD', 'NO FUTURE']);
          const invert = random() < 0.5;
          sticker(0.085 * k, 0.03 * k, at, (ctx, w, h) => text(ctx, word, w, h, invert ? '#111' : '#f4f4f0', invert ? '#f4f4f0' : '#111'), top);
        } else if (a.stickers === 'skate') {
          const colour = pick(['#ff3ea0', '#3af0e0', '#ffe23a', '#ff5a1c', '#7dff3a']);
          if (index % 2) sticker(0.05 * k, 0.05 * k, at, (ctx, w, h) => { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.49, 0, 7); ctx.fill(); star(ctx, w, h, colour, pick([4, 5, 8])); }, top);
          else sticker(0.08 * k, 0.034 * k, at, (ctx, w, h) => text(ctx, pick(['SHRED', 'GNAR', 'RIP', 'LOCALS', 'WAX']), w, h, '#111', colour), top);
        } else if (a.stickers === 'hearts') {
          const colour = pick(['#ff4f9a', '#ff3a4a', '#ffd23a', '#b06aff', '#3ad0ff']);
          const kind = Math.floor(random() * 3);
          sticker(0.045 * k, 0.045 * k, at, (ctx, w, h) => {
            if (kind === 0) heart(ctx, w, h, colour);
            else if (kind === 1) star(ctx, w, h, colour);
            else { ctx.fillStyle = '#ffd92a'; ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.47, 0, 7); ctx.fill(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(w * 0.36, h * 0.4, w * 0.05, 0, 7); ctx.arc(w * 0.64, h * 0.4, w * 0.05, 0, 7); ctx.fill(); ctx.strokeStyle = '#222'; ctx.lineWidth = w * 0.05; ctx.beginPath(); ctx.arc(w / 2, h * 0.5, w * 0.25, 0.3, 2.84); ctx.stroke(); }
          }, top);
        } else if (index === 0) sticker(0.11 * k, 0.018 * k, [0, H * 0.94, front + 0.007], (ctx, w, h) => text(ctx, pick(['PROPERTY OF J.', 'DANNY\'S', 'HANDS OFF', 'ROOM 12', 'MARIA K.']), w, h, '#f4f4f0', pick(['#1a1a1a', '#b8202a', '#1c4aa0'])));
        else sticker(0.04 * k, 0.03 * k, at, (ctx, w, h) => text(ctx, pick(['49.99', '$79', 'SALE']), w, h, '#c8202a', '#ffe94a'), top);
      });
    }

    // Mixtapes beside it.
    const tapeCount = Math.round(a.tapes < 0.17 ? 0 : a.tapes < 0.5 ? 1 : mix(2, 12, (a.tapes - 0.5) * 2) + mood.density * 2);
    const tw = 0.102, th = 0.013, td = 0.064;
    const tapeBox = new THREE.BoxGeometry(tw, th, td), tapeLabel = new THREE.PlaneGeometry(tw * 0.86, td * 0.62);
    const titles = TAPE_TITLES[a.labels];
    const pileX = W / 2 + 0.11, pileZ = front * 0.4;
    const heights = [0, 0, 0];
    for (let i = 0; i < tapeCount; i++) {
      const column = tapeCount < 4 ? 0 : Math.floor(random() * 3);
      const tape = new THREE.Group();
      const shellMesh = new THREE.Mesh(tapeBox, s.material(pick(shells), { roughness: 0.35 }));
      const word = pick(titles);
      const stripe = pick(['#d8343a', '#2c6fd0', '#e8a03a', '#3aa870', '#b04ac0', '#222']);
      const label = paint(192, 96, (ctx, w, h) => {
        ctx.fillStyle = '#f4efdf'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = stripe; ctx.fillRect(0, h * 0.72, w, h * 0.1);
        ctx.fillStyle = a.labels === 'crush' ? '#c0204a' : '#1d2a6a';
        ctx.font = `italic bold ${Math.min(34, 290 / word.length)}px cursive`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.save(); ctx.translate(w / 2, h * 0.36); ctx.rotate((random() - 0.5) * 0.12); ctx.fillText(word, 0, 0, w * 0.92); ctx.restore();
        ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(w * 0.3, h * 0.9, 7, 0, 7); ctx.arc(w * 0.7, h * 0.9, 7, 0, 7); ctx.fill();
      });
      const labelMesh = new THREE.Mesh(tapeLabel, new THREE.MeshStandardMaterial({ map: label, roughness: 0.8 }));
      labelMesh.rotation.x = -Math.PI / 2;
      labelMesh.position.y = th / 2 + 0.0006;
      tape.add(shellMesh, labelMesh);
      tape.traverse((n) => { n.castShadow = n.receiveShadow = true; });
      const cx = pileX + (column - (tapeCount < 4 ? 0 : 1)) * 0.02 + (column === 2 ? 0.1 : 0);
      const cz = pileZ + (column === 1 ? 0.085 : 0) - (column === 2 ? 0.02 : 0);
      tape.position.set(cx + (random() - 0.5) * 0.03, th / 2 + heights[column] * th * 1.03, cz + (random() - 0.5) * 0.03);
      tape.rotation.y = (random() - 0.5) * 0.9;
      heights[column]++;
      s.root.add(tape);
    }

    let beat = 0;
    const speed = mix(1.5, 6, mood.energy);
    return s.finish({
      footprint: W * 0.5 + 0.06,
      update: live ? (dt, time) => {
        for (const reel of reels) reel.rotation.z -= dt * speed;
        if (a.state !== 'playing') return;
        beat = Math.abs(Math.sin(time * speed * 1.3)) ** 3;
        for (const moving of cones) moving.position.y = beat * R * 0.05;
        leds.forEach((led, i) => { led.emissiveIntensity = i < 2 + beat * 6.5 ? 1.3 : 0; });
        for (const lamp of lamps) lamp.emissiveIntensity = 0.4 + beat * 1.4;
      } : undefined,
    });
  },
});
