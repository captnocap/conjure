import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P = [number, number, number];

function paint(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const CASES = { black: '#1e1d1f', brown: '#4a2a1a', olive: '#5d6140', cream: '#e4dcc2', red: '#a8322a', grey: '#6d7780' } as const;
const FORMS = {
  upright: { w: 0.135, h: 0.19, d: 0.075, lean: 0.42, window: 0.5 },
  pocket: { w: 0.09, h: 0.135, d: 0.035, lean: 1.2, window: 0.45 },
  bench: { w: 0.22, h: 0.15, d: 0.1, lean: 0.3, window: 0.62 },
  field: { w: 0.125, h: 0.165, d: 0.06, lean: 0.75, window: 0.48 },
} as const;
const MODES = ['OFF', 'DCV', 'ACV', 'OHM', 'mA'] as const;

export default defineThing({
  questions: {
    reading: choice('What is the needle doing?', {
      zero: 'Resting dead on zero at the left: nothing, no life in the circuit.',
      low: 'Barely lifted off the stop, a faint trickle.',
      mid: 'Steady at mid-scale, a healthy reading.',
      pegged: 'Slammed hard over against the right-hand stop: far too much, wrong range.',
      reversed: 'Kicked backwards below zero: the probes are on the wrong way round.',
    }),
    form: choice('What kind of meter is it?', {
      upright: 'A tall heavy laboratory meter with a carrying strap, propped on its back leg.',
      pocket: 'A slim pocket meter lying almost flat.',
      bench: 'A wide bench instrument with a big generous dial.',
      field: 'A field meter in an open leather case, flap folded back.',
    }),
    colour: choice('What colour is the case?', {
      black: 'Glossy black bakelite.',
      brown: 'Mottled brown bakelite.',
      olive: 'Army olive drab.',
      cream: 'Cream enamel gone ivory.',
      red: 'Cheerful red plastic.',
      grey: 'Grey hammertone metal.',
    }),
    range: choice('What is the selector turned to?', {
      off: 'OFF.',
      dcv: 'DC volts.',
      acv: 'AC volts, mains.',
      ohm: 'Ohms, for continuity.',
      ma: 'Milliamps.',
    }),
    probes: choice('What are the probe leads doing?', {
      idle: 'Plugged in and laid side by side in front, waiting.',
      battery: 'Held across a fat dry-cell battery.',
      resistor: 'Clipped across a big striped resistor.',
      capacitor: 'Touched to the legs of a metal-can capacitor.',
      shorted: 'Tips touched together, to zero the meter.',
      unplugged: 'Unplugged and coiled up beside the meter.',
    }),
    notes: noul('Is there a notepad of pencilled readings beside it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const f = FORMS[a.form];
    const caseColour = new THREE.Color(CASES[a.colour]);
    const light = caseColour.getHSL({ h: 0, s: 0, l: 0 }).l > 0.5;
    const caseMat = s.material(caseColour, { roughness: a.colour === 'grey' ? 0.6 : 0.28, metalness: a.colour === 'grey' ? 0.5 : 0 });
    const dark = s.material('#161617', { roughness: 0.5 });
    const steel = s.material('#c5c9ca', { metalness: 0.85, roughness: 0.25 });
    const red = s.material('#c8261e', { roughness: 0.4 }), black = s.material('#18181a', { roughness: 0.45 });
    const mode = { off: 0, dcv: 1, acv: 2, ohm: 3, ma: 4 }[a.range];
    const winH = f.h * f.window, winW = f.w * 0.84, winY = f.h - winH / 2 - f.h * 0.06;
    const knobY = (f.h - winH) * 0.48, knobX = a.form === 'bench' ? -f.w * 0.18 : 0;

    // ---- Body, built upright with its face on +z and its back-bottom edge on the bench.
    const m = new Sculpture(context);
    const outline = new THREE.Shape();
    const r = 0.012, hw = f.w / 2;
    outline.moveTo(-hw + r, 0); outline.lineTo(hw - r, 0); outline.quadraticCurveTo(hw, 0, hw, r); outline.lineTo(hw, f.h - r); outline.quadraticCurveTo(hw, f.h, hw - r, f.h);
    outline.lineTo(-hw + r, f.h); outline.quadraticCurveTo(-hw, f.h, -hw, f.h - r); outline.lineTo(-hw, r); outline.quadraticCurveTo(-hw, 0, -hw + r, 0);
    m.mesh(new THREE.ExtrudeGeometry(outline, { depth: f.d - 0.008, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2 }), caseMat, [0, 0, 0.004]);
    const ink = light ? '#2a2622' : '#e8e2cc';
    const PX = 512, PY = Math.round(512 * f.h / f.w);
    const face = paint(PX, PY, (ctx) => {
      const X = (x: number) => (x / f.w + 0.5) * PX, Y = (y: number) => (1 - y / f.h) * PY, S = PX / f.w;
      ctx.fillStyle = light ? '#' + caseColour.getHexString() : '#19191b'; ctx.fillRect(0, 0, PX, PY);
      // Meter window.
      ctx.fillStyle = mood.wear > 0.6 ? '#ddd0a6' : '#f2ecd6';
      ctx.fillRect(X(-winW / 2), Y(winY + winH / 2), winW * S, winH * S);
      const cx = X(0), cy = Y(winY - winH * 0.42), R = winH * S * 0.82;
      const arc = (rr: number, colour: string, width: number) => { ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.beginPath(); ctx.arc(cx, cy, rr, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke(); };
      arc(R, '#1c1a18', 4); arc(R * 0.84, '#b3261e', 3); arc(R * 0.7, '#2f7a48', 3);
      ctx.strokeStyle = '#1c1a18'; ctx.fillStyle = '#1c1a18'; ctx.font = `bold ${Math.round(R * 0.085)}px monospace`; ctx.textAlign = 'center';
      for (let i = 0; i <= 20; i++) {
        const t = Math.PI * (1.25 + 0.5 * i / 20), len = i % 5 ? 0.05 : 0.1;
        ctx.lineWidth = i % 5 ? 2 : 4; ctx.beginPath(); ctx.moveTo(cx + Math.cos(t) * R, cy + Math.sin(t) * R); ctx.lineTo(cx + Math.cos(t) * R * (1 + len), cy + Math.sin(t) * R * (1 + len)); ctx.stroke();
        if (i % 5 === 0) ctx.fillText(String(i / 2), cx + Math.cos(t) * R * 1.19, cy + Math.sin(t) * R * 1.19 + 5);
      }
      ctx.font = `bold ${Math.round(R * 0.1)}px monospace`; ctx.fillText('V  Ω  mA', cx, cy - R * 0.42);
      ctx.fillStyle = '#19191b'; ctx.fillRect(X(-winW / 2), Y(winY - winH * 0.34), winW * S, 0.2 * winH * S);
      if (mood.wear > 0.55) { ctx.strokeStyle = 'rgba(40,40,40,0.75)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(X(winW * 0.2), Y(winY + winH / 2)); ctx.lineTo(X(winW * 0.05), Y(winY + winH * 0.1)); ctx.lineTo(X(winW * 0.3), Y(winY - winH * 0.1)); ctx.lineTo(X(winW * 0.16), Y(winY - winH * 0.3)); ctx.stroke(); }
      // Selector legends round the knob.
      ctx.fillStyle = ink; ctx.font = `bold ${Math.round(PX * 0.045)}px monospace`;
      const kr = Math.min(f.w * 0.3, knobY * 0.8) * S;
      MODES.forEach((label, i) => { const t = Math.PI * (1 + i / 4); ctx.fillText(label, X(knobX) + Math.cos(t) * kr, Y(knobY) + Math.sin(t) * kr + 6); });
      if (mood.wear > 0.4) { ctx.fillStyle = '#e9dfb6'; ctx.fillRect(X(f.w * 0.16), Y(f.h * 0.14), 70, 30); ctx.fillStyle = '#3a3020'; ctx.font = 'bold 15px monospace'; ctx.fillText('CAL 71', X(f.w * 0.16) + 35, Y(f.h * 0.14) + 20); }
    });
    m.mesh(new THREE.PlaneGeometry(f.w - 0.012, f.h - 0.012), new THREE.MeshStandardMaterial({ map: face, roughness: 0.4 }), [0, f.h / 2, f.d + 0.0005]);
    // Window bezel.
    for (const side of [-1, 1]) {
      m.box([winW + 0.008, 0.005, 0.006], [0, winY + side * winH / 2, f.d + 0.002], caseMat);
      m.box([0.005, winH + 0.008, 0.006], [side * winW / 2, winY, f.d + 0.002], caseMat);
    }
    const pane = m.mesh(new THREE.PlaneGeometry(winW, winH), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, roughness: 0.02, depthWrite: false }), [0, winY, f.d + 0.005]);
    pane.castShadow = false;
    // Needle.
    const swing = { zero: 0.78, low: 0.6, mid: 0, pegged: -0.85, reversed: 0.93 }[a.reading];
    const needleLen = winH * 0.78;
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.0022, needleLen, 0.001).translate(0, needleLen / 2, 0), new THREE.MeshStandardMaterial({ color: '#c41a14', roughness: 0.4 }));
    needle.position.set(0, winY - winH * 0.42, f.d + 0.0025);
    needle.rotation.z = swing;
    m.root.add(needle);
    m.cylinder(0.006, 0.006, 0.003, [0, winY - winH * 0.47, f.d + 0.003], steel, 10).rotation.x = Math.PI / 2;
    // Selector knob with a pointer bar.
    const knob = new THREE.Group();
    const kr = Math.min(f.w * 0.16, knobY * 0.42);
    const k1 = new THREE.Mesh(new THREE.CylinderGeometry(kr * 0.8, kr, 0.014, 20), dark); k1.rotation.x = Math.PI / 2; k1.position.z = 0.007;
    const k2 = new THREE.Mesh(new THREE.BoxGeometry(kr * 0.36, kr * 2.3, 0.01), dark); k2.position.z = 0.018;
    const k3 = new THREE.Mesh(new THREE.BoxGeometry(kr * 0.12, kr * 0.7, 0.002), new THREE.MeshStandardMaterial({ color: '#f1efe6' })); k3.position.set(0, kr * 0.78, 0.024);
    knob.add(k1, k2, k3); knob.traverse((o) => { o.castShadow = true; });
    knob.position.set(knobX, knobY, f.d);
    knob.rotation.z = Math.PI / 2 - mode * Math.PI / 4;
    m.root.add(knob);
    if (a.form === 'bench') {
      m.cylinder(0.012, 0.014, 0.012, [f.w * 0.22, knobY, f.d + 0.006], dark, 16).rotation.x = Math.PI / 2;
      m.box([0.012, 0.02, 0.012], [f.w * 0.38, knobY, f.d + 0.004], steel).rotation.x = 0.4;
    }
    // Jacks.
    const jx = a.form === 'bench' ? f.w * 0.06 : f.w * 0.32, jy = a.form === 'bench' ? knobY : f.h * 0.07;
    const jacks = [new THREE.Vector3(-jx + (a.form === 'bench' ? f.w * 0.06 : 0), jy, f.d + 0.004), new THREE.Vector3(jx, jy, f.d + 0.004)];
    m.cylinder(0.0065, 0.0065, 0.008, jacks[0].toArray() as P, black, 12).rotation.x = Math.PI / 2;
    m.cylinder(0.0065, 0.0065, 0.008, jacks[1].toArray() as P, red, 12).rotation.x = Math.PI / 2;
    // Carrying strap or leather case.
    const leather = s.material('#6a4326', { roughness: 0.75 });
    if (a.form === 'upright') m.tube([[-hw * 0.7, f.h, f.d / 2], [-hw * 0.5, f.h + 0.035, f.d / 2], [hw * 0.5, f.h + 0.035, f.d / 2], [hw * 0.7, f.h, f.d / 2]], 0.004, leather);
    if (a.form === 'field') {
      m.box([f.w + 0.012, f.h + 0.008, 0.006], [0, f.h / 2, -0.003], leather);
      m.box([f.w + 0.012, 0.006, f.d * 0.8], [0, -0.003, f.d * 0.4], leather);
      for (const side of [-1, 1]) m.box([0.006, f.h * 0.6, f.d * 0.8], [side * (hw + 0.003), f.h * 0.3, f.d * 0.4], leather);
      const flap = m.box([f.w + 0.012, f.h * 0.75, 0.005], [0, f.h + f.h * 0.3, -0.045], leather);
      flap.rotation.x = -0.75;
      m.box([0.02, 0.012, 0.004], [0, f.h + f.h * 0.6, -0.105], s.material('#b8913f', { metalness: 0.7, roughness: 0.3 })).rotation.x = -0.75;
    }
    // Back leg.
    if (a.form !== 'pocket') for (const side of [-1, 1]) m.rod([side * hw * 0.55, f.h * 0.6, 0], [side * hw * 0.55, f.h * 0.6 - Math.cos(f.lean) * f.h * 0.6, -Math.sin(f.lean) * f.h * 0.62 / Math.max(0.4, Math.cos(f.lean))], 0.003, steel);
    m.root.rotation.x = -f.lean;
    m.root.rotation.y = (random() - 0.5) * 0.16;
    m.root.position.set(0, 0, -0.03);
    if (a.form === 'pocket') m.root.position.y = 0.001;
    s.root.add(m.root);
    m.root.updateMatrixWorld(true);
    const jackAt = jacks.map((j) => m.root.localToWorld(j.clone().add(new THREE.Vector3(0, 0, 0.006))));
    const frontZ = m.root.localToWorld(new THREE.Vector3(0, 0, f.d)).z;

    // ---- Whatever is being measured.
    const cz = frontZ + 0.085, tips: [THREE.Vector3, THREE.Vector3] = [new THREE.Vector3(-0.035, 0.006, cz), new THREE.Vector3(0.035, 0.006, cz)];
    if (a.probes === 'battery') {
      const cell = s.cylinder(0.017, 0.017, 0.062, [0, 0.017, cz], s.material(mood.cheer > 0.5 ? '#d8a11c' : '#2f5f9a', { roughness: 0.5 }), 18);
      cell.rotation.z = Math.PI / 2;
      s.cylinder(0.0172, 0.0172, 0.012, [-0.022, 0.017, cz], steel, 18).rotation.z = Math.PI / 2;
      s.cylinder(0.005, 0.005, 0.006, [0.034, 0.017, cz], steel, 10).rotation.z = Math.PI / 2;
      tips[0].set(-0.033, 0.02, cz + 0.004); tips[1].set(0.038, 0.02, cz + 0.004);
    } else if (a.probes === 'resistor') {
      s.cylinder(0.009, 0.009, 0.05, [0, 0.011, cz], s.material('#c9a26a', { roughness: 0.6 }), 14).rotation.z = Math.PI / 2;
      ['#7a3b1a', '#1a1a1a', '#c8261e', '#c9a53a'].forEach((c, i) => { s.cylinder(0.0094, 0.0094, 0.005, [-0.016 + i * 0.009 + (i === 3 ? 0.006 : 0), 0.011, cz], s.material(c), 14).rotation.z = Math.PI / 2; });
      s.rod([-0.06, 0.008, cz], [0.06, 0.008, cz], 0.0012, steel);
      tips[0].set(-0.05, 0.01, cz + 0.002); tips[1].set(0.05, 0.01, cz + 0.002);
    } else if (a.probes === 'capacitor') {
      s.cylinder(0.02, 0.02, 0.055, [0, 0.0275, cz - 0.01], s.material('#b9bfc2', { metalness: 0.75, roughness: 0.3 }), 20);
      s.cylinder(0.0203, 0.0203, 0.03, [0, 0.026, cz - 0.01], s.material('#1f4f9a', { roughness: 0.5 }), 20);
      for (const x of [-0.008, 0.008]) s.rod([x, 0.004, cz - 0.01], [x * 4, 0.003, cz + 0.022], 0.001, steel);
      tips[0].set(-0.03, 0.005, cz + 0.02); tips[1].set(0.03, 0.005, cz + 0.02);
    } else if (a.probes === 'shorted') { tips[0].set(-0.001, 0.006, cz); tips[1].set(0.001, 0.009, cz); }
    else { tips[0].set(-0.03, 0.006, cz + 0.02); tips[1].set(-0.005, 0.006, cz + 0.025); }

    // ---- Probes and leads.
    const coiled = a.probes === 'unplugged';
    const mats = [black, red];
    for (let i = 0; i < 2; i++) {
      const side = i ? 1 : -1;
      let tip = tips[i];
      let dir = a.probes === 'idle' ? new THREE.Vector3(0.25 + i * 0.05, 0, -1).normalize() : new THREE.Vector3(-side * 0.8, 0, -0.6 - random() * 0.2).normalize();
      if (coiled) { tip = new THREE.Vector3(f.w / 2 + 0.05 + i * 0.016, 0.006, 0.08); dir = new THREE.Vector3(0.1, 0, -1); }
      const tail = tip.clone().addScaledVector(dir, -0.125); tail.y = 0.007;
      const neck = tip.clone().lerp(tail, 0.26);
      s.rod(tip.toArray() as P, neck.toArray() as P, 0.0004, steel, 0.0016);
      s.rod(neck.toArray() as P, tail.toArray() as P, 0.0045, mats[i], 0.0055);
      const guard = s.cylinder(0.0085, 0.0085, 0.003, tip.clone().lerp(tail, 0.36).toArray() as P, mats[i], 12);
      guard.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tail.clone().sub(tip).normalize());
      const far = tail.clone().addScaledVector(dir, -0.04); far.y = 0.004;
      if (coiled) {
        const pts: P[] = [tail.toArray() as P, far.toArray() as P];
        const cx = f.w / 2 + 0.085, cz2 = -0.02 + i * 0.006;
        for (let n = 0; n <= 20; n++) { const t = n / 20 * Math.PI * 4 + 1.6; pts.push([cx + Math.cos(t) * (0.034 + i * 0.005), 0.004 + n * 0.0004 + i * 0.003, cz2 + Math.sin(t) * 0.04]); }
        s.tube(pts, 0.002, mats[i]);
      } else {
        const j = jackAt[i];
        const sweep = side * (0.03 + random() * 0.03 + f.w * 0.3);
        s.tube([tail.toArray() as P, far.toArray() as P, [far.x * 0.5 + sweep, 0.004, (far.z + frontZ) / 2 + 0.02], [j.x + side * 0.03, 0.004, frontZ + 0.05 + random() * 0.02], [j.x, Math.max(0.006, j.y * 0.5), j.z + 0.03], j.toArray() as P], 0.002, mats[i]);
        const plug = s.cylinder(0.005, 0.005, 0.016, j.toArray() as P, mats[i], 10);
        plug.rotation.x = Math.PI / 2 - f.lean;
      }
      if (mood.wear > 0.65 && i === 0) s.cylinder(0.0062, 0.0062, 0.016, tip.clone().lerp(tail, 0.7).toArray() as P, s.material('#d8c23a'), 10).quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tail.clone().sub(tip).normalize());
    }

    if (a.notes) {
      const pad = paint(192, 256, (ctx) => {
        ctx.fillStyle = '#f3ecd2'; ctx.fillRect(0, 0, 192, 256);
        ctx.strokeStyle = '#9ab4c9'; ctx.lineWidth = 1;
        for (let y = 36; y < 256; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(192, y); ctx.stroke(); }
        ctx.fillStyle = '#3a3a44'; ctx.font = '17px monospace';
        ['HT  250V', 'V1a 92V', 'V2k 1.4V', 'R7  47k?', 'C4 leaky'].slice(0, 3 + Math.floor(random() * 3)).forEach((line, i) => ctx.fillText(line, 14, 54 + i * 22));
        ctx.strokeStyle = '#c8261e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(70, 92, 62, 14, 0, 0, 7); ctx.stroke();
      });
      const nx = -f.w / 2 - 0.06;
      const sheet = s.box([0.085, 0.006, 0.115], [nx, 0.003, 0.0], [0, 1, 2, 3, 4, 5].map((i) => i === 2 ? new THREE.MeshStandardMaterial({ map: pad, roughness: 0.9 }) : s.material('#e6dfc6')) as unknown as THREE.Material);
      sheet.rotation.y = 0.2 + random() * 0.3;
      const pencil = s.cylinder(0.0035, 0.0035, 0.12, [nx + 0.02, 0.0095, 0.01], s.material('#d9a21c'), 6);
      pencil.rotation.set(Math.PI / 2, 0, 0.9 + random());
    }

    const energy = mood.energy, phase = random() * 10, live = a.reading !== 'zero';
    return s.finish({
      update: (_dt, time) => {
        const wobble = live ? Math.sin(time * 6 + phase) * 0.012 + Math.sin(time * 1.7 + phase) * 0.03 : 0;
        needle.rotation.z = swing + wobble * (0.3 + energy);
      },
    });
  },
});
