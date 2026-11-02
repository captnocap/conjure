import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, figure, mix, noul, paint, paintHex } from '@conjure/kit';

const canvasTexture = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat = true) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
};

/** A deck plan: straight sides and half-elliptical ends, as a shape in x (length) and y (beam). */
const planPoints = (halfLen: number, halfBeam: number, endLen: number) => {
  const pts: THREE.Vector2[] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) { const t = -Math.PI / 2 + (i / n) * Math.PI; pts.push(new THREE.Vector2(halfLen - endLen + Math.cos(t) * endLen, Math.sin(t) * halfBeam)); }
  for (let i = 0; i <= n; i++) { const t = Math.PI / 2 + (i / n) * Math.PI; pts.push(new THREE.Vector2(-halfLen + endLen + Math.cos(t) * endLen, Math.sin(t) * halfBeam)); }
  return pts;
};
const slabGeometry = (halfLen: number, halfBeam: number, endLen: number, height: number, hole?: [number, number, number]) => {
  const shape = new THREE.Shape(planPoints(halfLen, halfBeam, endLen));
  if (hole) shape.holes.push(new THREE.Path(planPoints(...hole).reverse()));
  const g = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 4 });
  g.rotateX(-Math.PI / 2);
  return g;
};

const NAMES = {
  morning: 'MORNING STAR', celestial: 'CELESTIAL STAR', twinkling: 'TWINKLING STAR', night: 'NIGHT STAR', meridian: 'MERIDIAN STAR', solar: 'SOLAR STAR',
} as const;

export default defineThing({
  questions: {
    name: choice('Which ferry is it (the name on its board)?', {
      morning: 'MORNING STAR, the name for first crossings.',
      celestial: 'CELESTIAL STAR, grand and hopeful.',
      twinkling: 'TWINKLING STAR, small and sweet.',
      night: 'NIGHT STAR, the late boat.',
      meridian: 'MERIDIAN STAR, steady and noon-bright.',
      solar: 'SOLAR STAR, warm and ordinary.',
    }),
    hull: paint('What colour is the lower hull?', ['forest', 'green', 'teal', 'navy', 'crimson', 'black', 'rust', 'olive']),
    upper: paint('What colour are the upper works?', ['white', 'cream', 'mint', 'sky', 'yellow', 'pink']),
    wrap: choice('Is it wrapped in an advertisement?', {
      none: 'No wrap: the plain classic livery.',
      stripes: 'A bold advertising wrap of broad diagonal stripes running the length of the cabins.',
      letters: 'A wrap of giant brand lettering across the cabin sides.',
      heritage: 'A special heritage livery: a deep band and gilt lining for an anniversary.',
    }),
    wrapColour: paint('If it carries a wrap or special livery, what colour is it?', ['red', 'orange', 'magenta', 'blue', 'yellow', 'turquoise', 'purple', 'gold', 'lime']),
    leading: choice('Which end is leading?', {
      east: 'Heading right, the right-hand wheelhouse leading.',
      west: 'Heading left, the left-hand wheelhouse leading.',
    }),
    crowd: choice('How many passengers are aboard?', {
      empty: 'Empty: the last sailing, benches bare, one crew member.',
      few: 'A handful of passengers scattered along the rail.',
      packed: 'Packed at the rush hour, people standing all along the upper deck.',
    }),
    moored: choice('Where is it?', {
      crossing: 'Mid-harbour, a bow wave curling at the leading end and a wake behind.',
      pier: 'Tied up at a pier pontoon, the gangway down, ropes on the bollards.',
      drifting: 'Idling between piers, engines quiet, barely moving.',
    }),
    canvas: noul('Are the striped canvas rain screens rolled down around the open upper deck?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const night = Math.min(1, Math.max(0, (lowSun - 0.35) / 0.65));
    const L = 38, HL = L / 2, B = 9, HB = B / 2;
    const dir = a.leading === 'east' ? 1 : -1;
    const hullHex = paintHex(a.hull), upperHex = paintHex(a.upper), wrapHex = paintHex(a.wrapColour);

    const hull = s.material(hullHex, { roughness: 0.45 });
    const boot = s.material(new THREE.Color(hullHex).multiplyScalar(0.45), { roughness: 0.6 });
    const upper = s.material(upperHex, { roughness: 0.5 });
    const fender = s.material('#3d2c22', { roughness: 0.8 });
    const dark = s.material('#1f2326', { roughness: 0.5 });
    const deckWood = s.material('#a9825a', { roughness: 0.8 });
    const greenTrim = s.material(hullHex, { roughness: 0.5 });

    // Hull: a narrower bottom, the full-beam topsides, a rubbing fender all round.
    s.mesh(slabGeometry(HL - 1.2, HB - 0.7, 6, 1.4), boot, [0, 0, 0]);
    s.mesh(slabGeometry(HL, HB, 7, 1.7), hull, [0, 1.4, 0]);
    s.mesh(slabGeometry(HL + 0.25, HB + 0.25, 7.2, 0.35), fender, [0, 2.75, 0]);
    s.mesh(slabGeometry(HL - 0.1, HB - 0.1, 7, 0.12), deckWood, [0, 3.1, 0]);

    // Lower saloon: a window band, warm at night, optionally wrapped.
    const bay = 1.6, cabinH = 2.4;
    const windowMap = canvasTexture(64, 96, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 64, 96);
      c.fillStyle = '#4c5a62'; c.beginPath(); c.roundRect(10, 28, 44, 40, 8); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(14, 32, 16, 10);
      c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, 88, 64, 8);
    });
    windowMap.repeat.set(1 / bay, 1 / cabinH);
    const litMap = canvasTexture(64, 96, (c) => { c.fillStyle = '#000'; c.fillRect(0, 0, 64, 96); c.fillStyle = '#ffe1a0'; c.beginPath(); c.roundRect(10, 28, 44, 40, 8); c.fill(); });
    litMap.repeat.set(1 / bay, 1 / cabinH);
    const wrapped = a.wrap === 'stripes' || a.wrap === 'letters';
    const wrapMap = wrapped ? canvasTexture(1024, 128, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 1024, 128);
      c.fillStyle = wrapHex;
      if (a.wrap === 'stripes') for (let i = -2; i < 20; i++) { c.beginPath(); c.moveTo(i * 64, 128); c.lineTo(i * 64 + 32, 128); c.lineTo(i * 64 + 96, 0); c.lineTo(i * 64 + 64, 0); c.fill(); }
      else { c.fillRect(0, 0, 1024, 128); c.fillStyle = '#ffffff'; c.font = 'bold 104px sans-serif'; c.textBaseline = 'middle'; c.fillText(['SHINE', 'FRESH', 'GO GO', 'YUM!'][Math.floor(random() * 4)], 60, 68); c.fillText('★', 700, 68); }
      c.fillStyle = 'rgba(40,50,60,0.55)';
      for (let x = 10; x < 1024; x += 43) { c.beginPath(); c.roundRect(x, 38, 30, 34, 6); c.fill(); }
    }) : null;
    if (wrapMap) wrapMap.repeat.set(1 / 24, 1 / cabinH);
    const cabinWall = s.material(upperHex, {
      map: wrapMap ?? windowMap, emissive: '#ffd590', emissiveMap: litMap, emissiveIntensity: mix(0, 1.3, night), roughness: 0.5,
    });
    s.mesh(slabGeometry(HL - 1.2, HB - 0.12, 6.2, cabinH), cabinWall, [0, 3.2, 0]);
    if (a.wrap === 'heritage') s.mesh(slabGeometry(HL - 1.15, HB - 0.08, 6.2, 0.5), s.material(wrapHex, { roughness: 0.4 }), [0, 3.3, 0]);
    if (a.wrap === 'heritage') s.mesh(slabGeometry(HL - 1.1, HB - 0.06, 6.2, 0.08), s.material('#d4a537', { metalness: 0.8, roughness: 0.3 }), [0, 3.85, 0]);

    // Upper deck: a planked floor overhanging the saloon, a railing panel, posts, the roof.
    const upY = 5.6;
    s.mesh(slabGeometry(HL - 0.6, HB, 6.6, 0.25), upper, [0, upY - 0.25, 0]);
    s.mesh(slabGeometry(HL - 0.7, HB - 0.05, 6.5, 0.04), deckWood, [0, upY, 0]);
    const panelMat = a.wrap === 'heritage' ? s.material(wrapHex) : greenTrim;
    s.mesh(slabGeometry(HL - 0.6, HB, 6.6, 1.05, [HL - 0.75, HB - 0.15, 6.45]), panelMat, [0, upY, 0]);
    s.mesh(slabGeometry(HL - 0.5, HB + 0.05, 6.6, 0.12, [HL - 0.8, HB - 0.2, 6.4]), upper, [0, upY + 1.05, 0]);
    const roofY = upY + 2.7;
    s.mesh(slabGeometry(HL - 0.9, HB - 0.05, 6.4, 0.28), upper, [0, roofY, 0]);
    s.mesh(slabGeometry(HL - 0.85, HB, 6.45, 0.1), greenTrim, [0, roofY - 0.1, 0]);
    const posts: THREE.BufferGeometry[] = [];
    for (const z of [-1, 1]) for (let x = -HL + 6; x <= HL - 6; x += 2.4) { const g = new THREE.BoxGeometry(0.14, roofY - upY, 0.14); g.translate(x, (upY + roofY) / 2, z * (HB - 0.1)); posts.push(g); }
    for (const sx of [-1, 1]) for (const k of [-0.6, 0, 0.6]) { const g = new THREE.BoxGeometry(0.14, roofY - upY, 0.14); g.translate(sx * (HL - 2.4 - Math.abs(k) * 1.8), (upY + roofY) / 2, k * HB * 1.2); posts.push(g); }
    s.mesh(mergeGeometries(posts), upper);
    // Reversible slatted benches whose backs swing toward the way it is going.
    const bench = mergeGeometries([
      new THREE.BoxGeometry(0.45, 0.06, 1.7).translate(0, 0.45, 0),
      new THREE.BoxGeometry(0.06, 0.45, 1.7).rotateZ(-dir * 0.25).translate(-dir * 0.2, 0.75, 0),
      new THREE.BoxGeometry(0.4, 0.42, 0.06).translate(0, 0.21, 0.8),
      new THREE.BoxGeometry(0.4, 0.42, 0.06).translate(0, 0.21, -0.8),
    ].map((g) => g.toNonIndexed()));
    const seats: { at: [number, number, number]; size: number }[] = [];
    for (let x = -HL + 6.5; x <= HL - 6.5; x += 1.15) { if (Math.abs(x) < 1.6) continue; for (const z of [-2.3, 2.3]) seats.push({ at: [x, upY, z], size: 1 }); }
    s.scatter(bench, deckWood, seats);
    // Rain screens of striped canvas, rolled down.
    if (a.canvas) {
      const stripes = canvasTexture(128, 32, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f1ead6' : hullHex; c.fillRect(i * 16, 0, 16, 32); } });
      stripes.repeat.set(1.2, 1);
      s.mesh(slabGeometry(HL - 0.65, HB - 0.02, 6.55, roofY - upY - 1.2, [HL - 0.75, HB - 0.12, 6.45]), s.material('#ffffff', { map: stripes, roughness: 0.9 }), [0, upY + 1.17, 0]);
    }

    // Wheelhouses at both ends, the leading one lit; a mast and lamp on each.
    for (const end of [-1, 1]) {
      const x = end * (HL - 3.2);
      s.box([2.6, 1.9, 4.4], [x, roofY + 0.28 + 0.95, 0], upper);
      const leadLit = end === dir;
      s.box([2.64, 0.8, 4.2], [x, roofY + 0.28 + 1.25, 0], s.material('#36464f', { emissive: '#ffe0a0', emissiveIntensity: leadLit ? mix(0.15, 1, night) : 0, roughness: 0.2 }));
      s.box([2.8, 0.14, 4.6], [x, roofY + 0.28 + 1.95, 0], greenTrim);
      s.rod([x - end * 0.6, roofY + 2.3, 0], [x - end * 0.6, roofY + 4.6, 0], 0.06, dark);
      s.ball([0.18, 0.18, 0.18], [x - end * 0.6, roofY + 4.7, 0], new THREE.MeshStandardMaterial({ color: '#fff6dc', emissive: '#fff0c0', emissiveIntensity: mix(0.2, 2, night) }), 8).castShadow = false;
      // Lifebuoys on the railing near each end.
      const buoy = s.ring(0.34, 0.1, [x - end * 2.6, upY + 0.55, HB + 0.06], s.material('#ee6a1c'));
      buoy.rotation.y = 0;
    }
    // A flag streams from the trailing mast.
    const flag = s.box([0.9, 0.55, 0.03], [-dir * (HL - 3.2 - 0.6) - dir * 0.5, roofY + 4.3, 0], s.material('#c8102e', { side: THREE.DoubleSide }));

    // The funnel amidships with the star emblem.
    const funnel = s.cylinder(0.9, 1.05, 3.4, [0, roofY + 0.28 + 1.7, 0], upper, 24);
    funnel.scale.z = 0.72;
    s.cylinder(0.92, 0.92, 0.5, [0, roofY + 0.28 + 3.2, 0], dark, 24).scale.z = 0.73;
    s.cylinder(0.97, 0.97, 0.7, [0, roofY + 0.28 + 2.3, 0], greenTrim, 24).scale.z = 0.74;
    const star = canvasTexture(128, 128, (c) => {
      c.clearRect(0, 0, 128, 128); c.fillStyle = '#ffffff'; c.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 22 : 54, an = (i / 10) * Math.PI * 2 - Math.PI / 2; c.lineTo(64 + Math.cos(an) * r, 64 + Math.sin(an) * r); }
      c.closePath(); c.fill();
    }, false);
    for (const z of [-1, 1]) {
      const emblem = s.mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshStandardMaterial({ map: star, transparent: true, alphaTest: 0.5, roughness: 0.5 }), [0, roofY + 0.28 + 2.3, z * 0.72]);
      emblem.rotation.y = z > 0 ? 0 : Math.PI;
      emblem.castShadow = false;
    }
    // Name boards on the railing panel, both sides.
    for (const z of [-1, 1]) {
      const board = s.label(NAMES[a.name], 6.4, 0.62, [0, upY + 0.55, z * (HB + 0.03)], '#f4f1e6', a.wrap === 'heritage' ? '#1d1d1f' : new THREE.Color(hullHex).multiplyScalar(0.7).getStyle());
      board.rotation.y = z > 0 ? 0 : Math.PI;
      board.castShadow = false;
    }

    // Passengers at the rail and on the benches.
    const count = { empty: 1, few: 4, packed: 11 }[a.crowd];
    const people: ReturnType<typeof figure>[] = [];
    const tops = ['#d8322c', '#2b6fb8', '#f4f2ec', '#34363a', '#f2c21c', '#2e8b57', '#b9a5e6', '#c8a77e'];
    for (let i = 0; i < count; i++) {
      const crew = a.crowd === 'empty';
      const p = figure(s, {
        height: 1.55 + random() * 0.3, pose: crew ? 'leaning' : random() < 0.3 ? 'pointing' : 'standing', style: 'doll',
        hair: crew ? 'cap' : (['short', 'long', 'bun', 'cap', 'none'] as const)[Math.floor(random() * 5)],
        top: crew ? '#f4f2ec' : tops[Math.floor(random() * tops.length)], bottom: random() < 0.5 ? '#2a3140' : '#5b5145',
        skin: ['#e0b48f', '#c99470', '#9a6b4c', '#f0cfb1'][Math.floor(random() * 4)], gaze: random() < 0.4 ? 'right' : 'ahead', mirror: random() < 0.5,
      });
      s.root.add(p.root);
      const x = crew ? dir * (HL - 7) : -HL + 7 + ((i + random() * 0.5) / count) * (L - 14);
      p.root.position.set(Math.abs(x) < 1.6 ? x + 2 : x, upY + 0.04, HB - 0.6 - random() * 0.4);
      people.push(p);
    }

    // Water business: a curling bow wave and wake, or the pier pontoon and gangway.
    const updates: ((dt: number, time: number) => void)[] = [];
    const foamMat = new THREE.MeshStandardMaterial({ color: '#f6fbff', transparent: true, opacity: 0.85, depthWrite: false, roughness: 0.8 });
    if (a.moored === 'crossing') {
      const puffs: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 16; i++) {
        const side = i % 2 ? 1 : -1, u = i / 16;
        const g = new THREE.SphereGeometry(1, 10, 6); g.scale(1.4 + random(), 0.35, 0.6 + random() * 0.4);
        g.translate(dir * (HL - 1 - u * 5), 1.2, side * (HB * (0.3 + u * 0.75) + 0.2));
        puffs.push(g);
      }
      for (let i = 0; i < 12; i++) {
        const g = new THREE.SphereGeometry(1, 10, 6); g.scale(2.4 + random() * 2, 0.2, 0.8 + random());
        g.translate(-dir * (HL + 2 + i * 2.6), 1.15, (random() - 0.5) * (2 + i * 0.6));
        puffs.push(g);
      }
      s.mesh(mergeGeometries(puffs), foamMat).castShadow = false;
    } else if (a.moored === 'pier') {
      const px = dir * (HL + 5.2);
      const pontoon = s.material('#6f6a62', { roughness: 0.9 });
      s.box([8, 2.9, 14], [px, 1.45, 0], pontoon);
      s.box([8.2, 0.3, 14.2], [px, 3.0, 0], s.material('#9c958a'));
      for (const z of [-5.5, 5.5]) { s.cylinder(0.3, 0.38, 0.7, [px - dir * 3.2, 3.5, z], dark, 10); s.rod([px - dir * 3.2, 3.6, z], [dir * (HL - 4), 3.3, z * 0.6], 0.06, s.material('#c8b48a')); }
      const ramp = s.box([4.2, 0.2, 2.4], [dir * (HL + 0.6), 3.5, 0], s.material('#8a8f93', { metalness: 0.5 }));
      ramp.rotation.z = -dir * 0.12;
      for (const z of [-1.2, 1.2]) s.rod([dir * (HL - 1.4), 4.3, z], [dir * (HL + 2.6), 3.9, z], 0.04, dark);
      s.box([3, 3.4, 4], [px + dir * 1.8, 4.85, 0], s.material('#e8e4da'));
      s.box([3.4, 0.25, 4.4], [px + dir * 1.8, 6.65, 0], greenTrim);
    }

    const bob = mix(0.02, 0.18, mood.energy) * (a.moored === 'pier' ? 0.3 : 1);
    return s.finish({
      footprint: HB + 1,
      update: (dt, time) => {
        flag.rotation.y = Math.sin(time * mix(1, 6, mood.energy)) * 0.3;
        s.root.rotation.x = Math.sin(time * 0.9) * bob * 0.05;
        for (const p of people) p.update(dt, time);
        for (const fn of updates) fn(dt, time);
      },
    });
  },
});
