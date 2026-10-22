import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P = [number, number, number];
type Ctx = CanvasRenderingContext2D;
type Glass = 'highball' | 'beer' | 'sour' | 'shot';

function paint(w: number, h: number, draw: (c: Ctx, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const STAGES = {
  first: { lo: 0.85, hi: 1, eaten: 0, tip: 0, mess: 0, extra: 0 },
  peak: { lo: 0.2, hi: 0.9, eaten: 0.5, tip: 0.04, mess: 0.45, extra: 0.6 },
  wreckage: { lo: 0, hi: 0.3, eaten: 1, tip: 0.3, mess: 1, extra: 1.3 },
  absent: { lo: 0, hi: 0.2, eaten: 0.85, tip: 0, mess: 0.25, extra: 0.3 },
  cleared: { lo: 0, hi: 0, eaten: 1, tip: 0, mess: 0, extra: 0 },
} as const;
const GLASS = {
  highball: { h: 0.16, r: 0.038, tint: '#d9952a', foam: false, ice: true },
  beer: { h: 0.165, r: 0.048, tint: '#e3a11c', foam: true, ice: false },
  sour: { h: 0.145, r: 0.04, tint: '#e9edc4', foam: false, ice: true },
  shot: { h: 0.06, r: 0.025, tint: '#f2f7f7', foam: false, ice: false },
} as const;
const SIGNS = { nomihodai: 'ALL YOU CAN DRINK', timer: '90 MIN', last: 'LAST ORDER', happy: 'HAPPY HOUR' } as const;

export default defineThing({
  questions: {
    stage: choice('How far into the night is it?', {
      first: 'First round: full glasses in a neat row, food untouched, towels still rolled.',
      peak: 'The peak: half-drunk glasses everywhere, food going fast, napkins piling up.',
      wreckage: 'Wreckage: empties, tipped glasses, spills, a plate of bones and shells.',
      absent: 'Winding down, with one untouched full glass set at an empty place for someone absent.',
      cleared: 'Over: the empties stacked on a tray and the table wiped, waiting for the next party.',
    }),
    drinks: choice('What are they drinking?', {
      highball: 'Whisky highballs: tall amber glasses with ice.',
      beer: 'Draught beer in handled mugs with foam heads.',
      sour: 'Pale cloudy lemon sours with a wedge on the rim.',
      soju: 'Green soju bottles and tiny shot glasses.',
      mixed: 'Everyone ordered something different.',
    }),
    snacks: choice('What food is on the table?', {
      izakaya: 'Japanese izakaya: fried chicken with lemon, a bowl of edamame.',
      korean: 'Korean: glazed red and golden fried chicken, white pickled radish cubes.',
      western: 'Western bar food: a basket of fries and a pizza on a board.',
      dry: 'Dry nibbles only: rice crackers, peanuts, dried squid and chocolate sticks.',
    }),
    people: score('How many people is the table set for?', ['One person alone', 'A couple', 'A group of friends', 'A whole office party']),
    top: choice('What is the tabletop?', {
      wood: 'Fake wood-grain laminate.',
      black: 'Gloss black laminate.',
      marble: 'White marble-effect laminate.',
      red: 'Lacquer-red laminate.',
    }),
    pitcher: noul('Is there a pitcher of beer on the table?'),
    call: choice('How do you call for staff?', {
      dome: 'A wireless call button: a puck with a coloured dome.',
      tablet: 'An ordering tablet glowing on a stand.',
      none: 'Nothing on the table: you use the wall phone.',
    }),
    menu: choice('How is the drinks menu displayed?', {
      tent: 'A laminated tent card.',
      flat: 'A big laminated sheet lying flat.',
      stand: 'Upright in an acrylic stand.',
    }),
    sign: choice('What does the menu shout at the top?', SIGNS),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const st = STAGES[a.stage];
    const n = Math.max(1, Math.round(mix(1, 8, a.people)));
    const Wt = n <= 2 ? 0.8 : n <= 4 ? 1.05 : 1.35, Dt = 0.66, T = 0.42;
    const put = (g: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: P = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      g.add(mesh);
      return mesh;
    };

    // The table.
    const topTint = { wood: '#b07a48', black: '#1d1e22', marble: '#ece8e0', red: '#b3221f' }[a.top];
    const topMap = paint(512, 256, (c, w, h) => {
      c.fillStyle = topTint; c.fillRect(0, 0, w, h);
      if (a.top === 'wood') for (let i = 0; i < 70; i++) {
        c.strokeStyle = `rgba(${random() < 0.5 ? '70,40,15' : '220,170,110'},${0.1 + random() * 0.2})`;
        c.lineWidth = 1 + random() * 3;
        const y = random() * h;
        c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(w * 0.3, y + (random() - 0.5) * 14, w * 0.7, y + (random() - 0.5) * 14, w, y + (random() - 0.5) * 8); c.stroke();
      }
      if (a.top === 'marble') for (let i = 0; i < 14; i++) {
        c.strokeStyle = `rgba(110,110,120,${0.12 + random() * 0.2})`; c.lineWidth = 1 + random() * 2;
        c.beginPath(); let x = random() * w, y = 0; c.moveTo(x, y);
        while (y < h) { x += (random() - 0.5) * 60; y += 20 + random() * 30; c.lineTo(x, y); }
        c.stroke();
      }
      const rings = Math.round(mix(0, 14, mood.wear) + st.mess * 4);
      for (let i = 0; i < rings; i++) {
        c.strokeStyle = a.top === 'black' ? 'rgba(200,200,210,0.22)' : 'rgba(60,35,15,0.25)';
        c.lineWidth = 2 + random() * 2;
        c.beginPath(); c.arc(random() * w, random() * h, 12 + random() * 5, random() * 3, 5 + random() * 2); c.stroke();
      }
    });
    s.box([Wt, 0.035, Dt], [0, T - 0.0175, 0], s.material(topTint, { roughness: a.top === 'wood' ? 0.5 : 0.22 }));
    const face = s.mesh(new THREE.PlaneGeometry(Wt - 0.004, Dt - 0.004), new THREE.MeshStandardMaterial({ map: topMap, roughness: a.top === 'wood' ? 0.45 : 0.2 }), [0, T + 0.0006, 0]);
    face.rotation.x = -Math.PI / 2; face.castShadow = false;
    s.box([Wt + 0.006, 0.018, Dt + 0.006], [0, T - 0.03, 0], s.material('#2a2622', { roughness: 0.5 }));
    const legTint = s.material(a.top === 'wood' ? '#5a3a22' : '#26262a', { roughness: 0.6 });
    for (const x of [-1, 1]) s.box([0.05, T - 0.04, Dt * 0.72], [x * (Wt / 2 - 0.12), (T - 0.04) / 2, 0], legTint);
    s.box([Wt - 0.28, 0.03, 0.06], [0, 0.12, 0], legTint);

    const clear = new THREE.MeshStandardMaterial({ color: '#b4ccd6', transparent: true, opacity: 0.45, roughness: 0.06, side: THREE.DoubleSide });
    const white = s.material('#f3f1ea', { roughness: 0.35 });
    const taken: { x: number; z: number; r: number }[] = [];
    const claim = (x: number, z: number, r: number) => taken.push({ x, z, r });
    const free = (r: number, zone = 0.9): [number, number] | null => {
      for (let i = 0; i < 24; i++) {
        const x = (random() - 0.5) * (Wt - 0.1 - r * 2), z = (random() - 0.5) * (Dt - 0.08 - r * 2) * zone;
        if (taken.every((t) => Math.hypot(t.x - x, t.z - z) > t.r + r + 0.006)) { claim(x, z, r); return [x, z]; }
      }
      return null;
    };

    const glassGeo = (type: Glass) => {
      const { h, r } = GLASS[type];
      return new THREE.LatheGeometry([[0, 0.002], [r * 0.82, 0.002], [r * 0.84, 0.012], [r, h]].map(([x, y]) => new THREE.Vector2(x, y)), 18);
    };
    const geos = { highball: glassGeo('highball'), beer: glassGeo('beer'), sour: glassGeo('sour'), shot: glassGeo('shot') };
    const liquidMat = (tint: string) => new THREE.MeshStandardMaterial({ color: tint, transparent: true, opacity: 0.9, roughness: 0.15, emissive: tint, emissiveIntensity: 0.12 });
    const drink = (type: Glass, fill: number, x: number, z: number, tipped = false, y = T) => {
      const { h, r, tint, foam, ice } = GLASS[type];
      const g = new THREE.Group();
      put(g, geos[type], clear);
      if (type === 'beer') put(g, new THREE.TorusGeometry(0.03, 0.007, 6, 14, Math.PI), clear, [r * 0.95, h * 0.5, 0]).rotation.z = -Math.PI / 2;
      const level = tipped ? 0 : fill * h * 0.86;
      if (level > 0.006) {
        put(g, new THREE.CylinderGeometry(r * mix(0.84, 0.95, fill), r * 0.8, level, 16), liquidMat(tint), [0, 0.012 + level / 2, 0]);
        if (foam && fill > 0.3) put(g, new THREE.CylinderGeometry(r * 0.96, r * 0.93, 0.02, 16), white, [0, 0.012 + level + 0.01, 0]);
      } else if (foam && !tipped) put(g, new THREE.CylinderGeometry(r * 0.8, r * 0.8, 0.004, 14), white, [0, 0.014, 0]);
      if (ice && !tipped) for (let i = 0; i < 2; i++)
        put(g, new THREE.BoxGeometry(0.022, 0.022, 0.022), new THREE.MeshStandardMaterial({ color: '#f4fbff', transparent: true, opacity: 0.75, roughness: 0.1 }), [(i - 0.5) * 0.02, 0.012 + Math.max(level, 0.012) - 0.004 + i * 0.006, (random() - 0.5) * 0.02]).rotation.set(random(), random(), random());
      if (type === 'sour' && !tipped) {
        const wedge = put(g, new THREE.CylinderGeometry(0.02, 0.02, 0.008, 10, 1, false, 0, Math.PI), s.material('#f5d93a', { roughness: 0.5 }), [r * 0.9, h, 0]);
        wedge.rotation.set(Math.PI / 2, 0, random() * 0.5);
      }
      const outer = new THREE.Group();
      outer.position.set(x, y, z);
      outer.rotation.y = random() * Math.PI * 2;
      if (tipped) {
        g.rotation.z = Math.PI / 2; g.position.set(h / 2, r, 0);
        const puddle = put(outer, new THREE.CircleGeometry(1, 20), liquidMat(tint), [-h / 2 - 0.05, 0.0015, 0]);
        puddle.rotation.x = -Math.PI / 2; puddle.scale.set(mix(0.05, 0.1, random()), mix(0.04, 0.07, random()), 1); puddle.castShadow = false;
      }
      outer.add(g);
      s.root.add(outer);
    };
    const seatDrink = (): Glass => a.drinks === 'soju' ? 'shot' : a.drinks === 'mixed' ? (['highball', 'beer', 'sour'] as const)[Math.floor(random() * 3)] : a.drinks;

    const dummy = new THREE.Object3D();
    /** A heap of small instanced pieces inside a disc. */
    const pile = (geometry: THREE.BufferGeometry, count: number, at: P, radius: number, tints: readonly string[], size: P, heap: number, tumble = true) => {
      if (count < 1) return;
      const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ roughness: 0.7 }), count);
      for (let i = 0; i < count; i++) {
        const t = random() * Math.PI * 2, d = Math.sqrt(random()) * radius;
        dummy.position.set(at[0] + Math.cos(t) * d, at[1] + size[1] * 0.5 + (1 - d / Math.max(radius, 0.001)) * heap * random(), at[2] + Math.sin(t) * d);
        dummy.rotation.set(tumble ? random() * 6 : (random() - 0.5) * 0.4, random() * 6, tumble ? random() * 6 : (random() - 0.5) * 0.4);
        const k = mix(0.8, 1.2, random());
        dummy.scale.set(size[0] * k, size[1] * k, size[2] * k);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, new THREE.Color(tints[Math.floor(random() * tints.length)]));
      }
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    };
    const plate = (x: number, z: number, r: number, tint: string, y = T) =>
      s.lathe([[0, 0.004], [r * 0.7, 0.004], [r, 0.014], [r, 0.018], [r * 0.68, 0.009], [0, 0.009]], s.material(tint, { roughness: 0.3, side: THREE.DoubleSide }), [x, y, z]);
    const bowl = (x: number, z: number, r: number, h: number, tint: string) =>
      s.lathe([[0, 0.003], [r * 0.5, 0.003], [r, h], [r * 0.94, h], [r * 0.46, 0.01], [0, 0.01]], s.material(tint, { roughness: 0.35, side: THREE.DoubleSide }), [x, T, z]);
    const lump = new THREE.IcosahedronGeometry(1, 1), unit = new THREE.BoxGeometry(1, 1, 1), pod = new THREE.CapsuleGeometry(0.5, 2.4, 3, 8);
    const FRIED = ['#b8742a', '#c98a36', '#a8641e', '#d09a48'], BONE = ['#e8dcc2', '#d8c8a8', '#c8a888'];

    // Places down the long sides, the middle strip for sharing.
    const k = Wt / 1.35;
    const spots = { a: [-0.45 * k, 0] as const, jug: [-0.17 * k, -0.02] as const, b: [0.08 * k, 0.01] as const, c: [0.33 * k, -0.01] as const };
    const endX = Wt / 2 - 0.1;
    const eaten = st.eaten, left = 1 - eaten;

    if (a.stage !== 'cleared') {
      // Shared food.
      const [ax, az] = spots.a, [bx, bz] = spots.b, [cx, cz] = spots.c;
      if (a.snacks === 'izakaya') {
        plate(ax, az, 0.12, '#2c2e33'); claim(ax, az, 0.12);
        pile(lump, Math.round(9 * left), [ax, T + 0.012, az], 0.07, FRIED, [0.03, 0.022, 0.026], 0.03);
        pile(pod, Math.round(10 * eaten), [ax + 0.02, T + 0.012, az], 0.07, BONE, [0.008, 0.012, 0.008], 0.012);
        if (left > 0.2) s.mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.014, 10, 1, false, 0, Math.PI), s.material('#f5d93a'), [ax + 0.07, T + 0.02, az + 0.05]);
        bowl(bx, bz, 0.075, 0.05, '#3a5a8a'); claim(bx, bz, 0.08);
        pile(pod, Math.round(22 * left) + 2, [bx, T + 0.02, bz], 0.045, ['#6fae3a', '#86c04a', '#5e9a30'], [0.007, 0.012, 0.01], 0.03);
        if (n > 2) {
          bowl(cx, cz, 0.065, 0.045, '#e8e4da'); claim(cx, cz, 0.07);
          pile(pod, Math.round(26 * eaten), [cx, T + 0.02, cz], 0.04, ['#b9c98a', '#a8b878', '#c8d49a'], [0.006, 0.01, 0.009], 0.025);
        }
      } else if (a.snacks === 'korean') {
        bowl(ax, az, 0.13, 0.045, '#c9ccd0'); claim(ax, az, 0.135);
        pile(lump, Math.round(12 * left), [ax, T + 0.02, az], 0.085, ['#b02a14', '#c43a18', '#c98a36', '#d09a48', '#9a2010'], [0.034, 0.026, 0.028], 0.04);
        pile(pod, Math.round(6 * eaten), [ax, T + 0.02, az], 0.08, BONE, [0.008, 0.012, 0.008], 0.01);
        bowl(bx, bz, 0.055, 0.03, '#f3f1ea'); claim(bx, bz, 0.06);
        pile(unit, Math.round(14 * mix(1, 0.3, eaten)), [bx, T + 0.012, bz], 0.035, ['#fbfbf4', '#f2f2e6'], [0.014, 0.014, 0.014], 0.016);
        if (n > 2) {
          bowl(cx, cz, 0.075, 0.05, '#8a8e94'); claim(cx, cz, 0.08);
          pile(pod, Math.round(18 * eaten) + 1, [cx, T + 0.02, cz], 0.045, BONE, [0.008, 0.013, 0.008], 0.03);
        }
      } else if (a.snacks === 'western') {
        s.cylinder(0.14, 0.14, 0.012, [ax, T + 0.006, az], s.material('#a8763e'), 24); claim(ax, az, 0.145);
        const slices = Math.round(8 * left);
        for (let i = 0; i < slices; i++) {
          s.mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.012, 5, 1, false, (i * Math.PI) / 4 + 0.04, Math.PI / 4 - 0.08), s.material(i % 2 ? '#e9b53c' : '#e2a630', { roughness: 0.6 }), [ax, T + 0.018, az]);
          const t = (i + 0.5) * (Math.PI / 4);
          s.cylinder(0.016, 0.016, 0.004, [ax + Math.sin(t) * 0.075, T + 0.026, az + Math.cos(t) * 0.075], s.material('#b3261c'), 10);
        }
        pile(lump, Math.round(8 * eaten), [ax, T + 0.012, az], 0.1, ['#d8b070', '#c89858'], [0.012, 0.006, 0.02], 0.004);
        s.cylinder(0.075, 0.055, 0.06, [bx, T + 0.03, bz], s.material('#d8262c', { roughness: 0.5 }), 14); claim(bx, bz, 0.085);
        pile(unit, Math.round(34 * left) + 3, [bx, T + 0.05, bz], 0.05, ['#f0c84a', '#e8b83a', '#f4d468'], [0.008, 0.008, 0.07], 0.04);
        bowl(cx, cz, 0.035, 0.022, '#f3f1ea'); claim(cx, cz, 0.04);
        s.cylinder(0.026, 0.02, 0.012, [cx, T + 0.014, cz], s.material('#c81e14', { roughness: 0.3 }), 12);
      } else {
        plate(ax, az, 0.11, '#3a2a22'); claim(ax, az, 0.115);
        pile(pod, Math.round(40 * mix(1, 0.2, eaten)), [ax - 0.02, T + 0.012, az], 0.06, ['#e07a1e', '#d8621a', '#e8943a'], [0.005, 0.006, 0.005], 0.015);
        pile(lump, Math.round(18 * mix(1, 0.2, eaten)), [ax + 0.03, T + 0.012, az + 0.02], 0.05, ['#d8b070', '#c89858'], [0.007, 0.006, 0.009], 0.012);
        plate(bx, bz, 0.085, '#f3f1ea'); claim(bx, bz, 0.09);
        pile(unit, Math.round(16 * mix(1, 0.25, eaten)), [bx, T + 0.012, bz], 0.05, ['#e8d8b0', '#d8c494', '#f0e4c4'], [0.008, 0.003, 0.08], 0.012, false);
        put(s.root, geos.highball, clear, [cx, T, cz]); claim(cx, cz, 0.04);
        pile(new THREE.CylinderGeometry(0.5, 0.5, 1, 6), Math.round(12 * mix(1, 0.15, eaten)), [cx, T + 0.08, cz], 0.016, ['#4a2a16', '#5a3420'], [0.005, 0.15, 0.005], 0, false);
      }

      // Pitcher.
      if (a.pitcher) {
        const [px, pz] = spots.jug, level = mix(0.9, 0.08, eaten) * 0.2;
        claim(px, pz, 0.085);
        s.lathe([[0, 0.003], [0.062, 0.003], [0.065, 0.02], [0.075, 0.23]], clear, [px, T, pz]);
        s.cylinder(mix(0.064, 0.073, level / 0.2), 0.062, level, [px, T + 0.012 + level / 2, pz], liquidMat('#e3a11c'), 18);
        s.cylinder(0.073, 0.07, 0.016, [px, T + 0.014 + level + 0.006, pz], white, 18);
        const handle = s.ring(0.06, 0.009, [px + 0.075, T + 0.125, pz], clear, Math.PI);
        handle.rotation.z = -Math.PI / 2;
      }

      // Menu and call button at the end of the table.
      claim(endX, -0.12, 0.09); claim(endX, 0.14, 0.06);

      // Each person's place.
      const absentSeat = a.stage === 'absent' ? (n > 1 ? 1 : 0) : -1;
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? -1 : 1, per = side > 0 ? Math.ceil(n / 2) : Math.floor(n / 2), index = Math.floor(i / 2);
        const span = Wt - 0.42;
        const x = (per === 1 ? 0 : mix(-span / 2, span / 2, index / (per - 1))) - 0.05 + (random() - 0.5) * 0.03;
        const z = side * (Dt / 2 - 0.1);
        const gone = i === absentSeat;
        const type = seatDrink();
        const fill = gone ? 1 : mix(st.lo, st.hi, random());
        const tipped = !gone && random() < st.tip;
        const gx = x + 0.075, gz = z - side * 0.02 + (random() - 0.5) * 0.03;
        claim(gx, gz, tipped ? 0.12 : 0.05); claim(x - 0.04, z, 0.07);
        if (gone || a.stage === 'first') s.cylinder(0.045, 0.045, 0.004, [gx, T + 0.002, gz], s.material(gone ? '#f3f1ea' : '#c8a878', { roughness: 0.9 }), 16);
        drink(type, fill, gx, gz, tipped, T + (gone || a.stage === 'first' ? 0.004 : 0));
        plate(x - 0.04, z, 0.055, '#f3f1ea');
        const sticks = s.material('#3a2a20', { roughness: 0.5 });
        if (gone || a.stage === 'first') {
          s.box([0.2, 0.006, 0.026], [x - 0.04, T + 0.003, z + side * 0.075], white);
          const roll = s.cylinder(0.018, 0.018, 0.11, [x - 0.04, T + 0.018, z - side * 0.085], white, 10);
          roll.rotation.z = Math.PI / 2;
        } else {
          for (const o of [-0.006, 0.006]) {
            const stick = s.box([0.21, 0.005, 0.005], [x - 0.04 + (random() - 0.5) * 0.03, T + 0.02, z + o + (random() - 0.5) * 0.02], sticks);
            stick.rotation.y = (random() - 0.5) * 0.7;
          }
          pile(lump, Math.round(mix(1, 5, random()) * eaten), [x - 0.04, T + 0.01, z], 0.03, a.snacks === 'izakaya' ? ['#b9c98a', ...BONE] : a.snacks === 'korean' ? BONE : ['#d8b070', '#c89858'], [0.012, 0.006, 0.008], 0.006);
        }
      }

      // Bottles for soju tables, then loose empties, napkins and the bill.
      const crowd = mix(0.6, 1.4, mood.density);
      if (a.drinks === 'soju') {
        const bottles = Math.max(1, Math.round(n * mix(0.4, 1.4, st.mess) * crowd));
        const profile = [[0, 0], [0.03, 0], [0.032, 0.01], [0.032, 0.12], [0.014, 0.165], [0.013, 0.205], [0.015, 0.21], [0, 0.21]].map(([x, y]) => new THREE.Vector2(x, y));
        const green = new THREE.MeshStandardMaterial({ color: '#3f9a4e', transparent: true, opacity: 0.85, roughness: 0.1, emissive: '#1f6a2e', emissiveIntensity: 0.25 });
        for (let i = 0; i < bottles; i++) {
          const lying = random() < st.tip * 1.4;
          const at = free(lying ? 0.11 : 0.036);
          if (!at) break;
          const g = new THREE.Group();
          put(g, new THREE.LatheGeometry(profile, 14), green);
          put(g, new THREE.CylinderGeometry(0.0325, 0.0325, 0.05, 14, 1, true), white, [0, 0.075, 0]);
          g.position.set(at[0], T, at[1]);
          if (lying) { g.rotation.set(0, random() * 6, Math.PI / 2); g.rotation.order = 'YXZ'; g.position.y = T + 0.032; }
          s.root.add(g);
        }
      } else {
        const extras = Math.round(n * st.extra * crowd);
        for (let i = 0; i < extras; i++) {
          const tipped = random() < st.tip;
          const at = free(tipped ? 0.1 : 0.045);
          if (!at) break;
          drink(seatDrink(), random() < 0.7 ? 0 : random() * 0.3, at[0], at[1], tipped);
        }
      }
      const napkins = Math.round(n * st.mess * 1.2 * crowd);
      for (let i = 0; i < napkins; i++) {
        const at = free(0.03);
        if (!at) break;
        const wad = s.mesh(new THREE.IcosahedronGeometry(0.024, 0), s.material('#f6f4ee', { roughness: 0.95, flatShading: true }), [at[0], T + 0.016, at[1]]);
        wad.rotation.set(random() * 6, random() * 6, random() * 6); wad.scale.y = 0.7;
      }
      if (a.stage !== 'first') {
        const at = free(0.03);
        if (at) {
          s.cylinder(0.022, 0.022, 0.07, [at[0], T + 0.035, at[1]], clear, 12);
          const bill = s.cylinder(0.014, 0.014, 0.1, [at[0], T + 0.055, at[1]], white, 8);
          bill.rotation.z = 0.15;
        }
      }
    } else {
      // Bussed: everything stacked on a tray, a cloth left on the wiped top.
      const tx = -Wt * 0.14, tz = 0.02;
      s.box([0.44, 0.012, 0.32], [tx, T + 0.006, tz], s.material('#5a3a26', { roughness: 0.5 }));
      for (const z of [-1, 1]) s.box([0.44, 0.02, 0.01], [tx, T + 0.016, tz + z * 0.16], s.material('#4a2e1e'));
      const type: Glass = a.drinks === 'beer' ? 'beer' : a.drinks === 'sour' ? 'sour' : 'highball';
      const stacks = Math.min(6, Math.ceil(n / 2) + 1);
      for (let i = 0; i < stacks; i++) {
        const x = tx - 0.15 + (i % 3) * 0.085, z = tz - 0.07 + Math.floor(i / 3) * 0.12;
        const high = type === 'beer' ? 1 : 1 + Math.floor(random() * 3);
        for (let j = 0; j < high; j++) drink(type, j === high - 1 && random() < 0.5 ? 0.1 : 0, x, z, false, T + 0.012 + j * GLASS[type].h * 0.38);
      }
      for (let i = 0; i < Math.min(n, 6); i++) plate(tx + 0.13 + (random() - 0.5) * 0.008, tz + 0.03 + (random() - 0.5) * 0.008, 0.06, '#f3f1ea', T + 0.012 + i * 0.012);
      pile(pod, 10, [tx + 0.13, T + 0.02 + Math.min(n, 6) * 0.012, tz + 0.03], 0.035, a.snacks === 'izakaya' ? ['#b9c98a', '#a8b878'] : BONE, [0.007, 0.011, 0.008], 0.01);
      const cloth = s.box([0.16, 0.014, 0.11], [Wt * 0.22, T + 0.008, 0.16], s.material(mood.warmth > 0.5 ? '#f0b8c0' : '#9ac8e0', { roughness: 0.95 }));
      cloth.rotation.y = 0.4 + random() * 0.4;
    }

    // Menu.
    const menuMap = paint(256, 384, (c, w, h) => {
      c.fillStyle = '#fff8e2'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#d8201c'; c.fillRect(0, 0, w, 84);
      c.fillStyle = '#ffe23a'; c.font = 'bold 40px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const words = SIGNS[a.sign].split(' ');
      const lines = words.length > 2 ? [words.slice(0, 2).join(' '), words.slice(2).join(' ')] : [words.join(' ')];
      lines.forEach((line, i) => c.fillText(line, w / 2, lines.length === 1 ? 44 : 26 + i * 36, w - 16));
      const tints = ['#d9952a', '#e3a11c', '#e9edc4', '#3f9a4e', '#e04a7a', '#7a3ac0', '#f08a2a', '#4ab0e0', '#c8262c', '#f0d040'];
      for (let i = 0; i < 10; i++) {
        const x = 20 + (i % 2) * 122, y = 104 + Math.floor(i / 2) * 46;
        c.fillStyle = tints[i]; c.fillRect(x, y, 20, 32);
        c.fillStyle = '#ffffff'; c.fillRect(x, y, 20, 7);
        c.fillStyle = '#3a3030'; c.fillRect(x + 28, y + 6, 60 + random() * 20, 6); c.fillStyle = '#a09088'; c.fillRect(x + 28, y + 20, 40 + random() * 20, 4);
      }
      c.fillStyle = '#ffe23a'; c.beginPath(); c.arc(w - 50, h - 40, 34, 0, 7); c.fill();
      c.fillStyle = '#d8201c'; c.font = 'bold 26px sans-serif'; c.fillText(a.sign === 'timer' ? '¥980' : '¥1500', w - 50, h - 40, 60);
    });
    const menuMat = new THREE.MeshStandardMaterial({ map: menuMap, roughness: 0.22, side: THREE.DoubleSide });
    const mx = a.stage === 'cleared' ? Wt / 2 - 0.12 : endX, mz = -0.12;
    if (a.menu === 'flat') {
      const sheet = s.mesh(new THREE.PlaneGeometry(0.2, 0.3), menuMat, [mx - 0.02, T + 0.004 + st.mess * 0.001, mz + 0.04]);
      sheet.rotation.set(-Math.PI / 2, 0, 1.2 + (random() - 0.5) * mix(0.1, 0.9, st.mess));
    } else if (a.menu === 'tent') {
      for (const side of [-1, 1]) {
        const leaf = s.mesh(new THREE.PlaneGeometry(0.14, 0.21), menuMat, [mx + side * 0.036, T + 0.1, mz]);
        leaf.rotation.set(0, side * Math.PI / 2, 0); leaf.rotateX(-0.35);
      }
    } else {
      const g = new THREE.Group();
      put(g, new THREE.PlaneGeometry(0.15, 0.225), menuMat, [0, 0.135, 0.004]);
      put(g, new THREE.BoxGeometry(0.16, 0.24, 0.005), clear, [0, 0.13, 0]);
      put(g, new THREE.BoxGeometry(0.16, 0.012, 0.07), clear, [0, 0.006, 0]);
      g.position.set(mx, T, mz); g.rotation.y = -0.5 + (random() - 0.5) * 0.3;
      s.root.add(g);
    }
    // Call button or tablet.
    const glows: THREE.MeshStandardMaterial[] = [];
    if (a.call === 'dome') {
      const tint = mood.warmth > 0.5 ? '#ff5a2a' : '#2ad0ff';
      s.cylinder(0.04, 0.045, 0.022, [mx, T + 0.011, 0.14], s.material('#1c1c20', { roughness: 0.4 }), 18);
      const dome = new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: 0.8, roughness: 0.25 });
      glows.push(dome);
      s.ball([0.028, 0.016, 0.028], [mx, T + 0.022, 0.14], dome, 16);
    } else if (a.call === 'tablet') {
      const g = new THREE.Group();
      put(g, new THREE.BoxGeometry(0.2, 0.13, 0.012), s.material('#1c1c20', { roughness: 0.4 }), [0, 0.085, 0]).rotation.x = -0.35;
      const screenMap = paint(128, 80, (c, w, h) => {
        c.fillStyle = '#10182c'; c.fillRect(0, 0, w, h);
        const tints = ['#ff5a8a', '#ffd02a', '#4ad0ff', '#7ae04a', '#ff8a2a', '#b07aff'];
        for (let i = 0; i < 6; i++) { c.fillStyle = tints[i]; c.fillRect(6 + (i % 3) * 40, 8 + Math.floor(i / 3) * 34, 34, 28); }
      });
      const screen = new THREE.MeshStandardMaterial({ map: screenMap, emissiveMap: screenMap, emissive: '#ffffff', emissiveIntensity: 0.8, roughness: 0.2 });
      glows.push(screen);
      const lcd = put(g, new THREE.PlaneGeometry(0.18, 0.112), screen, [0, 0.085, 0.0068]);
      lcd.rotation.x = -0.35; lcd.position.z = 0.0068 * Math.cos(0.35); lcd.position.y = 0.085 + 0.0068 * Math.sin(0.35); lcd.castShadow = false;
      put(g, new THREE.BoxGeometry(0.1, 0.02, 0.09), s.material('#2a2a30'), [0, 0.01, -0.02]);
      g.position.set(mx, T, 0.16); g.rotation.y = -0.4;
      s.root.add(g);
    }

    const base = mix(0.5, 1.3, mood.cheer);
    return s.finish({
      update: (_dt, time) => {
        const blink = base * (1 + Math.sin(time * mix(0.8, 6, mood.energy)) * 0.25);
        for (const m of glows) m.emissiveIntensity = blink;
      },
    });
  },
});
