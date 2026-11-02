import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, figure, mix, paint, paintHex } from '@conjure/kit';

const canvasTexture = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// The hull: u runs bow (0, at +x) to stern (1), v runs port sheer, keel, starboard sheer.
const LEN = 18;
const hullX = (u: number) => LEN / 2 - u * LEN;
const halfBeam = (u: number) => 1.15 + 1.75 * Math.sin(Math.PI * Math.min(1, 0.18 + u * 0.95)) ** 0.7 + 0.25 * smooth(0.8, 1, u);
const sheer = (u: number) => 2.0 + 0.5 * (1 - u) ** 2 + 2.3 * smooth(0.62, 1, u);
const keel = (u: number) => 0.7 * (1 - smooth(0, 0.3, u)) + 1.1 * smooth(0.75, 1, u);
const hullPoint = (u: number, v: number, target: THREE.Vector3) => {
  const theta = Math.PI * v;
  const c = Math.cos(theta), sn = Math.sin(theta);
  const lateral = -Math.sign(c) * Math.abs(c) ** 0.55 * halfBeam(u);
  const drop = Math.abs(sn) ** 1.6;
  return target.set(hullX(u), keel(u) + (sheer(u) - keel(u)) * (1 - drop), lateral);
};

export default defineThing({
  questions: {
    sails: paint('What colour are the sails?', ['crimson', 'red', 'rust', 'amber', 'tan', 'black', 'white', 'brown']),
    hull: paint('What colour is the wooden hull?', ['brown', 'tan', 'black', 'forest', 'crimson', 'navy']),
    trim: paint('What colour is the painted trim and stern carving?', ['red', 'gold', 'green', 'yellow', 'white', 'turquoise']),
    rig: choice('Are the sails up?', {
      full: 'All three sails raised and drawing, the battens fanned out.',
      reefed: 'Sails half lowered, reefed down to a few panels for the wind.',
      furled: 'Sails lowered and bundled at the foot of the masts, the junk at rest.',
    }),
    era: choice('What kind of junk is it?', {
      fishing: 'A working fishing junk: nets hung to dry, baskets and floats, weathered planks.',
      tourist: 'A restored tourist junk: varnished, strings of bulbs from the mastheads, a gilt stern.',
      cargo: 'A trading junk loaded with crates, sacks and jars.',
    }),
    crew: choice('Who is on deck?', {
      none: 'Nobody visible, the junk sailing as if by itself.',
      family: 'A fishing family in conical hats working the lines.',
      tourists: 'A crowd of tourists leaning on the rail, taking pictures.',
    }),
    flag: choice('What flies at the masthead?', {
      none: 'Nothing at the masthead.',
      pennant: 'A long forked red-and-yellow streamer.',
      bauhinia: 'A red flag with a white five-petalled flower.',
      dragon: 'A yellow triangular dragon banner with a scalloped border.',
    }),
    sea: choice('What is the sea doing to it?', {
      calm: 'Flat calm, upright and reflected.',
      breeze: 'A fresh breeze heeling it a little, spray at the bow.',
      squall: 'A squall heeling it hard over, spray flying.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const night = Math.min(1, Math.max(0, (lowSun - 0.35) / 0.65));
    const ship = new THREE.Group();
    s.root.add(ship);
    const put = (m: THREE.Object3D) => { s.root.remove(m); ship.add(m); return m; };

    const hullHex = paintHex(a.hull), trimHex = paintHex(a.trim), sailHex = paintHex(a.sails);
    const plankMap = canvasTexture(256, 128, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 256, 128);
      for (let row = 0; row < 16; row++) {
        const g = 200 + Math.floor(random() * 50); c.fillStyle = `rgb(${g},${g - 8},${g - 16})`; c.fillRect(0, row * 8, 256, 7);
        c.fillStyle = 'rgba(40,25,15,0.35)'; c.fillRect(Math.floor(random() * 256), row * 8, 2, 7);
      }
      for (let i = 0; i < Math.round(mood.wear * 50 + (a.era === 'fishing' ? 30 : 0)); i++) { c.fillStyle = `rgba(30,20,10,${0.1 + random() * 0.2})`; c.fillRect(random() * 256, random() * 128, 4 + random() * 20, 2 + random() * 6); }
    });
    const wood = s.material(hullHex, { map: plankMap, roughness: a.era === 'tourist' ? 0.4 : 0.85 });
    const trim = s.material(trimHex, { roughness: 0.5, metalness: a.trim === 'gold' ? 0.7 : 0.05 });
    const darkWood = s.material('#3a2618', { roughness: 0.8 });
    const deckMat = s.material('#b58c5e', { roughness: 0.85 });

    // Hull with closed ends.
    put(s.surface(hullPoint, wood, { segments: [48, 20] }));
    for (const u of [0, 1]) {
      const ring: THREE.Vector3[] = [];
      for (let i = 0; i <= 20; i++) ring.push(hullPoint(u, i / 20, new THREE.Vector3()));
      const centre = ring.reduce((sum, p) => sum.add(p), new THREE.Vector3()).multiplyScalar(1 / ring.length);
      const pos: number[] = [];
      for (let i = 0; i < 20; i++) pos.push(...centre.toArray(), ...ring[u ? i + 1 : i].toArray(), ...ring[u ? i : i + 1].toArray());
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
      put(s.mesh(g, u ? trim : wood));
    }
    // A painted wale along the sheer and the bow eyes.
    const walePts: [number, number, number][] = [];
    for (const side of [-1, 1]) {
      walePts.length = 0;
      for (let i = 0; i <= 16; i++) { const u = i / 16; walePts.push([hullX(u), sheer(u) - 0.25, side * (halfBeam(u) + 0.04)]); }
      put(s.tube(walePts, 0.12, trim));
    }
    const eyeMap = canvasTexture(128, 128, (c) => {
      c.clearRect(0, 0, 128, 128);
      c.fillStyle = '#f4f2ec'; c.beginPath(); c.ellipse(64, 64, 60, 40, 0, 0, 7); c.fill();
      c.fillStyle = '#c8102e'; c.beginPath(); c.ellipse(64, 64, 60, 40, 0, 0, 7); c.lineWidth = 8; c.strokeStyle = '#c8102e'; c.stroke();
      c.fillStyle = '#111214'; c.beginPath(); c.arc(70, 64, 24, 0, 7); c.fill();
    });
    for (const side of [-1, 1]) {
      const u = 0.06, y = sheer(u) - 0.75;
      const eye = put(s.mesh(new THREE.PlaneGeometry(1.0, 0.7), new THREE.MeshStandardMaterial({ map: eyeMap, transparent: true, alphaTest: 0.4, roughness: 0.6 }), [hullX(u), y, side * (halfBeam(u) * 0.97 + 0.08)]));
      eye.rotation.y = side > 0 ? 0.35 : Math.PI - 0.35;
      eye.castShadow = false;
    }
    // Decks: the main deck and a raised poop deck aft, a low cabin.
    const deckShape = (u0: number, u1: number, inset: number) => {
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 12; i++) { const u = mix(u0, u1, i / 12); pts.push(new THREE.Vector2(hullX(u), halfBeam(u) - inset)); }
      for (let i = 12; i >= 0; i--) { const u = mix(u0, u1, i / 12); pts.push(new THREE.Vector2(hullX(u), -(halfBeam(u) - inset))); }
      return new THREE.Shape(pts);
    };
    const deckGeo = (u0: number, u1: number, y: number, inset: number, depth = 0.15) => {
      const g = new THREE.ExtrudeGeometry(deckShape(u0, u1, inset), { depth, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g;
    };
    put(s.mesh(deckGeo(0.02, 0.98, 2.05, 0.12), deckMat));
    put(s.mesh(deckGeo(0.72, 0.99, 3.35, 0.2), deckMat));
    put(s.mesh(deckGeo(0.74, 0.97, 2.1, 0.45, 1.25), wood));
    put(s.box([3.2, 1.3, 2.8], [hullX(0.6), 2.8, 0], s.material(hullHex, { map: plankMap })));
    put(s.box([3.6, 0.15, 3.3], [hullX(0.6), 3.5, 0], darkWood));
    // The carved stern: a tall fan of painted boards standing above the poop.
    const sternMap = canvasTexture(256, 160, (c) => {
      c.fillStyle = trimHex; c.fillRect(0, 0, 256, 160);
      c.strokeStyle = 'rgba(20,10,5,0.75)'; c.lineWidth = 5; c.strokeRect(10, 10, 236, 140);
      c.fillStyle = 'rgba(20,10,5,0.55)';
      for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(40 + i * 44, 80, 16, 0, 7); c.fill(); }
      c.fillStyle = a.era === 'tourist' ? '#f0c040' : 'rgba(255,255,255,0.5)'; c.font = 'bold 36px serif'; c.textAlign = 'center'; c.fillText('福', 128, 92);
    });
    const sternShape = new THREE.Shape();
    sternShape.moveTo(-2.0, 0); sternShape.lineTo(2.0, 0); sternShape.quadraticCurveTo(2.7, 1.6, 2.3, 2.6); sternShape.quadraticCurveTo(0, 2.0, -2.3, 2.6); sternShape.quadraticCurveTo(-2.7, 1.6, -2.0, 0);
    const sternGeo = new THREE.ShapeGeometry(sternShape, 8);
    const pos = sternGeo.attributes.position, uv = sternGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + 2.7) / 5.4, pos.getY(i) / 2.6);
    const stern = put(s.mesh(sternGeo, s.material('#ffffff', { map: sternMap, side: THREE.DoubleSide, roughness: 0.6 }), [hullX(0.995), sheer(1) - 0.9, 0]));
    stern.rotation.y = Math.PI / 2;
    stern.rotation.x = 0;
    put(s.box([0.25, 2.4, 0.18], [hullX(1) - 0.2, 0.9, 0], darkWood)).rotation.z = -0.2;
    put(s.box([1.4, 2.2, 0.14], [hullX(1) - 0.7, 0.4, 0], darkWood));

    // Masts: fore raked forward, main amidships, mizzen aft; each with its battened sail.
    const raked = { full: 1, reefed: 0.5, furled: 0.11 }[a.rig];
    const masts = [
      { u: 0.17, h: 11, rake: -0.12, w: 5.2, sh: 8.4 },
      { u: 0.45, h: 15, rake: 0.02, w: 7.2, sh: 11.6 },
      { u: 0.86, h: 8.4, rake: 0.06, w: 3.8, sh: 5.4 },
    ];
    const sailMat = s.material(sailHex, { side: THREE.DoubleSide, roughness: 0.85 });
    const sailMap = canvasTexture(64, 256, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 64, 256);
      for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(60,30,20,${0.04 + random() * 0.08})`; c.fillRect(random() * 64, random() * 256, 2 + random() * 8, 3 + random() * 20); }
      for (let i = 0; i < Math.round(mood.wear * 12); i++) { c.fillStyle = 'rgba(40,25,15,0.35)'; c.fillRect(random() * 64, random() * 256, 6 + random() * 10, 6 + random() * 10); }
    });
    sailMat.map = sailMap;
    const battens: THREE.BufferGeometry[] = [];
    const sea = { calm: 0, breeze: 0.1, squall: 0.24 }[a.sea];
    const tips: THREE.Vector3[] = [];
    for (const m of masts) {
      const x0 = hullX(m.u);
      const base = new THREE.Vector3(x0, 2.1, 0);
      const top = new THREE.Vector3(x0 + Math.sin(m.rake) * m.h * -1, 2.1 + m.h, 0);
      put(s.rod(base.toArray() as [number, number, number], top.toArray() as [number, number, number], 0.16, darkWood, 0.09));
      tips.push(top);
      // The sail in its own frame: x aft from the mast, y up from the foot.
      const W = m.w, H = m.sh * raked, footY = 3.4 + (m.u > 0.8 ? 1.3 : 0);
      const panels = Math.max(2, Math.round(7 * raked));
      const luff = (v: number) => new THREE.Vector2(mix(-0.2 * W, -0.26 * W, v), v * H * 0.84);
      const leech = (v: number) => {
        const p0 = new THREE.Vector2(0.78 * W, 0), p1 = new THREE.Vector2(1.08 * W, 0.5 * H), p2 = new THREE.Vector2(0.58 * W, H);
        return new THREE.Vector2((1 - v) ** 2 * p0.x + 2 * (1 - v) * v * p1.x + v * v * p2.x, (1 - v) ** 2 * p0.y + 2 * (1 - v) * v * p1.y + v * v * p2.y);
      };
      const billow = W * (a.rig === 'furled' ? 0.06 : 0.09) * (1 + sea * 2);
      const frame = new THREE.Matrix4().makeRotationZ(m.rake).setPosition(x0 - 0.25, footY, 0);
      // Mirror so the sail runs aft (toward -x) and lies off the centreline to leeward.
      const flip = new THREE.Matrix4().makeScale(-1, 1, 1);
      const sail = s.surface((u, v, target) => {
        const lp = luff(v), rp = leech(v);
        const p = lp.clone().lerp(rp, u);
        const panel = (v * panels) % 1;
        const bulge = Math.sin(Math.PI * u) * (0.35 + 0.65 * Math.sin(Math.PI * panel));
        return target.set(p.x, p.y, -bulge * billow - 0.25);
      }, sailMat, { segments: [16, panels * 6] });
      sail.applyMatrix4(flip);
      sail.applyMatrix4(frame);
      put(sail);
      for (let i = 0; i <= panels; i++) {
        const v = i / panels;
        const lp = luff(v), rp = leech(v);
        const g = new THREE.CylinderGeometry(0.05, 0.05, lp.distanceTo(rp) + 0.2, 5);
        g.rotateZ(Math.atan2(rp.y - lp.y, rp.x - lp.x) - Math.PI / 2);
        const mid = lp.clone().add(rp).multiplyScalar(0.5);
        g.translate(mid.x, mid.y, -0.3);
        g.applyMatrix4(flip); g.applyMatrix4(frame);
        battens.push(g);
      }
    }
    put(s.mesh(mergeGeometries(battens), darkWood));

    // Era dressing.
    const updates: ((time: number) => void)[] = [];
    if (a.era === 'fishing') {
      const net = s.material('#5b6a5a', { transparent: true, opacity: 0.75, side: THREE.DoubleSide, roughness: 1 });
      put(s.drape({ size: [5, 3.4], at: [hullX(0.32), 4.2, 0], over: [{ box: [4.2, 1.6, 0.25], at: [hullX(0.32), 2.9, 0] }], floor: 2.2, stiffness: 0.15, rumple: 0.6, detail: 18 }, net));
      put(s.box([4.2, 0.1, 0.1], [hullX(0.32), 3.7, 0], darkWood));
      const floats: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 14; i++) floats.push({ at: [hullX(0.25 + random() * 0.15), 2.35 + random() * 0.3, (random() - 0.5) * 3], size: 0.18 + random() * 0.08, color: random() < 0.6 ? '#ee7a12' : '#f4f2ec' });
      put(s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#ffffff'), floats));
      for (let i = 0; i < 4; i++) put(s.cylinder(0.35, 0.28, 0.5, [hullX(0.65 + random() * 0.05), 2.45, (random() - 0.5) * 2.6], s.material('#b9965a'), 10));
    } else if (a.era === 'cargo') {
      for (let i = 0; i < 9; i++) { const sz = 0.7 + random() * 0.5; put(s.box([sz, sz * 0.8, sz], [hullX(0.24 + random() * 0.3), 2.2 + sz * 0.4 + (i > 5 ? 0.7 : 0), (random() - 0.5) * 2.6], s.material(random() < 0.5 ? '#9a7a4e' : '#c8a77e'))); }
      for (let i = 0; i < 4; i++) put(s.lathe([[0, 0], [0.32, 0.05], [0.42, 0.4], [0.3, 0.8], [0.18, 0.9], [0, 0.9]], s.material('#6b4428', { roughness: 0.4 }), [hullX(0.68), 2.2, -1.2 + i * 0.8]));
    } else {
      // Strings of bulbs from the mastheads to bow and stern.
      const bulbs: { at: [number, number, number]; size: number }[] = [];
      const runs: [THREE.Vector3, THREE.Vector3][] = [
        [tips[0], new THREE.Vector3(hullX(0) + 0.3, sheer(0), 0)], [tips[0], tips[1]], [tips[1], tips[2]], [tips[2], new THREE.Vector3(hullX(1), sheer(1) + 1.5, 0)],
      ];
      for (const [p, q] of runs) {
        const line: [number, number, number][] = [];
        for (let i = 0; i <= 10; i++) { const t = i / 10; const pt = p.clone().lerp(q, t); pt.y -= Math.sin(Math.PI * t) * 0.6; line.push(pt.toArray() as [number, number, number]); if (i > 0 && i < 10) bulbs.push({ at: line[i], size: 0.12 }); }
        put(s.tube(line, 0.02, darkWood));
      }
      const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff1c0', emissive: '#ffd27a', emissiveIntensity: mix(0.5, 2.2, night) });
      const string = put(s.scatter(new THREE.SphereGeometry(1, 8, 6), bulbMat, bulbs)) as THREE.InstancedMesh;
      string.castShadow = false;
      const rail: THREE.BufferGeometry[] = [];
      for (let i = 0; i <= 20; i++) for (const side of [-1, 1]) { const u = 0.05 + i * 0.033; const g = new THREE.BoxGeometry(0.06, 0.7, 0.06); g.translate(hullX(u), sheer(u) + 0.3, side * (halfBeam(u) - 0.1)); rail.push(g); }
      put(s.mesh(mergeGeometries(rail), trim));
    }
    // The masthead flag.
    if (a.flag !== 'none') {
      const t = tips[1];
      const flagMap = canvasTexture(128, 64, (c) => {
        if (a.flag === 'pennant') { c.fillStyle = '#c8102e'; c.fillRect(0, 0, 128, 32); c.fillStyle = '#f4d40c'; c.fillRect(0, 32, 128, 32); }
        else if (a.flag === 'bauhinia') { c.fillStyle = '#d0202a'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#ffffff'; for (let i = 0; i < 5; i++) { const an = (i / 5) * Math.PI * 2; c.beginPath(); c.ellipse(64 + Math.cos(an) * 10, 32 + Math.sin(an) * 10, 10, 5, an, 0, 7); c.fill(); } }
        else { c.fillStyle = '#f4c20c'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#c8102e'; for (let x = 0; x < 128; x += 12) { c.beginPath(); c.arc(x, 64, 6, 0, 7); c.fill(); } c.fillStyle = '#2f6e3c'; c.font = 'bold 36px serif'; c.fillText('龍', 40, 44); }
      });
      const fl = a.flag === 'pennant' ? 3.2 : 1.6;
      const fg = new THREE.PlaneGeometry(fl, a.flag === 'pennant' ? 0.5 : 1.0, 8, 1);
      if (a.flag !== 'bauhinia') { const p = fg.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) * (1 - (p.getX(i) + fl / 2) / fl * (a.flag === 'dragon' ? 0.95 : 0.6))); }
      fg.translate(-fl / 2, 0, 0);
      const flag = put(s.mesh(fg, new THREE.MeshStandardMaterial({ map: flagMap, side: THREE.DoubleSide, roughness: 0.8 }), [t.x, t.y - 0.4, 0]));
      flag.castShadow = false;
      updates.push((time) => { flag.rotation.y = 0.3 + Math.sin(time * mix(1, 6, mood.energy)) * 0.25; });
    }
    // Crew.
    const people: ReturnType<typeof figure>[] = [];
    const count = { none: 0, family: 3, tourists: 6 }[a.crew];
    for (let i = 0; i < count; i++) {
      const fam = a.crew === 'family';
      const p = figure(s, {
        height: fam && i === 2 ? 1.15 : 1.6 + random() * 0.2, style: 'doll', pose: fam ? (['crouching', 'carrying', 'reaching'] as const)[i % 3] : random() < 0.4 ? 'pointing' : 'standing',
        hair: fam ? 'hat' : (['short', 'long', 'cap', 'bun'] as const)[Math.floor(random() * 4)],
        top: fam ? ['#3b4a5a', '#5b6a5a', '#2a3140'][i % 3] : ['#d8322c', '#f4f2ec', '#2b6fb8', '#f2c21c', '#e05a9a'][Math.floor(random() * 5)],
        bottom: fam ? '#1f2326' : '#3d4652', skin: ['#d9a77d', '#c48f68', '#e8c4a0'][Math.floor(random() * 3)], mirror: random() < 0.5,
      });
      s.root.remove(p.root); ship.add(p.root);
      const u = fam ? [0.3, 0.55, 0.65][i] : 0.22 + (i / count) * 0.45;
      p.root.position.set(hullX(u), 2.2, (fam ? (random() - 0.5) * 1.6 : halfBeam(u) - 0.55));
      p.root.rotation.y = fam ? random() * 6 : 0;
      people.push(p);
    }
    // Spray at the bow when the wind is up.
    if (sea > 0) {
      const spray: THREE.BufferGeometry[] = [];
      for (let i = 0; i < (sea > 0.15 ? 14 : 7); i++) {
        const g = new THREE.SphereGeometry(1, 8, 6); const sz = 0.25 + random() * 0.35; g.scale(sz * 1.8, sz * 0.8, sz);
        g.translate(hullX(0.02) + random() * 1.5 - 0.5, 0.9 + random() * 1.4 * (1 + sea * 3), (random() - 0.5) * 3.2);
        spray.push(g);
      }
      put(s.mesh(mergeGeometries(spray), new THREE.MeshStandardMaterial({ color: '#f4f8fa', transparent: true, opacity: 0.55, depthWrite: false }))).castShadow = false;
    }
    ship.rotation.x = -sea;
    const rock = mix(0.005, 0.04, mood.energy) * (0.4 + sea * 3);
    return s.finish({
      footprint: 3,
      update: (dt, time) => {
        ship.rotation.x = -sea + Math.sin(time * 0.8) * rock;
        for (const p of people) p.update(dt, time);
        for (const fn of updates) fn(time);
      },
    });
  },
});
