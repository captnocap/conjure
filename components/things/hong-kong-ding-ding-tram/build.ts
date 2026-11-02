import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, figure, mix, noul, paint, paintHex } from '@conjure/kit';

const canvasTexture = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const L = 12, HL = L / 2, HB = 1.0, END = 0.85;
const planPoints = (inset = 0) => {
  const pts: THREE.Vector2[] = [];
  const hl = HL - inset, hb = HB - inset, e = END - inset * 0.5;
  for (let i = 0; i <= 12; i++) { const t = -Math.PI / 2 + (i / 12) * Math.PI; pts.push(new THREE.Vector2(hl - e + Math.cos(t) * e, Math.sin(t) * hb)); }
  for (let i = 0; i <= 12; i++) { const t = Math.PI / 2 + (i / 12) * Math.PI; pts.push(new THREE.Vector2(-hl + e + Math.cos(t) * e, Math.sin(t) * hb)); }
  return pts;
};
/** A slice of the body between two heights; with `ring`, hollow, as a wall. */
const slab = (y0: number, y1: number, inset = 0, ring = 0) => {
  const shape = new THREE.Shape(planPoints(inset));
  if (ring) shape.holes.push(new THREE.Path(planPoints(inset + ring).reverse()));
  const g = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false, curveSegments: 4 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  // Side-wall UVs in metres along the length and up from the slab's foot.
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + HL) / L, (p.getY(i) - y0) / (y1 - y0));
  return g;
};

const ROUTES = {
  kennedy: ['KENNEDY TOWN', '1'], north: ['NORTH POINT', '2'], valley: ['HAPPY VALLEY', '5'], shau: ['SHAU KEI WAN', '3'], western: ['WESTERN MARKET', '8'], whitty: ['WHITTY STREET', '7'],
} as const;

export default defineThing({
  questions: {
    livery: choice('What livery does the tram wear?', {
      classic: 'The classic dark green with cream window frames.',
      advert: 'An all-over advertising wrap in loud colours.',
      heritage: 'A heritage open-balcony tram in maroon and cream, its upper deck ends open to the air.',
      party: 'A hired party tram with fairy lights strung round the upper deck.',
    }),
    body: paint('If it wears an advert, what is the main colour?', ['red', 'magenta', 'blue', 'yellow', 'orange', 'turquoise', 'purple', 'lime', 'pink', 'black', 'white']),
    band: paint('What colour is the band and the lettering of the advert?', ['white', 'yellow', 'black', 'red', 'cream', 'sky', 'gold']),
    pattern: choice('If it wears an advert, what is on it?', {
      words: 'A huge brand word across both decks.',
      dots: 'Giant polka dots.',
      stripes: 'Racing stripes sweeping from end to end.',
      waves: 'Cartoon waves and stars.',
    }),
    route: choice('What does the destination blind say?', {
      kennedy: 'KENNEDY TOWN, the far western end.',
      north: 'NORTH POINT, east along the island.',
      valley: 'HAPPY VALLEY, the racecourse loop.',
      shau: 'SHAU KEI WAN, the end of the line.',
      western: 'WESTERN MARKET, the old terminus.',
      whitty: 'WHITTY STREET, the depot.',
    }),
    passengers: choice('Who is riding?', {
      empty: 'Nobody but the driver, a late tram going back to the depot.',
      few: 'A few riders upstairs at the front windows.',
      packed: 'Packed on both decks, faces at every window.',
    }),
    stop: choice('What is it doing?', {
      shelter: 'Stopped at a tram stop island behind it, with a railing and a little canopy.',
      rolling: 'Rolling along, a spark at the trolley head.',
      depot: 'Parked for the night, the trolley pole hooked down.',
    }),
    windows: noul('Are the upper deck windows slid open on a hot day?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const night = Math.min(1, Math.max(0, (lowSun - 0.35) / 0.65));
    const dir = random() < 0.5 ? 1 : -1;

    const tone = {
      classic: ['#1f4a2b', '#efe3c4'], heritage: ['#6e1f2a', '#efe3c4'], party: ['#2a2f6b', '#f0c040'], advert: [paintHex(a.body), paintHex(a.band)],
    }[a.livery];
    const [bodyHex, bandHex] = tone;
    // The advert is painted onto the panels as a map, the full 12 m along the body.
    const wrapMap = a.livery === 'advert' ? canvasTexture(1536, 256, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 1536, 256);
      c.fillStyle = bandHex;
      if (a.pattern === 'words') { c.font = 'bold 200px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(['BOOM!', 'FRESH', 'SHIOK', 'YUMMY', 'GLOW'][Math.floor(random() * 5)], 768, 136, 1300); }
      else if (a.pattern === 'dots') for (let i = 0; i < 40; i++) { c.beginPath(); c.arc(random() * 1536, random() * 256, 20 + random() * 50, 0, 7); c.fill(); }
      else if (a.pattern === 'stripes') for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(0, 40 + k * 50); c.bezierCurveTo(500, -40 + k * 50, 1000, 200 + k * 30, 1536, 60 + k * 50); c.lineTo(1536, 82 + k * 50); c.bezierCurveTo(1000, 222 + k * 30, 500, -18 + k * 50, 0, 62 + k * 50); c.fill(); }
      else { for (let x = 0; x < 1536; x += 120) { c.beginPath(); c.arc(x, 220, 60, Math.PI, 0); c.fill(); } for (let i = 0; i < 12; i++) { const x = random() * 1536, y = 30 + random() * 120; c.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 10 : 26, an = (k / 10) * Math.PI * 2; c.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); } c.fill(); } }
    }) : null;
    const body = s.material(bodyHex, { map: wrapMap, roughness: 0.45 });
    const band = s.material(bandHex, { roughness: 0.5 });
    const roofMat = s.material(a.livery === 'classic' ? '#d9d3c2' : '#c9c4b6', { roughness: 0.7 });
    const dark = s.material('#1d2024', { roughness: 0.6 });
    const steel = s.material('#7c8186', { metalness: 0.6, roughness: 0.4 });
    const glass = new THREE.MeshStandardMaterial({ color: '#9fb8c4', transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.1, emissive: '#ffd894', emissiveIntensity: mix(0, 0.6, night) });
    const interior = s.material('#3a3226', { emissive: '#ffd89a', emissiveIntensity: mix(0.05, 0.9, night) });

    // Rails and the truck underneath.
    for (const z of [-0.53, 0.53]) s.box([16, 0.08, 0.1], [0, 0.04, z], steel);
    s.box([16, 0.03, 1.6], [0, 0.015, 0], s.material('#6b6b68', { roughness: 0.95 }));
    s.box([3.2, 0.45, 1.4], [0, 0.42, 0], dark);
    for (const x of [-0.9, 0.9]) for (const z of [-0.6, 0.6]) s.cylinder(0.34, 0.34, 0.1, [x, 0.36, z], steel, 16).rotation.x = Math.PI / 2;
    s.mesh(slab(0.55, 0.72, 0.05), dark);

    // The body, deck by deck.
    const open = a.livery === 'heritage';
    s.mesh(slab(0.72, 1.45), body);
    s.mesh(slab(1.45, 1.55, -0.02), band);
    s.mesh(slab(2.35, 2.85), body);
    s.mesh(slab(2.3, 2.38, -0.02), band);
    s.mesh(slab(2.85, 2.93, -0.02), band);
    // Window posts and panes: the lower saloon all round, the upper deck long sides (and its ends unless it has balconies).
    const frames: THREE.BufferGeometry[] = [], panes: THREE.BufferGeometry[] = [];
    const deck = (y0: number, y1: number, upper: boolean) => {
      const span = upper && open ? HL - END - 0.6 : HL - END;
      const n = Math.round((2 * span) / 0.78);
      for (const side of [-1, 1]) {
        for (let i = 0; i <= n; i++) { const x = -span + (i * 2 * span) / n; frames.push(new THREE.BoxGeometry(0.08, y1 - y0, 0.08).translate(x, (y0 + y1) / 2, side * (HB - 0.03))); }
        for (let i = 0; i < n; i++) {
          if (upper && a.windows && i % 3 !== 1) continue;
          const x = -span + ((i + 0.5) * 2 * span) / n;
          panes.push(new THREE.BoxGeometry((2 * span) / n - 0.1, y1 - y0 - 0.12, 0.03).translate(x, (y0 + y1) / 2 + 0.03, side * (HB - 0.04)));
        }
        frames.push(new THREE.BoxGeometry(2 * span, 0.08, 0.08).translate(0, y0 + (y1 - y0) * 0.55, side * (HB - 0.02)));
      }
      if (!(upper && open)) for (const end of [-1, 1]) {
        for (const k of [-0.6, 0, 0.6]) frames.push(new THREE.BoxGeometry(0.08, y1 - y0, 0.08).translate(end * (HL - END + Math.cos(Math.asin(k)) * END * 0.97), (y0 + y1) / 2, k * HB));
        panes.push(new THREE.BoxGeometry(0.03, y1 - y0 - 0.1, 1.7).translate(end * (HL - 0.35), (y0 + y1) / 2, 0));
      }
    };
    deck(1.55, 2.3, false);
    deck(2.93, 3.85, true);
    s.mesh(mergeGeometries(frames), band);
    const paneMesh = s.mesh(mergeGeometries(panes), glass);
    paneMesh.castShadow = false;
    // Floors, a warm interior lining and seats.
    s.mesh(slab(0.72, 0.8, 0.12), interior);
    s.mesh(slab(2.38, 2.45, 0.1), interior);
    const seats: THREE.BufferGeometry[] = [];
    for (const side of [-1, 1]) seats.push(new THREE.BoxGeometry(8.6, 0.45, 0.4).translate(0, 1.0, side * 0.7));
    for (let x = -4.4; x <= 4.4; x += 0.8) for (const z of [-0.55, 0.55]) {
      seats.push(new THREE.BoxGeometry(0.4, 0.45, 0.7).translate(x, 2.68, z));
      seats.push(new THREE.BoxGeometry(0.08, 0.5, 0.7).translate(x - 0.2, 3.1, z));
    }
    s.mesh(mergeGeometries(seats), s.material('#7a5a3a', { roughness: 0.7 }));
    // Upper panel and the roof.
    s.mesh(slab(3.85, 4.05, open ? 0.7 : 0), body);
    if (open) {
      for (const end of [-1, 1]) {
        const rail: THREE.BufferGeometry[] = [];
        for (let k = 0; k <= 6; k++) { const an = -Math.PI / 2 + (k / 6) * Math.PI; rail.push(new THREE.BoxGeometry(0.05, 1.0, 0.05).translate(end * (HL - END + Math.cos(an) * END * 0.96), 3.35, Math.sin(an) * HB * 0.96)); }
        s.mesh(mergeGeometries(rail), band);
        const top: [number, number, number][] = [];
        for (let k = 0; k <= 8; k++) { const an = -Math.PI / 2 + (k / 8) * Math.PI; top.push([end * (HL - END + Math.cos(an) * END * 0.96), 3.85, Math.sin(an) * HB * 0.96]); }
        s.tube(top, 0.04, band);
      }
    }
    const roofGeo = slab(4.05, 4.3, open ? 0.6 : 0.04);
    s.mesh(roofGeo, roofMat);
    s.mesh(slab(4.3, 4.42, open ? 0.75 : 0.25), roofMat);

    // Destination blinds and route numbers at both ends; the fleet number on the side.
    const [dest, num] = ROUTES[a.route];
    for (const end of [-1, 1]) {
      const blind = s.label(dest, 1.3, 0.28, [end * (HL + 0.01), 2.62, 0], '#ffffff', '#111214');
      blind.rotation.y = end * Math.PI / 2;
      blind.castShadow = false;
      (blind.material as THREE.MeshStandardMaterial).emissive.set('#ffffff');
      (blind.material as THREE.MeshStandardMaterial).emissiveMap = (blind.material as THREE.MeshStandardMaterial).map;
      (blind.material as THREE.MeshStandardMaterial).emissiveIntensity = mix(0.2, 1, night);
      const lamp = s.ball([0.12, 0.12, 0.05], [end * (HL + 0.005), 1.1, 0], new THREE.MeshStandardMaterial({ color: '#fff7dc', emissive: '#fff0c0', emissiveIntensity: end === dir ? mix(0.4, 2.2, night) : 0.1 }), 10);
      lamp.castShadow = false;
    }
    for (const side of [-1, 1]) {
      const box = s.label(num, 0.32, 0.32, [dir * (HL - END - 0.3), 2.62, side * (HB + 0.01)], '#111214', '#f4f2ec');
      box.rotation.y = side > 0 ? 0 : Math.PI;
      const fleet = s.label(String(10 + Math.floor(random() * 170)), 0.5, 0.2, [-dir * 2.4, 1.1, side * (HB + 0.01)], bandHex === '#ffffff' ? '#111214' : '#f4f2ec', bodyHex);
      fleet.rotation.y = side > 0 ? 0 : Math.PI;
      const door = s.box([0.9, 1.45, 0.03], [dir * (HL - END - 0.8), 1.4, side * (HB + 0.005)], dark);
      door.visible = side > 0;
    }
    if (a.livery === 'party') {
      const bulbs: { at: [number, number, number]; size: number; color: string }[] = [];
      const palette = ['#ff4b4b', '#ffd23f', '#3fd2ff', '#7dff6a', '#ff6ad5'];
      for (let i = 0; i <= 40; i++) for (const side of [-1, 1]) bulbs.push({ at: [-HL + END + (i / 40) * (L - 2 * END), 3.95 + Math.abs(Math.sin(i * 0.8)) * -0.08, side * (HB + 0.05)], size: 0.06, color: palette[i % palette.length] });
      const string = s.scatter(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: mix(0.6, 1.6, night) }), bulbs);
      string.castShadow = false;
      (string.material as THREE.MeshStandardMaterial).emissive.set('#ffffff');
    }

    // The trolley pole from its roof mount, up to the wire or hooked down.
    const poleBase = new THREE.Vector3(dir * 1.2, 4.45, 0);
    s.box([0.7, 0.2, 0.6], poleBase.toArray() as [number, number, number], dark);
    const up = a.stop !== 'depot';
    const tip = up ? new THREE.Vector3(-dir * 3.6, 6.8, 0) : new THREE.Vector3(-dir * (HL - 0.3), 4.6, 0);
    s.rod(poleBase.toArray() as [number, number, number], tip.toArray() as [number, number, number], 0.05, dark, 0.035);
    s.cylinder(0.08, 0.08, 0.2, tip.toArray() as [number, number, number], steel, 10).rotation.x = Math.PI / 2;
    s.rod(poleBase.clone().setY(4.55).toArray() as [number, number, number], tip.clone().setY(tip.y - 0.05).toArray() as [number, number, number], 0.006, dark);
    if (!up) s.box([0.2, 0.3, 0.2], [-dir * (HL - 0.3), 4.5, 0], dark);
    const updates: ((time: number) => void)[] = [];
    if (a.stop === 'rolling') {
      const spark = new THREE.MeshStandardMaterial({ color: '#d6f0ff', emissive: '#bfe6ff', emissiveIntensity: 2.5, transparent: true, opacity: 0.9, depthWrite: false });
      const flash = s.ball([0.22, 0.22, 0.22], tip.toArray() as [number, number, number], spark, 8);
      flash.castShadow = false;
      updates.push((time) => { const on = Math.sin(time * mix(4, 20, mood.energy)) > 0.4; spark.opacity = on ? 0.9 : 0.1; });
    } else if (a.stop === 'shelter') {
      // The tram stop island behind it.
      const conc = s.material('#b4aea2', { roughness: 0.9 });
      s.box([9, 0.25, 1.4], [0, 0.125, -2.1], conc);
      const rails: THREE.BufferGeometry[] = [];
      for (let x = -4.2; x <= 4.2; x += 0.7) rails.push(new THREE.BoxGeometry(0.05, 1.0, 0.05).translate(x, 0.75, -2.75));
      rails.push(new THREE.BoxGeometry(8.4, 0.06, 0.06).translate(0, 1.25, -2.75));
      for (const x of [-2, 2]) rails.push(new THREE.BoxGeometry(0.1, 2.5, 0.1).translate(x, 1.5, -2.6));
      s.mesh(mergeGeometries(rails), s.material('#2d6b3c'));
      s.box([5, 0.08, 1.4], [0, 2.78, -2.2], s.material('#e8e4da'));
      const sign = s.label('TRAM STOP', 1.2, 0.3, [0, 2.55, -1.55], '#f4f2ec', '#1f4a2b');
      sign.castShadow = false;
    }

    // Riders: faces at the windows.
    const riders = { empty: 1, few: 4, packed: 10 }[a.passengers];
    const people: ReturnType<typeof figure>[] = [];
    for (let i = 0; i < riders; i++) {
      const driver = i === 0;
      const upper = !driver && (i % 3 !== 0);
      const p = figure(s, {
        height: 1.6 + random() * 0.2, style: 'doll', pose: upper ? 'sitting' : 'standing', gaze: driver ? 'ahead' : random() < 0.5 ? 'left' : 'right',
        hair: (['short', 'long', 'bun', 'cap', 'none'] as const)[Math.floor(random() * 5)],
        top: driver ? '#2b4a7a' : ['#d8322c', '#f4f2ec', '#2b6fb8', '#f2c21c', '#34363a', '#e05a9a'][Math.floor(random() * 6)],
        bottom: '#2a3140', skin: ['#e0b48f', '#c99470', '#f0cfb1'][Math.floor(random() * 3)], mirror: random() < 0.5,
      });
      s.root.add(p.root);
      if (driver) { p.root.position.set(dir * (HL - 0.75), 0.8, 0); p.root.rotation.y = dir * Math.PI / 2; }
      else if (upper) {
        const x = Math.round((-4.4 + random() * 8.8) / 0.8) * 0.8 + 0.05;
        p.root.position.set(x, 2.45, random() < 0.5 ? -0.55 : 0.55);
        p.root.rotation.y = dir * Math.PI / 2;
        p.settle();
        p.root.position.y = 2.45 + 0.45 - p.hipHeight;
      } else { p.root.position.set(-3.5 + random() * 7, 0.8, (random() - 0.5) * 0.4); p.root.rotation.y = random() * 6; }
      people.push(p);
    }

    return s.finish({
      footprint: 2,
      update: (dt, time) => { for (const p of people) p.update(dt, time); for (const fn of updates) fn(time); },
    });
  },
});
