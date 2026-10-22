import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const LIVERY = {
  white: { body: '#ecebe4', trim: '#2b3a55', seat: '#2a2c30', ink: '#1f2c4a' },
  teal: { body: '#2f9a9c', trim: '#f277b0', seat: '#efe7d2', ink: '#ffffff' },
  navy: { body: '#22335c', trim: '#d1a94a', seat: '#b9b2a2', ink: '#f1d77a' },
  yellow: { body: '#e3b62c', trim: '#2a2a2a', seat: '#2a2c30', ink: '#1c1c1c' },
  green: { body: '#3f6b4f', trim: '#e6dfc8', seat: '#d8cfb6', ink: '#f3eeda' },
} as const;
const WORDS = { security: 'SECURITY', patrol: 'MALL PATROL', safety: 'PUBLIC SAFETY', parking: 'PARKING', unit: 'SECURITY 2' } as const;

type Ctx = CanvasRenderingContext2D;
function paint(w: number, h: number, draw: (ctx: Ctx, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    kind: choice('What kind of cart is it?', {
      golf: 'An ordinary two-seat golf cart with a bag well at the back, bought used from a country club.',
      utility: 'A utility cart with a small flatbed box behind the seat for cones and salt.',
      cab: 'A cart with hard half-doors and a full windshield, a tiny patrol car for bad weather.',
    }),
    livery: choice('What colour is it?', {
      white: 'Fleet white with a dark blue stripe, anonymous contract security.',
      teal: 'Mall-brand teal with a pink stripe, painted to match the 1989 logo.',
      navy: 'Dark navy with a gold stripe, pretending to be police.',
      yellow: 'Maintenance yellow, borrowed from the groundskeepers.',
      green: 'Faded golf-course green and cream, never repainted.',
    }),
    state: choice('What is it doing right now?', {
      patrol: 'Still on patrol: beacon turning, headlights on, guarding nothing.',
      idle: 'Parked mid-shift and switched off, the guard gone for coffee.',
      charging: 'Plugged in on a long orange extension cord that trails away across the ground.',
      flat: 'Abandoned for months on flat tyres, leaves on the seat and weeds at the wheels.',
      stripped: 'Stripped: seat and a wheel gone, propped on a cinder block, battery hatch open.',
    }),
    lettering: choice('How is the panel lettered?', {
      brush: 'Hand-painted with a brush, wobbly letters that run out of room, a few drips.',
      stencil: 'Spray-stencilled block capitals with overspray haze.',
      magnet: 'A printed magnetic sign, one corner peeling away from the body.',
      tape: 'Letters built out of strips of silver duct tape.',
    }),
    words: choice('What does the panel say?', {
      security: 'SECURITY.',
      patrol: 'MALL PATROL.',
      safety: 'PUBLIC SAFETY, a consultant chose it.',
      parking: 'PARKING, the only thing left to enforce.',
      unit: 'SECURITY 2, though there was never a 1.',
    }),
    roof: choice('What is over the driver?', {
      hard: 'A moulded hard roof on four struts with the beacon on top.',
      canopy: 'A sagging striped fabric sun canopy on a bent frame.',
      none: 'Nothing: an open cart with the beacon on a pole behind the seat.',
    }),
    beacon: choice('What warning light does it carry?', {
      dome: 'A single amber dome beacon.',
      bar: 'A short amber light bar with two lamps, more official.',
      spot: 'An amber dome and a hand-aimed spotlight on a stalk.',
    }),
    left: choice('What has been left on it?', {
      nothing: 'Nothing.',
      thermos: 'A steel thermos and a clipboard of incident reports on the seat.',
      cones: 'A stack of orange traffic cones in the back and one set out on the ground.',
      jacket: 'A yellow windbreaker draped over the seat back.',
      radio: 'A handheld radio and a heavy flashlight on the dash.',
      donuts: 'A pink bakery box open on the seat.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const liv = LIVERY[a.livery];
    const dead = a.state === 'flat' || a.state === 'stripped';
    const stripped = a.state === 'stripped';
    const on = a.state === 'patrol';
    const wear = Math.min(1, mood.wear + (dead ? 0.25 : 0));

    const fade = new THREE.Color(liv.body).lerp(new THREE.Color('#cfcabd'), wear * 0.35);
    const body = new THREE.MeshStandardMaterial({ color: fade, roughness: mix(0.35, 0.85, wear), metalness: 0.05 });
    const trim = s.material(liv.trim, { roughness: 0.5 });
    const black = s.material('#1c1d20', { roughness: 0.85 });
    const rubber = s.material('#232326', { roughness: 0.95 });
    const steel = s.material('#8d9396', { metalness: 0.6, roughness: 0.45 });
    const hub = s.material('#d9d6cc', { roughness: 0.5, metalness: 0.2 });
    const vinyl = s.material(liv.seat, { roughness: 0.7 });
    const rust = s.material('#7a4a2c', { roughness: 1 });
    const glass = new THREE.MeshStandardMaterial({ color: '#cfe3ea', transparent: true, opacity: 0.18, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide });

    const cart = new THREE.Group();
    s.root.add(cart);
    const C = <T extends THREE.Object3D>(o: T) => { cart.add(o); return o; };

    // Body tub: one side profile (z forward, y up) extruded across the width.
    const HW = 0.52;
    const tub = new THREE.Shape();
    const bed = a.kind === 'utility';
    const profile: [number, number][] = [
      [1.22, 0.3], [1.24, 0.5], [1.16, 0.74], [0.82, 0.98], [0.72, 0.96], [0.66, 0.42],
      [-0.08, 0.42], [-0.1, 0.72], [-0.74, 0.72],
      ...(bed ? [[-0.74, 0.62], [-1.36, 0.62]] as [number, number][] : [[-0.78, 0.86], [-1.18, 0.82], [-1.26, 0.6]] as [number, number][]),
      [-1.28, 0.3],
    ];
    profile.forEach(([z, y], i) => (i ? tub.lineTo(z, y) : tub.moveTo(z, y)));
    tub.closePath();
    const tubGeo = new THREE.ExtrudeGeometry(tub, { depth: HW * 2 - 0.08, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 3 });
    tubGeo.rotateY(-Math.PI / 2);
    tubGeo.translate(HW - 0.04, 0, 0);
    C(s.mesh(tubGeo, body));
    // Stripe, bumpers, fenders, grille.
    for (const x of [-1, 1]) {
      C(s.box([0.012, 0.07, 1.1], [x * (HW + 0.004), 0.6, -0.7 + (bed ? -0.05 : 0)], trim));
      C(s.box([0.012, 0.07, 0.5], [x * (HW + 0.004), 0.6, 0.94], trim));
      const fender = C(s.cylinder(0.33, 0.33, 0.2, [x * (HW + 0.02), 0.3, 0.86], body, 20));
      fender.rotation.z = Math.PI / 2;
      fender.scale.set(1, 1, 0.9);
    }
    C(s.box([HW * 2 + 0.1, 0.1, 0.1], [0, 0.3, 1.27], black));
    C(s.box([HW * 2 + 0.1, 0.1, 0.1], [0, 0.32, bed ? -1.4 : -1.31], black));
    C(s.box([0.5, 0.16, 0.02], [0, 0.42, 1.265], black));
    // Headlights.
    const lampMat = new THREE.MeshStandardMaterial({ color: '#f4f0dc', roughness: 0.3, emissive: '#fff2c4', emissiveIntensity: on ? 1.6 : 0 });
    for (const x of [-1, 1]) {
      if (stripped && x === 1) { C(s.cylinder(0.07, 0.07, 0.03, [x * 0.33, 0.62, 1.21], black, 14)).rotation.x = Math.PI / 2; continue; }
      const lamp = C(s.cylinder(0.075, 0.075, 0.04, [x * 0.33, 0.62, 1.215], lampMat, 16));
      lamp.rotation.x = Math.PI / 2 - 0.2;
    }
    // Floor mat and pedals.
    C(s.box([HW * 2 - 0.12, 0.02, 0.7], [0, 0.435, 0.28], black));
    C(s.box([0.09, 0.14, 0.02], [0.1, 0.52, 0.6], steel)).rotation.x = -0.6;

    // Wheels. A dead cart sits on squashed tyres; a stripped one has lost one or two.
    const missing = stripped ? (random() < 0.5 ? [0] : [0, 3]) : [];
    const R = 0.23;
    const tyreGeo = new THREE.CylinderGeometry(R, R, 0.2, 22);
    tyreGeo.rotateZ(Math.PI / 2);
    const hubGeo = new THREE.CylinderGeometry(R * 0.55, R * 0.55, 0.21, 12);
    hubGeo.rotateZ(Math.PI / 2);
    const spots: [number, number][] = [[1, 0.86], [-1, 0.86], [1, -0.86], [-1, -0.86]];
    spots.forEach(([x, z], i) => {
      if (missing.includes(i)) {
        // Bare hub on a cinder block.
        C(s.mesh(hubGeo, rust, [x * (HW + 0.02), R, z])).scale.set(0.6, 0.5, 0.5);
        const block = s.box([0.4, R - 0.03, 0.2], [x * (HW - 0.06), (R - 0.03) / 2, z], s.material('#a9a79c', { roughness: 1 }));
        block.rotation.y = (random() - 0.5) * 0.5;
        return;
      }
      const flat = dead ? mix(0.62, 0.8, random()) : 1;
      const tyre = C(s.mesh(tyreGeo, rubber, [x * (HW + 0.03), R * flat, z]));
      tyre.scale.set(1, flat, dead ? 1.08 : 1);
      C(s.mesh(hubGeo, wear > 0.75 && random() < 0.5 ? rust : hub, [x * (HW + 0.03), R * flat, z])).scale.set(1, flat, 1);
      if (i < 2 && !dead) tyre.rotation.y = 0;
    });

    // Seat.
    if (!stripped) {
      C(s.box([HW * 2 - 0.06, 0.13, 0.52], [0, 0.79, -0.42], vinyl));
      const back = C(s.box([HW * 2 - 0.06, 0.4, 0.11], [0, 1.06, -0.72], vinyl));
      back.rotation.x = -0.14;
      if (wear > 0.45) {
        // Duct tape over the split vinyl.
        const tape = s.material('#b8bcbe', { roughness: 0.5, metalness: 0.3 });
        C(s.box([0.22, 0.012, 0.09], [-0.2 + random() * 0.4, 0.858, -0.42 + (random() - 0.5) * 0.25], tape)).rotation.y = random() * 1.2;
        if (wear > 0.7) C(s.box([0.09, 0.012, 0.3], [0.25, 0.858, -0.4], tape)).rotation.y = 0.3;
      }
    } else {
      // Bare seat pan with the battery hatch open and cells showing.
      C(s.box([HW * 2 - 0.1, 0.02, 0.5], [0, 0.73, -0.42], black));
      for (let i = 0; i < 3; i++) C(s.box([0.24, 0.1, 0.36], [-0.3 + i * 0.3, 0.76, -0.42], s.material(i === 1 && random() < 0.6 ? '#3a3c40' : '#5d6468')));
      const hatch = C(s.box([HW * 2 - 0.1, 0.03, 0.5], [0, 0.98, -0.74], black));
      hatch.rotation.x = 1.25;
    }
    for (const x of [-1, 1]) C(s.tube([[x * (HW - 0.02), 0.74, -0.2], [x * (HW - 0.02), 0.98, -0.26], [x * (HW - 0.02), 0.98, -0.62], [x * (HW - 0.02), 0.84, -0.7]], 0.016, steel));

    // Steering column and wheel.
    C(s.rod([-0.24, 0.9, 0.74], [-0.24, 1.14, 0.4], 0.022, black));
    if (!stripped) {
      const wheel = C(s.ring(0.15, 0.02, [-0.24, 1.15, 0.39], black));
      wheel.rotation.x = -0.95;
      C(s.box([0.26, 0.025, 0.03], [-0.24, 1.15, 0.39], black)).rotation.x = -0.95;
    }

    // Roof and its struts.
    const top = 1.84;
    const fz = 0.78, rz = bed ? -0.82 : -0.92;
    const strutMat = a.kind === 'cab' ? body : black;
    let beaconAt: [number, number, number] = [0, top + 0.05, -0.1];
    if (a.roof !== 'none') {
      const bent = a.roof === 'canopy' ? mix(0, 0.1, wear) : 0;
      for (const x of [-1, 1]) {
        C(s.rod([x * (HW - 0.03), 0.9, fz], [x * (HW - 0.03) + bent * x, top, fz - 0.16], 0.02, strutMat));
        C(s.rod([x * (HW - 0.03), bed ? 0.64 : 0.84, rz], [x * (HW - 0.03), top, rz + 0.06], 0.02, strutMat));
      }
      if (a.roof === 'hard') {
        const slab = new THREE.Shape();
        const rw = HW + 0.08, r0 = rz - 0.12, r1 = fz + 0.02, rr = 0.16;
        slab.moveTo(-rw + rr, r0); slab.lineTo(rw - rr, r0); slab.quadraticCurveTo(rw, r0, rw, r0 + rr);
        slab.lineTo(rw, r1 - rr); slab.quadraticCurveTo(rw, r1, rw - rr, r1); slab.lineTo(-rw + rr, r1);
        slab.quadraticCurveTo(-rw, r1, -rw, r1 - rr); slab.lineTo(-rw, r0 + rr); slab.quadraticCurveTo(-rw, r0, -rw + rr, r0);
        const roofGeo = new THREE.ExtrudeGeometry(slab, { depth: 0.05, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
        roofGeo.rotateX(Math.PI / 2);
        const roofMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#efeee8').lerp(new THREE.Color('#b9b3a2'), wear * 0.5), roughness: 0.6 });
        const roof = C(s.mesh(roofGeo, roofMat, [0, top + 0.05, 0]));
        roof.scale.z = -1;
        roofMat.side = THREE.DoubleSide;
      } else {
        // Fabric canopy: a sagging striped sheet on a tube frame.
        const cw = HW * 2 + 0.2, cl = fz - rz + 0.2;
        const stripes = paint(128, 32, (ctx, w, h) => {
          for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#f1ecdc' : liv.trim; ctx.fillRect(i * w / 8, 0, w / 8, h); }
          ctx.fillStyle = `rgba(110,100,80,${wear * 0.45})`; ctx.fillRect(0, 0, w, h);
        });
        const geo = new THREE.PlaneGeometry(cw, cl, 10, 10);
        geo.rotateX(-Math.PI / 2);
        const p = geo.attributes.position;
        const sag = mix(0.03, 0.2, wear), torn = wear > 0.6;
        for (let i = 0; i < p.count; i++) {
          const u = p.getX(i) / (cw / 2), v = p.getZ(i) / (cl / 2);
          let y = -(1 - u * u) * (1 - v * v) * sag + Math.sin(u * 7 + v * 3) * 0.012;
          if (torn && u > 0.3 && v > 0.2) y -= (u - 0.3) * (v - 0.2) * 1.3;
          p.setY(i, y);
        }
        geo.computeVertexNormals();
        C(s.mesh(geo, new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.9, side: THREE.DoubleSide }), [0, top + 0.02, (fz + rz) / 2 - 0.05]));
        for (const x of [-1, 1]) C(s.rod([x * cw / 2, top + 0.02, rz - 0.1], [x * cw / 2, top + 0.02, fz], 0.016, black));
        for (const z of [rz - 0.1, fz]) C(s.rod([-cw / 2, top + 0.02, z], [cw / 2, top + 0.02, z], 0.016, black));
      }
      // Windshield, cracked when things are bad.
      if (!(stripped && random() < 0.5)) {
        const shield = C(s.mesh(new THREE.PlaneGeometry(HW * 2 - 0.1, a.kind === 'cab' ? 0.9 : 0.6), glass, [0, a.kind === 'cab' ? 1.38 : 1.24, fz - (a.kind === 'cab' ? 0.085 : 0.06)]));
        shield.rotation.x = -0.175;
        C(s.rod([-HW + 0.05, a.kind === 'cab' ? 1.82 : 1.54, fz - 0.16 * (a.kind === 'cab' ? 1 : 0.7)], [HW - 0.05, a.kind === 'cab' ? 1.82 : 1.54, fz - 0.16 * (a.kind === 'cab' ? 1 : 0.7)], 0.014, strutMat));
        if (wear > 0.55) {
          const cx = (random() - 0.5) * 0.5;
          for (let i = 0; i < 6; i++) {
            const ang = random() * Math.PI * 2, len = 0.1 + random() * 0.2;
            C(s.rod([cx, 1.25, fz - 0.05], [cx + Math.cos(ang) * len, 1.25 + Math.sin(ang) * len * 0.9, fz - 0.05 - Math.sin(ang) * len * 0.17], 0.004, hub));
          }
        }
      }
    } else {
      // Beacon pole behind the seat.
      C(s.rod([0.3, 0.8, -0.86], [0.3, 1.62, -0.86], 0.022, steel));
      beaconAt = [0.3, 1.62, -0.86];
      C(s.box([HW * 2 - 0.1, 0.03, 0.03], [0, 0.99, 0.78], black));
    }
    if (a.kind === 'cab') {
      // Hard half-doors with a handle, and side glass above.
      for (const x of [-1, 1]) {
        const door = C(s.box([0.035, 0.5, 0.72], [x * (HW + 0.01), 0.7, 0.28], body));
        if (dead && x === 1) { door.rotation.y = -0.7; door.position.set(HW + 0.26, 0.7, 0.42); }
        C(s.box([0.02, 0.03, 0.12], [x * (HW + 0.035), 0.84, 0.05], black));
        if (a.roof !== 'none') C(s.mesh(new THREE.PlaneGeometry(0.7, 0.8), glass, [x * (HW - 0.03), 1.38, 0.28])).rotation.y = Math.PI / 2;
      }
    }
    if (bed) {
      // Flatbed box with low sides and a tailgate.
      const bz = -1.05, bw = HW * 2 + 0.04;
      for (const x of [-1, 1]) C(s.box([0.03, 0.24, 0.62], [x * bw / 2, 0.78, bz], body));
      C(s.box([bw, 0.24, 0.03], [0, 0.78, bz + 0.31], body));
      const gate = C(s.box([bw, 0.24, 0.03], [0, 0.78, bz - 0.31], body));
      if (wear > 0.5) { gate.rotation.x = -1.3; gate.position.set(0, 0.64, bz - 0.42); }
      C(s.box([bw - 0.04, 0.02, 0.6], [0, 0.665, bz], black));
    }

    // The lettered panels: a fascia board over the windshield, both flanks and the nose.
    const text = WORDS[a.words];
    const boardInk = a.lettering === 'tape' ? '#c9cdcf' : a.lettering === 'magnet' ? '#ffffff' : liv.ink;
    const boardPaper = a.lettering === 'magnet' ? '#1e2d55' : a.lettering === 'brush' ? (a.livery === 'white' || a.livery === 'yellow' ? '#f4efdf' : `#${fade.getHexString()}`) : `#${fade.getHexString()}`;
    const jitter = Array.from({ length: text.length }, () => [random() - 0.5, random() - 0.5, random()] as const);
    const sign = paint(512, 128, (ctx, w, h) => {
      ctx.fillStyle = boardPaper;
      ctx.fillRect(0, 0, w, h);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      if (a.lettering === 'magnet') {
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.strokeRect(8, 8, w - 16, h - 16);
        ctx.fillStyle = boardInk;
        ctx.font = `bold ${h * 0.56}px Arial, Helvetica, sans-serif`;
        ctx.fillText(text, w / 2, h * 0.54, w * 0.86);
      } else if (a.lettering === 'stencil') {
        ctx.fillStyle = 'rgba(30,30,30,0.12)';
        ctx.fillRect(w * 0.04, h * 0.1, w * 0.92, h * 0.8);
        ctx.fillStyle = boardInk === '#ffffff' ? '#ffffff' : '#1b1b1b';
        ctx.font = `bold ${h * 0.6}px 'Courier New', monospace`;
        ctx.fillText(text, w / 2, h * 0.54, w * 0.86);
        // Stencil bridges.
        ctx.fillStyle = boardPaper;
        for (let x = w * 0.08; x < w * 0.94; x += w * 0.86 / text.length) ctx.fillRect(x + w * 0.035, 0, 4, h);
      } else {
        // Brush or tape: letter by letter, each a little off, crowding toward the end.
        const n = text.length;
        let x = w * 0.07;
        for (let i = 0; i < n; i++) {
          const squeeze = a.lettering === 'brush' ? mix(1.25, 0.72, i / Math.max(1, n - 1)) : 1;
          const cw = (w * 0.86 / n) * squeeze;
          const [jx, jy, jr] = jitter[i];
          ctx.save();
          ctx.translate(x + cw / 2, h * 0.52 + jy * h * 0.14);
          ctx.rotate(jx * 0.22);
          if (a.lettering === 'tape') {
            ctx.font = `${h * 0.7}px 'Courier New', monospace`;
            ctx.lineWidth = 11; ctx.lineJoin = 'miter'; ctx.strokeStyle = boardInk;
            ctx.strokeText(text[i], 0, 0, cw * 1.1);
            ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(90,95,100,0.55)';
            ctx.strokeText(text[i], 0, 0, cw * 1.1);
          } else {
            ctx.fillStyle = boardInk;
            ctx.font = `bold ${h * mix(0.72, 0.5, i / Math.max(1, n - 1))}px 'Comic Sans MS', 'Marker Felt', 'Trebuchet MS', sans-serif`;
            ctx.fillText(text[i], 0, 0, cw * 1.15);
            if (jr < 0.3 && text[i] !== ' ') ctx.fillRect(-2 + jx * 10, h * 0.12, 4, h * (0.15 + jr));
          }
          ctx.restore();
          x += cw;
        }
      }
      // Sun fade and grime.
      ctx.fillStyle = `rgba(215,208,190,${wear * 0.3})`;
      ctx.fillRect(0, 0, w, h);
      for (let k = 0; k < 8; k++) { ctx.fillStyle = `rgba(80,65,45,${wear * 0.22})`; ctx.fillRect(((k * 67) % 100) / 100 * w, 0, 8, h * (0.3 + (k % 4) / 6)); }
    });
    const signMat = new THREE.MeshStandardMaterial({ map: sign, roughness: 0.7, side: THREE.DoubleSide });
    const peel = a.lettering === 'magnet';
    for (const x of [-1, 1]) {
      const plate = C(s.mesh(new THREE.PlaneGeometry(1.0, 0.25), signMat, [x * (HW + 0.014), 0.48, bed ? -0.72 : -0.66]));
      plate.rotation.y = x * Math.PI / 2;
      if (peel && x === 1) { plate.rotation.x = mix(0.03, 0.2, wear); plate.rotation.z = -0.04; plate.position.x += 0.02; }
    }
    if (a.roof !== 'none') {
      const fasciaY = top + 0.2;
      C(s.box([HW * 2 + 0.06, 0.3, 0.03], [0, fasciaY, fz - 0.1], a.lettering === 'brush' ? s.material('#c9b58c') : black));
      const front = C(s.mesh(new THREE.PlaneGeometry(HW * 2 + 0.02, 0.26), signMat, [0, fasciaY, fz - 0.082]));
      front.rotation.z = a.lettering === 'brush' ? (random() - 0.5) * 0.06 : 0;
      for (const x of [-1, 1]) C(s.rod([x * 0.4, top + 0.04, fz - 0.14], [x * 0.4, fasciaY, fz - 0.12], 0.014, black));
    } else {
      const nose = C(s.mesh(new THREE.PlaneGeometry(0.84, 0.21), signMat, [0, 0.87, 1.0]));
      nose.rotation.x = -Math.PI / 2 + 0.62;
    }

    // Warning light.
    const amber = new THREE.MeshStandardMaterial({ color: '#f29a1c', roughness: 0.25, emissive: '#ff8a00', emissiveIntensity: on ? 2.2 : 0.08 });
    const [bx, by, bz] = beaconAt;
    const domeProfile: [number, number][] = [[0.075, 0], [0.078, 0.07], [0.06, 0.12], [0.03, 0.145], [0, 0.15]];
    const spinner = new THREE.Group();
    if (stripped) {
      C(s.cylinder(0.05, 0.06, 0.03, [bx, by + 0.015, bz], black, 12));
      C(s.rod([bx, by + 0.03, bz], [bx + 0.08, by + 0.1, bz + 0.03], 0.006, s.material('#b0392b')));
    } else if (a.beacon === 'bar') {
      C(s.box([0.62, 0.05, 0.16], [bx, by + 0.025, bz], black));
      C(s.box([0.6, 0.09, 0.14], [bx, by + 0.095, bz], amber));
      C(s.box([0.14, 0.095, 0.15], [bx, by + 0.095, bz], s.material('#e9e9e4', { roughness: 0.3 })));
    } else {
      C(s.cylinder(0.085, 0.095, 0.05, [bx, by + 0.025, bz], black, 16));
      C(s.lathe(domeProfile, amber, [bx, by + 0.05, bz]));
      if (a.beacon === 'spot') {
        const sx = bx + (a.roof === 'none' ? -0.6 : 0.34), sz = a.roof === 'none' ? 0.78 - bz + bz : fz - 0.3;
        const sy = a.roof === 'none' ? 1.0 : by;
        C(s.rod([sx, sy, sz], [sx, sy + 0.16, sz], 0.012, steel));
        const spot = C(s.cylinder(0.075, 0.045, 0.13, [sx, sy + 0.2, sz + 0.02], steel, 14));
        spot.rotation.set(Math.PI / 2 - 0.25, 0, 0.3);
        const lens = C(s.cylinder(0.07, 0.07, 0.012, [sx - 0.02, sy + 0.215, sz + 0.085], lampMat, 14));
        lens.rotation.copy(spot.rotation);
      }
    }
    if (on && !stripped) {
      // A bright reflector that turns inside the lens, and a halo around it.
      const flare = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.03), new THREE.MeshBasicMaterial({ color: '#fff0b0' }));
      flare.position.y = a.beacon === 'bar' ? 0.04 : 0.02;
      spinner.add(flare);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.16, depthWrite: false }));
      spinner.add(halo);
      spinner.position.set(bx, by + 0.09, bz);
      spinner.rotation.y = random() * 6;
      cart.add(spinner);
    }

    // What was left on it.
    const seatY = stripped ? 0.75 : 0.86;
    if (a.left === 'thermos') {
      C(s.cylinder(0.04, 0.04, 0.24, [0.26, seatY + 0.12, -0.36], steel, 12));
      C(s.cylinder(0.042, 0.042, 0.05, [0.26, seatY + 0.26, -0.36], s.material('#b0392b'), 12));
      const board = C(s.box([0.23, 0.012, 0.32], [-0.02, seatY + 0.008, -0.4], s.material('#7a5a3a')));
      board.rotation.y = 0.3;
      C(s.box([0.2, 0.004, 0.27], [-0.02, seatY + 0.018, -0.41], s.material('#f3f0e6'))).rotation.y = 0.3;
    } else if (a.left === 'cones') {
      const cone = s.material('#ee6a1f', { roughness: 0.6 });
      const cz = bed ? -1.05 : -1.0, cy = bed ? 0.68 : 0.84;
      const n = 2 + Math.floor(random() * 3 + mood.density * 2);
      for (let i = 0; i < n; i++) {
        C(s.cylinder(0.025, 0.12, 0.42, [0.2, cy + 0.21 + i * 0.07, cz], cone, 12));
        if (i === n - 1) C(s.cylinder(0.062, 0.078, 0.07, [0.2, cy + 0.27 + i * 0.07, cz], s.material('#f1eee4'), 12));
      }
      C(s.box([0.28, 0.02, 0.28], [0.2, cy + 0.01, cz], cone));
      const gx = HW + 0.5 + random() * 0.4, gz = 0.9 + random() * 0.6;
      const loose = s.cylinder(0.025, 0.12, 0.42, [gx, 0.22, gz], cone, 12);
      s.box([0.28, 0.02, 0.28], [gx, 0.01, gz], cone);
      s.cylinder(0.062, 0.078, 0.07, [gx, 0.28, gz], s.material('#f1eee4'), 12);
      if (dead) { loose.rotation.z = Math.PI / 2 - 0.25; loose.position.y = 0.12; }
    } else if (a.left === 'jacket' && !stripped) {
      const jacket = s.material('#e4c81f', { roughness: 0.8 });
      const drape = C(s.box([0.5, 0.42, 0.16], [0.14, 1.1, -0.74], jacket));
      drape.rotation.x = -0.14;
      C(s.box([0.13, 0.4, 0.06], [0.44, 0.98, -0.82], jacket)).rotation.z = 0.25;
      C(s.box([0.5, 0.05, 0.165], [0.14, 1.0, -0.725], s.material('#d8dcdc', { metalness: 0.5, roughness: 0.3 }))).rotation.x = -0.14;
    } else if (a.left === 'radio') {
      C(s.box([0.06, 0.14, 0.035], [0.2, 1.03, 0.76], black)).rotation.x = -0.5;
      C(s.rod([0.22, 1.09, 0.73], [0.22, 1.22, 0.69], 0.005, black));
      const torch = C(s.cylinder(0.022, 0.022, 0.3, [0.02, 0.985, 0.8], black, 10));
      torch.rotation.z = Math.PI / 2;
      C(s.cylinder(0.035, 0.024, 0.06, [0.19, 0.985, 0.8], steel, 10)).rotation.z = -Math.PI / 2;
    } else if (a.left === 'donuts') {
      const pink = s.material('#f39ac0', { roughness: 0.8 });
      C(s.box([0.3, 0.05, 0.3], [0.18, seatY + 0.025, -0.4], pink));
      const lid = C(s.box([0.3, 0.012, 0.3], [0.18, seatY + 0.18, -0.56], pink));
      lid.rotation.x = 1.25;
      const left = Math.floor(random() * 4);
      for (let i = 0; i < left; i++) C(s.ring(0.035, 0.018, [0.11 + (i % 2) * 0.13, seatY + 0.065, -0.47 + Math.floor(i / 2) * 0.13], s.material(['#c98a4a', '#5a3320', '#f6c1d8'][i % 3]))).rotation.x = Math.PI / 2;
    }

    // Rust blooms along the sills as the body ages.
    const blooms = Math.round(mix(-3, 9, wear));
    for (let i = 0; i < blooms; i++) {
      const x = random() < 0.5 ? -1 : 1;
      const patch = C(s.cylinder(1, 1, 0.006, [x * (HW + 0.006), 0.36 + random() * 0.12, mix(-1.2, 1.1, random())], rust, 9));
      patch.rotation.z = Math.PI / 2;
      patch.scale.set(0.03 + random() * 0.05, 1, 0.05 + random() * 0.1);
    }

    // A dead cart settles and lists; a stripped one sits level on its block.
    if (a.state === 'flat') {
      cart.rotation.z = (random() - 0.5) * 0.08;
      cart.rotation.x = (random() - 0.5) * 0.03;
      cart.position.y = -0.015;
    }

    // Ground dressing.
    if (a.state === 'charging') {
      const pts: [number, number, number][] = [[-0.3, 0.5, -1.3], [-0.34, 0.06, -1.5]];
      let x = -0.34, z = -1.5, heading = Math.PI + (random() - 0.5);
      for (let i = 0; i < 9; i++) {
        // Loose loops beside the cart, then a short run off toward a socket that is not there.
        heading += 0.9 + (random() - 0.5) * 0.5;
        x += Math.sin(heading) * 0.3 - 0.06; z += Math.cos(heading) * 0.3 - 0.03;
        pts.push([x, 0.02, z]);
      }
      s.tube(pts, 0.016, s.material('#ea6b1e', { roughness: 0.6 }));
      s.box([0.07, 0.04, 0.1], [x, 0.03, z], s.material('#ea6b1e'));
      C(s.box([0.03, 0.03, 0.01], [-0.18, 0.56, bed ? -1.375 : -1.27], new THREE.MeshStandardMaterial({ color: '#3ad36a', emissive: '#3ad36a', emissiveIntensity: 1.5 })));
    }
    if (dead || wear > 0.6) {
      const blade = new THREE.ConeGeometry(0.05, 1, 5);
      blade.translate(0, 0.5, 0);
      const n = Math.round(mix(6, 30, wear) * (dead ? 1 : 0.4));
      s.scatter(blade, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), Array.from({ length: n }, () => {
        const [wx, wz] = spots[Math.floor(random() * 4)];
        return { at: [wx * (HW + 0.05) + (random() - 0.5) * 0.5, 0, wz + (random() - 0.5) * 0.6] as const, size: mix(0.12, 0.4, random()), color: random() < 0.4 ? '#c9bb74' : '#8fa65a' };
      }));
      const leaf = new THREE.BoxGeometry(0.07, 0.006, 0.045);
      const leaves = Math.round(mix(4, 26, wear));
      const leafMesh = s.scatter(leaf, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), Array.from({ length: leaves }, (_u, i) => (
        i % 3 === 0 && !stripped
          ? { at: [(random() - 0.5) * 0.8, 0.862, -0.42 + (random() - 0.5) * 0.4] as const, size: 0.8 + random() * 0.6, color: random() < 0.5 ? '#d1a04c' : '#a9783c' }
          : { at: [(random() - 0.5) * 1.7, 0.004, (random() - 0.5) * 2.8] as const, size: 0.8 + random() * 0.8, color: random() < 0.5 ? '#d1a04c' : '#a9783c' }
      )));
      leafMesh.castShadow = false;
    }
    if (stripped) {
      // The missing wheel was not taken far.
      if (random() < 0.6) { const lost = s.mesh(tyreGeo, rubber, [-HW - 0.7 - random() * 0.4, 0.1, -0.3 + random()]); lost.rotation.z = Math.PI / 2; lost.rotation.y = random(); }
      s.rod([0.2, 0.01, 1.5], [0.6, 0.01, 1.62], 0.012, steel);
    }

    const speed = mix(1.5, 7, mood.energy);
    return s.finish({
      update: on && !stripped
        ? (dt, time) => {
            spinner.rotation.y += dt * speed;
            amber.emissiveIntensity = 1.5 + Math.sin(time * speed * 2) * 0.9;
          }
        : undefined,
    });
  },
});
