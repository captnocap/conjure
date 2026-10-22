import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const PAINTS = {
  cream: 'Yellowed cream gloss, layer on layer.',
  silver: 'Aluminium radiator paint, dull silver.',
  green: 'The same green gloss as the wall, painted in one go.',
  brown: 'Chocolate brown, the caretaker’s leftover tin.',
  white: 'Fresh bright white, recently redone.',
  iron: 'Bare black iron with rust at the joints.',
  pink: 'A faded salmon pink nobody remembers choosing.',
} as const;
const PAINT: Record<keyof typeof PAINTS, string> = {
  cream: '#ddd2ae', silver: '#aeb2b3', green: '#7d9a78', brown: '#6b4a3a', white: '#f1f0ea', iron: '#3a3837', pink: '#d9a394',
};

export default defineThing({
  questions: {
    pattern: choice('What pattern of radiator is it?', {
      classic: 'The classic: three rounded columns per section, waist high.',
      soviet: 'Chunky two-column sections with wide gaps, squat and heavy, as in every panel block.',
      tall: 'A tall narrow hall radiator, chest high with slender columns.',
      low: 'A low deep one, knee high with four columns, made to sit under a wide window.',
    }),
    length: choice('How long is it?', {
      stub: 'A stub of five sections, for a toilet or a landing.',
      room: 'Nine sections, an ordinary room.',
      long: 'Fourteen sections along a classroom wall.',
      hall: 'Twenty sections, a corridor or a gymnasium.',
    }),
    paint: choice('What is it painted?', PAINTS),
    valve: choice('What is the valve like?', {
      red: 'A red cast wheel, the paint worn off the rim by hands.',
      brass: 'A bare brass wheel on a brass body.',
      stem: 'The wheel is gone: only a square stem that needs pliers.',
      knob: 'A white plastic thermostat knob, a later replacement.',
    }),
    drying: choice('What is on top of it?', {
      mittens: 'A pair of wet wool mittens laid out to dry.',
      hat: 'A soaked knitted hat with a pom-pom.',
      socks: 'A row of socks draped over the ribs.',
      scarf: 'A long scarf draped along the top, ends hanging.',
      cat: 'A cat asleep in a loaf on the warm top.',
      nothing: 'Nothing: bare ribs.',
    }),
    doing: choice('What is it doing right now?', {
      hot: 'Full on and ticking, too hot to touch, the air above it wavering.',
      lukewarm: 'Barely warm, as it is every year until the first frost.',
      cold: 'Stone cold: the heating is off and the room knows it.',
      leaking: 'Weeping at the valve into a jar set underneath, a rust trail down the pipe.',
    }),
    backing: choice('Where does it stand?', {
      free: 'On its own, away from any wall.',
      wall: 'Against a section of two-tone painted wall.',
      sill: 'Under a deep window sill.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const spec = {
      classic: { H: 0.62, D: 0.16, cols: 3, pitch: 0.06, t: 0.046, r: 0.07 },
      soviet: { H: 0.56, D: 0.14, cols: 2, pitch: 0.094, t: 0.062, r: 0.045 },
      tall: { H: 0.95, D: 0.11, cols: 2, pitch: 0.052, t: 0.038, r: 0.05 },
      low: { H: 0.36, D: 0.24, cols: 4, pitch: 0.06, t: 0.046, r: 0.08 },
    }[a.pattern];
    const { H, D, cols, pitch, t, r } = spec;
    const n = { stub: 5, room: 9, long: 14, hall: 20 }[a.length];
    const L = n * pitch;
    const footH = 0.11;
    const top = footH + H;
    const hot = a.doing === 'hot';
    const colour = new THREE.Color(PAINT[a.paint]);

    // Paint skin: drips, chips to dark iron, rust.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const g = canvas.getContext('2d')!;
    g.fillStyle = `#${colour.getHexString()}`;
    g.fillRect(0, 0, 256, 256);
    for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(255,255,255,${0.03 + random() * 0.05})`; g.fillRect(random() * 256, random() * 256, 3 + random() * 5, 30 + random() * 80); }
    const chips = Math.round(mood.wear * 90 + (a.paint === 'iron' ? 40 : 0) + (a.paint === 'white' ? -30 : 0));
    for (let k = 0; k < chips; k++) {
      g.fillStyle = random() < 0.55 ? `rgba(60,48,42,${0.5 + random() * 0.4})` : `rgba(150,78,36,${0.4 + random() * 0.4})`;
      g.beginPath(); g.ellipse(random() * 256, random() * 256, 2 + random() * 9, 2 + random() * 6, random() * 3, 0, Math.PI * 2); g.fill();
    }
    const skin = new THREE.CanvasTexture(canvas);
    skin.colorSpace = THREE.SRGBColorSpace;
    skin.wrapS = skin.wrapT = THREE.RepeatWrapping;
    skin.repeat.set(3, 1.6);
    const iron = new THREE.MeshStandardMaterial({
      map: skin, roughness: a.paint === 'iron' ? 0.8 : mix(0.35, 0.7, mood.wear), metalness: a.paint === 'silver' ? 0.45 : 0.05,
      emissive: '#ff5a1e', emissiveIntensity: hot ? mix(0.04, 0.16, mood.warmth) : 0,
    });
    const pipe = s.material(colour.clone().multiplyScalar(0.94), { roughness: 0.5 });

    // One section, extruded from its side profile and instanced along the length.
    const shape = new THREE.Shape();
    const hw = D / 2;
    shape.moveTo(-hw + r, 0);
    shape.lineTo(hw - r, 0);
    shape.absarc(hw - r, r, r, -Math.PI / 2, 0, false);
    shape.lineTo(hw, H - r);
    shape.absarc(hw - r, H - r, r, 0, Math.PI / 2, false);
    shape.lineTo(-hw + r, H);
    shape.absarc(-hw + r, H - r, r, Math.PI / 2, Math.PI, false);
    shape.lineTo(-hw, r);
    shape.absarc(-hw + r, r, r, Math.PI, Math.PI * 1.5, false);
    const sw = (D / cols) * 0.4;
    for (let k = 1; k < cols; k++) {
      const x = -hw + (k * D) / cols, y0 = H * 0.17, y1 = H * 0.83;
      const hole = new THREE.Path();
      hole.moveTo(x - sw / 2, y0);
      hole.lineTo(x - sw / 2, y1);
      hole.absarc(x, y1, sw / 2, Math.PI, 0, true);
      hole.lineTo(x + sw / 2, y0);
      hole.absarc(x, y0, sw / 2, 0, Math.PI, true);
      shape.holes.push(hole);
    }
    const bevel = t * 0.3;
    const section = new THREE.ExtrudeGeometry(shape, { depth: t - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 3, curveSegments: 8 });
    section.translate(0, 0, -(t - bevel * 2) / 2);
    section.rotateY(Math.PI / 2);
    const ribs = new THREE.InstancedMesh(section, iron, n);
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      m.makeTranslation((i - (n - 1) / 2) * pitch, footH, 0);
      ribs.setMatrixAt(i, m);
      ribs.setColorAt(i, new THREE.Color().setScalar(1 - random() * mood.wear * 0.22));
    }
    ribs.castShadow = ribs.receiveShadow = true;
    s.root.add(ribs);

    // Hubs joining the sections, end plugs and feet.
    const hubR = Math.min(0.03, r * 0.55);
    const hubTop = footH + H - Math.max(r * 0.75, 0.045), hubBottom = footH + Math.max(r * 0.75, 0.045);
    for (const y of [hubTop, hubBottom]) {
      s.cylinder(hubR, hubR, L - pitch + 0.02, [0, y, 0], iron, 14).rotation.z = Math.PI / 2;
      for (const side of [-1, 1]) s.cylinder(hubR * 0.9, hubR * 0.9, 0.02, [side * (L / 2 + 0.004), y, 0], pipe, 6).rotation.z = Math.PI / 2;
    }
    for (const side of [-1, 1]) for (const z of [-1, 1]) {
      const x = side * (L / 2 - pitch / 2);
      s.cylinder(0.014, 0.022, footH + 0.03, [x, footH / 2 + 0.015, z * (hw - r * 0.6)], iron, 8);
      s.cylinder(0.026, 0.03, 0.012, [x, 0.006, z * (hw - r * 0.6)], iron, 8);
    }

    // Riser pipes, feed and return, and the valve.
    const riserX = L / 2 + 0.2;
    const riserTop = Math.max(top + 0.45, 1.25);
    s.cylinder(0.017, 0.017, riserTop, [riserX, riserTop / 2, -0.02], pipe, 10);
    s.cylinder(0.017, 0.017, riserTop, [riserX + 0.075, riserTop / 2, -0.02], pipe, 10);
    s.rod([L / 2, hubTop, 0], [riserX, hubTop, -0.02], 0.014, pipe);
    s.rod([L / 2, hubBottom, 0], [riserX + 0.075, hubBottom, -0.02], 0.014, pipe);
    for (const y of [0.012, riserTop * 0.72]) for (const dx of [0, 0.075]) s.cylinder(0.024, 0.024, 0.016, [riserX + dx, y, -0.02], pipe, 10);
    const vx = L / 2 + 0.085;
    const brass = s.material(a.valve === 'red' ? '#7c7468' : '#b8944a', { metalness: 0.7, roughness: 0.4 });
    s.cylinder(0.024, 0.024, 0.06, [vx, hubTop, -0.008], brass, 10).rotation.z = Math.PI / 2;
    s.cylinder(0.014, 0.018, 0.055, [vx, hubTop + 0.04, -0.008], brass, 8);
    const wheelY = hubTop + 0.075;
    if (a.valve === 'red' || a.valve === 'brass') {
      const wheelMat = a.valve === 'red' ? s.material('#c2332b', { roughness: 0.5 }) : brass;
      const wheel = s.ring(0.036, 0.007, [vx, wheelY, -0.008], wheelMat);
      wheel.rotation.x = Math.PI / 2;
      for (let k = 0; k < 3; k++) {
        const ang = (k / 3) * Math.PI + random();
        s.rod([vx - Math.cos(ang) * 0.036, wheelY, -0.008 - Math.sin(ang) * 0.036], [vx + Math.cos(ang) * 0.036, wheelY, -0.008 + Math.sin(ang) * 0.036], 0.004, wheelMat);
      }
    } else if (a.valve === 'stem') s.box([0.012, 0.03, 0.012], [vx, wheelY - 0.005, -0.008], s.material('#2c2a28', { metalness: 0.6 }));
    else s.cylinder(0.026, 0.03, 0.06, [vx, wheelY + 0.01, -0.008], s.material('#efeee8', { roughness: 0.4 }), 16);

    // Wall or sill behind.
    if (a.backing !== 'free') {
      const wallW = L + 0.75, cx = 0.12, wz = -hw - 0.11;
      const wallH = a.backing === 'sill' ? top + 0.2 : Math.max(top + 0.6, 1.5);
      const dado = a.backing === 'sill' ? wallH : Math.min(wallH - 0.25, 1.35);
      const low = new THREE.Color(a.paint === 'green' ? '#7d9a78' : ['#8c9a6a', '#a3bac4', '#c7a252', '#9a8a78'][Math.floor(random() * 4)]);
      s.box([wallW, dado, 0.1], [cx, dado / 2, wz], s.material(low, { roughness: 0.5 }));
      if (wallH > dado) {
        s.box([wallW, wallH - dado, 0.1], [cx, dado + (wallH - dado) / 2, wz], s.material('#e6e2d4', { roughness: 0.95 }));
        s.box([wallW, 0.02, 0.004], [cx, dado, wz + 0.052], s.material(low.clone().multiplyScalar(0.55)));
      }
      s.box([wallW, 0.08, 0.015], [cx, 0.04, wz + 0.057], s.material('#4c4741'));
      if (a.backing === 'sill') {
        s.box([wallW + 0.06, 0.045, D + 0.32], [cx, wallH + 0.022, wz + (D + 0.32) / 2 - 0.05], s.material('#e9e6dc', { roughness: 0.4 }));
        s.box([wallW, 0.07, 0.06], [cx, wallH + 0.08, wz], s.material('#dcd8cc'));
      }
      for (const dx of [0, 0.075]) s.box([0.05, 0.01, 0.09], [riserX + dx, riserTop * 0.72, -0.07], pipe);
    }

    // What dries on top.
    const wet: { x: number; z: number; y: number }[] = [];
    const wools = ['#b8322e', '#2f5d9a', '#d8a531', '#3f7d5a', '#7a4a8c', '#e7e2d2'];
    const wool = (c: string) => s.material(new THREE.Color(c).lerp(new THREE.Color('#6d6a66'), (1 - mood.cheer) * 0.4), { roughness: 1 });
    const pickWool = () => wools[Math.floor(random() * wools.length)];
    const x0 = (random() - 0.5) * Math.max(0, L - 0.3);
    if (a.drying === 'mittens') {
      const mat = wool(pickWool()), cuff = wool('#e7e2d2');
      for (const side of [-1, 1]) {
        const mx = x0 + side * 0.075, rot = (random() - 0.5) * 0.7;
        const grp = new THREE.Group();
        grp.position.set(mx, top + 0.017, 0); grp.rotation.y = rot;
        const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), mat); palm.scale.set(0.05, 0.019, 0.075); palm.position.z = 0.02;
        const thumb = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mat); thumb.scale.set(0.02, 0.014, 0.035); thumb.position.set(side * 0.05, 0, 0.01); thumb.rotation.y = side * 0.6;
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.03, 0.04), cuff); band.position.z = -0.07;
        for (const part of [palm, thumb, band]) { part.castShadow = true; grp.add(part); }
        s.root.add(grp);
        wet.push({ x: mx, z: hw * 0.9, y: top });
      }
    } else if (a.drying === 'hat') {
      const mat = wool(pickWool());
      s.ball([0.095, 0.075, 0.085], [x0, top + 0.035, 0], mat, 18).rotation.z = 0.12;
      s.ring(0.088, 0.02, [x0, top + 0.02, 0], wool('#e7e2d2')).rotation.x = Math.PI / 2;
      s.ball([0.035, 0.035, 0.035], [x0 + 0.015, top + 0.12, 0], wool('#e7e2d2'), 10);
      wet.push({ x: x0 - 0.05, z: hw, y: top }, { x: x0 + 0.06, z: -hw * 0.5, y: top });
    } else if (a.drying === 'socks') {
      const count = Math.min(n - 1, 3 + Math.floor(random() * 4));
      for (let k = 0; k < count; k++) {
        const sx = (k - (count - 1) / 2) * Math.min(0.12, (L - 0.1) / count) + (random() - 0.5) * 0.02;
        const mat = wool(pickWool()), drop = 0.12 + random() * 0.1;
        s.box([0.07, 0.012, D + 0.02], [sx, top + 0.007, 0], mat);
        s.box([0.07, drop, 0.012], [sx, top - drop / 2 + 0.01, hw + 0.012], mat).rotation.z = (random() - 0.5) * 0.12;
        s.box([0.07, 0.07 + random() * 0.05, 0.012], [sx, top - 0.03, -hw - 0.012], mat);
        s.box([0.07, 0.03, 0.06], [sx, top - drop + 0.02, hw + 0.04], mat);
        wet.push({ x: sx, z: hw + 0.04, y: top - drop });
      }
    } else if (a.drying === 'scarf') {
      const mat = wool(pickWool()), stripe = wool(pickWool());
      const half = Math.min(L / 2 - 0.02, 0.45);
      s.box([half * 2, 0.014, D * 0.8], [x0 * 0.3, top + 0.008, 0], mat);
      for (const side of [-1, 1]) {
        const drop = 0.2 + random() * 0.2, ex = x0 * 0.3 + side * (half - 0.06);
        s.box([0.12, drop, 0.014], [ex, top - drop / 2 + 0.01, hw + 0.014], mat).rotation.z = (random() - 0.5) * 0.1;
        s.box([0.122, 0.03, 0.016], [ex, top - drop + 0.06, hw + 0.014], stripe);
        for (let f = 0; f < 6; f++) s.box([0.008, 0.035, 0.006], [ex - 0.05 + f * 0.02, top - drop - 0.012, hw + 0.014], stripe);
        wet.push({ x: ex, z: hw + 0.014, y: top - drop });
      }
    } else if (a.drying === 'cat') {
      const fur = s.material(['#d08a3e', '#3a3836', '#9a9590', '#e8e2d6'][Math.floor(random() * 4)], { roughness: 1 });
      const cx = Math.max(-L / 2 + 0.17, Math.min(L / 2 - 0.2, x0));
      s.ball([0.17, 0.08, Math.min(0.1, hw + 0.02)], [cx, top + 0.07, 0], fur, 18);
      s.ball([0.062, 0.055, 0.058], [cx + 0.15, top + 0.1, 0.01], fur, 14);
      for (const z of [-1, 1]) s.cylinder(0, 0.022, 0.04, [cx + 0.155, top + 0.16, 0.01 + z * 0.035], fur, 4);
      s.tube([[cx - 0.15, top + 0.04, 0], [cx - 0.19, top + 0.03, 0.06], [cx - 0.12, top + 0.025, 0.1], [cx - 0.02, top + 0.02, 0.1]], 0.016, fur);
      for (const z of [-1, 1]) s.ball([0.03, 0.02, 0.03], [cx + 0.12, top + 0.02, z * 0.04], fur, 8);
    }

    // Puddles and falling drops under whatever is wet, or under a weeping valve.
    const water = new THREE.MeshStandardMaterial({ color: '#5c6a70', roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.55, depthWrite: false });
    const drops: { mesh: THREE.Mesh; from: number; phase: number; to: number }[] = [];
    const dropGeo = new THREE.SphereGeometry(0.007, 8, 6);
    const addDrip = (x: number, y: number, z: number, to = 0) => {
      const mesh = new THREE.Mesh(dropGeo, water);
      mesh.position.set(x, y, z);
      s.root.add(mesh);
      drops.push({ mesh, from: y, phase: random(), to });
      const pool = s.cylinder(0.05 + random() * 0.05, 0.05, 0.002, [x, to + 0.002, z], water, 16);
      pool.scale.z = 0.6 + random() * 0.5;
      pool.castShadow = false;
    };
    if (a.drying !== 'cat' && a.drying !== 'nothing') for (const w of wet) addDrip(w.x, w.y, w.z);
    if (a.doing === 'leaking') {
      const jx = vx, jz = 0.01;
      s.cylinder(0.045, 0.04, 0.11, [jx, 0.055, jz], new THREE.MeshStandardMaterial({ color: '#cfe0dc', transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false }), 16);
      s.cylinder(0.04, 0.036, 0.05 + random() * 0.04, [jx, 0.035, jz], s.material('#8a6a48', { roughness: 0.2 }), 16);
      s.ring(0.045, 0.004, [jx, 0.11, jz], s.material('#c9d4d0')).rotation.x = Math.PI / 2;
      const rust = s.material('#9a5226', { roughness: 0.9 });
      s.box([0.03, 0.012, 0.03], [vx, hubTop - 0.026, -0.008], rust);
      s.rod([L / 2 - 0.005, hubTop - 0.02, hw * 0.3], [L / 2 - 0.005, footH + 0.03, hw * 0.3], 0.006, rust, 0.002);
      addDrip(jx, hubTop - 0.035, jz, 0.07);
    }

    // Heat haze over a hot radiator: faint rising wisps, see-through so they are not measured.
    const wisps: THREE.Mesh[] = [];
    if (hot) {
      const haze = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.055, depthWrite: false, side: THREE.DoubleSide });
      for (let k = 0; k < Math.min(8, n); k++) {
        const wisp = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.16), haze);
        wisp.position.set((random() - 0.5) * L, top + 0.15, (random() - 0.5) * D);
        wisp.userData.x = wisp.position.x; wisp.userData.phase = random() * 6;
        s.root.add(wisp); wisps.push(wisp);
      }
    }

    const rate = mix(0.25, 1.1, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const d of drops) {
          const p = (time * rate + d.phase) % 1;
          const fall = Math.min(1, p * 2.2);
          d.mesh.position.y = mix(d.from, d.to + 0.005, fall * fall);
          d.mesh.visible = p < 0.46;
        }
        for (const w of wisps) {
          const p = (time * 0.35 * (0.6 + rate) + (w.userData.phase as number)) % 1;
          w.position.y = top + 0.08 + p * 0.3;
          w.position.x = (w.userData.x as number) + Math.sin(time * 2 + (w.userData.phase as number)) * 0.012;
          w.scale.y = 0.6 + p;
        }
        if (hot) iron.emissiveIntensity = mix(0.04, 0.16, mood.warmth) * (0.9 + Math.sin(time * 1.3) * 0.1);
      },
    });
  },
});
