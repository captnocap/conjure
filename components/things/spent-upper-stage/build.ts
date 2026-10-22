import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const ERAS = {
  sixties: 'Early space race: white paint, ribbed skirts, built like a boiler.',
  soviet: 'Grey-green with an open lattice truss on the front, blunt and unsentimental.',
  hydrogen: 'A thin-skinned steel balloon tank under orange-tan foam, spindly and delicate.',
  modern: 'Clean modern white with a black carbon interstage and one wide dark nozzle.',
  steel: 'Polished stainless steel, mirror bright.',
} as const;
const MARKINGS = {
  checks: 'Black-and-white roll-pattern checks.',
  name: 'A name in tall block letters down its side.',
  emblem: 'A star in a circle, and a coloured band.',
  signatures: 'Hundreds of scrawled signatures from the people who built it.',
  bleached: 'Markings bleached by decades of sun to pale ghosts.',
  none: 'Nothing: bare skin.',
} as const;
const ENGINES = {
  single: 'One big engine bell.',
  twin: 'Two slim bells side by side.',
  cluster: 'A cluster of four small nozzles.',
} as const;
const STATES = {
  venting: 'Still venting: a pale plume of frost crystals streams from a valve.',
  cold: 'Long dead: cold, silent, only turning.',
  ruptured: 'Burst: a torn hole in the tank with peeled metal and a halo of fragments.',
  shedding: 'Shedding flakes of insulation and paint like slow snow.',
} as const;
const FRONTS = {
  ring: 'An empty payload adapter ring: job done.',
  payload: 'A small satellite still bolted on, never released.',
  fairing: 'One half of the nose fairing still hanging on.',
  wires: 'Severed umbilical cables trailing from the front.',
} as const;
const NAMES = ['AURIGA', 'VOSKHOD-K', 'ATLAS-9', 'KITE II', 'MERIDIAN', 'D-1 E', 'PERSEVERE', 'LONG REACH'];

export default defineThing({
  questions: {
    era: choice('What era of rocketry is it from?', ERAS),
    markings: choice('What markings does it carry?', MARKINGS),
    engines: choice('What engines does it have?', ENGINES),
    state: choice('What is it doing now?', STATES),
    front: choice('What is left on its front end?', FRONTS),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const add = <T extends THREE.Object3D>(parent: THREE.Object3D, child: T) => { parent.add(child); return child; };
    const jitter = (amount: number) => (random() - 0.5) * amount;
    const tilt = add(s.root, new THREE.Group());
    const spin = add(tilt, new THREE.Group());

    const R = a.era === 'hydrogen' ? 1.4 : 1.55;
    const L = a.era === 'hydrogen' ? 6.2 : a.era === 'modern' ? 8.5 : 7.4;
    const base = { sixties: '#ecebe4', soviet: '#8b9684', hydrogen: '#c98a4e', modern: '#f3f2ee', steel: '#c9ced3' }[a.era];
    const accent = ['#c8362c', '#2f5fb5', '#e08a1c', '#1f7a5a'][Math.floor(random() * 4)];
    const name = NAMES[Math.floor(random() * NAMES.length)];
    const ink = a.era === 'soviet' ? '#f2efe2' : '#17181b';

    // The tank skin: stringers, markings, then frost, soot and age.
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const c = canvas.getContext('2d')!;
    c.fillStyle = base; c.fillRect(0, 0, 1024, 512);
    if (a.era === 'hydrogen') for (let i = 0; i < 500; i++) { c.fillStyle = `rgba(${150 + random() * 80},${90 + random() * 50},${30 + random() * 40},0.25)`; c.fillRect(random() * 1024, random() * 512, 6 + random() * 30, 4 + random() * 12); }
    c.strokeStyle = 'rgba(0,0,0,0.14)'; c.lineWidth = 2;
    const stringers = a.era === 'sixties' ? 48 : 12;
    for (let i = 0; i < stringers; i++) { c.beginPath(); c.moveTo(i * 1024 / stringers, 0); c.lineTo(i * 1024 / stringers, 512); c.stroke(); }
    for (const y of [70, 250, 430]) { c.beginPath(); c.moveTo(0, y); c.lineTo(1024, y); c.stroke(); }
    const faded = a.markings === 'bleached';
    c.globalAlpha = faded ? 0.22 : 1;
    if (a.markings === 'checks') {
      for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? '#17181b' : '#f4f3ee'; c.fillRect(i * 128, 60 + j * 90, 128, 90); }
      c.fillStyle = '#17181b'; c.fillRect(0, 400, 1024, 26);
    }
    if (a.markings === 'name' || faded) for (const x of [256, 768]) {
      c.save(); c.translate(x, 256); c.rotate(-Math.PI / 2);
      c.fillStyle = faded ? accent : ink; c.font = 'bold 120px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(name, 0, 0, 440);
      c.restore();
    }
    if (a.markings === 'emblem' || faded) {
      c.fillStyle = accent; c.fillRect(0, 96, 1024, 44);
      for (const x of [128, 640]) {
        c.fillStyle = '#f4f3ee'; c.beginPath(); c.arc(x, 290, 84, 0, 7); c.fill();
        c.fillStyle = accent; c.beginPath(); c.arc(x, 290, 70, 0, 7); c.fill();
        c.fillStyle = '#f4f3ee'; c.beginPath();
        for (let p = 0; p < 10; p++) { const r = p % 2 ? 20 : 52, t = (p / 10) * Math.PI * 2 - Math.PI / 2; c.lineTo(x + Math.cos(t) * r, 290 + Math.sin(t) * r); }
        c.fill();
      }
    }
    if (a.markings === 'signatures') {
      c.lineWidth = 2.5; c.lineCap = 'round';
      for (let i = 0; i < 220; i++) {
        c.strokeStyle = ['#17181b', '#1f3f9a', '#a8261c', '#1f6a3a'][Math.floor(random() * 4)];
        let x = random() * 1000, y = 90 + random() * 330;
        c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 7; k++) { x += 6 + random() * 9; y += jitter(16); c.lineTo(x, y); }
        c.stroke();
      }
    }
    c.globalAlpha = 1;
    // Frost collects on the cold end; soot on the engine end; age everywhere.
    const frosty = a.state === 'venting' ? 0.9 : a.state === 'cold' ? 0.45 : 0.25;
    for (let i = 0; i < frosty * 230; i++) {
      const y = 512 - random() ** 2 * 330;
      c.fillStyle = `rgba(250,253,255,${0.25 + random() * 0.45})`;
      c.beginPath(); c.ellipse(random() * 1024, y, 10 + random() * 40, 6 + random() * 22, random() * 3, 0, 7); c.fill();
    }
    const soot = c.createLinearGradient(0, 512, 0, 380);
    soot.addColorStop(0, `rgba(30,24,18,${0.25 + mood.wear * 0.5})`); soot.addColorStop(1, 'rgba(30,24,18,0)');
    c.fillStyle = soot; c.fillRect(0, 380, 1024, 132);
    for (let i = 0; i < mood.wear * 300; i++) { c.fillStyle = `rgba(60,50,40,${0.1 + random() * 0.3})`; c.beginPath(); c.arc(random() * 1024, random() * 512, 1 + random() * 5, 0, 7); c.fill(); }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    const shiny = a.era === 'steel';
    const skin = new THREE.MeshStandardMaterial({ map: texture, metalness: shiny ? 0.9 : a.era === 'hydrogen' ? 0 : 0.15, roughness: shiny ? 0.22 : 0.75, side: THREE.DoubleSide });
    const dark = s.material('#22252a', { roughness: 0.6, metalness: 0.3 });
    const metal = s.material('#b9bec3', { metalness: 0.85, roughness: 0.35 });
    const carbon = s.material(a.era === 'modern' ? '#1e2024' : a.era === 'soviet' ? '#6f7a6a' : '#d7d5cd', { roughness: 0.7 });

    // Tank: a cylinder with a torn window if it burst, domed ends inside the skirts.
    const burst = a.state === 'ruptured';
    const tank = add(spin, s.mesh(new THREE.CylinderGeometry(R, R, L, 48, 1, true, 0, burst ? Math.PI * 1.72 : Math.PI * 2), skin));
    tank.rotation.y = burst ? 0.9 : 0;
    add(spin, s.ball([R * 0.98, R * 0.45, R * 0.98], [0, L / 2, 0], carbon, 28));
    add(spin, s.ball([R * 0.98, R * 0.5, R * 0.98], [0, -L / 2, 0], a.era === 'hydrogen' ? metal : carbon, 28));
    if (burst) {
      const inside = s.material('#3a3f45', { metalness: 0.6, roughness: 0.5, side: THREE.DoubleSide });
      add(spin, s.mesh(new THREE.CylinderGeometry(R * 0.96, R * 0.96, L * 0.98, 32, 1, true), inside));
      // Peeled petals of skin curl back from the wound.
      for (let i = 0; i < 6; i++) {
        const y = -L * 0.38 + i * L * 0.15;
        for (const side of [0, 1]) {
          const hinge = add(spin, new THREE.Group());
          const angle = 0.9 + (side ? Math.PI * 1.72 : 0) + Math.PI / 2;
          hinge.position.set(Math.sin(angle - Math.PI / 2) * R, y, Math.cos(angle - Math.PI / 2) * R);
          hinge.rotation.y = angle - Math.PI / 2 + (side ? -1 : 1) * (0.7 + random() * 0.9) + Math.PI / 2;
          const flap = add(hinge, s.mesh(new THREE.PlaneGeometry(0.5 + random() * 0.7, L * 0.15), new THREE.MeshStandardMaterial({ color: base, metalness: 0.4, roughness: 0.5, side: THREE.DoubleSide })));
          flap.position.x = 0.3;
          flap.rotation.z = jitter(0.3);
        }
      }
    }
    // Skirts and rings.
    const ribbed = a.era === 'sixties';
    add(spin, s.cylinder(R * 1.0, R * 1.02, 0.9, [0, -L / 2 - 0.25, 0], carbon, ribbed ? 36 : 48));
    add(spin, s.cylinder(R * 1.02, R * 1.0, 0.7, [0, L / 2 + 0.15, 0], carbon, 48));
    for (const y of [-L / 2 + 0.2, L / 2 - 0.2, -L / 2 - 0.7]) add(spin, s.ring(R * 1.02, 0.045, [0, y, 0], metal)).rotation.x = Math.PI / 2;
    if (ribbed) for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      add(spin, s.box([0.06, 0.9, 0.08], [Math.cos(angle) * R * 1.03, -L / 2 - 0.25, Math.sin(angle) * R * 1.03], metal)).rotation.y = -angle;
    }
    // A raceway and a couple of pressure bottles break up the cylinder.
    add(spin, s.box([0.16, L * 0.96, 0.12], [0, 0, R + 0.04], carbon));
    for (const [angle, y] of [[2.2, -L * 0.3], [4.1, -L * 0.34]] as const) add(spin, s.ball([0.34, 0.34, 0.34], [Math.sin(angle) * (R + 0.2), y, Math.cos(angle) * (R + 0.2)], s.material('#d3a534', { metalness: 0.7, roughness: 0.35 }), 14));

    // Engines.
    const hot = s.material(a.era === 'modern' ? '#17181b' : '#4f5258', { metalness: 0.75, roughness: 0.4, side: THREE.DoubleSide });
    const bell = (x: number, z: number, size: number, cant = 0) => {
      const mount = add(spin, new THREE.Group());
      mount.position.set(x, -L / 2 - R * 0.45, z);
      mount.rotation.set(z * cant, 0, -x * cant);
      add(mount, s.cylinder(size * 0.22, size * 0.3, size * 0.5, [0, -size * 0.2, 0], metal, 16));
      add(mount, s.lathe([[size * 0.2, 0], [size * 0.42, -size * 0.45], [size * 0.72, -size * 1.0], [size * 0.92, -size * 1.5], [size, -size * 1.9]], hot, [0, -size * 0.4, 0]));
      add(mount, s.ring(size, 0.03, [0, -size * 2.3, 0], metal)).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) add(mount, s.rod([Math.cos(i * 2.1) * size * 0.25, 0, Math.sin(i * 2.1) * size * 0.25], [Math.cos(i * 2.1) * R * 0.5 - x, R * 0.35, Math.sin(i * 2.1) * R * 0.5 - z], 0.035, metal));
    };
    if (a.engines === 'single') bell(0, 0, a.era === 'modern' ? 1.35 : 1.05);
    if (a.engines === 'twin') { bell(-0.72, 0, 0.62, 0.12); bell(0.72, 0, 0.62, 0.12); }
    if (a.engines === 'cluster') for (let i = 0; i < 4; i++) bell(Math.cos(i * Math.PI / 2 + 0.78) * 0.78, Math.sin(i * Math.PI / 2 + 0.78) * 0.78, 0.42, 0.1);

    // Front end.
    const top = L / 2 + 0.5;
    if (a.era === 'soviet') {
      for (let i = 0; i < 12; i++) {
        const p = (i / 12) * Math.PI * 2, q = ((i + 1) / 12) * Math.PI * 2;
        add(spin, s.rod([Math.cos(p) * R, top, Math.sin(p) * R], [Math.cos(q) * R * 0.95, top + 1.0, Math.sin(q) * R * 0.95], 0.04, metal));
        add(spin, s.rod([Math.cos(q) * R, top, Math.sin(q) * R], [Math.cos(p) * R * 0.95, top + 1.0, Math.sin(p) * R * 0.95], 0.04, metal));
      }
      add(spin, s.ring(R * 0.95, 0.05, [0, top + 1.0, 0], metal)).rotation.x = Math.PI / 2;
    } else {
      add(spin, s.lathe([[R * 1.0, 0], [R * 0.62, 0.8], [R * 0.6, 0.95]], new THREE.MeshStandardMaterial({ color: a.era === 'modern' ? '#1e2024' : '#d7d5cd', roughness: 0.7, side: THREE.DoubleSide }), [0, top, 0]));
      add(spin, s.ring(R * 0.6, 0.05, [0, top + 0.95, 0], metal)).rotation.x = Math.PI / 2;
    }
    const nose = top + 1.0;
    if (a.front === 'payload') {
      const gold = s.material('#c99a3a', { metalness: 0.7, roughness: 0.35, flatShading: true });
      add(spin, s.cylinder(0.7, 0.75, 1.2, [0, nose + 0.6, 0], gold, 8));
      const cells = new THREE.MeshStandardMaterial({ color: '#1b2f6a', metalness: 0.4, roughness: 0.35, emissive: '#152a70', emissiveIntensity: 0.3 });
      for (const side of [-1, 1]) add(spin, s.box([0.06, 1.1, 0.9], [side * 0.8, nose + 0.6, 0], cells));
      add(spin, s.lathe([[0.03, 0], [0.3, 0.06], [0.5, 0.22]], s.material('#e9e7df', { side: THREE.DoubleSide }), [0, nose + 1.25, 0]));
    } else if (a.front === 'fairing') {
      const shell = new THREE.MeshStandardMaterial({ color: base === '#c98a4e' ? '#ecebe4' : base, roughness: 0.7, metalness: shiny ? 0.8 : 0.1, side: THREE.DoubleSide });
      const half = add(spin, s.mesh(new THREE.LatheGeometry([[R * 1.02, 0], [R * 1.02, 2.2], [R * 0.8, 3.4], [R * 0.4, 4.3], [0.02, 4.7]].map(([x, y]) => new THREE.Vector2(x, y)), 20, 0, Math.PI), shell, [0, top - 0.1, 0]));
      half.rotation.set(0.14, random() * 6, 0.1);
    } else if (a.front === 'wires') {
      for (let i = 0; i < 5; i++) {
        const angle = random() * 6;
        add(spin, s.tube([[Math.cos(angle) * R * 0.5, nose - 0.1, Math.sin(angle) * R * 0.5], [Math.cos(angle) * R * 0.8 + jitter(0.6), nose + 0.7 + random() * 0.6, Math.sin(angle) * R * 0.8 + jitter(0.6)], [Math.cos(angle) * R * 1.3 + jitter(1), nose + 1.2 + random() * 1.1, Math.sin(angle) * R * 1.3 + jitter(1)]], 0.03, [dark, s.material(accent), s.material('#d3a534')][i % 3]));
      }
    }

    // What surrounds it: a vent plume, a halo of fragments, or drifting flakes.
    const plumes: THREE.Mesh[] = [];
    if (a.state === 'venting') {
      const vapour = new THREE.MeshBasicMaterial({ color: '#f4fbff', transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
      for (let i = 0; i < 3; i++) {
        const plume = add(spin, s.mesh(new THREE.ConeGeometry(0.4 + i * 0.35, 1.6 + i * 0.9, 14, 1, true).translate(0, -(1.6 + i * 0.9) / 2, 0), vapour, [0, -L * 0.2, -R]));
        plume.rotation.x = Math.PI / 2 + 0.25;
        plume.castShadow = false;
        plumes.push(plume);
      }
      add(spin, s.cylinder(0.09, 0.12, 0.2, [0, -L * 0.2, -R - 0.06], metal, 10)).rotation.x = Math.PI / 2;
    }
    const flakes = Math.round(mix(0.5, 1.5, mood.density) * { venting: 46, cold: 6, ruptured: 60, shedding: 70 }[a.state]);
    const flakePaint = a.state === 'ruptured' ? s.material('#ffffff', { metalness: 0.7, roughness: 0.3 }) : new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#d8ecff', emissiveIntensity: 0.4, roughness: 0.5 });
    const flakeTints = a.state === 'shedding' ? [base, '#f4f3ee', accent] : a.state === 'ruptured' ? [base, '#8d9399', '#d8dadc'] : ['#ffffff'];
    add(spin, s.scatter(a.state === 'venting' || a.state === 'cold' ? new THREE.OctahedronGeometry(1, 0) : new THREE.TetrahedronGeometry(1, 0), flakePaint, Array.from({ length: flakes }, () => {
      const along = a.state === 'venting' ? -L * 0.2 + jitter(3) : jitter(L * 0.95);
      const angle = a.state === 'venting' ? Math.PI + jitter(1.6) : a.state === 'ruptured' ? 0.9 + Math.PI * 0.86 + Math.PI + jitter(2.2) : random() * 6.3;
      const radius = R + 0.25 + random() ** 1.6 * (a.state === 'cold' ? 1.0 : 1.9);
      return { at: [Math.sin(angle) * radius, along, Math.cos(angle) * radius] as [number, number, number], size: (a.state === 'ruptured' ? 0.05 : 0.03) + random() * (a.state === 'venting' ? 0.05 : 0.11), color: flakeTints[Math.floor(random() * flakeTints.length)] };
    })));

    // Lying over, engine bell swung toward the viewer; it rolls about its own long axis.
    tilt.rotation.set(jitter(0.2), 0.45 + jitter(0.3), 1.12 + jitter(0.25));
    const rate = mix(0.04, 0.6, mood.energy);
    const phase = random() * 6;
    // A burst tank starts with its wound toward the viewer.
    spin.rotation.y = burst ? Math.PI / 4 - 0.9 - Math.PI * 1.86 + jitter(0.5) : random() * 6;
    return s.finish({
      update: (dt, time) => {
        spin.rotation.y += dt * rate;
        plumes.forEach((plume, index) => { const pulse = 0.85 + 0.2 * Math.sin(time * (2 + index) * mix(0.5, 1.6, mood.energy) + phase + index); plume.scale.set(pulse, 1, pulse); });
      },
    });
  },
});
