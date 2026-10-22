import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const STYLES = {
  carved: { wood: '#4a2717', panel: '#643725', top: '#2c150c', pad: '#6a1826', trim: '#c2a04e' },
  pew: { wood: '#a57a4c', panel: '#bb925f', top: '#70532f', pad: '#7b6a45', trim: '#8f9396' },
  swivel: { wood: '#d6bd93', panel: '#e3cfa8', top: '#34373a', pad: '#2f4f7a', trim: '#b8c0c4' },
  mismatched: { wood: '#77563a', panel: '#8c6a47', top: '#5a3f27', pad: '#6d4024', trim: '#3d3a37' },
} as const;

export default defineThing({
  questions: {
    style: choice('What kind of jury box is it?', {
      carved: 'Dark carved timber with high-backed, leather-padded seats: an old assize court.',
      pew: 'Plain honey-oak benches like church pews, a county courthouse.',
      swivel: 'Pale wood and blue upholstered swivel chairs bolted to the floor, a modern court.',
      mismatched: 'A rough plank pen with a dozen mismatched chairs dragged in from elsewhere.',
    }),
    size: choice('How many jurors does it hold?', {
      six: 'Six in a single row, an inquest or small-claims jury.',
      twelve: 'Twelve, in two tiers of six.',
      fourteen: 'Twelve plus two alternates sitting slightly apart at the end.',
    }),
    occupants: choice('Who is in the seats?', {
      empty: 'Nobody. Every seat is bare.',
      notepads: 'Nobody, but notepads and pens are left on the seats: they are deliberating.',
      coats: 'Nobody, but coats and bags are left behind as if for a short recess.',
      full: 'Every seat is filled by an anonymous seated figure.',
      holdout: 'Every seat but one is filled; a single gap in the rows.',
      one: 'A single juror sits alone among empty seats.',
    }),
    odd: choice('Is one seat conspicuously different from the rest?', {
      none: 'No, they are all alike.',
      colour: 'One seat is upholstered in a startling different colour.',
      broken: 'One seat is broken, its back snapped and tilted.',
      draped: 'One seat is draped in black cloth.',
      flowers: 'A bunch of flowers has been laid on one seat.',
      small: "One seat is far too small, a child's chair.",
    }),
    rail: choice('What is the rail in front like?', {
      panels: 'A solid rail of raised wooden panels.',
      balusters: 'An open rail of turned balusters.',
      brass: 'A polished brass bar on short posts, with a curtain below.',
    }),
    ledge: choice('What sits on the rail?', {
      nothing: 'Nothing.',
      verdict: 'A single folded slip of paper: the verdict.',
      binders: 'Fat ring binders of evidence, one per juror.',
      water: 'A water jug and a stack of paper cups.',
      headphones: 'Translation headsets hung over the rail.',
    }),
    backing: choice('What stands behind the back row?', {
      low: 'Just a low panelled back.',
      high: 'A tall panelled wall with a cornice.',
      clock: 'A tall panelled wall with a clock on it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const st = STYLES[a.style];
    const wood = s.material(st.wood, { roughness: 0.5 });
    const panel = s.material(st.panel, { roughness: 0.55 });
    const top = s.material(st.top, { roughness: 0.4 });
    const pad = s.material(st.pad, { roughness: 0.7 });
    const trim = s.material(st.trim, { metalness: 0.75, roughness: 0.3 });
    const black = s.material('#17181b', { roughness: 0.85 });
    const white = s.material('#f1eee4');

    const perRow = 6, pitch = 0.68;
    const tiers = a.size === 'six' ? 1 : 2;
    const extra = a.size === 'fourteen' ? 2 : 0;
    const rowW = perRow * pitch;
    const W = rowW + 0.3 + (extra ? pitch + 0.45 : 0);
    const offX = extra ? -(pitch + 0.45) / 2 : 0;
    const tierD = 0.95, tierH = 0.34, base = 0.16;
    const Dp = tiers * tierD + 0.55;
    const zFront = Dp / 2;
    const seatZ = (t: number) => zFront - 0.75 - t * tierD;
    const floorY = (t: number) => base + t * tierH;

    // Platform tiers.
    s.box([W, base, Dp], [0, base / 2, 0], wood);
    for (let t = 1; t < tiers; t++) s.box([W, tierH, tierD + 0.05], [0, base + tierH / 2, seatZ(t) - 0.12], wood);

    // Front rail and side returns.
    const RH = 0.92;
    const railRun = (len: number, at: [number, number, number], rot: number, y0: number) => {
      const g = new THREE.Group();
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, p: [number, number, number]) => {
        const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...p); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh;
      };
      const h = RH + base - y0;
      if (a.rail === 'brass') {
        const bar = add(new THREE.CylinderGeometry(0.028, 0.028, len, 10), trim, [0, h, 0]); bar.rotation.z = Math.PI / 2;
        const posts = Math.max(2, Math.round(len / 0.9) + 1);
        for (let i = 0; i < posts; i++) { const x = (i / (posts - 1) - 0.5) * (len - 0.06); add(new THREE.CylinderGeometry(0.022, 0.03, h, 8), trim, [x, h / 2, 0]); add(new THREE.SphereGeometry(0.045, 10, 8), trim, [x, h + 0.03, 0]); }
        add(new THREE.BoxGeometry(len - 0.08, h - 0.2, 0.025), s.material(mood.cheer > 0.5 ? '#7a2230' : '#3c4a44', { roughness: 0.95 }), [0, h / 2 - 0.02, 0]);
      } else {
        add(new THREE.BoxGeometry(len, 0.07, 0.2), top, [0, h, 0]);
        add(new THREE.BoxGeometry(len, 0.14, 0.1), wood, [0, 0.07, 0]);
        if (a.rail === 'balusters') {
          const count = Math.round(len / 0.16);
          for (let i = 0; i < count; i++) {
            if (mood.wear > 0.75 && random() < 0.1) continue;
            add(new THREE.LatheGeometry([[0.022, 0], [0.042, 0.15], [0.02, 0.35], [0.046, 0.6], [0.02, 0.85], [0.03, 1]].map(([r, y]) => new THREE.Vector2(r, y * (h - 0.16))), 8), panel, [(i - (count - 1) / 2) * (len - 0.12) / Math.max(count - 1, 1), 0.13, 0]);
          }
        } else {
          add(new THREE.BoxGeometry(len, h - 0.12, 0.06), wood, [0, h / 2 + 0.04, 0]);
          const cols = Math.max(1, Math.round(len / 0.7));
          for (let i = 0; i < cols; i++) {
            const x = (i - (cols - 1) / 2) * (len - 0.1) / cols;
            add(new THREE.BoxGeometry((len - 0.1) / cols - 0.1, h - 0.36, 0.1), panel, [x, h / 2 + 0.03, 0]);
            if (a.style !== 'mismatched') add(new THREE.BoxGeometry((len - 0.1) / cols - 0.24, h - 0.5, 0.13), wood, [x, h / 2 + 0.03, 0]);
          }
        }
      }
      g.position.set(...at); g.rotation.y = rot; s.root.add(g);
    };
    railRun(W, [0, 0, zFront - 0.06], 0, 0);
    for (const x of [-1, 1]) {
      railRun(tierD - 0.15, [x * (W / 2 - 0.06), 0, zFront - 0.06 - (tierD - 0.15) / 2 - 0.05], Math.PI / 2, 0);
      for (let t = 1; t < tiers; t++) railRun(tierD + 0.1, [x * (W / 2 - 0.06), tierH, seatZ(t) - 0.12], Math.PI / 2, 0);
      s.box([0.14, RH + base + 0.1, 0.14], [x * (W / 2 - 0.06), (RH + base + 0.1) / 2, zFront - 0.06], wood);
      if (a.style === 'carved') s.ball([0.09, 0.09, 0.09], [x * (W / 2 - 0.06), RH + base + 0.18, zFront - 0.06], trim, 12);
    }

    // Back wall.
    const backZ = -Dp / 2 + 0.04, backBase = floorY(tiers - 1);
    const backH = a.backing === 'low' ? 1.25 : 2.3;
    s.box([W, backH, 0.08], [0, backBase + backH / 2, backZ], wood);
    const bcols = Math.round(W / 0.75);
    for (let i = 0; i < bcols; i++) for (let r = 0; r < (a.backing === 'low' ? 1 : 2); r++)
      s.box([(W - 0.1) / bcols - 0.1, r ? backH - 1.45 : 1.0, 0.03], [(i - (bcols - 1) / 2) * (W - 0.1) / bcols, backBase + (r ? 1.25 + (backH - 1.25) / 2 : 0.62), backZ + 0.045], panel);
    if (a.backing !== 'low') s.box([W + 0.16, 0.12, 0.2], [0, backBase + backH + 0.06, backZ + 0.03], top);
    else s.box([W + 0.06, 0.06, 0.14], [0, backBase + backH + 0.03, backZ], top);
    let hand: THREE.Mesh | null = null;
    if (a.backing === 'clock') {
      const cy = backBase + backH - 0.55;
      s.cylinder(0.3, 0.3, 0.06, [0, cy, backZ + 0.08], top, 32).rotation.x = Math.PI / 2;
      s.cylinder(0.25, 0.25, 0.065, [0, cy, backZ + 0.085], white, 32).rotation.x = Math.PI / 2;
      for (let i = 0; i < 12; i++) s.box([0.015, 0.045, 0.01], [Math.sin(i * Math.PI / 6) * 0.21, cy + Math.cos(i * Math.PI / 6) * 0.21, backZ + 0.12], black).rotation.z = -i * Math.PI / 6;
      const hour = s.box([0.022, 0.13, 0.01], [0, cy, backZ + 0.125], black); hour.geometry.translate(0, 0.055, 0); hour.rotation.z = -random() * 6.28;
      hand = s.box([0.014, 0.2, 0.01], [0, cy, backZ + 0.13], black); hand.geometry.translate(0, 0.09, 0); hand.rotation.z = -random() * 6.28;
    }

    // Seats.
    type Seat = { x: number; y: number; z: number };
    const seats: Seat[] = [];
    for (let t = 0; t < tiers; t++) for (let i = 0; i < perRow; i++) seats.push({ x: offX + (i - (perRow - 1) / 2) * pitch, y: floorY(t), z: seatZ(t) });
    for (let e = 0; e < extra; e++) seats.push({ x: offX + rowW / 2 + 0.45 + pitch / 2 - 0.02, y: floorY(e), z: seatZ(e) });
    const total = seats.length;
    const oddIndex = a.odd === 'none' ? -1 : Math.floor(random() * total);
    const gapIndex = oddIndex >= 0 ? oddIndex : Math.floor(random() * total);
    const loneIndex = Math.floor(random() * total);
    const mis = ['#6d4024', '#3d4d5c', '#7a2230', '#5a6b3a', '#8c6a47', '#2b2e33', '#b08a3c'];
    const cloth = mood.cheer > 0.55 ? ['#2f4f7a', '#8d3b3b', '#4c7a5a', '#c9a24a', '#6a4f86', '#b0683c', '#3a3d42'] : ['#2b2e33', '#3a3d42', '#4a4640', '#33403f', '#463a3a', '#5a5852'];
    const skin = ['#d9b596', '#b98a68', '#7a5238', '#e6c8ae', '#9a6b4a'];

    if (a.style === 'pew') for (let t = 0; t < tiers; t++) {
      s.box([rowW, 0.06, 0.46], [offX, floorY(t) + 0.46, seatZ(t)], wood);
      s.box([rowW, 0.62, 0.06], [offX, floorY(t) + 0.74, seatZ(t) - 0.24], wood);
      for (const x of [-1, 1]) s.box([0.07, 0.75, 0.52], [offX + x * rowW / 2, floorY(t) + 0.375, seatZ(t)], panel);
    }
    seats.forEach((seat, index) => {
      const isOdd = index === oddIndex;
      const g = new THREE.Group();
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, p: [number, number, number]) => {
        const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...p); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh;
      };
      const k = isOdd && a.odd === 'small' ? 0.55 : 1;
      const seatPad = isOdd && a.odd === 'colour' ? s.material(mood.cheer > 0.5 ? '#f0c020' : '#d81e2c', { emissive: mood.cheer > 0.5 ? '#f0c020' : '#d81e2c', emissiveIntensity: 0.25 }) : a.style === 'mismatched' ? s.material(mis[Math.floor(random() * mis.length)]) : pad;
      const frame = a.style === 'swivel' ? black : wood;
      const backH = a.style === 'carved' ? 0.75 : a.style === 'mismatched' ? mix(0.4, 0.75, random()) : 0.55;
      const broken = isOdd && a.odd === 'broken';
      if (a.style === 'pew' && index < tiers * perRow && k === 1) {
        add(new THREE.BoxGeometry(0.56, 0.035, 0.42), seatPad, [0, 0.5, 0]);
        if (index % perRow) add(new THREE.BoxGeometry(0.04, 0.2, 0.42), wood, [-pitch / 2, 0.59, 0]);
        if (broken) { add(new THREE.BoxGeometry(0.56, 0.5, 0.05), panel, [0.05, 0.8, -0.1]).rotation.set(-0.7, 0, 0.25); }
      } else {
        add(new THREE.BoxGeometry(0.5, 0.09, 0.46), seatPad, [0, 0.47, 0]);
        const back = add(new THREE.BoxGeometry(0.5, backH, 0.07), a.style === 'swivel' ? seatPad : frame, [0, 0.52 + backH / 2, -0.24]);
        if (a.style === 'carved') add(new THREE.BoxGeometry(0.38, backH - 0.2, 0.03), seatPad, [0, 0.52 + backH / 2, -0.2]);
        if (broken) { back.rotation.set(-0.9, 0, 0.3); back.position.set(0.06, 0.62, -0.38); }
        if (a.style === 'swivel') { add(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 8), trim, [0, 0.21, 0]); add(new THREE.CylinderGeometry(0.2, 0.22, 0.03, 16), trim, [0, 0.015, 0]); }
        else for (const x of [-1, 1]) for (const z of [-1, 1]) add(new THREE.BoxGeometry(0.05, 0.44, 0.05), frame, [x * 0.21, 0.22, z * 0.19]);
        if (a.style !== 'mismatched' || random() > 0.5) for (const x of [-1, 1]) add(new THREE.BoxGeometry(0.05, 0.05, 0.42), frame, [x * 0.27, 0.68, -0.02]);
      }
      if (isOdd && a.odd === 'draped') { add(new THREE.BoxGeometry(0.62, 0.95, 0.14), black, [0, 0.72, -0.22]); add(new THREE.BoxGeometry(0.6, 0.12, 0.56), black, [0, 0.5, 0.02]); add(new THREE.BoxGeometry(0.58, 0.5, 0.04), black, [0, 0.27, 0.27]); }
      if (isOdd && a.odd === 'flowers') {
        const paperCone = add(new THREE.ConeGeometry(0.09, 0.4, 10), white, [0, 0.58, 0.02]); paperCone.rotation.set(Math.PI / 2 + 0.2, 0, 0.4);
        const hues = mood.cheer > 0.5 ? ['#e8b730', '#e4572e', '#f2f0e6', '#d94f8a'] : ['#f2f0e6', '#e9e2cf', '#b9a4c9'];
        for (let i = 0; i < 9; i++) add(new THREE.SphereGeometry(0.04, 8, 6), s.material(hues[Math.floor(random() * hues.length)]), [-0.09 + (random() - 0.5) * 0.14, 0.6 + random() * 0.07, -0.14 + (random() - 0.5) * 0.12]);
      }

      // Occupants and leavings.
      const seated = !isOdd || a.odd === 'colour' ? (a.occupants === 'full' || (a.occupants === 'holdout' && index !== gapIndex) || (a.occupants === 'one' && index === loneIndex)) : false;
      if (seated) {
        const c = s.material(cloth[Math.floor(random() * cloth.length)], { roughness: 0.9 });
        const lean = (random() - 0.5) * 0.14 * (1 + mood.energy);
        const h = mix(0.5, 0.64, random());
        const torso = add(new THREE.LatheGeometry([[0.19, 0], [0.21, h * 0.5], [0.17, h * 0.9], [0.06, h], [0, h + 0.01]].map(([r, y]) => new THREE.Vector2(r, y)), 12), c, [0, 0.52, -0.06]); torso.rotation.z = lean;
        add(new THREE.BoxGeometry(0.36, 0.14, 0.4), c, [0, 0.58, 0.12]);
        const head = add(new THREE.SphereGeometry(0.105, 14, 10), s.material(skin[Math.floor(random() * skin.length)]), [-lean * 0.7, 0.52 + h + 0.1, -0.05]); head.scale.y = 1.15;
        const hair = add(new THREE.SphereGeometry(0.11, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), s.material(['#2a211c', '#5a4634', '#b9b3a8', '#8a5a33', '#17181b'][Math.floor(random() * 5)]), [-lean * 0.7, 0.52 + h + 0.115, -0.065]); hair.scale.y = 1.1;
      } else if (a.occupants === 'notepads' && !isOdd) {
        const pad2 = add(new THREE.BoxGeometry(0.2, 0.02, 0.28), s.material(random() > 0.3 ? '#f2d94e' : '#f1eee4'), [(random() - 0.5) * 0.12, 0.53, (random() - 0.5) * 0.08]); pad2.rotation.y = (random() - 0.5) * 1.2;
        add(new THREE.BoxGeometry(0.014, 0.014, 0.16), s.material('#22386b'), [pad2.position.x + 0.03, 0.548, pad2.position.z]).rotation.y = random() * 3;
      } else if (a.occupants === 'coats' && !isOdd && random() < 0.75) {
        const c = s.material(cloth[Math.floor(random() * cloth.length)], { roughness: 0.95 });
        add(new THREE.BoxGeometry(0.54, 0.5, 0.13), c, [(random() - 0.5) * 0.06, 0.9, -0.24]).rotation.z = (random() - 0.5) * 0.25;
        if (random() < 0.5) add(new THREE.BoxGeometry(0.3, 0.24, 0.16), s.material(mis[Math.floor(random() * mis.length)]), [(random() - 0.5) * 0.1, 0.64, 0.05]);
      }
      g.scale.setScalar(k);
      g.position.set(seat.x + (a.style === 'mismatched' ? (random() - 0.5) * 0.12 : 0), seat.y, seat.z);
      g.rotation.y = a.style === 'swivel' ? (random() - 0.5) * mix(0.1, 1.2, mood.energy) : a.style === 'mismatched' ? (random() - 0.5) * 0.4 : 0;
      s.root.add(g);
    });

    // What sits on the rail.
    const ry = RH + base + 0.035, rz = zFront - 0.06;
    if (a.ledge === 'verdict') {
      const v = s.box([0.24, 0.012, 0.16], [offX + (random() - 0.5) * 2, ry + 0.006, rz], white); v.rotation.y = 0.2;
      s.box([0.24, 0.012, 0.16], [v.position.x, ry + 0.03, rz - 0.03], white).rotation.set(0.5, 0.2, 0);
    } else if (a.ledge === 'binders') {
      const hues = ['#22386b', '#8d1f2a', '#1f5a3c', '#17181b', '#d9d2bc'];
      for (let i = 0; i < perRow; i++) if (random() < 0.85) { const b = s.box([0.3, 0.07 + random() * 0.05, 0.19], [offX + (i - (perRow - 1) / 2) * pitch + (random() - 0.5) * 0.1, ry + 0.045, rz], s.material(hues[Math.floor(random() * hues.length)])); b.rotation.y = (random() - 0.5) * 0.3; }
    } else if (a.ledge === 'water') {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#dff1f5', transparent: true, opacity: 0.4, roughness: 0.05, depthWrite: false });
      const x = offX - rowW / 2 + 0.5;
      s.lathe([[0, 0], [0.08, 0.01], [0.09, 0.2], [0.06, 0.26], [0.07, 0.3]], glass, [x, ry, rz]);
      s.cylinder(0.08, 0.075, 0.16, [x, ry + 0.09, rz], s.material('#86c0d4', { transparent: true, opacity: 0.8 }), 14);
      for (let i = 0; i < 7; i++) s.cylinder(0.04, 0.03, 0.08, [x + 0.25, ry + 0.04 + i * 0.016, rz], white, 12);
    } else if (a.ledge === 'headphones') {
      for (let i = 0; i < perRow; i++) {
        const x = offX + (i - (perRow - 1) / 2) * pitch;
        const band = s.ring(0.085, 0.012, [x, ry + 0.0, rz], black, Math.PI); band.rotation.y = Math.PI / 2;
        for (const z of [-1, 1]) s.cylinder(0.04, 0.04, 0.03, [x, ry - 0.06, rz + z * 0.1], black, 12).rotation.x = Math.PI / 2;
      }
    }
    if (mood.wear > 0.6) for (let i = 0; i < 5; i++) { const p = s.box([0.21, 0.004, 0.3], [(random() - 0.5) * W, 0.004, zFront + 0.15 + random() * 0.4], white); p.rotation.y = random() * 3; }

    const minute = hand, tick = mix(0.02, 0.6, mood.energy);
    return s.finish({ update: minute ? (dt) => { minute.rotation.z -= dt * tick; } : undefined });
  },
});
