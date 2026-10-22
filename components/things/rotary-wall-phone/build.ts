import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
const SHELL = { black: '#1b1b1d', avocado: '#7d8a3c', gold: '#d9a530', ivory: '#ebe2c8', red: '#b8271f', turquoise: '#3fa7a3' } as const;
const NUMBERS = ['Dr. Novak  4-4471', 'Anna  2-5519', 'Butcher  3-0812', 'Josef (work) 7-2260', 'Church  2-1004', 'Marta - LONG DIST.', '  0 then 311 5-9902', 'Taxi  3-3333', 'Pharmacy 4-0170'];

/** A coil wound round any base path. */
class Coil extends THREE.Curve<THREE.Vector3> {
  constructor(private base: THREE.Curve<THREE.Vector3>, private turns: number, private radius: number) { super(); }
  override getPoint(t: number, target = new THREE.Vector3()) {
    const u = Math.min(1, Math.max(0, t));
    const tangent = this.base.getTangentAt(u);
    const reference = Math.abs(tangent.z) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    const normal = new THREE.Vector3().crossVectors(tangent, reference).normalize();
    const binormal = new THREE.Vector3().crossVectors(tangent, normal);
    // the coil closes down to nothing at each end where it enters its plug
    const swell = Math.min(1, u * 14, (1 - u) * 14);
    const angle = u * this.turns * Math.PI * 2;
    return target.copy(this.base.getPointAt(u)).addScaledVector(normal, Math.cos(angle) * this.radius * swell).addScaledVector(binormal, Math.sin(angle) * this.radius * swell);
  }
  override getPointAt(u: number, target?: THREE.Vector3) { return this.getPoint(u, target); }
}

export default defineThing({
  questions: {
    state: choice('What is the handset doing?', {
      hook: 'Hung up on its cradle: the phone is silent and waiting to ring.',
      waiting: 'Laid down on a stool below the phone, the line open while someone is fetched.',
      dangling: 'Dropped and dangling by its cord, swinging just above the floor.',
      top: 'Balanced off the hook on top of the phone so that it cannot ring.',
    }),
    colour: choice('What colour is the phone?', {
      black: 'Black bakelite, heavy and official.',
      avocado: 'Avocado green, straight from a 1970s kitchen.',
      gold: 'Harvest gold.',
      ivory: 'Ivory gone yellowish with age.',
      red: 'Bright red, an emergency sort of red.',
      turquoise: 'Turquoise, optimistic and a little frivolous.',
    }),
    wall: choice('What is the wall like?', {
      floral: 'Cream wallpaper with a trellis of small roses.',
      stripe: 'Broad green and cream wallpaper stripes.',
      fruit: 'Yellow kitchen wallpaper printed with fruit and teapots.',
      panel: 'Dark wood-grain panelling.',
      tile: 'White tiles to shoulder height with pale painted plaster above.',
    }),
    numbers: choice('Where are the telephone numbers kept?', {
      wall: 'Pencilled straight onto the wall beside the phone in a slanting column.',
      card: 'On a yellowed card pinned up with a drawing pin.',
      book: 'In a little address book hanging from a nail on a string.',
      none: 'Nowhere: she knows them all by heart.',
    }),
    cord: score('How long and tangled is the coil cord?', ['Short and springy', 'Long enough to reach the stove', 'Sagging to the floor', 'Absurdly long, kinked and knotted, pooled on the floor']),
    beside: choice('What else hangs on that bit of wall?', {
      nothing: 'Nothing else.',
      calendar: "A tradesman's calendar with days crossed off.",
      keys: 'A row of hooks with keys.',
      photo: 'A small framed photograph.',
      pad: 'A message pad with a pencil on a string.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const group = (parent: THREE.Object3D = s.root) => { const g = new THREE.Group(); parent.add(g); return g; };
    const part = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const paint = (width: number, height: number, draw: (ctx: Ctx) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      draw(canvas.getContext('2d')!);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      return texture;
    };
    const rounded = (w: number, h: number, r: number, depth: number, bevel = 0.008) => {
      const shape = new THREE.Shape(), x = w / 2, y = h / 2;
      shape.moveTo(-x + r, -y); shape.lineTo(x - r, -y); shape.absarc(x - r, -y + r, r, -Math.PI / 2, 0, false);
      shape.lineTo(x, y - r); shape.absarc(x - r, y - r, r, 0, Math.PI / 2, false);
      shape.lineTo(-x + r, y); shape.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI, false);
      shape.lineTo(-x, -y + r); shape.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5, false);
      return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 10 });
    };

    // ---- wall ---------------------------------------------------------------------------
    const WW = 0.95, WH = 1.5, PX = 600, K = 1.35;
    const phoneY = 1.1, listX = 0.32;
    const wallArt = paint(Math.round(WW * PX), Math.round(WH * PX), (ctx) => {
      const w = WW * PX, h = WH * PX;
      const Y = (metres: number) => h - metres * PX, X = (metres: number) => w / 2 + metres * PX;
      if (a.wall === 'floral') {
        ctx.fillStyle = '#f1e8d2'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(120,150,110,0.55)'; ctx.lineWidth = 3;
        for (let i = -20; i < 30; i++) { ctx.beginPath(); ctx.moveTo(i * 60, 0); ctx.lineTo(i * 60 + h, h); ctx.moveTo(i * 60, 0); ctx.lineTo(i * 60 - h, h); ctx.stroke(); }
        for (let row = 0; row < 32; row++) for (let col = 0; col < 12; col++) {
          const x = col * 60 + (row % 2) * 30, y = row * 30 + 15;
          ctx.fillStyle = '#6f9a62'; ctx.beginPath(); ctx.ellipse(x - 9, y + 4, 8, 4, 0.6, 0, 7); ctx.ellipse(x + 9, y + 4, 8, 4, -0.6, 0, 7); ctx.fill();
          ctx.fillStyle = (row + col) % 3 ? '#d9727a' : '#e8a0a0'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill();
          ctx.fillStyle = '#b84a58'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill();
        }
      } else if (a.wall === 'stripe') {
        ctx.fillStyle = '#efe7cf'; ctx.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 76) { ctx.fillStyle = '#8fae8a'; ctx.fillRect(x, 0, 38, h); ctx.fillStyle = '#d9b24a'; ctx.fillRect(x + 54, 0, 4, h); }
      } else if (a.wall === 'fruit') {
        ctx.fillStyle = '#f2dd93'; ctx.fillRect(0, 0, w, h);
        for (let row = 0; row < 12; row++) for (let col = 0; col < 7; col++) {
          const x = col * 96 + (row % 2) * 48 + 20, y = row * 84 + 40, kind = (row * 3 + col) % 4;
          if (kind === 0) { ctx.fillStyle = '#d0402f'; ctx.beginPath(); ctx.arc(x, y, 20, 0, 7); ctx.fill(); ctx.fillStyle = '#4f8a3a'; ctx.beginPath(); ctx.ellipse(x + 8, y - 22, 10, 5, -0.6, 0, 7); ctx.fill(); }
          else if (kind === 1) { ctx.fillStyle = '#e58a2c'; ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.fill(); ctx.fillStyle = '#f5b65a'; ctx.beginPath(); ctx.arc(x - 5, y - 5, 6, 0, 7); ctx.fill(); }
          else if (kind === 2) { ctx.fillStyle = '#7a4ea3'; for (const [dx, dy] of [[-9, -6], [9, -6], [0, 6], [-9, 14], [9, 14], [0, 24]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy - 8, 9, 0, 7); ctx.fill(); } }
          else { ctx.fillStyle = '#4f86a8'; ctx.beginPath(); ctx.ellipse(x, y, 24, 18, 0, 0, 7); ctx.fill(); ctx.fillRect(x - 10, y - 26, 20, 8); ctx.lineWidth = 6; ctx.strokeStyle = '#4f86a8'; ctx.beginPath(); ctx.arc(x + 26, y, 10, -1.2, 1.2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.lineTo(x - 36, y - 12); ctx.stroke(); }
        }
      } else if (a.wall === 'panel') {
        ctx.fillStyle = '#7a5232'; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 260; i++) { ctx.strokeStyle = `rgba(40,22,10,${0.1 + random() * 0.25})`; ctx.lineWidth = 1 + random() * 3; const x = random() * w; ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + (random() - 0.5) * 30, h * 0.3, x + (random() - 0.5) * 30, h * 0.6, x + (random() - 0.5) * 14, h); ctx.stroke(); }
        for (let x = 0; x < w; x += 95) { ctx.fillStyle = '#2c1a0e'; ctx.fillRect(x, 0, 5, h); }
      } else {
        ctx.fillStyle = '#dfe5d6'; ctx.fillRect(0, 0, w, h);
        const top = Y(1.02);
        ctx.fillStyle = '#f4f3ec'; ctx.fillRect(0, top, w, h - top);
        ctx.strokeStyle = '#b9bdb2'; ctx.lineWidth = 3;
        for (let y = top; y < h; y += 66) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        for (let x = 20; x < w; x += 66) { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, h); ctx.stroke(); }
        ctx.fillStyle = '#3f6f8a'; ctx.fillRect(0, top - 14, w, 14);
      }
      // age: yellowing, a grubby halo where hands rest, a lifting seam
      ctx.fillStyle = `rgba(150,110,40,${mood.wear * 0.22})`; ctx.fillRect(0, 0, w, h);
      const grime = ctx.createRadialGradient(X(-0.02), Y(phoneY - 0.02), 60, X(-0.02), Y(phoneY - 0.02), 230);
      grime.addColorStop(0, `rgba(70,55,40,${mood.wear * 0.5})`); grime.addColorStop(1, 'rgba(70,55,40,0)');
      ctx.fillStyle = grime; ctx.fillRect(0, 0, w, h);
      if (mood.wear > 0.5 && a.wall !== 'tile' && a.wall !== 'panel') { ctx.fillStyle = 'rgba(60,45,30,0.45)'; ctx.fillRect(X(-0.3), 0, 3, h * 0.42); }
      if (a.numbers === 'wall') {
        ctx.save(); ctx.translate(X(listX - 0.13), Y(phoneY + 0.17)); ctx.rotate(-0.06);
        ctx.fillStyle = a.wall === 'panel' ? 'rgba(235,225,200,0.85)' : 'rgba(55,55,60,0.82)';
        const lines = 4 + Math.round(mood.density * 5);
        for (let i = 0; i < lines; i++) {
          ctx.font = `italic ${i === 5 ? 'bold ' : ''}${21 + random() * 4}px Georgia, serif`;
          ctx.save(); ctx.rotate((random() - 0.5) * 0.08); ctx.fillText(NUMBERS[i % NUMBERS.length], random() * 10, i * 31); ctx.restore();
          if (i === 2 && mood.wear > 0.3) { ctx.fillRect(0, i * 31 - 7, 150, 2); }
        }
        ctx.restore();
      }
    });
    const plaster = s.material('#e4dccb', { roughness: 0.9 });
    const front = new THREE.MeshStandardMaterial({ map: wallArt, roughness: 0.88 });
    part(s.root, new THREE.BoxGeometry(WW, WH, 0.07), [plaster, plaster, plaster, plaster, front, plaster], 0, WH / 2, -0.035);
    const woodwork = s.material(a.wall === 'panel' ? '#4a2f1a' : '#f1ecdd', { roughness: 0.5 });
    part(s.root, new THREE.BoxGeometry(WW, 0.11, 0.018), woodwork, 0, 0.055, 0.009);
    part(s.root, new THREE.BoxGeometry(WW, 0.012, 0.024), woodwork, 0, 0.116, 0.012);
    // a strip of floor so the cord and stool have something to rest on
    part(s.root, new THREE.BoxGeometry(WW, 0.02, 0.5), s.material(mood.cheer > 0.5 ? '#c9b48a' : '#a9a393', { roughness: 0.8 }), 0, -0.01, 0.18);

    // ---- phone body ---------------------------------------------------------------------
    const tint = new THREE.Color(SHELL[a.colour]);
    if (a.colour === 'ivory') tint.lerp(new THREE.Color('#d9bf7a'), mood.wear * 0.6);
    const shell = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.28 + mood.wear * 0.35 });
    const chrome = new THREE.MeshStandardMaterial({ color: '#d5dadd', metalness: 0.9, roughness: 0.2 });
    const dark = new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.5 });
    const BW = 0.2, BH = 0.25, BD = 0.075;
    const phone = group();
    phone.position.set(0, phoneY, 0);
    phone.scale.setScalar(K);
    part(phone, rounded(BW, BH, 0.035, BD, 0.01), shell, 0, 0, 0.004);
    // the dial: numerals under a finger wheel
    const dialArt = paint(256, 256, (ctx) => {
      ctx.fillStyle = '#f2efe4'; ctx.beginPath(); ctx.arc(128, 128, 126, 0, 7); ctx.fill();
      ctx.fillStyle = '#1b1b1d'; ctx.font = 'bold 26px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < 10; i++) {
        const t = -0.35 - i * 0.52;
        ctx.fillText(String((i + 1) % 10), 128 + Math.cos(t) * 104, 128 - Math.sin(t) * 104);
      }
    });
    const dialZ = BD + 0.016, dialY = -0.03, dialR = 0.074;
    const face = part(phone, new THREE.CircleGeometry(dialR, 40), new THREE.MeshStandardMaterial({ map: dialArt, roughness: 0.5 }), 0, dialY, dialZ);
    const wheel = group(phone);
    wheel.position.set(0, dialY, dialZ + 0.004);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: a.colour === 'black' ? '#d9dcdc' : '#f4f1e6', roughness: 0.25, metalness: a.colour === 'black' ? 0.6 : 0 });
    const plate = new THREE.Shape();
    plate.absarc(0, 0, dialR * 0.86, 0, Math.PI * 2, false);
    for (let i = 0; i < 10; i++) {
      const t = -0.35 - i * 0.52, hole = new THREE.Path();
      hole.absarc(Math.cos(t) * dialR * 0.64, Math.sin(t) * dialR * 0.64, dialR * 0.14, 0, Math.PI * 2, true);
      plate.holes.push(hole);
    }
    part(wheel, new THREE.ExtrudeGeometry(plate, { depth: 0.004, bevelEnabled: false, curveSegments: 16 }), wheelMaterial);
    part(wheel, new THREE.CircleGeometry(dialR * 0.36, 24), new THREE.MeshStandardMaterial({ color: '#efe9d6', roughness: 0.6 }), 0, 0, 0.0045);
    part(wheel, new THREE.BoxGeometry(dialR * 0.4, dialR * 0.12, 0.0005), new THREE.MeshStandardMaterial({ color: '#8a8f96' }), 0, 0, 0.005);
    const stop = part(phone, new THREE.BoxGeometry(0.006, 0.03, 0.012), chrome, dialR * 0.72, dialY - dialR * 0.6, dialZ + 0.008);
    stop.rotation.z = 0.7;
    wheel.rotation.z = mix(-0.2, 0.2, random());
    face.castShadow = false;
    // cradle
    const cradleY = BH / 2 - 0.045;
    part(phone, new THREE.BoxGeometry(0.085, 0.05, 0.03), shell, 0, cradleY, BD + 0.02);
    for (const x of [-1, 1]) {
      part(phone, new THREE.BoxGeometry(0.012, 0.04, 0.05), chrome, x * 0.05, cradleY + 0.006, BD + 0.036);
      part(phone, new THREE.BoxGeometry(0.012, 0.022, 0.012), chrome, x * 0.05, cradleY + 0.03, BD + 0.058);
    }

    // ---- handset ------------------------------------------------------------------------
    const handset = group();
    handset.scale.setScalar(K);
    {
      // modelled lying along x with the cups facing -z; the cord enters at -x
      const bar = part(handset, new THREE.CapsuleGeometry(0.017, 0.15, 6, 14), shell);
      bar.rotation.z = Math.PI / 2; bar.scale.set(1, 1, 1.25); bar.position.z = 0.016;
      for (const x of [-1, 1]) {
        const cup = part(handset, new THREE.CylinderGeometry(0.033, 0.027, 0.04, 20), shell, x * 0.095, 0, -0.008);
        cup.rotation.x = Math.PI / 2;
        part(handset, new THREE.CylinderGeometry(0.026, 0.026, 0.004, 20), dark, x * 0.095, 0, -0.03).rotation.x = Math.PI / 2;
        part(handset, new THREE.SphereGeometry(0.03, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), shell, x * 0.095, 0, 0.01).rotation.x = Math.PI / 2;
      }
      part(handset, new THREE.CylinderGeometry(0.006, 0.008, 0.02, 10), dark, -0.128, 0, 0).rotation.z = Math.PI / 2;
    }
    const plug = new THREE.Vector3(-0.138, 0, 0); // where the cord meets the handset, handset-local

    // ---- cord ---------------------------------------------------------------------------
    const cordColour = a.colour === 'black' ? '#1b1b1d' : tint.clone().multiplyScalar(0.82);
    const cordMaterial = new THREE.MeshStandardMaterial({ color: cordColour, roughness: 0.55 });
    const anchor = new THREE.Vector3(-0.06 * K, phoneY - (BH / 2) * K - 0.004, BD * 0.55 * K);
    part(s.root, new THREE.CylinderGeometry(0.008, 0.006, 0.02, 10), dark, anchor.x, anchor.y - 0.006, anchor.z);
    const coil = (parent: THREE.Object3D, points: THREE.Vector3[], stretch: number) => {
      const base = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
      const length = base.getLength();
      const turns = Math.round(length * mix(70, 26, stretch));
      const curve = new Coil(base, turns, mix(0.015, 0.01, stretch));
      return part(parent, new THREE.TubeGeometry(curve, Math.min(turns * 7, 2400), 0.004, 5, false), cordMaterial);
    };
    const kinks = (from: THREE.Vector3, to: THREE.Vector3, sag: number, floorRun: number) => {
      // down from the phone, optionally along the floor in loops, and back up to the handset
      const points = [from.clone(), from.clone().add(new THREE.Vector3(-0.01, -0.06, 0.01))];
      const low = Math.max(0.02, Math.min(from.y, to.y) - sag);
      const onFloor = low <= 0.021;
      const midX = (from.x + to.x) / 2 - 0.05, midZ = Math.max(from.z, to.z) + 0.03;
      points.push(new THREE.Vector3(from.x - 0.03, mix(from.y, low, 0.6), from.z + 0.02));
      if (onFloor) {
        const loops = Math.round(floorRun * 3);
        points.push(new THREE.Vector3(from.x - 0.02, 0.022, midZ + 0.02));
        for (let i = 0; i < loops * 4; i++) {
          const t = i * 1.7 + random(), r = 0.06 + random() * 0.09;
          points.push(new THREE.Vector3(midX + Math.cos(t) * r + (random() - 0.5) * 0.05, 0.022 + (i % 3 === 2 ? 0.02 : 0), midZ + 0.1 + Math.sin(t) * r * 0.7));
        }
        points.push(new THREE.Vector3(to.x - 0.05, 0.022, midZ + 0.03));
      } else {
        points.push(new THREE.Vector3(midX, low, midZ));
        if (floorRun > 0.3) points.push(new THREE.Vector3(midX - 0.04, low + 0.05, midZ + 0.02), new THREE.Vector3(midX + 0.02, low + 0.02, midZ - 0.01));
      }
      points.push(new THREE.Vector3(to.x - 0.04, mix(to.y, low, 0.5), to.z + 0.02), to.clone().add(new THREE.Vector3(-0.012, -0.03, 0)), to.clone());
      return points;
    };

    let swing: THREE.Group | null = null;
    const sag = mix(0.22, 1.3, a.cord);
    const floorRun = Math.max(0, (a.cord - 0.6) / 0.4);
    if (a.state === 'hook' || a.state === 'top') {
      if (a.state === 'hook') handset.position.set(0, phoneY + (cradleY + 0.02) * K, (BD + 0.062) * K);
      else { handset.position.set(0.012, phoneY + (BH / 2 + 0.036) * K, BD * 0.5 * K); handset.rotation.set(-Math.PI / 2, mix(-0.25, 0.25, random()), 0); }
      s.root.updateMatrixWorld(true);
      coil(s.root, kinks(anchor, handset.localToWorld(plug.clone()), sag, floorRun), 0);
    } else if (a.state === 'dangling') {
      swing = group();
      swing.position.copy(anchor);
      const drop = Math.min(anchor.y - 0.36, mix(0.3, 0.7, a.cord));
      coil(swing, [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.004, -drop * 0.3, 0.004), new THREE.Vector3(-0.004, -drop * 0.7, 0), new THREE.Vector3(0, -drop, 0)], 0.85);
      swing.add(handset);
      handset.rotation.set(0, mix(-0.6, 0.6, random()), -Math.PI / 2);
      handset.position.set(0, -drop - 0.138 * K, 0);
      swing.rotation.z = mix(0.1, 0.3, mood.energy) * (random() < 0.5 ? -1 : 1);
      swing.rotation.x = 0.12;
    } else {
      // a stool under the phone with the handset laid on it, earpiece up
      const wood = s.material(mood.cheer > 0.5 ? '#c79a5e' : '#8a633c', { roughness: 0.7 });
      const sx = 0.06, sz = 0.3, sh = 0.46;
      part(s.root, new THREE.CylinderGeometry(0.16, 0.16, 0.03, 28), wood, sx, sh, sz);
      for (let i = 0; i < 4; i++) {
        const t = i * Math.PI / 2 + 0.6;
        s.rod([sx + Math.cos(t) * 0.1, sh - 0.01, sz + Math.sin(t) * 0.1], [sx + Math.cos(t) * 0.17, 0, sz + Math.sin(t) * 0.17], 0.014, wood);
      }
      s.ring(0.115, 0.007, [sx, 0.18, sz], wood).rotation.x = Math.PI / 2;
      handset.position.set(sx + 0.01, sh + 0.05, sz - 0.01);
      handset.rotation.set(Math.PI / 2, 0, mix(-0.5, 0.5, random()));
      handset.rotation.order = 'YXZ'; handset.rotation.y = mix(-0.7, 0.7, random());
      s.root.updateMatrixWorld(true);
      const to = handset.localToWorld(plug.clone());
      coil(s.root, kinks(anchor, to, Math.max(0.1, sag - 0.5), floorRun), 0.1);
    }

    // ---- numbers and neighbours ---------------------------------------------------------
    if (a.numbers === 'card') {
      const list = paint(256, 384, (ctx) => {
        ctx.fillStyle = `rgb(${244 - mood.wear * 20},${234 - mood.wear * 30},${200 - mood.wear * 50})`; ctx.fillRect(0, 0, 256, 384);
        ctx.fillStyle = '#2a3560';
        for (let i = 0; i < 9; i++) { ctx.font = `italic ${20 + random() * 4}px Georgia, serif`; ctx.save(); ctx.translate(14, 54 + i * 38); ctx.rotate((random() - 0.5) * 0.05); ctx.fillText(NUMBERS[i], 0, 0, 230); ctx.restore(); }
        ctx.strokeStyle = '#b8322c'; ctx.lineWidth = 3; ctx.strokeRect(8, 30 + 5 * 38, 236, 70);
      });
      const card = part(s.root, new THREE.PlaneGeometry(0.15, 0.225), new THREE.MeshStandardMaterial({ map: list, roughness: 0.9 }), listX, phoneY + 0.03, 0.003);
      card.rotation.z = mix(-0.07, 0.07, random());
      part(s.root, new THREE.SphereGeometry(0.007, 10, 8), new THREE.MeshStandardMaterial({ color: '#c8322c', roughness: 0.3 }), listX, phoneY + 0.13, 0.006);
    } else if (a.numbers === 'book') {
      part(s.root, new THREE.CylinderGeometry(0.003, 0.003, 0.02, 6), chrome, listX, phoneY + 0.17, 0.008).rotation.x = Math.PI / 2;
      s.rod([listX, phoneY + 0.17, 0.012], [listX - 0.02, phoneY + 0.07, 0.012], 0.0012, s.material('#b8a37a'));
      s.rod([listX, phoneY + 0.17, 0.012], [listX + 0.02, phoneY + 0.07, 0.012], 0.0012, s.material('#b8a37a'));
      const book = part(s.root, new THREE.BoxGeometry(0.09, 0.13, 0.016), s.material(mood.cheer > 0.5 ? '#a63a3a' : '#3a4a3a', { roughness: 0.6 }), listX, phoneY, 0.01);
      book.rotation.z = mix(-0.1, 0.1, random());
      part(s.root, new THREE.BoxGeometry(0.084, 0.124, 0.017), s.material('#efe6cf'), listX + 0.002, phoneY, 0.01).rotation.z = book.rotation.z;
      part(s.root, new THREE.BoxGeometry(0.09, 0.13, 0.002), s.material(mood.cheer > 0.5 ? '#a63a3a' : '#3a4a3a', { roughness: 0.6 }), listX, phoneY, 0.019).rotation.z = book.rotation.z;
    }
    const bx = -0.32, by = phoneY + 0.1;
    if (a.beside === 'calendar') {
      const month = paint(256, 384, (ctx) => {
        ctx.fillStyle = '#f4efe0'; ctx.fillRect(0, 0, 256, 384);
        ctx.fillStyle = mood.cheer > 0.5 ? '#b8322c' : '#3a5a7a'; ctx.fillRect(0, 0, 256, 150);
        ctx.fillStyle = '#f4efe0'; ctx.font = 'bold 30px Georgia, serif'; ctx.textAlign = 'center';
        ctx.fillText('KOWALSKI', 128, 62); ctx.font = 'bold 22px Georgia, serif'; ctx.fillText('QUALITY MEATS', 128, 100);
        ctx.fillStyle = '#2a2a2e'; ctx.font = 'bold 17px Arial, sans-serif';
        const crossed = Math.floor(random() * 28);
        for (let d = 0; d < 31; d++) {
          const x = 24 + (d % 7) * 35, y = 196 + Math.floor(d / 7) * 40;
          ctx.fillStyle = d % 7 === 6 ? '#b8322c' : '#2a2a2e'; ctx.fillText(String(d + 1), x, y);
          if (d < crossed) { ctx.strokeStyle = '#2a3560'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 12, y - 18); ctx.lineTo(x + 12, y + 6); ctx.stroke(); }
        }
      });
      part(s.root, new THREE.PlaneGeometry(0.2, 0.3), new THREE.MeshStandardMaterial({ map: month, roughness: 0.9 }), bx, by - 0.05, 0.004).rotation.z = mix(-0.04, 0.04, random());
      part(s.root, new THREE.SphereGeometry(0.006, 8, 6), chrome, bx, by + 0.09, 0.006);
    } else if (a.beside === 'keys') {
      part(s.root, new THREE.BoxGeometry(0.24, 0.035, 0.014), s.material('#8a5a34', { roughness: 0.6 }), bx, by, 0.007);
      const brass = new THREE.MeshStandardMaterial({ color: '#c9a64e', metalness: 0.85, roughness: 0.3 });
      for (let i = 0; i < 4; i++) {
        const x = bx - 0.09 + i * 0.06;
        s.rod([x, by, 0.014], [x, by - 0.012, 0.03], 0.0025, brass);
        if (random() < 0.3 + mood.density * 0.6) {
          s.ring(0.012, 0.0015, [x, by - 0.026, 0.03], chrome);
          for (let k = 0; k < 1 + Math.floor(random() * 3); k++) {
            const key = part(s.root, new THREE.BoxGeometry(0.008, 0.05, 0.002), k % 2 ? brass : chrome, x + (k - 1) * 0.008, by - 0.062, 0.03 + k * 0.003);
            key.rotation.z = (k - 1) * 0.25;
            part(s.root, new THREE.CylinderGeometry(0.01, 0.01, 0.002, 10), k % 2 ? brass : chrome, x + (k - 1) * 0.003, by - 0.04, 0.03 + k * 0.003).rotation.x = Math.PI / 2;
          }
        }
      }
    } else if (a.beside === 'photo') {
      const portrait = paint(128, 160, (ctx) => {
        ctx.fillStyle = '#b9a888'; ctx.fillRect(0, 0, 128, 160);
        ctx.fillStyle = '#4a3d2e';
        for (const [x, r] of [[44, 20], [86, 17]]) { ctx.beginPath(); ctx.arc(x, 62, r, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(x, 140, r * 1.7, 52, 0, 0, 7); ctx.fill(); }
      });
      part(s.root, new THREE.BoxGeometry(0.16, 0.2, 0.016), s.material('#3a2a1c', { roughness: 0.5 }), bx, by, 0.008).rotation.z = mix(-0.05, 0.05, random());
      part(s.root, new THREE.PlaneGeometry(0.125, 0.165), new THREE.MeshStandardMaterial({ map: portrait, roughness: 0.6 }), bx, by, 0.0165);
    } else if (a.beside === 'pad') {
      part(s.root, new THREE.BoxGeometry(0.11, 0.16, 0.012), s.material('#f6f2e2', { roughness: 0.9 }), bx, by - 0.02, 0.006);
      part(s.root, new THREE.BoxGeometry(0.11, 0.022, 0.014), s.material('#3f6f8a'), bx, by + 0.05, 0.007);
      const scribble = s.label(mood.cheer > 0.5 ? 'CALL BACK!' : 'she rang 2x', 0.095, 0.03, [bx, by - 0.005, 0.0125], '#2a3560', '#f6f2e2');
      scribble.rotation.z = -0.08;
      s.tube([[bx + 0.05, by + 0.05, 0.012], [bx + 0.09, by - 0.04, 0.02], [bx + 0.07, by - 0.14, 0.014]], 0.001, s.material('#b8a37a'));
      part(s.root, new THREE.CylinderGeometry(0.0035, 0.0035, 0.07, 6), new THREE.MeshStandardMaterial({ color: '#e0b12e' }), bx + 0.07, by - 0.175, 0.014).rotation.z = 0.12;
    }

    const period = 1.7, reach = swing ? Math.abs(swing.rotation.z) : 0, side = swing ? Math.sign(swing.rotation.z) || 1 : 1;
    return s.finish({
      update: (_dt, time) => {
        if (swing) swing.rotation.z = Math.cos((time * Math.PI * 2) / period) * reach * side;
        // now and then the dial is still unwinding
        if (a.state !== 'hook' && mood.energy > 0.3) wheel.rotation.z = Math.max(0, Math.sin(time * 0.7)) * -0.6 * mood.energy;
      },
    });
  },
});
