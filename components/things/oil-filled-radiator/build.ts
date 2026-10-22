import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

function roundedRect(w: number, h: number, r: number) {
  const x = w / 2, y = h / 2;
  const sh = new THREE.Shape();
  sh.moveTo(-x + r, -y);
  sh.lineTo(x - r, -y); sh.quadraticCurveTo(x, -y, x, -y + r);
  sh.lineTo(x, y - r); sh.quadraticCurveTo(x, y, x - r, y);
  sh.lineTo(-x + r, y); sh.quadraticCurveTo(-x, y, -x, y - r);
  sh.lineTo(-x, -y + r); sh.quadraticCurveTo(-x, -y, -x + r, -y);
  return sh;
}
/** A plate standing in the y-z plane, `t` thick along x, centred on the origin. */
function plate(depth: number, height: number, t: number, r: number, bevel: number) {
  const g = new THREE.ExtrudeGeometry(roundedRect(depth - bevel * 2, height - bevel * 2, Math.max(r - bevel, 0.002)), { depth: Math.max(t - bevel * 2, 0.0005), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -(t - bevel * 2) / 2);
  g.rotateY(Math.PI / 2);
  return g;
}

export default defineThing({
  questions: {
    state: choice('What is the radiator doing?', {
      off: 'Switched off and stone cold, lamp dark.',
      ticking: 'Ticking over on low, the thermostat lamp glowing amber.',
      blast: 'On full blast, lamp burning red and the air above it shimmering.',
      broken: 'Broken: dead, taped with a warning, a dark stain of oil spreading beneath.',
    }),
    body: choice('What colour is its enamel?', {
      white: 'Plain appliance white.',
      cream: 'Cream gone yellow with age.',
      anthracite: 'Dark anthracite grey, a newer model.',
      brown: 'Seventies brown and beige.',
      mint: 'Pale retro mint green.',
    }),
    size: score('How big is it?', ['A stubby five-fin heater for under a desk', 'Seven fins', 'Nine fins, the usual', 'A long thirteen-fin beast']),
    draped: choice('What has been left draped over the top to dry or warm?', {
      socks: 'A sock or two.',
      towel: 'A damp bath towel.',
      gloves: 'Wet woolly gloves and a bobble hat.',
      cat: 'A cat, asleep in a loaf on the warm fins.',
      nothing: 'Nothing.',
    }),
    cord: choice('Where does the cord go?', {
      trail: 'It trails in loops across the floor to a plug lying loose.',
      strip: 'Into a white extension strip with its red switch lit.',
      overloaded: 'Into a scorched cube adaptor bristling with other plugs.',
      coiled: 'Nowhere: it is wound round the hooks on the end.',
    }),
    controls: choice('What are the controls like?', {
      dial: 'One big numbered thermostat dial with a lamp beside it.',
      switches: 'A small dial and two rocker switches.',
      digital: 'A little digital display with a temperature readout.',
    }),
    beside: choice('What is warming on the floor beside it?', {
      boots: 'A pair of wet boots.',
      slippers: 'A pair of slippers, toes toward the heat.',
      mug: 'A mug.',
      bottle: 'A rubber hot-water bottle.',
      nothing: 'Nothing.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const on = a.state === 'ticking' || a.state === 'blast';
    const heat = a.state === 'blast' ? 1 : a.state === 'ticking' ? 0.45 : 0;
    const enamel = new THREE.Color({ white: '#eceae4', cream: '#e3d7b0', anthracite: '#42464c', brown: '#8a6747', mint: '#a9cdbf' }[a.body]);
    enamel.lerp(new THREE.Color('#b9a172'), mood.wear * 0.25);
    const glowTint = new THREE.Color().setHSL(mix(0.09, 0.02, heat), 1, 0.5);
    const finPaint = new THREE.MeshStandardMaterial({ color: enamel, roughness: 0.42 + mood.wear * 0.3, metalness: 0.15, emissive: glowTint, emissiveIntensity: heat * mix(0.06, 0.2, mood.warmth) });
    const panelTone = a.body === 'brown' ? '#d9c9a0' : a.body === 'anthracite' ? '#2a2c30' : '#d5d3cc';
    const panel = s.material(panelTone, { roughness: 0.5 });
    const black = s.material('#232529', { roughness: 0.55 });

    const N = Math.round(mix(5, 13, a.size));
    const pitch = 0.046, D = 0.15, H = 0.55, base = 0.085;
    const L = N * pitch, top = base + H;
    const x0 = -L / 2 - 0.05; // fins start here; the control box sits at +x
    const fin = plate(D, H, 0.014, 0.05, 0.004);
    const channel = plate(D * 0.42, H * 0.86, 0.024, 0.03, 0.006);
    for (let i = 0; i < N; i++) {
      const x = x0 + pitch * (i + 0.5);
      const m = s.mesh(fin, finPaint, [x, base + H / 2, 0]);
      const dent = mood.wear > 0.6 && random() < 0.2 ? (random() - 0.5) * 0.08 : 0;
      m.rotation.y = dent;
      s.mesh(channel, finPaint, [x, base + H / 2, 0]);
    }
    for (const y of [base + 0.055, top - 0.055]) s.rod([x0, y, 0], [x0 + L + 0.01, y, 0], 0.024, finPaint);
    // Warm air between the fins.
    if (heat > 0) {
      const ember = new THREE.MeshBasicMaterial({ color: glowTint, transparent: true, opacity: heat * 0.22, depthWrite: false });
      const core = new THREE.Mesh(new THREE.BoxGeometry(L, H * 0.8, D * 0.5), ember);
      core.position.set(x0 + L / 2, base + H / 2, 0);
      s.root.add(core);
    }

    // Control box.
    const cw = 0.115, cx = x0 + L + cw / 2;
    s.mesh(plate(D + 0.012, H + 0.02, cw, 0.03, 0.008), panel, [cx, base + H / 2, 0]);
    const fz = (D + 0.012) / 2;
    const lampTone = a.state === 'blast' ? '#ff3b1a' : '#ffa23a';
    const lamp = s.material(on ? lampTone : '#5a2a22', { emissive: on ? lampTone : '#000000', emissiveIntensity: on ? 1.6 : 0, roughness: 0.3 });
    const face = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, out = 0.004) => {
      const m = s.mesh(geometry, material, [cx + x, y, fz + out]);
      return m;
    };
    const knob = (y: number, r: number, turn: number) => {
      const k = face(new THREE.CylinderGeometry(r, r * 1.12, 0.024, 20), black, 0, y, 0.012);
      k.rotation.x = Math.PI / 2;
      const mark = face(new THREE.BoxGeometry(0.005, r * 0.9, 0.004), s.material('#f1efe8'), Math.sin(turn) * r * 0.5, y + Math.cos(turn) * r * 0.5, 0.025);
      mark.rotation.z = -turn;
      return k;
    };
    const setting = a.state === 'blast' ? 2.2 : a.state === 'ticking' ? 0.3 : -2.2;
    if (a.controls === 'dial') {
      const ring = face(new THREE.TorusGeometry(0.044, 0.004, 8, 28), on ? lamp : s.material('#8f9296'), 0, top - 0.14, 0.003);
      ring.castShadow = false;
      knob(top - 0.14, 0.034, setting + (random() - 0.5) * 0.4);
      for (let i = 0; i < 7; i++) { const q = -2.2 + i * 0.73; face(new THREE.BoxGeometry(0.004, 0.009, 0.002), black, Math.sin(q) * 0.05, top - 0.14 + Math.cos(q) * 0.05, 0.001).rotation.z = -q; }
      face(new THREE.SphereGeometry(0.011, 12, 8), lamp, 0, top - 0.245);
      face(new THREE.BoxGeometry(0.04, 0.02, 0.008), on ? s.material('#c8402c', { emissive: '#ff3b1a', emissiveIntensity: 0.7 }) : black, 0, top - 0.3);
    } else if (a.controls === 'switches') {
      knob(top - 0.11, 0.024, setting);
      for (const [i, y] of [top - 0.2, top - 0.25].entries()) {
        const live = on && (i === 0 || a.state === 'blast');
        const rocker = face(new THREE.BoxGeometry(0.036, 0.026, 0.01), live ? s.material('#d8402c', { emissive: '#ff3b1a', emissiveIntensity: 1.1 }) : s.material('#6a2a22'), 0, y);
        rocker.rotation.x = live ? 0.25 : -0.25;
      }
      face(new THREE.SphereGeometry(0.008, 10, 8), lamp, 0, top - 0.3);
    } else {
      face(new THREE.BoxGeometry(0.085, 0.06, 0.006), black, 0, top - 0.12);
      const text = a.state === 'broken' ? 'E4' : a.state === 'off' ? '--' : a.state === 'blast' ? pick(['30', '28', 'HI']) : pick(['17', '18', '16']);
      const read = s.label(text, 0.07, 0.045, [cx, top - 0.12, fz + 0.0085], a.state === 'off' ? '#3a1512' : lampTone, '#0c0a0a');
      const rm = read.material as THREE.MeshStandardMaterial;
      rm.emissiveMap = rm.map; rm.emissive.set('#ffffff'); rm.emissiveIntensity = a.state === 'off' ? 0.15 : 1.1;
      for (let i = 0; i < 3; i++) face(new THREE.CylinderGeometry(0.009, 0.009, 0.006, 12), s.material('#9a9da2'), (i - 1) * 0.027, top - 0.2).rotation.x = Math.PI / 2;
      face(new THREE.SphereGeometry(0.006, 8, 6), lamp, 0.03, top - 0.07);
    }
    // Carry handle recess and cord hooks on the end face.
    s.box([0.012, 0.03, 0.09], [cx + cw / 2 + 0.004, top - 0.07, 0], black);
    const hookX = cx + cw / 2;
    for (const y of [base + 0.14, base + 0.3]) { s.box([0.03, 0.012, 0.03], [hookX + 0.015, y, 0], panel); s.box([0.008, 0.035, 0.03], [hookX + 0.03, y + (y > base + 0.2 ? 0.012 : -0.012), 0], panel); }

    // Feet and castors.
    const feet = [x0 + 0.06, x0 + L + cw - 0.07];
    for (const x of feet) {
      s.box([0.035, 0.022, 0.28], [x, base - 0.018, 0], black);
      for (const z of [-0.12, 0.12]) {
        const wheel = s.cylinder(0.026, 0.026, 0.022, [x, 0.026, z], s.material('#1b1c1f', { roughness: 0.8 }), 14);
        wheel.rotation.z = Math.PI / 2; wheel.rotation.y = (random() - 0.5) * 1.2;
        s.cylinder(0.008, 0.008, 0.03, [x, 0.055, z], s.material('#8f9296', { metalness: 0.7 }), 8);
      }
    }

    // ----- Things draped over the top -----
    const drape = (xc: number, w: number, front: number, back: number, material: THREE.Material) => {
      const g = new THREE.PlaneGeometry(w, front + back + D, Math.max(2, Math.round(w * 30)), 20);
      const p = g.attributes.position;
      const phase = random() * 6;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i), run = p.getY(i) + (front + back + D) / 2 - back - D / 2; // 0 at the middle of the top
        const over = Math.abs(run) - D / 2;
        const z = over <= 0 ? run : Math.sign(run) * (D / 2 + 0.006 + Math.sin(u * 30 + phase) * 0.006 * Math.min(1, over / 0.08));
        const y = over <= 0 ? top + 0.006 + Math.sin(u * 70 + phase) * 0.0015 : top + 0.006 - over;
        p.setXYZ(i, xc + u, y, z);
      }
      g.computeVertexNormals();
      return s.mesh(g, material);
    };
    const wool = (hex: string) => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).lerp(new THREE.Color('#8b8275'), mood.wear * 0.2), roughness: 1, side: THREE.DoubleSide });
    const finsMid = x0 + L / 2;
    if (a.draped === 'socks') {
      const n = 1 + Math.floor(random() * 2 + mood.density * 2.2);
      const tone = pick(['#e9e6df', '#2b2d33', '#b3413a', '#5b6d8c', '#d9b23a']);
      for (let i = 0; i < Math.min(n, Math.floor(L / 0.1)); i++) {
        const x = finsMid + (i - (Math.min(n, Math.floor(L / 0.1)) - 1) / 2) * 0.11 + (random() - 0.5) * 0.02;
        drape(x, 0.075, 0.16 + random() * 0.08, 0.06 + random() * 0.06, wool(i < 2 ? tone : pick(['#e9e6df', '#2b2d33', '#7a8a6a'])));
      }
    } else if (a.draped === 'towel') {
      const w = Math.min(L * 0.85, 0.5);
      drape(finsMid + (random() - 0.5) * 0.04, w, 0.3 + random() * 0.12, 0.2 + random() * 0.1, wool(pick(['#7fa3c9', '#d98f8f', '#e8e2d0', '#6f9a7a', '#c9b06a'])));
    } else if (a.draped === 'gloves') {
      const tone = pick(['#b3413a', '#2f5f8f', '#5a7a4a', '#e0a030', '#6a4a7a']);
      for (const k of [-1, 1]) {
        const g = drape(finsMid + k * 0.065, 0.085, 0.12, 0.03, wool(tone));
        g.rotation.y = 0;
        const thumb = s.ball([0.018, 0.012, 0.035], [finsMid + k * 0.065 + k * 0.05, top + 0.012, 0.03], wool(tone), 8);
        thumb.rotation.y = k * 0.6;
      }
      const hat = s.mesh(new THREE.SphereGeometry(0.085, 18, 10, 0, 6.3, 0, Math.PI / 2), wool(tone), [cx - 0.01, top + 0.012, 0]);
      hat.scale.set(1, 0.9, 0.9);
      s.ring(0.082, 0.014, [cx - 0.01, top + 0.022, 0], wool('#e9e6df')).rotation.x = Math.PI / 2;
      (s.root.children[s.root.children.length - 1] as THREE.Mesh).scale.y = 0.9;
      s.ball([0.03, 0.03, 0.03], [cx - 0.01, top + 0.1, 0], wool('#e9e6df'), 10);
    } else if (a.draped === 'cat') {
      const fur = wool(pick(['#d98a3a', '#1e1e22', '#8a8a86', '#efe9dc', '#6a4a30']));
      const dir = random() < 0.5 ? -1 : 1;
      const bodyLen = Math.min(0.2, L * 0.42);
      s.ball([bodyLen, 0.085, 0.085], [finsMid, top + 0.08, 0], fur, 18);
      const hx = finsMid + dir * bodyLen * 0.92;
      s.ball([0.058, 0.052, 0.058], [hx, top + 0.085, 0.015], fur, 16);
      for (const k of [-1, 1]) { const ear = s.mesh(new THREE.ConeGeometry(0.02, 0.04, 4), fur, [hx + k * 0.03, top + 0.14, 0.015]); ear.rotation.z = -k * 0.25; }
      s.tube([[finsMid - dir * bodyLen * 0.9, top + 0.04, 0.03], [finsMid - dir * bodyLen * 0.6, top + 0.02, 0.085], [finsMid - dir * bodyLen * 0.4, top - 0.08, 0.088], [finsMid - dir * bodyLen * 0.45, top - 0.16, 0.09]], 0.014, fur);
      for (const k of [-1, 1]) s.ball([0.022, 0.016, 0.03], [hx - dir * 0.03 + k * 0.02 * dir, top + 0.02, 0.07], fur, 8);
    }

    // ----- Cord -----
    const wire = s.material(a.body === 'anthracite' ? '#1d1e21' : '#e4e2da', { roughness: 0.6 });
    const exitPoint: [number, number, number] = [cx + cw / 2, base + 0.07, -0.02];
    const plug = (x: number, z: number, y = 0.018, turn = random() * 3) => {
      const m = s.box([0.045, 0.036, 0.05], [x, y, z], wire);
      m.rotation.y = turn;
      for (const k of [-1, 1]) { const pin = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.004, 0.02), s.material('#c9a23a', { metalness: 0.8, roughness: 0.3 })); pin.position.set(k * 0.011, 0, -0.034); m.add(pin); }
      return m;
    };
    if (a.cord === 'coiled' ) {
      for (let i = 0; i < 4; i++) { const loop = s.mesh(new THREE.TorusGeometry(0.105, 0.006, 6, 24), wire, [hookX + 0.016 + i * 0.006, base + 0.22, 0]); loop.rotation.y = Math.PI / 2; loop.scale.set(0.5, 1, 1); loop.rotation.x = (random() - 0.5) * 0.25; }
      s.tube([[hookX + 0.03, base + 0.12, 0.02], [hookX + 0.05, base + 0.05, 0.05], [hookX + 0.06, 0.03, 0.09]], 0.006, wire);
      plug(hookX + 0.065, 0.11);
    } else {
      const ex = cx + cw / 2 + 0.3 + random() * 0.15, ez = 0.25 + random() * 0.15;
      const path: [number, number, number][] = [exitPoint, [exitPoint[0] + 0.06, 0.02, -0.06], [exitPoint[0] + 0.2, 0.008, -0.16 - random() * 0.1], [exitPoint[0] + 0.28, 0.008, 0.02], [ex - 0.12, 0.008, ez - 0.14 + random() * 0.08], [ex, 0.015, ez]];
      s.tube(path, 0.006, wire);
      if (a.cord === 'trail') plug(ex, ez + 0.02);
      else if (a.cord === 'strip') {
        const strip = s.box([0.06, 0.04, 0.3], [ex, 0.02, ez + 0.13], s.material('#ecebe6', { roughness: 0.5 }));
        strip.rotation.y = 0;
        s.box([0.02, 0.012, 0.03], [ex, 0.045, ez + 0.265], s.material('#d8402c', { emissive: '#ff2a10', emissiveIntensity: on ? 1.2 : 0.1 }));
        plug(ex, ez + 0.02, 0.058, Math.PI / 2).rotation.x = Math.PI / 2;
        for (let i = 0; i < 1 + Math.floor(mood.density * 2.5); i++) { plug(ex, ez + 0.09 + i * 0.065, 0.058, Math.PI / 2).rotation.x = Math.PI / 2; s.tube([[ex, 0.07, ez + 0.09 + i * 0.065], [ex + 0.08, 0.01, ez + 0.1 + i * 0.07], [ex + 0.2 + random() * 0.1, 0.008, ez + i * 0.1 - 0.05]], 0.004, s.material(pick(['#1d1e21', '#e4e2da']))); }
        s.tube([[ex, 0.02, ez + 0.28], [ex - 0.04, 0.008, ez + 0.36], [ex + 0.06, 0.008, ez + 0.44]], 0.006, s.material('#ecebe6'));
      } else {
        const scorch = new THREE.Color('#e9e6dc').lerp(new THREE.Color('#5a3a22'), 0.25 + mood.wear * 0.5);
        s.box([0.075, 0.075, 0.075], [ex, 0.04, ez + 0.05], s.material(scorch, { roughness: 0.6 }));
        for (const [dx, dz, turn] of [[0.055, 0, Math.PI / 2], [-0.055, 0, -Math.PI / 2], [0, 0.055, 0]] as const) {
          const p = plug(ex + dx, ez + 0.05 + dz, 0.04, turn + Math.PI);
          p.scale.setScalar(0.9);
          s.tube([[ex + dx * 1.4, 0.04, ez + 0.05 + dz * 1.4], [ex + dx * 2.6, 0.01, ez + 0.05 + dz * 2.6 + 0.04], [ex + dx * 4.5 + (random() - 0.5) * 0.1, 0.008, ez + 0.05 + dz * 4.5 + 0.1]], 0.004, s.material(pick(['#1d1e21', '#e4e2da', '#c9c5b8'])));
        }
        s.box([0.045, 0.02, 0.045], [ex, 0.087, ez + 0.05], wire);
      }
    }

    // ----- Broken: tape and oil -----
    if (a.state === 'broken') {
      const note = s.label(pick(['DO NOT USE', 'BROKEN', 'LEAKS!']), Math.min(L * 0.8, 0.26), 0.07, [finsMid, base + H * 0.6, D / 2 + 0.014], '#16161a', '#e8dfa8');
      note.rotation.z = (random() - 0.5) * 0.3;
      const oil = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshStandardMaterial({ color: '#3a2a12', roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.82, depthWrite: false }));
      oil.rotation.x = -Math.PI / 2;
      oil.position.set(finsMid + (random() - 0.5) * 0.1, 0.003, 0.05);
      oil.scale.set(L * mix(0.4, 0.75, random()), mix(0.14, 0.26, mood.wear), 1);
      s.root.add(oil);
    }

    // ----- Beside it -----
    const bx = x0 + L * 0.3, bz = 0.3 + random() * 0.05;
    if (a.beside === 'boots') {
      const leather = s.material(pick(['#5a3a22', '#23262c', '#6a5a2a', '#7a2f2a']), { roughness: 0.7 });
      const sole = s.material('#1b1c1f');
      for (const k of [-1, 1]) {
        const g = new THREE.Group();
        g.position.set(bx + k * 0.075, 0, bz); g.rotation.y = Math.PI + k * 0.15 + (random() - 0.5) * 0.3;
        const add = (m: THREE.Mesh, x: number, y: number, z: number) => { m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
        add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.022, 0.28), sole), 0, 0.011, 0);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), leather), 0, 0.05, 0.085).scale.set(1, 0.75, 1.3);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.048, 0.2, 14), leather), 0, 0.12, -0.07);
        if (k === 1 && random() < 0.4) { g.rotation.z = Math.PI / 2; g.position.y = 0.05; }
        s.root.add(g);
      }
    } else if (a.beside === 'slippers') {
      const felt = s.material(pick(['#7a2f3a', '#3a5a7a', '#8a7a5a', '#d98fa8']), { roughness: 1 });
      for (const k of [-1, 1]) {
        const slip = s.ball([0.048, 0.016, 0.125], [bx + k * 0.065, 0.016, bz], felt, 12);
        slip.rotation.y = k * 0.1 + (random() - 0.5) * 0.2;
        const toe = s.ball([0.05, 0.035, 0.065], [bx + k * 0.065 + Math.sin(slip.rotation.y) * -0.06, 0.035, bz - 0.06], felt, 12);
        toe.rotation.y = slip.rotation.y;
      }
    } else if (a.beside === 'mug') {
      const tone = s.material(new THREE.Color().setHSL(random(), 0.5, 0.55));
      s.cylinder(0.042, 0.037, 0.095, [bx, 0.0475, bz], tone, 18);
      s.cylinder(0.036, 0.036, 0.004, [bx, 0.088, bz], s.material('#5a3a22', { roughness: 0.2 }), 18);
      s.ring(0.027, 0.007, [bx + 0.048, 0.048, bz], tone);
    } else if (a.beside === 'bottle') {
      const rubber = s.material(pick(['#b3312c', '#2f5f8f', '#c98fa8', '#3a7a5a']), { roughness: 0.6 });
      const g = new THREE.ExtrudeGeometry(roundedRect(0.19, 0.27, 0.05), { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3 });
      g.rotateX(-Math.PI / 2);
      const body = s.mesh(g, rubber, [bx, 0.012, bz + 0.05]);
      body.rotation.y = (random() - 0.5) * 0.8;
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.05, 12), rubber); neck.rotation.x = Math.PI / 2; neck.position.set(0, 0.015, -0.17); body.add(neck);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.015, 12), black); cap.rotation.x = Math.PI / 2; cap.position.set(0, 0.015, -0.2); body.add(cap);
      for (let i = 0; i < 5; i++) { const rib = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.006, 0.01), rubber); rib.position.set(0, 0.044, -0.08 + i * 0.04); body.add(rib); }
    }

    // ----- Heat shimmer -----
    const ribbons: THREE.Mesh[] = [];
    if (heat > 0) {
      const haze = new THREE.MeshBasicMaterial({ color: mood.warmth > 0.5 ? '#ffd9a8' : '#ffffff', transparent: true, opacity: mix(0.05, 0.16, heat), depthWrite: false, side: THREE.DoubleSide });
      const n = Math.round(mix(2, 7, heat) * (L / 0.4));
      for (let i = 0; i < n; i++) {
        const g = new THREE.PlaneGeometry(0.03, 0.26, 1, 10);
        const p = g.attributes.position;
        const ph = random() * 6;
        for (let k = 0; k < p.count; k++) p.setX(k, p.getX(k) + Math.sin(p.getY(k) * 26 + ph) * 0.018);
        const m = new THREE.Mesh(g, haze);
        m.userData = { x: x0 + random() * L, z: (random() - 0.5) * D * 0.6, phase: random() };
        s.root.add(m);
        ribbons.push(m);
      }
    }
    const lampMaterial = lamp as THREE.MeshStandardMaterial;
    const drift = (time: number) => {
      for (const m of ribbons) {
        const u = (time * mix(0.15, 0.6, mood.energy) + m.userData.phase) % 1;
        m.position.set(m.userData.x + Math.sin(u * 5 + m.userData.phase * 7) * 0.015, top + 0.14 + u * 0.3, m.userData.z);
        m.scale.set(1 + u, 1, 1);
      }
    };
    drift(0);
    return s.finish({
      update: (_dt, time) => {
        drift(time);
        // A thermostat on low clicks in and out.
        if (a.state === 'ticking') lampMaterial.emissiveIntensity = Math.sin(time * mix(0.3, 1.6, mood.energy)) > -0.5 ? 1.6 : 0.15;
        else if (a.state === 'blast') lampMaterial.emissiveIntensity = 1.6 + 0.25 * Math.sin(time * 5);
      },
    });
  },
});
