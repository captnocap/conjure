import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P = [number, number, number];
const DEST: Record<string, string[][]> = {
  city: [['CITY CENTRE', 'v v'], ['RING ROAD', 'EAST'], ['EXIT 14', 'ONLY']],
  airport: [['AIRPORT', 'TERMINALS 1-3'], ['CARGO', 'LONG STAY'], ['EXIT 7', '800 m']],
  coast: [['THE COAST', 'FERRY PORT'], ['HARBOUR', 'BEACHES'], ['LAST EXIT', 'BEFORE TOLL']],
  hospital: [['HOSPITAL', 'H  A+E'], ['UNIVERSITY', 'OLD TOWN'], ['EXIT 22', '1 km']],
  north: [['THE NORTH', '320'], ['M6 TOLL', 'v v'], ['SERVICES', '12 km']],
  suburbs: [['RIVERSIDE', 'MAPLE HEIGHTS'], ['SCHOOLS', 'RETAIL PARK'], ['EXIT 3', 'LOCAL']],
};

export default defineThing({
  questions: {
    state: choice('How has the gantry come down?', {
      standing: 'Still standing, only sagging a little, the last upright thing on the road.',
      leaning: 'Leaning hard over the carriageway, about to go.',
      'one-end': 'One leg has collapsed: the beam slopes from the standing leg down to the tarmac like a ramp.',
      toppled: 'Flat on its back across the lanes, signs facing the sky.',
    }),
    destination: choice('What did the sign once point to?', {
      city: 'The city centre and the ring road.',
      airport: 'The airport terminals.',
      coast: 'The coast and the ferry port.',
      hospital: 'The hospital and the university.',
      north: 'Simply THE NORTH, hundreds of kilometres on.',
      suburbs: 'Ordinary suburbs: schools, a retail park, somebody\'s home exit.',
    }),
    overpaint: choice('What did survivors paint over it?', {
      nothing: 'Nothing: only weather has touched it.',
      warning: 'A warning in red: TURN BACK.',
      safe: 'A promise in white: SAFE, with an arrow.',
      names: 'A column of first names and a tally of days.',
      crossed: 'The old destination crossed out and one word: GONE.',
      sun: 'No words, just a big yellow sun, painted by someone with time.',
    }),
    panels: choice('How many sign panels does it carry?', {
      one: 'One huge panel spanning the lanes.',
      two: 'Two panels, one per direction.',
      three: 'Three smaller lane panels in a row.',
    }),
    growth: choice('What has taken it over?', {
      ivy: 'Heavy curtains of ivy hanging to the road.',
      blossom: 'A flowering creeper, the whole frame hazed with purple.',
      moss: 'Only moss and rust streaks; the steel is still bare.',
      nests: 'Stick nests wedged in the truss and dark birds along the top chord.',
    }),
    signal: choice('Is there a lane signal under the beam, and is it alive?', {
      none: 'No lane signal.',
      dark: 'A dead black signal box hanging by one bracket.',
      red: 'A red X that somehow still glows.',
      amber: 'Amber lamps still blinking at nobody.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = Math.max(0.35, mood.wear);
    const steel = s.material('#8d9494', { metalness: 0.5, roughness: 0.6 });
    const rusty = s.material('#7a4b2e', { roughness: 0.95 });
    const concrete = s.material('#a7a59b', { roughness: 1 });
    const metal = () => (random() < wear * 0.5 ? rusty : steel);

    const SPAN = 11, H = 6.2, TD = 0.9, TZ = 0.7;
    const master = new THREE.Group();
    s.root.add(master);
    const add = <T extends THREE.Object3D>(m: T, g: THREE.Object3D) => { g.add(m); return m; };

    // Legs: twin tubes laced with rungs on a concrete footing.
    const leg = (g: THREE.Object3D) => {
      for (const z of [-TZ / 2, TZ / 2]) add(s.rod([0, 0, z], [0, H + TD, z], 0.09, metal()), g);
      for (let i = 0; i < 9; i++) { const y = 0.5 + i * 0.72; add(s.rod([0, y, -TZ / 2], [0, y + (i % 2 ? 0.72 : 0), TZ / 2], 0.035, steel), g); }
      add(s.box([0.5, 0.06, 1.1], [0, 0.03, 0], steel), g);
    };
    const footing = (x: number) => s.box([1.0, 0.5, 1.5], [x, 0.25, 0], concrete);
    const legL = new THREE.Group(), legR = new THREE.Group(), beam = new THREE.Group();
    legL.position.x = -SPAN / 2; legR.position.x = SPAN / 2;
    leg(legL); leg(legR);
    master.add(legL, legR, beam);
    beam.position.set(-SPAN / 2, H, 0);

    // Box truss, in beam space: x runs 0..SPAN, y 0..TD.
    for (const y of [0, TD]) for (const z of [-TZ / 2, TZ / 2]) add(s.rod([0, y, z], [SPAN, y, z], 0.06, metal()), beam);
    const bays = 11;
    for (let i = 0; i <= bays; i++) {
      const x = (SPAN * i) / bays;
      for (const z of [-TZ / 2, TZ / 2]) {
        add(s.rod([x, 0, z], [x, TD, z], 0.03, steel), beam);
        if (i < bays) add(s.rod([x, i % 2 ? TD : 0, z], [x + SPAN / bays, i % 2 ? 0 : TD, z], 0.028, metal()), beam);
      }
      add(s.rod([x, TD, -TZ / 2], [x, TD, TZ / 2], 0.025, steel), beam);
    }

    // Sign panels.
    const count = { one: 1, two: 2, three: 3 }[a.panels];
    const PH = count === 1 ? 3.0 : 2.5;
    const widths = count === 1 ? [7.4] : count === 2 ? [4.6, 4.2] : [3.1, 3.1, 2.7];
    const total = widths.reduce((sum, w) => sum + w, 0) + (count - 1) * 0.35;
    const green = new THREE.Color('#1c6a42').lerp(new THREE.Color('#7f9a80'), wear * 0.45);
    const paintPanel = (lines: string[], w: number, main: boolean) => {
      const c = document.createElement('canvas');
      c.height = 384; c.width = Math.round((384 * w) / PH);
      const x = c.getContext('2d')!;
      const cw = c.width, ch = c.height;
      x.fillStyle = `#${green.getHexString()}`; x.fillRect(0, 0, cw, ch);
      x.strokeStyle = '#eef0e6'; x.lineWidth = 9; x.strokeRect(14, 14, cw - 28, ch - 28);
      x.fillStyle = '#eef0e6'; x.textAlign = 'center'; x.textBaseline = 'middle';
      lines.forEach((line, i) => {
        const y = ch * (lines.length === 1 ? 0.5 : 0.34 + i * 0.36);
        if (line === 'v v') {
          for (const dx of [-0.2, 0.2]) { x.beginPath(); const ax = cw * (0.5 + dx); x.moveTo(ax - 34, y - 30); x.lineTo(ax + 34, y - 30); x.lineTo(ax, y + 44); x.fill(); }
        } else {
          x.font = `bold ${i === 0 ? 92 : 66}px sans-serif`;
          x.fillText(line, cw / 2, y, cw - 70);
        }
      });
      // Weather: sun-bleached bands, rust weeping from the fixings, flakes that took letters with them.
      for (let i = 0; i < 6 + wear * 18; i++) { const fx = random() * cw, fy = random() * ch, r = 10 + random() * 46 * wear; const g = x.createRadialGradient(fx, fy, 0, fx, fy, r); const tone = random() < 0.5 ? '176,170,150' : '120,70,38'; g.addColorStop(0, `rgba(${tone},0.9)`); g.addColorStop(0.7, `rgba(${tone},0.6)`); g.addColorStop(1, `rgba(${tone},0)`); x.fillStyle = g; x.fillRect(fx - r, fy - r, r * 2, r * 2); }
      for (let i = 0; i < 9; i++) { const fx = random() * cw; x.fillStyle = `rgba(110,62,32,${0.2 + wear * 0.4})`; x.fillRect(fx, 0, 3 + random() * 7, ch * (0.2 + random() * 0.7)); }
      if (main && a.overpaint !== 'nothing') {
        const brush = (text: string, size: number, y: number, colour: string, tilt: number) => {
          x.save(); x.translate(cw / 2, y); x.rotate(tilt); x.font = `bold ${size}px sans-serif`; x.fillStyle = colour; x.lineWidth = 8; x.strokeStyle = colour; x.lineJoin = 'round';
          x.strokeText(text, 0, 0, cw - 40); x.fillText(text, 0, 0, cw - 40);
          for (let i = 0; i < 7; i++) x.fillRect(-cw * 0.35 + random() * cw * 0.7, size * 0.3, 6, 20 + random() * 70);
          x.restore();
        };
        if (a.overpaint === 'warning') brush('TURN BACK', 130, ch * 0.5, '#c7281e', -0.06);
        else if (a.overpaint === 'safe') {
          brush('SAFE', 150, ch * 0.4, '#f6f3e8', 0.04);
          x.strokeStyle = '#f6f3e8'; x.lineWidth = 22; x.lineCap = 'round'; x.beginPath(); x.moveTo(cw * 0.25, ch * 0.8); x.lineTo(cw * 0.75, ch * 0.8); x.moveTo(cw * 0.66, ch * 0.68); x.lineTo(cw * 0.76, ch * 0.8); x.lineTo(cw * 0.66, ch * 0.92); x.stroke();
        } else if (a.overpaint === 'names') {
          x.font = 'bold 44px sans-serif'; x.fillStyle = '#f6f3e8'; x.textAlign = 'left';
          ['ANA', 'TOMAS + JUN', 'MRS OKAFOR', 'DEV', 'the twins'].forEach((n, i) => x.fillText(n, 36 + (i % 2) * 14, 60 + i * 56));
          x.strokeStyle = '#f6f3e8'; x.lineWidth = 6;
          for (let i = 0; i < 23; i++) { const tx = cw * 0.55 + (i % 12) * 20 + Math.floor((i % 12) / 5) * 14, ty = 70 + Math.floor(i / 12) * 90; x.beginPath(); x.moveTo(tx, ty); x.lineTo(tx + 3, ty + 60); x.stroke(); }
        } else if (a.overpaint === 'crossed') {
          x.strokeStyle = '#141414'; x.lineWidth = 26; x.lineCap = 'round'; x.beginPath(); x.moveTo(40, ch * 0.22); x.lineTo(cw - 40, ch * 0.46); x.moveTo(40, ch * 0.5); x.lineTo(cw - 50, ch * 0.3); x.stroke();
          brush('GONE', 120, ch * 0.74, '#f6f3e8', -0.03);
        } else if (a.overpaint === 'sun') {
          x.fillStyle = '#f4c81e'; x.strokeStyle = '#f4c81e'; x.lineWidth = 20; x.lineCap = 'round';
          x.beginPath(); x.arc(cw / 2, ch / 2, 86, 0, 7); x.fill();
          for (let i = 0; i < 12; i++) { const t = i * 0.5236 + 0.1; x.beginPath(); x.moveTo(cw / 2 + Math.cos(t) * 112, ch / 2 + Math.sin(t) * 112); x.lineTo(cw / 2 + Math.cos(t) * (150 + (i % 2) * 22), ch / 2 + Math.sin(t) * (150 + (i % 2) * 22)); x.stroke(); }
        }
      }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    const back = s.material('#9aa09c', { metalness: 0.4, roughness: 0.6 });
    const panelSpots: { g: THREE.Object3D; w: number; x: number; y: number }[] = [];
    let px = (SPAN - total) / 2;
    const lines = DEST[a.destination];
    widths.forEach((w, i) => {
      const face = new THREE.MeshStandardMaterial({ map: paintPanel(lines[i], w, i === 0), roughness: 0.75 });
      const hangs = random() < wear * 0.35 && i > 0; // one fixing gone: the panel droops
      const g = new THREE.Group();
      g.position.set(px + w / 2, TD / 2 + 0.25, TZ / 2 + 0.09);
      if (hangs) { g.rotation.z = (random() < 0.5 ? -1 : 1) * (0.12 + random() * 0.14); g.position.y -= 0.3; }
      const panel = new THREE.Mesh(new THREE.BoxGeometry(w, PH, 0.05), [back, back, back, back, face, back]);
      panel.castShadow = panel.receiveShadow = true;
      g.add(panel);
      for (const dy of [-0.8, 0, 0.8]) add(s.box([w - 0.2, 0.08, 0.06], [0, dy, -0.05], back), g);
      beam.add(g);
      panelSpots.push({ g, w, x: px + w / 2, y: g.position.y });
      px += w + 0.35;
    });

    // Lane signal.
    let lamp: THREE.MeshStandardMaterial | null = null;
    if (a.signal !== 'none') {
      const g = new THREE.Group();
      g.position.set(SPAN - 1.1, -0.75, 0.2);
      add(s.box([0.95, 0.95, 0.25], [0, 0, 0], s.material('#151617')), g);
      add(s.box([1.05, 0.06, 0.4], [0, 0.5, 0.05], s.material('#151617')), g);
      if (a.signal === 'red') {
        lamp = new THREE.MeshStandardMaterial({ color: '#ff3020', emissive: '#ff2010', emissiveIntensity: 2.2 });
        for (const r of [-1, 1]) add(s.box([0.9, 0.12, 0.03], [0, 0, 0.13], lamp), g).rotation.z = r * Math.PI / 4;
      } else if (a.signal === 'amber') {
        lamp = new THREE.MeshStandardMaterial({ color: '#ffb020', emissive: '#ff9a10', emissiveIntensity: 2.2 });
        for (const [dx, dy] of [[-0.28, 0.28], [0.28, 0.28], [-0.28, -0.28], [0.28, -0.28]]) add(s.cylinder(0.1, 0.1, 0.03, [dx, dy, 0.13], lamp, 12), g).rotation.x = Math.PI / 2;
      } else { g.rotation.z = 0.5; g.position.y -= 0.25; }
      add(s.rod([0, 0.5, 0], [0, 0.75, 0], 0.03, steel), g);
      beam.add(g);
    }

    // Bring it down.
    const barrier = (x: number, z: number, turn: number) => { const b = s.mesh(new THREE.ExtrudeGeometry(new THREE.Shape([[-0.3, 0], [0.3, 0], [0.12, 0.3], [0.08, 0.8], [-0.08, 0.8], [-0.12, 0.3]].map(([u, v]) => new THREE.Vector2(u, v))), { depth: 3, bevelEnabled: false }), concrete, [x, 0, z]); b.rotation.y = turn; return b; };
    if (a.state === 'standing') {
      master.rotation.x = 0.03; beam.rotation.z = -0.015;
      footing(-SPAN / 2); footing(SPAN / 2);
    } else if (a.state === 'leaning') {
      // Racked sideways into a parallelogram and pitching back.
      const rack = 0.3 + random() * 0.14;
      legL.rotation.z = legR.rotation.z = -rack;
      beam.position.set(-SPAN / 2 + H * Math.sin(rack), H * Math.cos(rack) - 0.1, 0);
      beam.rotation.z = -0.04;
      master.rotation.x = -(0.16 + random() * 0.1);
      footing(-SPAN / 2).rotation.z = -0.12; footing(SPAN / 2).rotation.z = -0.2;
    } else if (a.state === 'one-end') {
      beam.rotation.z = -Math.asin((H - 0.1) / SPAN);
      beam.rotation.y = -0.1;
      legL.rotation.z = -0.05;
      legR.position.set(SPAN / 2 + 0.6, 0.15, 0.4); legR.rotation.set(Math.PI / 2 - 0.02, 0, 0.35);
      footing(-SPAN / 2); footing(SPAN / 2).rotation.z = 0.15;
    } else {
      // Sheared off at the feet and lying on its back over a crushed barrier; the stumps still stand.
      master.rotation.set(-1.3, 0.2, 0.07); master.position.set(0.4, 0.9, -0.7);
      legR.rotation.z = 0.2;
      for (const x of [-SPAN / 2, SPAN / 2]) { footing(x); for (const z of [-TZ / 2, TZ / 2]) { const h = 0.7 + random() * 0.7; s.rod([x, 0.4, z], [x + (random() - 0.5) * 0.3, 0.4 + h, z - 0.15], 0.09, rusty, 0.07); } }
      barrier(-4.5, -H - 0.9, Math.PI / 2 - 0.1);
      barrier(-1.3, -H - 1.3, Math.PI / 2 + 0.25).rotation.z = 0.5;
    }
    s.root.updateMatrixWorld(true);
    const toWorld = (g: THREE.Object3D, v: P) => g.localToWorld(new THREE.Vector3(...v));

    // Growth, hung in world space so it obeys gravity however the frame lies.
    const leaves: { at: P; size: number; color: string }[] = [];
    const greens = a.growth === 'blossom' ? ['#4d7a34', '#5f8f3e', '#9a7fd1', '#b79ae6', '#7d63c0'] : mood.warmth > 0.75 ? ['#6f8f3a', '#9a9a3a', '#b8862e', '#4d7a34'] : ['#3f6a30', '#4d7a34', '#5f8f3e', '#2f5a2c'];
    const clump = (c: THREE.Vector3, r: number, n: number, size: number) => { for (let i = 0; i < n; i++) leaves.push({ at: [c.x + (random() - 0.5) * 2 * r, Math.max(0.05, c.y + (random() - 0.5) * 2 * r), c.z + (random() - 0.5) * 2 * r], size: size * (0.6 + random() * 0.8), color: greens[Math.floor(random() * greens.length)] }); };
    const stem = s.material('#4a4530', { roughness: 1 });
    const lush = a.growth === 'moss' ? 0.12 : a.growth === 'nests' ? 0.35 : mix(0.6, 1, wear);
    const curtains = Math.round(lush * 26);
    for (let i = 0; i < curtains; i++) {
      const fromBeam = random() < 0.75;
      const anchor = fromBeam ? toWorld(beam, [random() * SPAN, random() < 0.5 ? 0 : TD, (random() - 0.5) * TZ]) : toWorld(random() < 0.5 ? legL : legR, [0, H * (0.4 + random() * 0.6), 0]);
      const drop = Math.min(anchor.y - 0.05, 0.8 + random() * 4.5 * lush);
      if (drop < 0.3) { clump(anchor, 0.4, 8, 0.14); continue; }
      const swayX = (random() - 0.5) * 0.4;
      s.rod(anchor.toArray() as P, [anchor.x + swayX, anchor.y - drop, anchor.z + 0.05], 0.018, stem, 0.008);
      const n = Math.ceil(drop / 0.3);
      for (let k = 0; k <= n; k++) clump(new THREE.Vector3(anchor.x + swayX * (k / n), anchor.y - drop * (k / n), anchor.z + 0.05), 0.2, 4, 0.13);
    }
    // Creeper over the faces of the panels: thick at the edges, leaving the words half showing.
    for (const spot of panelSpots) {
      const patches = Math.round(lush * 9);
      for (let i = 0; i < patches; i++) {
        const edge = random();
        const u = edge < 0.4 ? (random() < 0.5 ? -1 : 1) * (0.5 - random() * 0.14) : random() - 0.5;
        const v = edge < 0.4 ? random() - 0.5 : 0.5 - random() * random() * 0.5;
        clump(toWorld(spot.g, [u * spot.w, v * PH, 0.08]), 0.32, 14, 0.13);
      }
    }
    // Vines climbing the legs.
    for (const g of [legL, legR]) for (let i = 0; i < Math.round(lush * 12); i++) clump(toWorld(g, [0, random() * H * mix(0.4, 1, lush), (random() - 0.5) * TZ]), 0.3, 8, 0.13);
    const leafMesh = leaves.length ? s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true }), leaves) : null;

    // Moss along the top chord.
    const mossGeo = new THREE.SphereGeometry(1, 8, 6); mossGeo.scale(1, 0.35, 1);
    const pads: { at: P; size: number; color: string }[] = [];
    for (let i = 0; i < 16 + wear * 20; i++) { const p = toWorld(beam, [random() * SPAN, TD + 0.05, (random() - 0.5) * TZ]); pads.push({ at: p.toArray() as P, size: 0.12 + random() * 0.16, color: ['#56753a', '#6c8a3f', '#8c9a4a'][i % 3] }); }
    s.scatter(mossGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), pads);

    if (a.growth === 'nests') {
      const twig = s.material('#6a5238', { roughness: 1 }), crow = s.material('#1c1c20', { roughness: 0.7 });
      for (let i = 0; i < 3; i++) {
        const p = toWorld(beam, [1.2 + i * 3.6 + random(), TD + 0.1, 0]);
        s.cylinder(0.5, 0.36, 0.3, [p.x, p.y + 0.12, p.z], twig, 9);
        for (let k = 0; k < 14; k++) { const t = random() * 6.28; s.rod([p.x + Math.cos(t) * 0.25, p.y + 0.2, p.z + Math.sin(t) * 0.25], [p.x + Math.cos(t + 0.8) * 0.7, p.y + 0.1 + random() * 0.3, p.z + Math.sin(t + 0.8) * 0.7], 0.015, twig); }
      }
      for (let i = 0; i < 5 + Math.round(mood.density * 5); i++) {
        const p = toWorld(beam, [random() * SPAN, TD + 0.06, (random() < 0.5 ? -1 : 1) * TZ / 2]);
        const turn = random() * 6.28;
        s.ball([0.09, 0.1, 0.17], [p.x, p.y + 0.14, p.z], crow, 10).rotation.y = turn;
        s.ball([0.06, 0.06, 0.07], [p.x + Math.sin(turn) * 0.13, p.y + 0.26, p.z + Math.cos(turn) * 0.13], crow, 8);
        s.rod([p.x + Math.sin(turn) * 0.17, p.y + 0.26, p.z + Math.cos(turn) * 0.17], [p.x + Math.sin(turn) * 0.28, p.y + 0.24, p.z + Math.cos(turn) * 0.28], 0.02, crow, 0.004);
        s.rod([p.x - Math.sin(turn) * 0.1, p.y + 0.14, p.z - Math.cos(turn) * 0.1], [p.x - Math.sin(turn) * 0.34, p.y + 0.08, p.z - Math.cos(turn) * 0.34], 0.04, crow, 0.02);
      }
    }
    // Grass and rubble at the feet.
    for (const x of [-SPAN / 2, SPAN / 2]) { clump(new THREE.Vector3(x, 0.15, 0.6), 0.6, 0, 0.1); for (let i = 0; i < 5; i++) s.box([0.2 + random() * 0.3, 0.12 + random() * 0.15, 0.2 + random() * 0.3], [x + (random() - 0.5) * 1.8, 0.07, (random() - 0.5) * 2.2], concrete).rotation.y = random() * 3; }

    const blink = a.signal === 'amber';
    const sway = mix(0.001, 0.008, mood.energy);
    return s.finish({
      footprint: 6,
      update: (_dt, time) => {
        if (leafMesh) leafMesh.rotation.z = Math.sin(time * 0.9) * sway;
        if (lamp) lamp.emissiveIntensity = blink ? (Math.sin(time * 5) > 0 ? 2.4 : 0.2) : 2 + Math.sin(time * 23) * 0.3 * (0.3 + mood.energy);
      },
    });
  },
});
