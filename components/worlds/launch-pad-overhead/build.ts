import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, score } from '@conjure/kit';
import { Batch } from './batch';

type P = [number, number, number];

const COASTS = {
  marsh: 'A subtropical salt marsh: olive-green flats, winding tidal creeks, a tan beach and grey-blue surf.',
  steppe: 'A dry inland steppe: tan grass, dusty gullies and a white salt pan instead of a sea.',
  jungle: 'A tropical coast: deep green forest, turquoise lagoons, bright sand and a warm sea.',
  tundra: 'A cold northern shore: grey-green tundra, meltwater ponds and an ice-edged slate sea.',
  atoll: 'A flat coral island: pale sand and scrub with turquoise water on the seaward side.',
} as const;
const PALETTE: Record<keyof typeof COASTS, { land: string; alt: string; water: string; sand: string; sea: string; scrub: string[] }> = {
  marsh: { land: '#8a9a62', alt: '#a3a368', water: '#6e97a2', sand: '#ddd0a9', sea: '#6c9db2', scrub: ['#5f7f3a', '#78904a', '#93a35a'] },
  steppe: { land: '#c8b684', alt: '#b9a570', water: '#a8946a', sand: '#ece7d6', sea: '#e3ddca', scrub: ['#9a9258', '#b0a064', '#847f4c'] },
  jungle: { land: '#5f9652', alt: '#4d8548', water: '#56b0a6', sand: '#ecdcae', sea: '#4cb4c0', scrub: ['#2f7a3c', '#3f8f48', '#5aa652'] },
  tundra: { land: '#aeb5a0', alt: '#9ba58f', water: '#86a2b2', sand: '#e9eff0', sea: '#7b95a6', scrub: ['#7d8a6a', '#97a183', '#6c775c'] },
  atoll: { land: '#e0d2a8', alt: '#cfc294', water: '#63c2c4', sand: '#f1e6c2', sea: '#45b3c4', scrub: ['#5c9550', '#7aa85c', '#4a8046'] },
};

export default defineWorld({
  questions: {
    coast: choice('What kind of country is the complex built on?', COASTS),
    state: choice('What is happening at the complex?', {
      countdown: 'Launch morning: floodlight pools on the pad, vapour drifting, everything pointed at one moment.',
      dormant: 'Between flights: swept, maintained and empty.',
      aftermath: 'Just after a launch: fresh black scars, steam still rising, scrub scorched brown round the pad.',
      abandoned: 'Abandoned for decades: cracked concrete, weeds in the joints, the marsh taking the road back.',
      flooded: 'After a storm surge: standing water across the crawlerway and round the pad.',
    }),
    pad: choice('What shape is the pad?', {
      octagon: 'A broad octagon with sloping flanks.',
      round: 'A circular hardstand.',
      square: 'A plain square slab with a hazard-striped edge.',
      star: 'An octagon with long flame aprons reaching out on two sides.',
    }),
    scars: score('How burnt is the concrete?', ['Clean and pale, never fired from', 'A faint grey star', 'Bold black rays out to the edge', 'Scorched black far beyond the pad']),
    way: choice('What kind of road brings the rocket to the pad?', {
      crawlerway: 'A wide crawlerway: twin lanes of pale river gravel with a grass median.',
      rails: 'Railway tracks on a ballast embankment, the rocket arrives lying down.',
      road: 'A plain asphalt road with a painted centre line.',
    }),
    dressing: choice('What is built around the perimeter?', {
      floodlights: 'Tall floodlight masts ringing the pad.',
      tanks: 'A tank farm of small white spheres and pipe runs.',
      bunkers: 'Earth-covered blockhouses with slit windows.',
      fence: 'A double security fence with a gatehouse.',
      bare: 'Nothing: road, pad and wilderness.',
    }),
    water: score('How much open water lies among the land?', ['Bone dry', 'A few creeks', 'Creeks and ponds everywhere', 'More water than land']),
    number: choice('What is painted on the pad apron?', {
      '39a': '39A', '1': 'A single numeral 1', '5': 'ПЛ 5 in Cyrillic', h: 'A crossed-out H', none: 'Nothing readable.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const G = 33, H = G / 2;
    const pal = PALETTE[a.coast];
    const wear = a.state === 'abandoned' ? Math.max(mood.wear, 0.65) : mood.wear;
    const wet = Math.min(1, a.water + (a.state === 'flooded' ? 0.45 : 0)) * (a.coast === 'steppe' ? 0.5 : 1);
    const scars = Math.min(1, a.scars + (a.state === 'aftermath' ? 0.3 : 0));
    const dawn = Math.abs(mood.daylight - 0.5) * 2;
    const background = '#' + new THREE.Color('#e4e8e6').lerp(new THREE.Color(mood.daylight < 0.5 ? '#f0ddc6' : '#e6d0c8'), dawn * 0.8).getHexString();
    const padR = 7.2, padH = 0.5;
    const wayAngle = mix(-0.95, -0.45, random());
    const wayDir = new THREE.Vector2(Math.sin(wayAngle), Math.cos(wayAngle));
    const along = (d: number, side = 0): [number, number] => [wayDir.x * d + wayDir.y * side, wayDir.y * d - wayDir.x * side];
    const ringR = 11.6;
    const onRing = (angle: number): [number, number] => [Math.sin(angle) * ringR, Math.cos(angle) * ringR];
    const slots: [number, number, number, number][] = [
      [0, 0, padH, 1],
      [...along(14.4), 0.08, 0.5], [...onRing(wayAngle + 1.35), 0.02, 0.5], [...onRing(wayAngle - 1.5), 0.02, 0.5],
      [...along(18.6), 0.08, 0.42], [...onRing(wayAngle + 2.5), 0.02, 0.46], [...onRing(wayAngle - 2.55), 0.02, 0.46],
    ];
    const { art: s, world } = diorama(context, { background, floor: pal.land, width: G, depth: G, maxHeight: 10, radius: 4.2, pitch: 57, yaw: mix(16, 40, random()), slots });

    // ---- The ground, painted from above -------------------------------------------------------
    const N = 1024, k = N / G;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = N;
    const ctx = canvas.getContext('2d')!;
    const px = (x: number) => (x + H) * k;
    const tone = (hex: string, shift = 0, alpha = 1) => { const c = new THREE.Color(hex).offsetHSL(0, 0, shift); c.lerp(new THREE.Color('#9a8f72'), wear * 0.12); return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${alpha})`; };
    ctx.fillStyle = tone(pal.land);
    ctx.fillRect(0, 0, N, N);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = tone(random() < 0.5 ? pal.alt : pal.land, (random() - 0.5) * 0.12, 0.35);
      ctx.beginPath();
      ctx.ellipse(random() * N, random() * N, 6 + random() * 40, 4 + random() * 16, random() * 3, 0, 7);
      ctx.fill();
    }
    // Shoreline along the far edge.
    const shore = (x: number) => -13.5 + Math.sin(x * 0.21 + 1) * 0.7 + Math.sin(x * 0.57) * 0.3;
    const shoreBand = (offset: number, fill: string) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let x = -H; x <= H; x += 0.5) ctx.lineTo(px(x), px(shore(x) + offset));
      ctx.lineTo(N, 0);
      ctx.closePath();
      ctx.fill();
    };
    // Creeks and ponds.
    const creeks = Math.round(wet * 9);
    ctx.lineCap = ctx.lineJoin = 'round';
    for (let c = 0; c < creeks; c++) {
      let x = (random() - 0.5) * G, z = mix(-10, 17, random()), heading = Math.PI + (random() - 0.5) * 2;
      let width = mix(0.25, 0.9, random()) * (0.6 + wet);
      for (let step = 0; step < 60 && Math.abs(x) < H + 1 && z > -15; step++) {
        const nx = x + Math.sin(heading) * 0.7, nz = z + Math.cos(heading) * 0.7;
        ctx.strokeStyle = tone(pal.water, 0, 0.95);
        ctx.lineWidth = width * k;
        ctx.beginPath(); ctx.moveTo(px(x), px(z)); ctx.lineTo(px(nx), px(nz)); ctx.stroke();
        x = nx; z = nz;
        heading += (random() - 0.5) * 0.9 + (Math.PI - heading) * 0.06;
        width = Math.min(1.6, width * 1.012);
      }
    }
    for (let p = 0; p < Math.round(wet * wet * 46); p++) {
      ctx.fillStyle = tone(pal.water, (random() - 0.5) * 0.06, 0.95);
      ctx.beginPath();
      ctx.ellipse(random() * N, random() * N, (0.5 + random() * 2.4 * (0.5 + wet)) * k, (0.3 + random() * 1.2 * (0.5 + wet)) * k, random() * 3, 0, 7);
      ctx.fill();
    }
    shoreBand(1.1, tone(pal.sand));
    shoreBand(0, tone(pal.sea));
    if (a.coast !== 'steppe') for (let line = 0; line < 5; line++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.85 - line * 0.15})`;
      ctx.lineWidth = (2.6 - line * 0.35);
      ctx.setLineDash([18 + random() * 40, 6 + random() * 16]);
      ctx.beginPath();
      for (let x = -H; x <= H; x += 0.5) ctx.lineTo(px(x), px(shore(x) - 0.12 - line * 0.62 + Math.sin(x * 1.3 + line) * 0.08));
      ctx.stroke();
    }
    ctx.setLineDash([]);
    if (a.coast === 'tundra') for (let floe = 0; floe < 26; floe++) { const x = (random() - 0.5) * G, z = shore(x) - 0.5 - random() * 3; ctx.fillStyle = 'rgba(244,249,250,0.95)'; ctx.beginPath(); ctx.ellipse(px(x), px(z), (0.3 + random() * 0.9) * k, (0.2 + random() * 0.5) * k, random() * 3, 0, 7); ctx.fill(); }
    if (a.coast === 'steppe') for (let crack = 0; crack < 40; crack++) { const x = (random() - 0.5) * G, z = shore(x) - random() * 3.6; ctx.strokeStyle = 'rgba(170,160,135,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px(x), px(z)); ctx.lineTo(px(x + (random() - 0.5) * 2), px(z + (random() - 0.5) * 1.2)); ctx.stroke(); }

    // Perimeter road, spur and the way in.
    const asphalt = tone('#8b8a82', wear * 0.08);
    const road = (width: number, colour: string) => { ctx.strokeStyle = colour; ctx.lineWidth = width * k; ctx.beginPath(); ctx.arc(px(0), px(0), ringR * k, 0, 7); ctx.stroke(); };
    road(1.5, tone(pal.sand, -0.08));
    road(1.05, asphalt);
    ctx.setLineDash([10, 12]); road(0.07, 'rgba(240,236,220,0.9)'); ctx.setLineDash([]);
    const spurAngle = wayAngle + Math.PI * mix(0.75, 1.1, random());
    ctx.strokeStyle = asphalt; ctx.lineWidth = 0.8 * k;
    ctx.beginPath(); ctx.moveTo(px(Math.sin(spurAngle) * padR), px(Math.cos(spurAngle) * padR)); ctx.lineTo(px(Math.sin(spurAngle) * ringR), px(Math.cos(spurAngle) * ringR)); ctx.stroke();
    const farEnd = Math.min(H / Math.abs(wayDir.x), H / Math.abs(wayDir.y)) - 0.1;
    const wayLine = (side: number, width: number, colour: string, dash: number[] = []) => {
      ctx.strokeStyle = colour; ctx.lineWidth = width * k; ctx.lineCap = 'butt'; ctx.setLineDash(dash);
      ctx.beginPath(); ctx.moveTo(px(along(padR - 0.5, side)[0]), px(along(padR - 0.5, side)[1])); ctx.lineTo(px(along(farEnd, side)[0]), px(along(farEnd, side)[1])); ctx.stroke();
      ctx.setLineDash([]); ctx.lineCap = 'round';
    };
    if (a.way === 'crawlerway') {
      wayLine(0, 4.4, tone(pal.sand, -0.1));
      wayLine(0, 3.7, tone(pal.alt, 0.02));
      for (const side of [-1.15, 1.15]) { wayLine(side, 1.35, tone('#e2dccb')); for (const rut of [-0.42, 0.42]) wayLine(side + rut, 0.09, 'rgba(150,142,120,0.55)', [14, 3]); }
    } else if (a.way === 'rails') {
      wayLine(0, 3, tone('#a8a08c'));
      for (const side of [-0.75, 0.75]) { wayLine(side, 0.9, tone('#7f786a'), [3, 4]); for (const rail of [-0.3, 0.3]) wayLine(side + rail, 0.08, '#3d3a36'); }
    } else {
      wayLine(0, 2.6, tone(pal.sand, -0.08)); wayLine(0, 2, asphalt); wayLine(0, 0.09, 'rgba(240,236,220,0.9)', [12, 12]);
    }
    // Soot thrown beyond the pad, scorched scrub, floodlight pools, drowned ground.
    const axis = wayAngle + Math.PI / 2 + (random() - 0.5) * 0.3;
    const fan = (cx: number, cz: number, rx: number, rz: number, turn: number, inner: string, outer: string) => {
      ctx.save(); ctx.translate(px(cx), px(cz)); ctx.rotate(-turn); ctx.scale(rx * k, rz * k);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, inner); g.addColorStop(1, outer);
      ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
    };
    if (a.state === 'aftermath') fan(0, 0, padR + 4.5, padR + 4.5, 0, 'rgba(110,84,50,0.75)', 'rgba(110,84,50,0)');
    for (const end of [-1, 1]) fan(Math.sin(axis) * end * (padR + 1.5), Math.cos(axis) * end * (padR + 1.5), 2.6 + scars * 2, 4 + scars * 5.5, axis, `rgba(18,16,14,${scars * 0.85})`, 'rgba(18,16,14,0)');
    if (a.state === 'countdown') for (let i = 0; i < 6; i++) { const t = (i / 6) * 6.283 + 0.4; fan(Math.sin(t) * (padR + 1.2), Math.cos(t) * (padR + 1.2), 3.4, 3.4, 0, `rgba(255,240,190,${mix(0.25, 0.6, dawn)})`, 'rgba(255,240,190,0)'); }
    if (a.state === 'flooded') {
      for (let pool = 0; pool < 16; pool++) { const d = mix(padR, 22, random()), [x, z] = pool < 9 ? along(d, (random() - 0.5) * 5) : [(random() - 0.5) * 26, (random() - 0.5) * 26]; ctx.fillStyle = tone(pal.water, 0.03, 0.9); ctx.beginPath(); ctx.ellipse(px(x), px(z), (0.9 + random() * 2.6) * k, (0.5 + random() * 1.4) * k, random() * 3, 0, 7); ctx.fill(); }
    }
    if (wear > 0.45) for (let bite = 0; bite < Math.round((wear - 0.45) * 90); bite++) {
      const onRoad = random() < 0.6, t = random() * 6.283, d = mix(padR, 24, random());
      const [x, z] = onRoad ? [Math.sin(t) * (ringR + (random() - 0.5) * 1.2), Math.cos(t) * (ringR + (random() - 0.5) * 1.2)] : along(d, (random() - 0.5) * 4.2);
      ctx.fillStyle = tone(random() < 0.5 ? pal.land : pal.alt, (random() - 0.5) * 0.08, 0.92);
      ctx.beginPath(); ctx.ellipse(px(x), px(z), (0.25 + random() * 0.8) * k, (0.15 + random() * 0.45) * k, random() * 3, 0, 7); ctx.fill();
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    const slab = world.ground as THREE.Mesh;
    const edge = slab.material as THREE.MeshStandardMaterial;
    const top = new THREE.MeshStandardMaterial({ map, roughness: 0.95 });
    slab.material = [edge, edge, top, edge, edge, edge];

    // ---- The pad ---------------------------------------------------------------------------------
    const sides = a.pad === 'round' ? 40 : a.pad === 'square' ? 4 : 8;
    const turn = a.pad === 'square' ? Math.PI / 4 + wayAngle : Math.PI / 8 + wayAngle;
    const concrete = new THREE.Color('#b1ad9f').lerp(new THREE.Color('#9c9584'), wear * 0.5);
    const outer = a.pad === 'square' ? padR * 1.25 : padR;
    const body = s.mesh(new THREE.CylinderGeometry(outer, outer + 0.9, padH, sides), new THREE.MeshStandardMaterial({ color: concrete.clone().multiplyScalar(0.88), roughness: 0.95 }), [0, padH / 2, 0]);
    body.rotation.y = turn;
    const pc = document.createElement('canvas');
    pc.width = pc.height = 768;
    const p = pc.getContext('2d')!;
    const ps = 768 / (outer * 2), pp = (v: number) => (v + outer) * ps;
    p.beginPath();
    for (let i = 0; i < sides; i++) { const t = turn + (i / sides) * Math.PI * 2; p.lineTo(pp(Math.sin(t) * outer), pp(Math.cos(t) * outer)); }
    p.closePath();
    p.save();
    p.clip();
    p.fillStyle = '#' + concrete.getHexString();
    p.fillRect(0, 0, 768, 768);
    p.save(); p.translate(384, 384); p.rotate(-wayAngle);
    p.strokeStyle = 'rgba(120,116,104,0.7)'; p.lineWidth = 1.3;
    for (let line = -8; line <= 8; line++) { p.beginPath(); p.moveTo(line * 46, -400); p.lineTo(line * 46, 400); p.moveTo(-400, line * 46); p.lineTo(400, line * 46); p.stroke(); }
    for (let cell = 0; cell < 90; cell++) { p.fillStyle = `rgba(${random() < 0.5 ? '255,255,250' : '90,86,76'},${0.05 + random() * 0.08})`; p.fillRect(Math.floor(random() * 17 - 8.5) * 46, Math.floor(random() * 17 - 8.5) * 46, 46, 46); }
    p.restore();
    // Hazard border.
    p.lineWidth = 0.45 * ps;
    p.strokeStyle = '#e3bb25';
    p.setLineDash([0.6 * ps, 0.6 * ps]);
    p.beginPath();
    for (let i = 0; i <= sides; i++) { const t = turn + (i / sides) * Math.PI * 2; p.lineTo(pp(Math.sin(t) * (outer - 0.45)), pp(Math.cos(t) * (outer - 0.45))); }
    p.stroke();
    p.setLineDash([]);
    // Flame trench mouths either side of the mount, and a ring where the rocket stands.
    p.save(); p.translate(384, 384); p.rotate(-axis);
    p.fillStyle = '#3a3531';
    p.fillRect(-1.1 * ps, -outer * 0.92 * ps, 2.2 * ps, outer * 1.84 * ps);
    p.fillStyle = '#6f4a36';
    p.fillRect(-0.8 * ps, -outer * 0.92 * ps, 1.6 * ps, outer * 1.84 * ps);
    p.restore();
    // Scars: a star of soot rays, longest down the trench axis.
    const rays = Math.round(10 + scars * 26);
    for (let ray = 0; ray < rays; ray++) {
      const t = random() * Math.PI * 2, alignment = Math.abs(Math.cos(t - axis));
      const reach = outer * mix(0.35, 1.15, random()) * mix(0.55, 1, alignment) * mix(0.5, 1.1, scars), spread = mix(0.03, 0.12, random());
      const g = p.createRadialGradient(384, 384, 0, 384, 384, reach * ps);
      g.addColorStop(0, `rgba(14,12,11,${Math.min(0.95, scars * 1.3)})`); g.addColorStop(0.55, `rgba(22,19,16,${scars * 0.7})`); g.addColorStop(1, 'rgba(26,22,18,0)');
      p.fillStyle = g;
      p.beginPath(); p.moveTo(384, 384); p.arc(384, 384, reach * ps, Math.PI / 2 - t - spread, Math.PI / 2 - t + spread); p.closePath(); p.fill();
    }
    const core = p.createRadialGradient(384, 384, 0, 384, 384, outer * 0.5 * ps);
    core.addColorStop(0, `rgba(12,11,10,${Math.min(0.95, 0.15 + scars)})`); core.addColorStop(1, 'rgba(12,11,10,0)');
    p.fillStyle = core; p.fillRect(0, 0, 768, 768);
    p.strokeStyle = 'rgba(240,238,228,0.85)'; p.lineWidth = 0.14 * ps;
    p.beginPath(); p.arc(384, 384, 3.6 * ps, 0, 7); p.stroke();
    // Apron lettering, set to be read from the camera side.
    const label = { '39a': '39A', '1': '1', '5': 'ПЛ 5', h: 'H', none: '' }[a.number];
    if (label) {
      p.save(); p.translate(pp(along(outer * 0.72)[0]), pp(along(outer * 0.72)[1])); p.rotate(-wayAngle * 0.4);
      p.fillStyle = `rgba(245,243,232,${0.92 - wear * 0.45})`;
      p.font = `bold ${1.7 * ps}px sans-serif`; p.textAlign = 'center'; p.textBaseline = 'middle';
      p.fillText(label, 0, 0);
      if (a.number === 'h') { p.strokeStyle = '#c9311f'; p.lineWidth = 0.22 * ps; p.beginPath(); p.moveTo(-ps, -ps); p.lineTo(ps, ps); p.moveTo(ps, -ps); p.lineTo(-ps, ps); p.stroke(); }
      p.restore();
    }
    // Age: cracks with weeds in them, rust weeping from fittings.
    for (let crack = 0; crack < Math.round(wear * 26); crack++) {
      let x = random() * 768, y = random() * 768;
      p.strokeStyle = 'rgba(60,56,48,0.75)'; p.lineWidth = 1.4; p.beginPath(); p.moveTo(x, y);
      for (let seg = 0; seg < 6; seg++) { x += (random() - 0.5) * 80; y += (random() - 0.5) * 80; p.lineTo(x, y); if (wear > 0.5 && random() < 0.7) { p.fillStyle = pal.scrub[seg % 3]; p.fillRect(x - 3, y - 3, 6 + random() * 6, 5 + random() * 5); } }
      p.stroke();
    }
    for (let stain = 0; stain < Math.round(wear * 14); stain++) { p.fillStyle = 'rgba(132,68,31,0.35)'; p.beginPath(); p.ellipse(random() * 768, random() * 768, 8 + random() * 26, 4 + random() * 10, random() * 3, 0, 7); p.fill(); }
    if (a.state === 'flooded') for (let pool = 0; pool < 7; pool++) { p.fillStyle = 'rgba(110,150,165,0.75)'; p.beginPath(); p.ellipse(random() * 768, random() * 768, 20 + random() * 60, 12 + random() * 30, random() * 3, 0, 7); p.fill(); }
    p.restore();
    const padMap = new THREE.CanvasTexture(pc);
    padMap.colorSpace = THREE.SRGBColorSpace;
    padMap.anisotropy = 8;
    const padTop = s.mesh(new THREE.PlaneGeometry(outer * 2, outer * 2), new THREE.MeshStandardMaterial({ map: padMap, roughness: 0.9, alphaTest: 0.5, transparent: false }), [0, padH + 0.012, 0]);
    padTop.rotation.x = -Math.PI / 2;
    padTop.castShadow = false;

    // ---- Built dressing --------------------------------------------------------------------------
    const b = new Batch();
    const rustHex = new THREE.Color('#84441f');
    const paint = (hex: string) => { const c = new THREE.Color(hex); if (random() < wear * 0.7) c.lerp(rustHex, random() * wear * 0.8); return c; };
    // Ramp where the way climbs onto the pad, and flame aprons for the star pad.
    const rampYaw = Math.atan2(wayDir.x, wayDir.y);
    b.box([a.way === 'crawlerway' ? 4.2 : 2.6, 0.06, 3.4], [along(outer + 0.9)[0], padH / 2, along(outer + 0.9)[1]], a.way === 'road' ? '#8b8a82' : '#d5cfbd', [-Math.atan2(padH, 3.4), rampYaw, 0]);
    if (a.pad === 'star') for (const end of [-1, 1]) b.box([3.4, 0.3, 6.5], [Math.sin(axis) * end * (outer + 2.6), 0.15, Math.cos(axis) * end * (outer + 2.6)], concrete.clone().lerp(new THREE.Color('#1c1917'), scars * 0.75), [0, axis, 0]);
    if (a.way === 'rails') for (let tie = 0; tie < 2; tie++) b.box([0.1, 0.12, farEnd - padR], [along((farEnd + padR) / 2, tie ? 0.45 : -0.45)[0], 0.07, along((farEnd + padR) / 2, tie ? 0.45 : -0.45)[1]], '#4a4743', [0, rampYaw, 0]);
    // Small service buildings by the spur road.
    const spur: [number, number] = [Math.sin(spurAngle) * (ringR + 1.6), Math.cos(spurAngle) * (ringR + 1.6)];
    for (let hut = 0; hut < Math.round(mix(1, 4, mood.density)); hut++) {
      const x = spur[0] + (random() - 0.5) * 4.5, z = Math.max(-11.6, spur[1] + (random() - 0.5) * 4.5), w = 0.8 + random() * 1.1, d = 0.6 + random() * 0.8, h = 0.35 + random() * 0.4;
      b.box([w, h, d], [x, h / 2, z], paint(['#d9d6cb', '#c9c5b6', '#b7c0c4'][hut % 3]), [0, spurAngle, 0]);
      b.box([w + 0.1, 0.06, d + 0.1], [x, h + 0.03, z], paint('#6f7477'), [0, spurAngle, 0]);
    }
    const lamps: THREE.Mesh[] = [];
    const lampMat = s.material('#fff3c9', { emissive: '#ffe9a6', emissiveIntensity: a.state === 'countdown' ? 2.4 : a.state === 'dormant' ? 0.5 : 0 });
    if (a.dressing === 'floodlights') {
      for (let i = 0; i < 6; i++) {
        const t = (i / 6) * 6.283 + 0.4, r = outer + 2.2, x = Math.sin(t) * r, z = Math.cos(t) * r, lean = wear > 0.7 && random() < 0.4 ? 0.25 : 0;
        b.within([x, 0, z], [lean, t, 0], () => { b.lattice(0.5, 0, 3.4, 5, 0.035, () => paint('#d9d9d2')); b.box([1.1, 0.5, 0.12], [0, 3.6, 0], '#3a3d3e', [0.5, Math.PI, 0]); });
        if (!lean) lamps.push(s.box([0.95, 0.38, 0.05], [x - Math.sin(t) * 0.1, 3.58, z - Math.cos(t) * 0.1], lampMat));
        if (!lean) lamps[lamps.length - 1].rotation.set(0.5, t + Math.PI, 0, 'YXZ');
      }
    } else if (a.dressing === 'tanks') {
      const t0 = axis + 0.9;
      for (let i = 0; i < 4; i++) {
        const x = Math.sin(t0 + i * 0.16) * (outer + 3.4), z = Math.cos(t0 + i * 0.16) * (outer + 3.4), r = 0.55 + (i % 2) * 0.18;
        b.ball(r, [x, r + 0.3, z], paint('#f1f1ec'), [1, 1, 1], 14);
        for (let leg = 0; leg < 5; leg++) b.cyl(0.04, 0.04, r + 0.3, [x + Math.sin(leg * 1.26) * r * 0.9, (r + 0.3) / 2, z + Math.cos(leg * 1.26) * r * 0.9], '#d8d8d2', 5);
        b.rod([x, 0.12, z], [Math.sin(t0 + i * 0.16) * outer, 0.12, Math.cos(t0 + i * 0.16) * outer], 0.06, '#e6e6df', 0.06, 5);
      }
      b.cyl(3.2, 3.2, 0.04, [Math.sin(t0 + 0.24) * (outer + 3.4), 0.03, Math.cos(t0 + 0.24) * (outer + 3.4)], '#b9b5a6', 20);
    } else if (a.dressing === 'bunkers') {
      for (let i = 0; i < 3; i++) {
        const t = wayAngle + 0.75 + i * 1.9, r = ringR + 2.4, x = Math.sin(t) * r, z = Math.max(-11.4, Math.cos(t) * r);
        b.ball(1, [x, 0, z], new THREE.Color(pal.alt).offsetHSL(0, 0, -0.04), [1.9, 0.75, 1.5], 12);
        b.box([1.5, 0.5, 0.5], [x - Math.sin(t) * 1.2, 0.25, z - Math.cos(t) * 1.2], paint('#b9b5a8'), [0, t, 0]);
        b.box([1.1, 0.1, 0.52], [x - Math.sin(t) * 1.2, 0.32, z - Math.cos(t) * 1.2], '#22262a', [0, t, 0]);
        b.cyl(0.04, 0.04, 0.9, [x, 1, z], '#55595a', 5);
      }
    } else if (a.dressing === 'fence') {
      for (const r of [ringR + 1.3, ringR + 1.9]) for (let i = 0; i < 72; i++) {
        const t0 = (i / 72) * 6.283, t1 = ((i + 1) / 72) * 6.283;
        if (Math.abs(((t0 - wayAngle + 9.42) % 6.283) - Math.PI) < 0.2 || Math.cos(t0) * r < -12.2 || (wear > 0.6 && random() < wear * 0.4)) continue;
        b.cyl(0.03, 0.03, 0.42, [Math.sin(t0) * r, 0.21, Math.cos(t0) * r], '#8f9596', 4);
        b.rod([Math.sin(t0) * r, 0.4, Math.cos(t0) * r], [Math.sin(t1) * r, 0.4, Math.cos(t1) * r], 0.022, '#aab0b1', 0.022, 3);
        b.rod([Math.sin(t0) * r, 0.2, Math.cos(t0) * r], [Math.sin(t1) * r, 0.2, Math.cos(t1) * r], 0.016, '#aab0b1', 0.016, 3);
      }
      const gate = along(ringR + 1.6, 2.9);
      b.box([0.8, 0.55, 0.7], [gate[0], 0.28, gate[1]], paint('#e3e0d4'), [0, rampYaw, 0]);
      b.box([0.95, 0.07, 0.85], [gate[0], 0.59, gate[1]], '#c9311f', [0, rampYaw, 0]);
      b.box([4.4, 0.07, 0.07], [along(ringR + 1.6)[0], 0.42, along(ringR + 1.6)[1]], '#e3bb25', [0, rampYaw, a.state === 'abandoned' ? 0.12 : 0]);
    }
    // Scrub, reeds and driftwood, kept off the concrete and out of the sea.
    const clumps: { at: P; size: number; color: string }[] = [];
    const wanted = Math.round(mix(120, 520, mood.density) * (a.coast === 'atoll' || a.coast === 'steppe' ? 0.55 : 1) * (a.state === 'abandoned' ? 1.5 : 1));
    for (let tries = 0; clumps.length < wanted && tries < wanted * 4; tries++) {
      const x = (random() - 0.5) * (G - 0.6), z = (random() - 0.5) * (G - 0.6), r = Math.hypot(x, z);
      if (z < shore(x) + 1.3) continue;
      const lane = Math.abs(x * wayDir.y - z * wayDir.x), ahead = x * wayDir.x + z * wayDir.y;
      const clear = a.state === 'abandoned' ? 0.55 : 1;
      if (r < outer + 1.6 * clear || (Math.abs(r - ringR) < 0.9 * clear) || (ahead > 0 && lane < 2.5 * clear)) continue;
      if (slots.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 2.2)) continue;
      if (a.dressing === 'tanks' && Math.hypot(x - Math.sin(axis + 1.14) * (outer + 3.4), z - Math.cos(axis + 1.14) * (outer + 3.4)) < 3.4) continue;
      const burnt = a.state === 'aftermath' && r < outer + 5;
      const size = (a.coast === 'jungle' ? 0.34 : 0.2) * mix(0.6, 1.6, random());
      clumps.push({ at: [x, size * 0.45, z], size, color: burnt ? ['#6b5234', '#3d3128'][clumps.length % 2] : pal.scrub[Math.floor(random() * 3)] });
    }
    if (clumps.length) s.scatter(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), clumps);
    if (a.coast === 'jungle' || a.coast === 'atoll') for (let palm = 0; palm < 14; palm++) {
      const x = (random() - 0.5) * (G - 2), z = shore(x) + 1.4 + random() * 1.6;
      b.rod([x, 0, z], [x + 0.15, 0.95, z + 0.1], 0.045, '#8a744f', 0.03, 4);
      for (let frond = 0; frond < 6; frond++) b.rod([x + 0.15, 0.95, z + 0.1], [x + 0.15 + Math.sin(frond) * 0.5, 0.75, z + 0.1 + Math.cos(frond) * 0.5], 0.05, pal.scrub[frond % 3], 0.01, 3);
    }
    if (a.state === 'abandoned') for (let junk = 0; junk < 9; junk++) { const t = random() * 6.283, r = outer * random() * 0.95; b.box([0.3 + random() * 0.9, 0.08 + random() * 0.2, 0.2 + random() * 0.4], [Math.sin(t) * r, padH + 0.08, Math.cos(t) * r], paint('#8f6a4a'), [0, random() * 3, 0]); }
    s.root.add(b.mesh({ metalness: 0.05 }));

    // Vapour and steam.
    const puffs: THREE.Mesh[] = [];
    const vapour = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.4, depthWrite: false, roughness: 1 });
    const puffCount = a.state === 'aftermath' ? 12 : a.state === 'countdown' ? 5 : 0;
    for (let i = 0; i < puffCount; i++) {
      const end = i % 2 ? -1 : 1, d = a.state === 'aftermath' ? outer * mix(0.7, 1.7, random()) : outer * mix(0.75, 1.05, random());
      const size = a.state === 'aftermath' ? mix(0.9, 2.2, random()) : mix(0.5, 1, random());
      const at = new THREE.Vector3(Math.sin(axis) * end * d + (random() - 0.5) * 2.5, padH + size * 0.7, Math.cos(axis) * end * d + (random() - 0.5) * 2.5);
      const puff = s.ball([size, size * 0.7, size], at.toArray() as P, vapour, 10);
      puff.castShadow = false;
      puff.userData.home = at;
      puff.userData.phase = random() * 6;
      puffs.push(puff);
    }

    const energy = mix(0.3, 1.6, mood.energy);
    world.update = (_dt, time) => {
      for (const puff of puffs) { const home = puff.userData.home as THREE.Vector3; puff.position.y = home.y + Math.sin(time * 0.6 * energy + puff.userData.phase) * 0.25; puff.position.x = home.x + Math.cos(time * 0.4 * energy + puff.userData.phase) * 0.3; }
      if (a.state === 'countdown') lampMat.emissiveIntensity = 2.2 + Math.sin(time * 2 * energy) * 0.3;
    };
    const dispose = world.dispose.bind(world);
    world.dispose = () => { top.map?.dispose(); top.dispose(); dispose(); };
    return world;
  },
});
