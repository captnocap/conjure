import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const W = 1024, H = 512;
type LL = readonly [number, number]; // canvas x 0..W, y 0..H

const PALETTES = {
  vellum: { sea: '#d9c79a', land: ['#b98f52', '#a67c45', '#c4a565'], ink: '#4a3320', route: '#9c2b1c', line: '#8f7a52' },
  school: { sea: '#a9cfd6', land: ['#e6a4a0', '#e9d28a', '#a8c98f', '#c9a6d4'], ink: '#33434a', route: '#c22a2a', line: '#7ea4ab' },
  night: { sea: '#1f2c4a', land: ['#c7a045', '#b08a38', '#d4b660'], ink: '#f0dfa6', route: '#ff7a5a', line: '#45557a' },
  jade: { sea: '#bfd3bd', land: ['#5f8463', '#7a9a6c', '#4d7460'], ink: '#243a2e', route: '#a8332a', line: '#8fae94' },
} as const;

export default defineThing({
  questions: {
    world: choice('Which false world does the globe map?', {
      mu: 'One vast lost continent filling an ocean, labelled MU, with a few crumbs of islands.',
      antillia: 'An archipelago of many small square-ish islands scattered across an empty sea: the Seven Cities.',
      australis: 'A normal-looking north, and an enormous invented southern continent wrapped round the bottom of the world.',
      hollow: 'A hollow earth: a great dark opening at the pole with land curling down into it.',
      ring: 'A single ring-shaped continent around the equator enclosing an inner sea.',
      dragons: 'Almost entirely blank: one small known coast and the rest left empty for monsters.',
    }),
    pin: choice('Where is the pin stuck?', {
      none: 'No pin; nobody has claimed anything.',
      capital: 'A single red-headed pin in the heart of the largest land.',
      sea: 'One pin far out in open water, where there is nothing at all.',
      pole: 'A flag-headed pin right at the top of the world.',
      many: 'A dozen pins joined with thread, an obsessive’s campaign.',
      end: 'A black pin at the place where the expedition’s route stops.',
    }),
    route: choice('What does the expedition’s route look like?', {
      none: 'No route is drawn.',
      loop: 'A proud dashed loop right round the world and home again.',
      lost: 'A dashed line that sets out boldly, wanders, and ends in a small cross.',
      zigzag: 'A nervous zigzag hopping from island to island.',
    }),
    palette: choice('How is the map coloured?', {
      vellum: 'Sepia and tan on yellowed vellum.',
      school: 'Cheerful classroom pastels, each land a different colour.',
      night: 'Deep navy seas with lands and lettering in gold.',
      jade: 'Faded greens, like an old chart left in the sun.',
    }),
    monsters: score('How crowded are the seas with monsters and ships?', ['Empty water', 'A serpent and a ship or two', 'Every sea writhing with beasts']),
    stand: choice('What holds the globe?', {
      cradle: 'A four-legged mahogany floor cradle with a broad horizon ring and turned legs.',
      tripod: 'A tall three-legged stand with splayed legs and a brass stretcher.',
      pedestal: 'A single turned column on a heavy round foot.',
      desk: 'A low desk stand, the globe barely off the ground.',
    }),
    state: choice('What state is the globe in?', {
      turning: 'Turning slowly on its own, as if someone just spun it.',
      still: 'Perfectly still, kept dusted.',
      cracked: 'Split along a seam, a wedge of bare plaster showing through the map.',
      unfinished: 'Unfinished: several paper gores were never pasted on, leaving blank white strips.',
    }),
    glass: noul('Is a brass magnifying glass left on the horizon ring or beside the stand?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pal = PALETTES[a.palette];
    const rnd = (lo: number, hi: number) => lo + random() * (hi - lo);

    // ---- Paint the map ----
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = pal.sea;
    ctx.fillRect(0, 0, W, H);
    // Graticule.
    ctx.strokeStyle = pal.line; ctx.lineWidth = 1.5;
    for (let i = 0; i <= 12; i++) { ctx.beginPath(); ctx.moveTo((i * W) / 12, 0); ctx.lineTo((i * W) / 12, H); ctx.stroke(); }
    for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(0, (i * H) / 6); ctx.lineTo(W, (i * H) / 6); ctx.stroke(); }
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

    const lands: { x: number; y: number; r: number }[] = [];
    const wrapped = (draw: (dx: number) => void) => { for (const dx of [-W, 0, W]) draw(dx); };
    const blob = (cx: number, cy: number, rx: number, ry: number, colour: string, rough = 0.28, squarish = false) => {
      const n = squarish ? 8 : 22, phase = random() * 6;
      const pts: [number, number][] = [];
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2;
        const wob = 1 + Math.sin(t * 3 + phase) * rough * 0.5 + (random() - 0.5) * rough;
        const stretch = 1 / Math.max(0.35, Math.sin((cy / H) * Math.PI)); // widen near the poles
        pts.push([cx + Math.cos(t) * rx * wob * Math.min(stretch, 2.2), cy + Math.sin(t) * ry * wob]);
      }
      wrapped((dx) => {
        ctx.beginPath();
        pts.forEach(([x, y], i) => {
          const [nx, ny] = pts[(i + 1) % n];
          if (i === 0) ctx.moveTo(dx + (x + nx) / 2, (y + ny) / 2);
          const [mx, my] = pts[(i + 2) % n];
          if (squarish) ctx.lineTo(dx + nx, ny); else ctx.quadraticCurveTo(dx + nx, ny, dx + (nx + mx) / 2, (ny + my) / 2);
        });
        ctx.closePath();
        ctx.fillStyle = colour; ctx.fill();
        ctx.strokeStyle = pal.ink; ctx.lineWidth = 3; ctx.stroke();
        // Coastal hatching.
        ctx.save(); ctx.clip(); ctx.globalAlpha = 0.25; ctx.lineWidth = 9; ctx.stroke(); ctx.restore();
      });
      lands.push({ x: cx, y: cy, r: Math.min(rx, ry) });
    };
    const text = (label: string, x: number, y: number, size: number, colour: string = pal.ink, spacing = 0) => {
      ctx.save();
      ctx.fillStyle = colour; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `italic bold ${size}px serif`;
      wrapped((dx) => {
        if (!spacing) ctx.fillText(label, x + dx, y);
        else [...label].forEach((ch, i) => ctx.fillText(ch, x + dx + (i - (label.length - 1) / 2) * spacing, y));
      });
      ctx.restore();
    };
    const colour = (i: number) => pal.land[i % pal.land.length];
    const face = W * 0.5; // the canvas x that faces the viewer at rest

    if (a.world === 'mu') {
      blob(face + rnd(-30, 30), H * 0.5, 190, 120, colour(0), 0.3);
      for (let i = 0; i < 7; i++) blob(face + rnd(-420, 420), rnd(90, H - 90), rnd(10, 26), rnd(8, 20), colour(1 + i));
      text('MU', face, H * 0.5, 74, pal.ink, 80);
    } else if (a.world === 'antillia') {
      for (let i = 0; i < 16; i++) blob(face + rnd(-460, 460), rnd(110, H - 110), rnd(20, 44), rnd(16, 34), colour(i), 0.14, true);
      text('ANTILLIA', face, H * 0.2, 40, pal.ink, 46);
      text('the Seven Cities', face, H * 0.2 + 34, 22);
    } else if (a.world === 'australis') {
      for (let i = 0; i < 4; i++) blob(face + (i - 1.5) * 250 + rnd(-30, 30), rnd(110, 190), rnd(60, 100), rnd(40, 60), colour(i));
      ctx.fillStyle = colour(4); ctx.strokeStyle = pal.ink; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 16) ctx.lineTo(x, H * 0.62 + Math.sin((x / W) * Math.PI * 6) * 26 + Math.sin((x / W) * Math.PI * 14 + 2) * 12 + rnd(-5, 5));
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill(); ctx.stroke();
      lands.push({ x: face, y: H * 0.8, r: 60 });
      text('TERRA AUSTRALIS', face, H * 0.8, 42, pal.ink, 44);
      text('nondum cognita', face, H * 0.8 + 36, 22);
    } else if (a.world === 'hollow') {
      for (let i = 0; i < 5; i++) blob(face + (i - 2) * 200 + rnd(-30, 30), rnd(230, 380), rnd(55, 95), rnd(45, 70), colour(i));
      ctx.fillStyle = colour(0); ctx.fillRect(0, 60, W, 60);
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 120);
      for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 122 + Math.sin((x / W) * Math.PI * 10) * 10 + rnd(-4, 4));
      ctx.stroke();
      const grad = ctx.createLinearGradient(0, 0, 0, 74);
      grad.addColorStop(0, '#000000'); grad.addColorStop(0.7, '#1a0f0a'); grad.addColorStop(1, '#5a2c14');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, 74);
      text('THE OPENING', face, 98, 28, pal.ink, 30);
      lands.push({ x: face, y: 300, r: 50 });
    } else if (a.world === 'ring') {
      ctx.fillStyle = colour(0); ctx.strokeStyle = pal.ink; ctx.lineWidth = 3;
      const top: [number, number][] = [], bottom: [number, number][] = [];
      for (let x = 0; x <= W; x += 16) {
        top.push([x, H * 0.36 + Math.sin((x / W) * Math.PI * 8) * 16 + rnd(-6, 6)]);
        bottom.push([x, H * 0.64 + Math.sin((x / W) * Math.PI * 10 + 1) * 16 + rnd(-6, 6)]);
      }
      ctx.beginPath(); top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      [...bottom].reverse().forEach(([x, y]) => ctx.lineTo(x, y)); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = pal.sea;
      wrapped((dx) => { ctx.beginPath(); ctx.ellipse(face + dx, H * 0.5, 210, 30, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
      text('MARE INTERIUS', face, H * 0.5, 24, pal.ink, 26);
      text('THE GIRDLE', face + W * 0.3, H * 0.5, 34, pal.ink, 36);
      lands.push({ x: face + 260, y: H * 0.5, r: 50 });
    } else {
      blob(face - 150, H * 0.42, 60, 70, colour(0), 0.35);
      text('known', face - 150, H * 0.42, 22);
      text('HERE BE DRAGONS', face + 120, H * 0.55, 40, pal.ink, 40);
      text('terra incognita', face + 380, H * 0.3, 26);
    }

    // Monsters, ships and a compass rose.
    const inSea = (): LL => {
      for (let tries = 0; tries < 30; tries++) {
        const p: LL = [rnd(0, W), rnd(100, H - 100)];
        if (a.world === 'dragons' || lands.every((l) => Math.hypot(((p[0] - l.x + W * 1.5) % W) - W / 2, p[1] - l.y) > l.r * 1.6 + 30)) return p;
      }
      return [rnd(0, W), rnd(100, H - 100)];
    };
    const beasts = Math.round(mix(0, 16, a.monsters) + (a.world === 'dragons' ? 4 : 0));
    ctx.lineCap = 'round';
    for (let i = 0; i < beasts; i++) {
      const [x, y] = inSea(), size = rnd(12, 22), kind = i % 3;
      wrapped((dx) => {
        ctx.strokeStyle = pal.ink; ctx.fillStyle = pal.ink; ctx.lineWidth = 5;
        if (kind === 0) { // sea serpent: three humps and a head
          for (let h = 0; h < 3; h++) { ctx.beginPath(); ctx.arc(x + dx + h * size * 1.5, y, size * 0.6, Math.PI, 0); ctx.stroke(); }
          ctx.beginPath(); ctx.moveTo(x + dx - size * 1.1, y); ctx.quadraticCurveTo(x + dx - size * 1.5, y - size * 1.6, x + dx - size * 2.1, y - size * 1.1); ctx.stroke();
          ctx.beginPath(); ctx.arc(x + dx - size * 2.1, y - size * 1.1, 4, 0, 7); ctx.fill();
        } else if (kind === 1) { // ship
          ctx.beginPath(); ctx.moveTo(x + dx - size, y); ctx.quadraticCurveTo(x + dx, y + size * 0.8, x + dx + size, y); ctx.closePath(); ctx.fill();
          ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + dx, y); ctx.lineTo(x + dx, y - size * 1.3); ctx.stroke();
          ctx.fillStyle = a.palette === 'night' ? pal.ink : '#fbf5e2';
          ctx.beginPath(); ctx.moveTo(x + dx + 2, y - size * 1.3); ctx.lineTo(x + dx + size * 0.9, y - size * 0.3); ctx.lineTo(x + dx + 2, y - size * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
        } else { // kraken: a dome and curling arms
          ctx.beginPath(); ctx.arc(x + dx, y, size * 0.6, Math.PI, 0); ctx.fill();
          for (let arm = 0; arm < 5; arm++) { const ax = x + dx + (arm - 2) * size * 0.5; ctx.beginPath(); ctx.moveTo(ax, y); ctx.quadraticCurveTo(ax + (arm - 2) * 6, y + size, ax + (arm - 2) * 10 + 5, y + size * 0.5); ctx.stroke(); }
        }
      });
    }
    const [rx, ry] = [face + W * 0.42, H * 0.76];
    wrapped((dx) => {
      ctx.strokeStyle = pal.ink; ctx.fillStyle = pal.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(rx + dx, ry, 34, 0, 7); ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const t = (i / 8) * Math.PI * 2, long = i % 2 ? 22 : 44;
        ctx.beginPath(); ctx.moveTo(rx + dx + Math.cos(t) * long, ry + Math.sin(t) * long);
        ctx.lineTo(rx + dx + Math.cos(t + 1.4) * 7, ry + Math.sin(t + 1.4) * 7); ctx.lineTo(rx + dx + Math.cos(t - 1.4) * 7, ry + Math.sin(t - 1.4) * 7); ctx.closePath(); ctx.fill();
      }
    });

    // The route.
    const main = lands.reduce((best, l) => (l.r > best.r ? l : best), lands[0] ?? { x: face, y: H / 2, r: 40 });
    const route: LL[] = [];
    const start: LL = [face - 200, H * 0.36];
    if (a.route === 'loop') for (let i = 0; i <= 40; i++) route.push([start[0] + (i / 40) * W, H * 0.5 + Math.sin((i / 40) * Math.PI * 2) * 90 + Math.sin(i * 0.9) * 10 - 70]);
    else if (a.route === 'lost') {
      let [x, y] = start, heading = rnd(-0.3, 0.3);
      for (let i = 0; i < 26; i++) { route.push([x, y]); heading += rnd(-0.25, 0.25) * (1 + i / 8); x += Math.cos(heading) * 15; y = Math.min(H - 110, Math.max(110, y + Math.sin(heading) * 15 + 2.5)); }
    } else if (a.route === 'zigzag') {
      const stops = lands.length > 2 ? [...lands].sort((p, q) => p.x - q.x).slice(0, 7).map((l): LL => [l.x, l.y]) : Array.from({ length: 6 }, (_u, i): LL => [face - 220 + i * 90, H * 0.5 + (i % 2 ? 80 : -80)]);
      stops.forEach((stop, i) => { if (i) for (let k = 1; k <= 6; k++) route.push([mix(stops[i - 1][0], stop[0], k / 6), mix(stops[i - 1][1], stop[1], k / 6)]); else route.push(stop); });
    }
    if (route.length) wrapped((dx) => {
      ctx.strokeStyle = pal.route; ctx.lineWidth = 6; ctx.setLineDash([16, 11]);
      ctx.beginPath(); route.forEach(([x, y], i) => (i ? ctx.lineTo(x + dx, y) : ctx.moveTo(x + dx, y))); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = pal.route; ctx.beginPath(); ctx.arc(route[0][0] + dx, route[0][1], 9, 0, 7); ctx.fill();
      const [ex, ey] = route[route.length - 1];
      if (a.route === 'lost') { ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(ex + dx - 13, ey - 13); ctx.lineTo(ex + dx + 13, ey + 13); ctx.moveTo(ex + dx + 13, ey - 13); ctx.lineTo(ex + dx - 13, ey + 13); ctx.stroke(); }
    });

    // Unpasted gores, cartouche, age.
    if (a.state === 'unfinished') {
      const first = Math.floor(rnd(0, 12));
      for (const g of [first, first + 1, first + 5]) {
        ctx.fillStyle = '#f3eedf'; ctx.fillRect(((g % 12) * W) / 12, 0, W / 12, H);
        ctx.strokeStyle = '#9a9483'; ctx.lineWidth = 2; ctx.strokeRect(((g % 12) * W) / 12, 0, W / 12, H);
      }
    }
    ctx.globalAlpha = mood.wear * 0.4;
    for (let i = 0; i < 40; i++) { ctx.fillStyle = i % 2 ? '#5a4326' : '#efe2bd'; ctx.beginPath(); ctx.arc(rnd(0, W), rnd(0, H), rnd(6, 40), 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    map.anisotropy = 4;

    // ---- Build ----
    const desk = a.stand === 'desk';
    const R = desk ? 0.24 : 0.3;
    const centreY = { cradle: 0.82, tripod: 0.98, pedestal: 0.9, desk: 0.36 }[a.stand];
    const wood = s.material(mood.wear > 0.65 ? '#5b3a2a' : '#5a2416', { roughness: 0.38 });
    const woodDark = s.material('#33150d', { roughness: 0.45 });
    const brass = s.material('#c49a3c', { metalness: 0.85, roughness: mix(0.25, 0.55, mood.wear) });

    const tilt = new THREE.Group();
    tilt.position.y = centreY;
    tilt.rotation.z = -0.41;
    s.root.add(tilt);
    const spin = new THREE.Group();
    tilt.add(spin);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), new THREE.MeshStandardMaterial({ map, roughness: mix(0.35, 0.8, mood.wear) }));
    ball.castShadow = ball.receiveShadow = true;
    spin.add(ball);
    // With three's sphere mapping, canvas x = face sits at +z when the ball is turned a quarter.
    const toLocal = ([x, y]: LL, radius = R) => {
      const phi = (x / W) * Math.PI * 2, theta = (y / H) * Math.PI;
      return new THREE.Vector3(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta)).multiplyScalar(radius);
    };
    spin.rotation.y = Math.PI / 2 + 0.35 + rnd(-0.25, 0.25);
    if (a.state === 'cracked') {
      const plaster = s.material('#ece6d6', { roughness: 0.95 });
      const wedge = new THREE.Mesh(new THREE.SphereGeometry(R * 1.004, 6, 24, 0, 0.16, 0.25, 2.3), plaster);
      wedge.rotation.y = -Math.PI / 2 - 0.9;
      spin.add(wedge);
      const gap = new THREE.Mesh(new THREE.SphereGeometry(R * 1.007, 4, 24, 0.06, 0.035, 0.3, 2.2), s.material('#221a14'));
      gap.rotation.y = wedge.rotation.y;
      spin.add(gap);
    }
    // Axis pins and meridian.
    const meridian = new THREE.Mesh(new THREE.TorusGeometry(R + 0.022, 0.011, 8, 64), brass);
    meridian.castShadow = true;
    tilt.add(meridian);
    for (const sign of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 10), brass);
      cap.position.y = sign * (R + 0.02);
      tilt.add(cap);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), brass);
      knob.position.y = sign * (R + 0.05);
      tilt.add(knob);
    }
    const hourRing = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.006, 20), brass);
    hourRing.position.y = R + 0.012;
    tilt.add(hourRing);

    // Pins.
    const pinAt = (p: LL, head: string, flag = false) => {
      const base = toLocal(p), tip = toLocal(p, R + 0.06);
      const shaft = s.rod(base.toArray() as [number, number, number], tip.toArray() as [number, number, number], 0.003, brass);
      spin.add(shaft);
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), s.material(head, { roughness: 0.3 }));
      bead.position.copy(tip); bead.castShadow = true;
      spin.add(bead);
      if (flag) {
        const pennant = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.04), s.material('#c2302a', { side: THREE.DoubleSide }));
        pennant.position.copy(toLocal(p, R + 0.05)).add(new THREE.Vector3(0, 0, 0.036));
        pennant.rotation.y = Math.PI / 2;
        pennant.castShadow = true;
        spin.add(pennant);
      }
      return tip;
    };
    if (a.pin === 'capital') pinAt([main.x, main.y - 8], '#d0261f');
    else if (a.pin === 'sea') pinAt([face + rnd(60, 130), H * 0.58], '#d0261f');
    else if (a.pin === 'pole') pinAt([face, 6], '#f0e9d6', true);
    else if (a.pin === 'end') pinAt(route.length ? route[route.length - 1] : [face + 40, H * 0.5], '#16130f');
    else if (a.pin === 'many') {
      const tips = Array.from({ length: 11 }, (_u, i) => pinAt([face + rnd(-200, 200), rnd(110, H - 110)], ['#d0261f', '#e8c33a', '#2e6fb5', '#f0e9d6'][i % 4]));
      const thread = s.material('#b3261e', { roughness: 0.9 });
      for (let i = 1; i < tips.length; i++) spin.add(s.rod(tips[i - 1].toArray() as [number, number, number], tips[i].toArray() as [number, number, number], 0.0022, thread));
    }

    // ---- Stand ----
    const horizonY = centreY;
    const ringOuter = R + 0.115;
    const horizon = () => {
      const shape = new THREE.Shape(); shape.absarc(0, 0, ringOuter, 0, Math.PI * 2, false);
      const hole = new THREE.Path(); hole.absarc(0, 0, R + 0.04, 0, Math.PI * 2, true); shape.holes.push(hole);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2, curveSegments: 40 });
      geo.rotateX(-Math.PI / 2);
      s.mesh(geo, wood, [0, horizonY - 0.02, 0]);
      // Calendar scale on the horizon ring.
      const ticks = Array.from({ length: 48 }, (_u, i) => {
        const t = (i / 48) * Math.PI * 2, rr = R + 0.08;
        return { at: [Math.cos(t) * rr, horizonY + 0.023, Math.sin(t) * rr] as const, size: i % 4 ? 0.006 : 0.012, color: '#e3c887' };
      });
      s.scatter(new THREE.BoxGeometry(1, 0.2, 1), s.material('#e3c887', { roughness: 0.5 }), ticks);
    };
    const turned = (height: number, girth: number): [number, number][] => [[girth * 0.7, 0], [girth, height * 0.06], [girth * 0.55, height * 0.14], [girth * 0.95, height * 0.3], [girth * 0.5, height * 0.5], [girth * 0.6, height * 0.78], [girth * 1.1, height * 0.86], [girth * 0.7, height * 0.93], [girth * 0.9, height]];
    if (a.stand === 'cradle') {
      horizon();
      const legTop = horizonY - 0.02, legR = ringOuter - 0.03;
      for (let i = 0; i < 4; i++) {
        const t = Math.PI / 4 + (i * Math.PI) / 2, x = Math.cos(t) * legR, z = Math.sin(t) * legR;
        s.lathe(turned(legTop, 0.03), wood, [x, 0, z]);
        s.ball([0.034, 0.02, 0.034], [x, 0.012, z], brass, 10);
      }
      for (const turn of [Math.PI / 4, -Math.PI / 4]) {
        const bar = s.box([legR * 2, 0.03, 0.04], [0, 0.26, 0], woodDark);
        bar.rotation.y = turn;
      }
      s.lathe([[0.06, 0], [0.075, 0.02], [0.03, 0.05], [0.04, 0.12], [0.02, 0.17], [0.045, 0.2], [0.05, centreY - R - 0.29 - 0.03]], wood, [0, 0.27, 0]);
      s.ring(0.03, 0.012, [0, centreY - R - 0.035, 0], brass).rotation.x = Math.PI / 2;
    } else if (a.stand === 'tripod') {
      horizon();
      const hub: [number, number, number] = [0, 0.5, 0];
      for (let i = 0; i < 3; i++) {
        const t = Math.PI / 2 + (i * Math.PI * 2) / 3;
        const top: [number, number, number] = [Math.cos(t) * (ringOuter - 0.04), horizonY - 0.02, Math.sin(t) * (ringOuter - 0.04)];
        const foot: [number, number, number] = [Math.cos(t) * 0.42, 0, Math.sin(t) * 0.42];
        s.rod(foot, top, 0.026, wood, 0.018);
        s.rod(hub, [mix(foot[0], top[0], 0.5), mix(foot[1], top[1], 0.5), mix(foot[2], top[2], 0.5)], 0.008, brass);
        s.ball([0.03, 0.018, 0.03], [foot[0], 0.01, foot[2]], brass, 10);
      }
      s.ball([0.03, 0.03, 0.03], hub, brass, 12);
    } else {
      // A half meridian arm carries the tilted globe on a column.
      const arm = new THREE.Mesh(new THREE.TorusGeometry(R + 0.05, 0.014, 8, 40, Math.PI), brass);
      arm.rotation.z = -Math.PI / 2 - 0.41;
      arm.position.y = centreY;
      arm.castShadow = true;
      s.root.add(arm);
      const columnTop = centreY - R - 0.04;
      if (desk) s.lathe([[0.17, 0], [0.18, 0.012], [0.16, 0.03], [0.06, 0.045], [0.03, columnTop * 0.6], [0.045, columnTop]], wood);
      else {
        s.lathe([[0.26, 0], [0.27, 0.02], [0.24, 0.05], [0.09, 0.08], [0.06, 0.11]], wood);
        s.lathe(turned(columnTop - 0.1, 0.055), wood, [0, 0.1, 0]);
      }
      s.ball([0.04, 0.03, 0.04], [0, columnTop, 0], brass, 12);
    }
    // Maker's plate.
    const plate = s.label(`ATLAS OF NOWHERE  ${1610 + Math.floor(rnd(0, 250))}`, 0.2, 0.035, [0, 0, 0], '#3a2a12', '#c9a44a');
    if (a.stand === 'cradle' || a.stand === 'tripod') plate.position.set(0, horizonY, ringOuter + 0.008);
    else { plate.position.set(0, desk ? 0.02 : 0.03, (desk ? 0.175 : 0.262)); plate.rotation.x = -0.25; }

    if (a.glass) {
      const lens = new THREE.Group();
      lens.add(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.007, 8, 28), brass));
      const pane = new THREE.Mesh(new THREE.CircleGeometry(0.05, 24), new THREE.MeshStandardMaterial({ color: '#dff1f5', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
      lens.add(pane);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.007, 0.1, 8), woodDark);
      handle.position.set(0, -0.105, 0);
      lens.add(handle);
      lens.rotation.x = -Math.PI / 2;
      lens.rotation.z = rnd(-1, 1);
      if (a.stand === 'cradle' || a.stand === 'tripod') lens.position.set(ringOuter * 0.62, horizonY + 0.03, ringOuter * 0.62);
      else lens.position.set(R + 0.16, 0.012, 0.16);
      lens.traverse((node) => { node.castShadow = true; });
      s.root.add(lens);
    }

    let speed = a.state === 'turning' ? mix(0.25, 1.6, mood.energy) : 0;
    return s.finish({
      footprint: desk ? 0.3 : 0.45,
      update: (dt) => { spin.rotation.y += dt * speed; if (a.state !== 'turning') speed = 0; },
    });
  },
});
