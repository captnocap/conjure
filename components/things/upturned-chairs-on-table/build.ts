import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type V3 = [number, number, number];

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const SEAT = 0.45;

export default defineThing({
  questions: {
    tables: choice('How many tables?', {
      one: 'A single table.',
      two: 'Two tables pushed together.',
      row: 'A short row of three tables down the room.',
    }),
    chairs: choice('What kind of chairs?', {
      shell: 'Moulded plastic shell chairs on splayed steel legs, school-canteen style.',
      bentwood: 'Bentwood cafe chairs with a hooped back and a round wooden seat.',
      diner: 'Chrome diner chairs with padded vinyl seats and backs.',
    }),
    stacking: choice('How were the chairs put up?', {
      neat: 'Neatly: every chair flipped and squared to its edge.',
      'one-down': 'All but one: a single chair still on the floor, pulled out as if someone just left it.',
      thrown: 'Thrown up any which way, crooked and overlapping, in a hurry to leave.',
      knocked: 'One chair knocked over and lying on the floor beside the table.',
    }),
    left: choice('What has been left on the table?', {
      nothing: 'Nothing: wiped clean.',
      tray: 'A forgotten tray with a cup and a crumpled wrapper.',
      jacket: 'A jacket draped over an upturned chair leg.',
      toy: 'A small bright toy car.',
      cup: 'A half-drunk paper cup with a lid.',
    }),
    floor: choice('What is on the floor around it?', {
      cone: 'A yellow wet-floor cone.',
      mop: 'A mop leaning against the table over a wet patch.',
      both: 'A wet-floor cone and a mop.',
      nothing: 'Nothing, just the floor.',
    }),
    sign: noul('Is there a CLOSED sign propped on the table?'),
    top: choice('What is the tabletop like?', {
      speckle: 'White laminate with a grey speckle.',
      wood: 'Fake wood-grain laminate.',
      red: 'Glossy red formica with a chrome edge.',
      mint: 'Pale mint laminate from a school canteen.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const jitter = (amount: number) => (random() - 0.5) * amount;
    const steel = s.material('#b7bcc0', { metalness: 0.75, roughness: 0.32 });
    const chrome = s.material('#dfe4e8', { metalness: 0.95, roughness: 0.15 });
    const dark = s.material('#2b2b2e', { roughness: 0.6 });
    const wood = s.material(pick(['#7a4a2a', '#5a3620', '#9a6a3c']), { roughness: 0.5 });
    const shellColour = pick(['#e07b2a', '#2f73b8', '#6a9c3a', '#c9c3b5', '#c23b3b', '#3a3a3a']);
    const vinyl = pick(['#c0392b', '#1f8a8a', '#d9c25a', '#3a4a9a']);

    // ---- tabletop texture
    const TOP = 0.76;
    const topArt = paint(256, 256, (ctx) => {
      if (a.top === 'speckle') {
        ctx.fillStyle = '#eceae2';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = 'rgba(80,80,80,0.5)';
        for (let i = 0; i < 1400; i++) ctx.fillRect(random() * 256, random() * 256, 1.5, 1.5);
      } else if (a.top === 'wood') {
        ctx.fillStyle = '#a97d4e';
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = 'rgba(70,40,15,0.45)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 28; i++) {
          ctx.beginPath();
          const y = i * 9 + random() * 6;
          ctx.moveTo(0, y);
          for (let x = 0; x <= 256; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 3);
          ctx.stroke();
        }
      } else if (a.top === 'red') {
        ctx.fillStyle = '#c62f2f';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        for (let i = 0; i < 400; i++) ctx.fillRect(random() * 256, random() * 256, 2, 2);
      } else {
        ctx.fillStyle = '#b9dccb';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = 'rgba(60,110,90,0.25)';
        for (let i = 0; i < 400; i++) ctx.fillRect(random() * 256, random() * 256, 1.5, 1.5);
      }
    });
    const laminate = new THREE.MeshStandardMaterial({ map: topArt, roughness: a.top === 'red' ? 0.3 : 0.6 });
    const round = a.chairs === 'bentwood';
    const TW = round ? 0.8 : a.chairs === 'diner' ? 1.1 : 0.8, TD = 0.8;
    const tableCount = { one: 1, two: 2, row: 3 }[a.tables];
    const gap = a.tables === 'two' ? 0 : 0.5;
    const pitch = TW + gap;
    const tableX = (i: number) => (i - (tableCount - 1) / 2) * pitch;

    // ---- one chair, upright, facing +z with its back at -z, standing on y = 0
    const chair = () => {
      const g = new THREE.Group();
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: V3, rot: V3 = [0, 0, 0]) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...at);
        mesh.rotation.set(...rot);
        mesh.castShadow = mesh.receiveShadow = true;
        g.add(mesh);
        return mesh;
      };
      const leg = (from: V3, to: V3, r: number, material: THREE.Material) => {
        const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to);
        const d = B.clone().sub(A);
        const mesh = add(new THREE.CylinderGeometry(r, r, d.length(), 8), material, A.clone().add(B).multiplyScalar(0.5).toArray() as V3);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      };
      if (a.chairs === 'shell') {
        const shell = s.material(shellColour, { roughness: 0.45 });
        add(new THREE.BoxGeometry(0.42, 0.025, 0.42), shell, [0, SEAT, 0]);
        add(new THREE.BoxGeometry(0.42, 0.34, 0.025), shell, [0, SEAT + 0.19, -0.2], [0.18, 0, 0]);
        add(new THREE.BoxGeometry(0.42, 0.06, 0.08), shell, [0, SEAT + 0.015, -0.19], [0.5, 0, 0]);
        for (const x of [-1, 1]) for (const z of [-1, 1]) leg([x * 0.16, SEAT - 0.01, z * 0.16], [x * 0.21, 0, z * 0.21], 0.011, steel);
        leg([-0.17, 0.12, 0.17], [0.17, 0.12, 0.17], 0.007, steel);
        leg([-0.17, 0.12, -0.17], [0.17, 0.12, -0.17], 0.007, steel);
      } else if (a.chairs === 'bentwood') {
        add(new THREE.CylinderGeometry(0.2, 0.2, 0.028, 24), wood, [0, SEAT, 0]);
        const hoop = add(new THREE.TorusGeometry(0.19, 0.014, 8, 24, Math.PI), wood, [0, SEAT + 0.2, -0.17], [0.15, 0, 0]);
        void hoop;
        add(new THREE.TorusGeometry(0.11, 0.011, 8, 20, Math.PI), wood, [0, SEAT + 0.16, -0.165], [0.15, 0, 0]);
        for (const x of [-1, 1]) leg([x * 0.19, SEAT + 0.2, -0.17], [x * 0.19, SEAT - 0.01, -0.17], 0.014, wood);
        for (const x of [-1, 1]) for (const z of [-1, 1]) leg([x * 0.14, SEAT - 0.01, z * 0.14], [x * 0.17, 0, z * 0.17], 0.016, wood);
        add(new THREE.TorusGeometry(0.15, 0.007, 6, 24), wood, [0, 0.14, 0], [Math.PI / 2, 0, 0]);
      } else {
        const pad = s.material(vinyl, { roughness: 0.35 });
        add(new THREE.BoxGeometry(0.44, 0.07, 0.42), pad, [0, SEAT, 0]);
        add(new THREE.BoxGeometry(0.44, 0.24, 0.07), pad, [0, SEAT + 0.26, -0.2], [0.12, 0, 0]);
        for (const x of [-1, 1]) leg([x * 0.2, SEAT - 0.03, -0.2], [x * 0.2, SEAT + 0.38, -0.23], 0.012, chrome);
        for (const x of [-1, 1]) for (const z of [-1, 1]) leg([x * 0.18, SEAT - 0.03, z * 0.17], [x * 0.2, 0, z * 0.19], 0.012, chrome);
        for (const x of [-1, 1]) leg([x * 0.19, 0.01, 0.19], [x * 0.19, 0.01, -0.19], 0.012, chrome);
        for (const x of [-1, 1]) add(new THREE.CylinderGeometry(0.02, 0.02, 0.012, 10), dark, [x * 0.19, 0.006, 0.19]);
      }
      return g;
    };
    const seatTop = SEAT + (a.chairs === 'diner' ? 0.035 : a.chairs === 'bentwood' ? 0.014 : 0.0125);

    // ---- the tables
    for (let i = 0; i < tableCount; i++) {
      const x = tableX(i);
      if (round) {
        s.mesh(new THREE.CylinderGeometry(TW / 2, TW / 2, 0.035, 32), laminate, [x, TOP - 0.0175, 0]);
        s.cylinder(0.035, 0.035, TOP - 0.1, [x, (TOP - 0.1) / 2 + 0.05, 0], dark, 12);
        s.cylinder(0.28, 0.3, 0.05, [x, 0.025, 0], dark, 24);
      } else {
        s.mesh(new THREE.BoxGeometry(TW, 0.035, TD), laminate, [x, TOP - 0.0175, 0]);
        if (a.chairs === 'diner') {
          s.box([TW + 0.02, 0.04, TD + 0.02], [x, TOP - 0.02, 0], chrome).scale.set(1, 0.9, 1);
          for (const cx of [-1, 1]) for (const z of [-1, 1]) s.rod([x + cx * (TW / 2 - 0.08), TOP - 0.04, z * (TD / 2 - 0.08)], [x + cx * (TW / 2 - 0.12), 0, z * (TD / 2 - 0.12)], 0.016, chrome);
        } else {
          s.box([TW - 0.04, 0.04, TD - 0.04], [x, TOP - 0.055, 0], s.material('#8d8a82'));
          for (const cx of [-1, 1]) for (const z of [-1, 1]) s.box([0.035, TOP - 0.04, 0.035], [x + cx * (TW / 2 - 0.06), (TOP - 0.04) / 2, z * (TD / 2 - 0.06)], steel);
        }
      }
    }

    // ---- the chairs, flipped onto the tables with their backs hanging over the edge
    type Spot = { x: number; z: number; turn: number };
    const spots: Spot[] = [];
    for (let i = 0; i < tableCount; i++) {
      const x = tableX(i);
      const halfW = TW / 2, halfD = TD / 2;
      // Front and back edges always; the sides only where no neighbour table butts against them.
      spots.push({ x: x + (round ? 0 : jitter(0.1)), z: halfD - 0.19, turn: 0 });
      spots.push({ x: x + (round ? 0 : jitter(0.1)), z: -(halfD - 0.19), turn: Math.PI });
      const leftOpen = i === 0 || gap > 0, rightOpen = i === tableCount - 1 || gap > 0;
      if (leftOpen && (round || a.chairs !== 'diner')) spots.push({ x: x - (halfW - 0.19), z: 0, turn: -Math.PI / 2 });
      if (rightOpen && (round || a.chairs !== 'diner')) spots.push({ x: x + (halfW - 0.19), z: 0, turn: Math.PI / 2 });
    }
    const odd = Math.floor(random() * spots.length);
    spots.forEach((spot, index) => {
      const g = chair();
      s.root.add(g);
      if ((a.stacking === 'one-down' || a.stacking === 'knocked') && index === odd) {
        // Still on the floor, pulled out from its edge.
        const out = 0.45 + random() * 0.25;
        const dx = Math.sin(spot.turn), dz = Math.cos(spot.turn);
        g.position.set(spot.x + dx * out * (spot.turn === 0 || spot.turn === Math.PI ? 0 : 1) + (spot.turn === 0 || spot.turn === Math.PI ? jitter(0.3) : 0), 0, spot.z + dz * out);
        g.rotation.y = spot.turn + Math.PI + jitter(0.6);
        if (a.stacking === 'knocked') {
          g.rotation.set(0, spot.turn + Math.PI + jitter(1), Math.PI / 2 + jitter(0.1));
          g.position.y = 0.2;
          g.position.x += 0.2;
          g.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(g);
          g.position.y -= box.min.y;
        }
        return;
      }
      const messy = a.stacking === 'thrown';
      g.rotation.set(Math.PI, spot.turn + (messy ? jitter(0.9) : jitter(0.06)), messy ? jitter(0.25) : 0);
      g.position.set(spot.x + (messy ? jitter(0.16) : 0), TOP + seatTop + (messy ? Math.abs(g.rotation.z) * 0.2 : 0), spot.z + (messy ? jitter(0.12) : 0));
    });

    // ---- what was left behind
    const tableTopY = TOP;
    const leftX = tableX(Math.floor(random() * tableCount)) + jitter(0.2), leftZ = jitter(0.2);
    if (a.left === 'tray') {
      s.box([0.36, 0.012, 0.26], [leftX, tableTopY + 0.006, leftZ], s.material(pick(['#5a1f24', '#2b2b2e', '#4c3a2a']), { roughness: 0.5 }));
      s.cylinder(0.035, 0.028, 0.1, [leftX + 0.1, tableTopY + 0.06, leftZ + 0.04], s.material('#f1ede4', { roughness: 0.7 }), 16);
      const wrapper = s.mesh(new THREE.IcosahedronGeometry(0.03, 1), s.material('#f3eee2', { roughness: 1, flatShading: true }), [leftX - 0.08, tableTopY + 0.03, leftZ - 0.03]);
      wrapper.scale.set(1.3, 0.7, 1);
    } else if (a.left === 'jacket') {
      const cloth = s.material(pick(['#2f3e5c', '#5a3a2a', '#1f1f22', '#8a2a2a', '#3f6a3a']), { roughness: 0.95 });
      const spot = spots[(odd + 1) % spots.length];
      const jx = spot.x + Math.sin(spot.turn) * 0.1, jz = spot.z + Math.cos(spot.turn) * 0.1;
      // A hanging bundle over a leg: a body draped from the leg top, sleeves falling either side.
      const legTop = TOP + seatTop + SEAT - 0.02;
      const body = s.box([0.3, 0.42, 0.14], [jx, legTop - 0.18, jz], cloth);
      body.rotation.set(jitter(0.2), spot.turn, jitter(0.15));
      s.box([0.09, 0.3, 0.09], [jx - 0.17 * Math.cos(spot.turn), legTop - 0.3, jz + 0.17 * Math.sin(spot.turn)], cloth).rotation.z = 0.2;
      s.box([0.09, 0.26, 0.09], [jx + 0.17 * Math.cos(spot.turn), legTop - 0.28, jz - 0.17 * Math.sin(spot.turn)], cloth).rotation.z = -0.25;
      s.box([0.22, 0.08, 0.16], [jx, legTop + 0.02, jz], cloth);
    } else if (a.left === 'toy') {
      const toyPaint = s.material(pick(['#e63946', '#1d7cd6', '#f4c20d', '#2a9d3f']), { roughness: 0.35 });
      const car = new THREE.Group();
      car.position.set(leftX, tableTopY + 0.014, leftZ);
      car.rotation.y = random() * Math.PI;
      s.root.add(car);
      const parts: [V3, V3][] = [[[0.09, 0.025, 0.045], [0, 0.012, 0]], [[0.05, 0.022, 0.04], [-0.005, 0.034, 0]]];
      for (const [size, at] of parts) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(...size), toyPaint);
        m.position.set(...at);
        m.castShadow = true;
        car.add(m);
      }
      for (const x of [-0.03, 0.03]) for (const z of [-1, 1]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.008, 10), dark);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(x, 0.012, z * 0.024);
        car.add(wheel);
      }
    } else if (a.left === 'cup') {
      s.cylinder(0.04, 0.03, 0.12, [leftX, tableTopY + 0.06, leftZ], s.material(pick(['#f1ede4', '#c0392b', '#2f73b8']), { roughness: 0.7 }), 16);
      s.cylinder(0.043, 0.043, 0.008, [leftX, tableTopY + 0.124, leftZ], s.material('#f6f6f3', { roughness: 0.5 }), 16);
      s.rod([leftX + 0.01, tableTopY + 0.12, leftZ], [leftX + 0.03, tableTopY + 0.2, leftZ + 0.01], 0.003, s.material('#d8262c'));
    }
    if (mood.density > 0.55) {
      const sx = tableX(tableCount - 1) + 0.25, sz = 0.25;
      s.box([0.08, 0.1, 0.05], [sx, tableTopY + 0.05, sz], chrome);
      s.cylinder(0.014, 0.014, 0.07, [sx - 0.07, tableTopY + 0.035, sz], s.material('#f4f4f0'), 10);
      s.cylinder(0.014, 0.014, 0.07, [sx - 0.1, tableTopY + 0.035, sz + 0.02], s.material('#2b2b2e'), 10);
    }

    // ---- closing-time signs and the floor
    if (a.sign) {
      const sx = tableX(0) + (round ? 0 : -0.15), sz = round ? 0 : 0.1;
      const card = s.label('CLOSED', 0.22, 0.1, [sx, tableTopY + 0.07, sz + 0.03], '#f4f1e6', '#b02a2a');
      card.rotation.x = -0.35;
      const back = s.label('CLOSED', 0.22, 0.1, [sx, tableTopY + 0.07, sz - 0.03], '#f4f1e6', '#b02a2a');
      back.rotation.set(0.35, Math.PI, 0);
    }
    const edgeX = tableX(0) - TW / 2 - 0.4;
    if (a.floor === 'cone' || a.floor === 'both') {
      const cx = edgeX + jitter(0.2), cz = 0.3 + jitter(0.3);
      const yellow = s.material('#f2c21b', { roughness: 0.6 });
      const cone = new THREE.Group();
      cone.position.set(cx, 0, cz);
      cone.rotation.y = jitter(1);
      s.root.add(cone);
      for (const side of [-1, 1]) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.62, 0.012), yellow);
        panel.position.set(0, 0.3, side * 0.1);
        panel.rotation.x = side * 0.32;
        panel.castShadow = panel.receiveShadow = true;
        cone.add(panel);
        const text = s.label('WET FLOOR', 0.22, 0.09, [0, 0, 0], '#1a1a1a', '#f2c21b');
        s.root.remove(text);
        text.position.set(0, 0.3, side * 0.108);
        text.rotation.set(side * 0.32, side > 0 ? 0 : Math.PI, 0);
        cone.add(text);
      }
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.22), yellow);
      bar.position.set(0, 0.59, 0);
      cone.add(bar);
    }
    if (a.floor === 'mop' || a.floor === 'both') {
      const mx = tableX(0) - TW / 2 + 0.05, mz = TD / 2 + 0.05;
      const top: V3 = [mx - 0.05, TOP + 0.5, mz - 0.1];
      s.rod([mx - 0.45, 0.06, mz + 0.35], top, 0.012, s.material('#c9a35a', { roughness: 0.7 }));
      const head = s.mesh(new THREE.CapsuleGeometry(0.045, 0.14, 4, 10), s.material('#9ea0a3', { roughness: 1 }), [mx - 0.5, 0.05, mz + 0.4]);
      head.rotation.set(Math.PI / 2, 0, 0.8);
      head.scale.set(1.3, 1, 0.6);
      const wet = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshStandardMaterial({ color: '#4a4f58', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.4, depthWrite: false }));
      wet.rotation.x = -Math.PI / 2;
      wet.position.set(mx - 0.4, 0.003, mz + 0.4);
      wet.scale.set(1.4, 1, 0.9);
      s.root.add(wet);
      // The bucket's shadow: a dark round smudge beside the mop.
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), new THREE.MeshStandardMaterial({ color: '#15171a', transparent: true, opacity: mix(0.25, 0.5, mood.wear), depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(mx - 0.8, 0.004, mz + 0.2);
      shadow.scale.set(1.3, 1, 1);
      s.root.add(shadow);
    }
    if (mood.wear > 0.5) for (let i = 0; i < 6; i++) {
      const crumb = s.box([0.03, 0.004, 0.025], [tableX(Math.floor(random() * tableCount)) + jitter(TW * 1.2), 0.002, jitter(TD * 1.3)], s.material(pick(['#d9cfb8', '#f3eee2', '#6b5a48'])));
      crumb.rotation.y = random() * 3;
    }

    return s.finish();
  },
});
