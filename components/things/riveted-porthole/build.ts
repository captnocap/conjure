import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix } from '@conjure/kit';
import { encrust, painted, stained } from './sea';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    state: choice('How has the porthole been left?', {
      dogged: 'Dogged shut, every wing nut screwed down tight.',
      open: 'Swung open on its hinge to let the air in.',
      shattered: 'Shut, but the glass is smashed to a ring of shards.',
      blind: 'Blinded: the iron storm cover is clamped down over the glass.',
    }),
    view: choice('What is seen through it?', {
      dark: 'Nothing: blackness.',
      sea: 'A bright sea and a level horizon.',
      storm: 'A grey wave rearing up against the glass.',
      depths: 'Green water with fish drifting past: it is under the sea.',
      cabin: 'A lamplit cabin: a bunk with a blanket, somebody\'s berth.',
      face: 'A pale face looking back.',
      stars: 'A night sky with a moon over the water.',
    }),
    plate: choice('What colour is the hull plate?', {
      black: 'Black topside paint.',
      waterline: 'Black above and red below, with white draught numerals: the waterline.',
      white: 'White, a liner\'s superstructure.',
      grey: 'Warship grey.',
      green: 'Deep hull green.',
    }),
    form: choice('What kind of piece of ship is it?', {
      section: 'A neat square cut from the hull, mounted on feet like a museum piece.',
      torn: 'A torn fragment with ragged edges, standing where it landed.',
      strake: 'A long run of plating with an overlapping seam, still part of the ship.',
    }),
    growth: choice('What has grown on it?', {
      bare: 'Nothing.',
      barnacles: 'Barnacles in drifts along the seams.',
      weed: 'Barnacles and hanging weed.',
      anemones: 'Bright anemones and sponges crowding the brass.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wide = a.form === 'strake';
    const W = wide ? 1.45 : 0.8, H = wide ? 1.0 : 0.88, T = 0.022;
    const cy = wide ? 0.58 : 0.45, hole = 0.2;
    const brass = stained(random, '#cba64a', '#5fb39c', clamp01(mood.wear * 0.6 - 0.05 + (a.growth === 'bare' ? 0 : 0.12)));
    const iron = stained(random, '#3a3d40', '#8a4a26', clamp01(0.25 + mood.wear * 0.55), { metalness: 0.3, roughness: 0.8 });
    const hosts: THREE.Mesh[] = [];

    // Plate outline, with a real hole for the port.
    const outline: [number, number][] = [];
    const ragged = a.form === 'torn';
    const bite = () => (ragged ? random() * random() * 0.2 : 0);
    const corner = ragged ? Math.floor(random() * 2) : -1;
    for (let i = 0; i <= 8; i++) outline.push([-W / 2 + (W * i) / 8, 0]);
    for (let i = 1; i <= 9; i++) outline.push([W / 2 - bite() * 0.6, (H * i) / 9]);
    for (let i = 1; i <= 8; i++) outline.push([W / 2 - (W * i) / 8, H - bite() - (ragged && ((corner === 0 && i < 3) || (corner === 1 && i > 5)) ? 0.16 : 0)]);
    for (let i = 1; i < 9; i++) outline.push([-W / 2 + bite() * 0.6, H - (H * i) / 9]);
    const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
    const cut = new THREE.Path();
    cut.absarc(0, cy, hole + 0.01, 0, Math.PI * 2, true);
    shape.holes.push(cut);
    const within = (x: number, y: number) => {
      let inside = false;
      for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
        const [xi, yi] = outline[i], [xj, yj] = outline[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    };

    const paint = { black: '#22252a', waterline: '#22252a', white: '#e6e3d6', grey: '#7d858a', green: '#2f4a3c' }[a.plate];
    const wl = wide ? 0.3 : 0.17;
    const map = painted(512, 512, (g, w, h) => {
      g.fillStyle = paint;
      g.fillRect(0, 0, w, h);
      const py = (y: number) => h - (y / H) * h, px = (x: number) => ((x + W / 2) / W) * w;
      if (a.plate === 'waterline') {
        g.fillStyle = '#8e2f25';
        g.fillRect(0, py(wl), w, h);
        g.fillStyle = '#e9e5d6';
        g.fillRect(0, py(wl) - 5, w, 7);
        g.font = `bold ${Math.round((0.11 / H) * h)}px sans-serif`;
        g.textAlign = 'center';
        const first = 12 + Math.floor(random() * 14);
        for (let i = 0; i < 4; i++) { const y = wl - 0.14 + i * 0.2; if (Math.abs(y - cy) > 0.33 || wide) g.fillText(String(first + i), px(W / 2 - 0.13), py(y), 60); }
      }
      // Plate mottling, rust blooms, and streaks weeping from the port and the seams.
      for (let i = 0; i < 90; i++) { g.globalAlpha = 0.05 + random() * 0.08; g.fillStyle = random() < 0.5 ? '#000000' : '#ffffff'; g.beginPath(); g.ellipse(random() * w, random() * h, 8 + random() * 40, 5 + random() * 20, random() * 3, 0, 7); g.fill(); }
      const rust = mood.wear;
      for (let i = 0; i < rust * rust * 70 + 5; i++) {
        const x = random() * w, y = random() * h, r = 2 + random() * random() * 16 * (0.4 + rust);
        const gradient = g.createRadialGradient(x, y, 0, x, y, r);
        gradient.addColorStop(0, '#7a3a1c'); gradient.addColorStop(0.5, '#9a5226'); gradient.addColorStop(1, 'rgba(154,82,38,0)');
        g.globalAlpha = 0.5 + random() * 0.4; g.fillStyle = gradient; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        g.globalAlpha = 0.25; g.fillStyle = '#8a4a26'; g.fillRect(x - r * 0.2, y, r * 0.4, r * (3 + random() * 6));
      }
      for (let i = 0; i < 9; i++) {
        const x = px((random() - 0.5) * 0.46), top = py(cy - 0.24);
        const streak = g.createLinearGradient(0, top, 0, top + h * mix(0.12, 0.4, rust));
        streak.addColorStop(0, 'rgba(138,74,38,0.85)'); streak.addColorStop(1, 'rgba(138,74,38,0)');
        g.globalAlpha = mix(0.25, 0.9, rust); g.fillStyle = streak; g.fillRect(x, top, 3 + random() * 9, h * 0.45);
      }
      g.globalAlpha = 1;
    });
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(1 / W, 1 / H);
    map.offset.set(0.5, 0);
    const steel = new THREE.MeshStandardMaterial({ map, metalness: 0.25, roughness: mix(0.5, 0.9, mood.wear) });
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false, curveSegments: 40 });
    geometry.translate(0, 0, -T / 2);
    const plate = s.mesh(geometry, steel);
    hosts.push(plate);

    // Frames behind, seams and rivets in front.
    const rivets: { at: P3; size: number }[] = [];
    const rivet = (x: number, y: number, z = T / 2, size = 0.013) => { if (within(x, y) && Math.hypot(x, y - cy) > 0.34) rivets.push({ at: [x, y, z], size }); };
    const ribs = wide ? [-0.62, 0.62] : [-0.34, 0.34];
    for (const x of ribs) {
      const top = ragged ? H * mix(0.6, 0.9, random()) : H;
      s.box([0.02, top, 0.1], [x, top / 2, -T / 2 - 0.05], iron);
      s.box([0.07, top, 0.014], [x + 0.025, top / 2, -T / 2 - 0.007], iron);
      for (let y = 0.06; y < H - 0.03; y += 0.085) { rivet(x, y); rivet(x + 0.045, y + 0.04); }
    }
    for (let x = -W / 2 + 0.05; x < W / 2; x += 0.085) { rivet(x, 0.05); if (!ragged) rivet(x, H - 0.05); }
    if (wide) {
      // An overlapping strake: the lower plate laps over the upper.
      const lap = s.box([W, 0.26, 0.014], [0, 0.13, T / 2 + 0.007], steel);
      hosts.push(lap);
      for (let x = -W / 2 + 0.04; x < W / 2; x += 0.07) { rivets.push({ at: [x, 0.225, T / 2 + 0.014], size: 0.013 }); rivets.push({ at: [x + 0.035, 0.18, T / 2 + 0.014], size: 0.013 }); }
    }
    s.scatter(new THREE.SphereGeometry(1, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), steel.clone(), rivets);
    ((s.root.children[s.root.children.length - 1] as THREE.Mesh).material as THREE.MeshStandardMaterial).map = null;
    ((s.root.children[s.root.children.length - 1] as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(paint).multiplyScalar(1.25);

    // What lies behind the glass, painted at the back of a short dark well.
    const view = painted(256, 256, (g, w, h) => {
      const sky = (top: string, bottom: string, to = h) => { const gradient = g.createLinearGradient(0, 0, 0, to); gradient.addColorStop(0, top); gradient.addColorStop(1, bottom); g.fillStyle = gradient; g.fillRect(0, 0, w, to); };
      g.fillStyle = '#05070a';
      g.fillRect(0, 0, w, h);
      if (a.view === 'sea') {
        const horizon = mix(110, 150, random());
        sky(mood.warmth > 0.6 ? '#f4c98a' : '#8fc4ea', '#e6f1f2', horizon);
        g.fillStyle = mood.warmth > 0.6 ? '#2f6f8a' : '#1f6fa8';
        g.fillRect(0, horizon, w, h);
        g.fillStyle = '#fff6d0'; g.beginPath(); g.arc(mix(60, 196, random()), horizon - mix(30, 70, random()), 16, 0, 7); g.fill();
        g.strokeStyle = '#e8f6fa'; g.lineWidth = 2;
        for (let i = 0; i < 22; i++) { const y = horizon + 6 + random() * (h - horizon), x = random() * w; g.globalAlpha = 0.7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8 + (y - horizon) * 0.25, y); g.stroke(); }
      } else if (a.view === 'storm') {
        sky('#3d444c', '#7f8a90');
        g.fillStyle = '#2f4a4f';
        g.beginPath(); g.moveTo(0, h); g.lineTo(0, 170);
        for (let x = 0; x <= w; x += 8) g.lineTo(x, 150 - Math.sin(x / 42 + random() * 0.2) * 55 - x * 0.25);
        g.lineTo(w, h); g.closePath(); g.fill();
        g.fillStyle = '#e4ecec';
        for (let i = 0; i < 60; i++) { const x = random() * w; g.globalAlpha = 0.8; g.beginPath(); g.arc(x, 150 - Math.sin(x / 42) * 55 - x * 0.25 + random() * 14, 3 + random() * 6, 0, 7); g.fill(); }
        g.strokeStyle = '#d7e2e4'; g.lineWidth = 1.5; g.globalAlpha = 0.6;
        for (let i = 0; i < 50; i++) { const x = random() * w, y = random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 10, y + 22); g.stroke(); }
      } else if (a.view === 'depths') {
        sky('#6fd0b0', '#0c3f4a');
        g.globalAlpha = 0.18; g.fillStyle = '#eafff0';
        for (let i = 0; i < 4; i++) { const x = 30 + i * 60 + random() * 20; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 26, 0); g.lineTo(x - 30, h); g.lineTo(x - 70, h); g.closePath(); g.fill(); }
        g.globalAlpha = 1;
        for (let i = 0; i < 3 + Math.round(mood.density * 4); i++) {
          const x = 40 + random() * 180, y = 50 + random() * 160, k = 14 + random() * 22, d = random() < 0.5 ? -1 : 1;
          g.fillStyle = ['#0a2a30', '#f0a03a', '#d8e6e0'][i % 3];
          g.beginPath(); g.ellipse(x, y, k, k * 0.45, 0, 0, 7); g.fill();
          g.beginPath(); g.moveTo(x - d * k * 0.8, y); g.lineTo(x - d * k * 1.5, y - k * 0.45); g.lineTo(x - d * k * 1.5, y + k * 0.45); g.closePath(); g.fill();
          g.fillStyle = '#05070a'; g.beginPath(); g.arc(x + d * k * 0.55, y - k * 0.1, 2, 0, 7); g.fill();
        }
      } else if (a.view === 'cabin') {
        sky('#3a2414', '#1c120b');
        const lamp = g.createRadialGradient(70, 80, 4, 70, 80, 150);
        lamp.addColorStop(0, '#fff0b8'); lamp.addColorStop(0.15, '#f2b04a'); lamp.addColorStop(1, 'rgba(120,60,10,0)');
        g.fillStyle = lamp; g.fillRect(0, 0, w, h);
        g.fillStyle = '#5a3a1f'; g.fillRect(96, 140, 160, 14); g.fillRect(96, 140, 10, 90);
        g.fillStyle = mood.cheer > 0.5 ? '#a8362c' : '#3e5068'; g.fillRect(106, 118, 150, 26);
        g.fillStyle = '#f1ead8'; g.fillRect(196, 104, 60, 22); g.fillRect(106, 118, 150, 6);
        g.fillStyle = '#2a1a0e'; g.fillRect(60, 86, 20, 40); g.fillStyle = '#fff6c8'; g.beginPath(); g.ellipse(70, 78, 9, 14, 0, 0, 7); g.fill();
        g.fillStyle = '#c9b88a'; g.fillRect(150, 40, 46, 34); g.fillStyle = '#4a5a6a'; g.fillRect(154, 44, 38, 26);
      } else if (a.view === 'face') {
        sky('#4f7a6c', '#1c3a36');
        g.fillStyle = '#e4e6d6'; g.beginPath(); g.ellipse(128, 128, 78, 100, 0, 0, 7); g.fill();
        g.fillStyle = '#0c1413';
        for (const x of [-1, 1]) { g.beginPath(); g.ellipse(128 + x * 32, 104, 17, 13, 0, 0, 7); g.fill(); }
        g.beginPath(); g.ellipse(128, 176, 18, mix(6, 20, mood.energy), 0, 0, 7); g.fill();
        g.fillStyle = '#b9c2b0'; g.beginPath(); g.ellipse(214, 196, 20, 26, 0.3, 0, 7); g.fill();
        for (let i = 0; i < 4; i++) g.fillRect(196 + i * 10, 150 + Math.abs(i - 1.5) * 6, 7, 30);
      } else if (a.view === 'stars') {
        sky('#0b1230', '#24325e', 170);
        g.fillStyle = '#0a1220'; g.fillRect(0, 170, w, h);
        g.fillStyle = '#f4f0d8';
        for (let i = 0; i < 70; i++) { g.globalAlpha = 0.5 + random() * 0.5; g.fillRect(random() * w, random() * 165, 1.5 + random() * 2, 1.5 + random() * 2); }
        g.globalAlpha = 1; g.beginPath(); g.arc(176, 70, 24, 0, 7); g.fill();
        g.fillStyle = '#0f1838'; g.beginPath(); g.arc(187, 63, 22, 0, 7); g.fill();
        g.fillStyle = '#c9d2e6'; g.globalAlpha = 0.5; for (let i = 0; i < 12; i++) g.fillRect(150 + random() * 50, 176 + i * 6, 20 + random() * 30, 2);
      } else {
        g.strokeStyle = '#2a3a44'; g.lineWidth = 10; g.globalAlpha = 0.6; g.beginPath(); g.arc(128, 128, 96, 3.6, 4.6); g.stroke();
      }
    });
    const lit = { dark: 0.3, sea: 1, storm: 0.8, depths: 0.9, cabin: 1.1, face: 0.95, stars: 0.9 }[a.view];
    const well = s.mesh(new THREE.CylinderGeometry(hole + 0.012, hole + 0.012, 0.12, 32, 1, true), new THREE.MeshStandardMaterial({ color: '#0a0c0e', roughness: 1, side: THREE.DoubleSide }), [0, cy, -0.06]);
    well.rotation.x = Math.PI / 2;
    s.mesh(new THREE.CircleGeometry(hole + 0.01, 40), new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#ffffff', emissiveMap: view, emissiveIntensity: lit, roughness: 1 }), [0, cy, -0.115]);
    s.box([0.5, 0.5, 0.02], [0, cy, -0.13], iron);

    // The port: a bolted flange, a hinged sash with glass, dogs, and a storm cover above.
    const ringAbout = (inner: number, outer: number, depth: number, material: THREE.Material) => {
      const lathe = new THREE.LatheGeometry([[inner, 0], [inner, depth], [inner + (outer - inner) * 0.35, depth * 1.25], [outer, depth * 0.55], [outer, 0]].map(([x, y]) => new THREE.Vector2(x, y)), 48);
      lathe.rotateX(Math.PI / 2);
      return new THREE.Mesh(lathe, material);
    };
    const flange = ringAbout(hole + 0.03, hole + 0.11, 0.034, brass);
    flange.position.set(0, cy, T / 2);
    flange.castShadow = flange.receiveShadow = true;
    s.root.add(flange);
    hosts.push(flange);
    s.scatter(new THREE.CylinderGeometry(1, 1, 1, 6).rotateX(Math.PI / 2), brass, Array.from({ length: 10 }, (_u, i) => ({ at: [Math.sin(i * 0.628 + 0.3) * (hole + 0.088), cy + Math.cos(i * 0.628 + 0.3) * (hole + 0.088), T / 2 + 0.024] as P3, size: 0.014 })));

    const sash = new THREE.Group();
    const sashRing = ringAbout(hole - 0.04, hole + 0.035, 0.034, brass);
    sashRing.position.set(hole + 0.05, 0, 0);
    sashRing.castShadow = true;
    sash.add(sashRing);
    // Broken glass is real geometry: a ring of shards standing in from the rim.
    let paneGeometry: THREE.BufferGeometry = new THREE.CircleGeometry(hole - 0.035, 40);
    if (a.state === 'shattered') {
      const r = hole - 0.035, points: number[] = [];
      for (let i = 0; i < 12; i++) {
        const t = (i / 12) * 6.283 + random() * 0.4, width = 0.14 + random() * 0.26, reach = r * (0.2 + random() * 0.55);
        points.push(Math.cos(t - width) * r, Math.sin(t - width) * r, 0, Math.cos(t + width) * r, Math.sin(t + width) * r, 0, Math.cos(t) * (r - reach), Math.sin(t) * (r - reach), 0);
      }
      paneGeometry = new THREE.BufferGeometry();
      paneGeometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      paneGeometry.computeVertexNormals();
    }
    const pane = new THREE.Mesh(paneGeometry, a.state === 'shattered'
      ? new THREE.MeshStandardMaterial({ color: '#e4f3f0', emissive: '#a9cdc8', emissiveIntensity: 0.35, transparent: true, opacity: 0.72, roughness: 0.15, side: THREE.DoubleSide })
      : new THREE.MeshStandardMaterial({ color: '#cfe6e2', transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide }));
    pane.position.set(hole + 0.05, 0, 0.012);
    sash.add(pane);
    // Hinge knuckles.
    for (const y of [-0.05, 0.05]) { const knuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 8), brass); knuckle.position.set(0, y, 0.01); sash.add(knuckle); }
    sash.position.set(-(hole + 0.05), cy, T / 2 + 0.032);
    const swung = a.state === 'open';
    if (swung) sash.rotation.y = -mix(1.5, 2.3, random());
    s.root.add(sash);
    // Dogs: swing bolts with wing nuts at three points round the free side.
    for (const angle of [0.45, Math.PI / 2, Math.PI - 0.45]) {
      const dog = new Sculpture(context);
      dog.cylinder(0.01, 0.01, 0.08, [0, 0, 0.04], brass, 8).rotation.x = Math.PI / 2;
      const wing = dog.box([0.1, 0.024, 0.016], [0, 0, 0.078], brass);
      wing.rotation.z = random() * 3;
      dog.ball([0.02, 0.02, 0.02], [0, 0, 0.078], brass, 8);
      const r = hole + 0.05;
      dog.root.position.set(Math.sin(angle) * r, cy + Math.cos(angle) * r, T / 2 + 0.03);
      // Undone dogs swing away from the rim and hang.
      if (swung) dog.root.rotation.set(Math.cos(angle) * 1.1 + 0.5, Math.sin(angle) * 1.2, 0);
      s.root.add(dog.root);
    }
    // Storm cover (deadlight): only swung down and clamped when the port is blinded.
    if (a.state === 'blind') {
      const cover = new THREE.Group();
      const coverPaint = new THREE.MeshStandardMaterial({ color: new THREE.Color(paint).multiplyScalar(a.plate === 'white' ? 0.8 : 1.6), metalness: 0.3, roughness: 0.7 });
      const lidMesh = new THREE.Mesh(new THREE.CylinderGeometry(hole + 0.03, hole + 0.03, 0.024, 36).rotateX(Math.PI / 2), coverPaint);
      lidMesh.position.set(0, -(hole + 0.06), 0.012);
      lidMesh.castShadow = true;
      cover.add(lidMesh);
      const coverRim = new THREE.Mesh(new THREE.TorusGeometry(hole + 0.02, 0.014, 8, 40), brass);
      coverRim.position.set(0, -(hole + 0.06), 0.026);
      cover.add(coverRim);
      const boss = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 8), coverPaint);
      boss.scale.z = 0.4;
      boss.position.set(0, -(hole + 0.06), 0.026);
      cover.add(boss);
      for (const x of [-0.07, 0.07]) { const strap = new THREE.Mesh(new THREE.BoxGeometry(0.034, hole * 0.6, 0.012), brass); strap.position.set(x, -hole * 0.28, 0.03); strap.castShadow = true; cover.add(strap); }
      const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.028, 0.02), brass);
      clamp.position.set(0, -(hole * 2 + 0.07), 0.04);
      cover.add(clamp);
      cover.position.set(0, cy + hole + 0.06, T / 2 + 0.085);
      cover.rotation.x = -mix(0, 0.06, random());
      s.root.add(cover);
      for (const x of [-0.07, 0.07]) s.box([0.04, 0.04, 0.09], [x, cy + hole + 0.07, T / 2 + 0.045], brass);
    }

    // Mounting.
    if (a.form === 'section') {
      const foot = s.material('#2a2c2e', { metalness: 0.4, roughness: 0.5 });
      for (const x of ribs) { s.box([0.06, 0.04, 0.5], [x, 0.02, -0.04], foot); s.rod([x, 0.03, -0.27], [x, 0.5, -T / 2 - 0.09], 0.014, foot); }
    } else if (ragged) {
      const sand = s.material(mood.warmth > 0.5 ? '#cdb98a' : '#a8a48f', { roughness: 1 });
      s.ball([0.6, 0.09, 0.3], [0.05, 0, 0.02], sand, 20);
      if (a.state === 'shattered') s.scatter(new THREE.TetrahedronGeometry(1), new THREE.MeshStandardMaterial({ color: '#d6ece8', roughness: 0.1, transparent: true, opacity: 0.8 }), Array.from({ length: 8 }, () => ({ at: [mix(-0.25, 0.25, random()), 0.085, 0.12 + random() * 0.14] as P3, size: 0.012 + random() * 0.012 })));
    } else {
      for (const x of ribs) s.box([0.1, 0.03, 0.3], [x, 0.015, -0.12], iron);
    }

    // Growth.
    if (a.growth !== 'bare') {
      encrust(s, hosts, mix(40, 100, mood.wear) * mix(0.7, 1.2, mood.density) * (wide ? 1.4 : 1), 0.017);
      if (a.growth === 'anemones') {
        const bloom = ['#d0563e', '#e08a3a', '#cf6a8a', '#e0b84a', '#8a78b0'];
        encrust(s, [flange], 20, 0.026, bloom, 'blob');
        encrust(s, hosts, 8, 0.024, bloom, 'blob');
      } else if (a.growth === 'weed') {
        const weeds = [s.material('#3d4a22', { roughness: 0.6 }), s.material('#56562a', { roughness: 0.6 }), s.material('#2f3d2a', { roughness: 0.6 })];
        for (let i = 0; i < Math.round(mix(7, 16, mood.density)); i++) {
          const fromTop = random() < 0.5;
          const x = fromTop ? mix(-W / 2 + 0.05, W / 2 - 0.05, random()) : Math.sin(mix(-1.3, 1.3, random())) * (hole + 0.09);
          const y = fromTop ? H - 0.03 - (ragged ? 0.2 : 0) : cy - Math.sqrt(Math.max((hole + 0.09) ** 2 - x * x, 0));
          const fall = Math.min(y - 0.03, mix(0.15, 0.5, random())), sx = (random() - 0.5) * 0.1;
          if (fall < 0.06) continue;
          s.tube([[x, y, T / 2 + 0.02], [x + sx, y - fall * 0.4, T / 2 + 0.035], [x - sx * 0.5, y - fall * 0.7, T / 2 + 0.02], [x + sx, y - fall, T / 2 + 0.03]], 0.008 + random() * 0.007, weeds[i % 3]);
        }
      }
    }

    const thing = s.finish();
    if (ragged) {
      // A fragment does not stand square: it leans where it fell.
      s.root.rotation.set(-mix(0.08, 0.2, random()), 0, mix(-0.07, 0.07, random()));
    }
    return thing;
  },
});
