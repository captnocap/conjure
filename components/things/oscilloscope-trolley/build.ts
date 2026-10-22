import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const SCREENS = {
  green: { glow: '#39ff6a', bed: '#0f3019', grid: '#2a7a44' },
  amber: { glow: '#ffb02e', bed: '#2e1e0a', grid: '#7a5420' },
  blue: { glow: '#6ec8ff', bed: '#0e2848', grid: '#2a5a90' },
  white: { glow: '#f4f4f4', bed: '#262a32', grid: '#5a6270' },
} as const;

export default defineThing({
  questions: {
    era: choice('What kind of oscilloscope is it?', {
      vintage: 'A cream and grey 1960s scope with a round screen and bakelite knobs.',
      eighties: 'A beige 1980s bench scope with a rectangular CRT and rows of knobs.',
      modern: 'A black modern scope with a flat colour display and a few soft keys.',
    }),
    screen: choice('What colour is the screen?', {
      green: 'Classic green phosphor.',
      amber: 'Warm amber phosphor.',
      blue: 'Pale blue phosphor.',
      white: 'A white trace on a dark modern display.',
    }),
    trace: choice('What is on the screen?', {
      sine: 'A clean sine wave.',
      flatline: 'A flat line, nothing on the probe.',
      noise: 'Jagged noise, a signal that will not settle.',
      square: 'A square wave with ringing on the edges.',
      pulse: 'A pulse train, sharp spikes at intervals.',
      lissajous: 'A looping Lissajous figure.',
    }),
    stacked: choice('What is stacked on or under it?', {
      nothing: 'Nothing: just the scope on the trolley.',
      generator: 'A signal generator with a big dial on the lower shelf.',
      supply: 'A bench power supply with two meters on top of the scope.',
      cables: 'A cardboard box of tangled cables on the lower shelf.',
      manual: 'A fat ring-bound manual open on the lower shelf.',
    }),
    mug: noul('Is there a mug on top of the scope?'),
    probes: choice('What about the probes?', {
      coiled: 'Probe leads coiled neatly on a side hook.',
      plugged: 'Two probes plugged in, leads trailing off the front.',
      tangled: 'A tangle of leads hanging down the side.',
    }),
    tag: choice('What label is stuck on the front?', {
      none: 'No label.', cal: 'A CAL DUE sticker.', name: 'A tape label with a name scrawled on it.', broken: 'A sticker saying DO NOT ADJUST.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const steel = s.material('#8a9096', { metalness: 0.6, roughness: 0.45 });
    const dark = s.material('#2a2c30', { roughness: 0.6 });
    const rubber = s.material('#1f2124', { roughness: 0.85 });

    // Trolley: two shelves, four posts, casters, a push handle.
    const W = 0.64, D = 0.5, topY = 0.82, lowY = 0.22;
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      s.box([0.03, topY, 0.03], [x * (W / 2 - 0.02), topY / 2 + 0.04, z * (D / 2 - 0.02)], steel);
      s.cylinder(0.035, 0.035, 0.025, [x * (W / 2 - 0.02), 0.035, z * (D / 2 - 0.02)], rubber, 12).rotation.x = Math.PI / 2;
      s.box([0.02, 0.05, 0.02], [x * (W / 2 - 0.02), 0.07, z * (D / 2 - 0.02)], dark);
    }
    s.box([W, 0.025, D], [0, topY + 0.04, 0], s.material('#9aa0a6', { metalness: 0.5, roughness: 0.5 }));
    s.box([W, 0.025, D], [0, lowY, 0], s.material('#9aa0a6', { metalness: 0.5, roughness: 0.5 }));
    for (const z of [-1, 1]) s.box([W, 0.03, 0.01], [0, topY + 0.065, z * (D / 2 - 0.005)], steel);
    s.tube([[-W / 2 + 0.05, topY + 0.05, -D / 2], [-W / 2 + 0.05, topY + 0.25, -D / 2 - 0.08], [0, topY + 0.3, -D / 2 - 0.1], [W / 2 - 0.05, topY + 0.25, -D / 2 - 0.08], [W / 2 - 0.05, topY + 0.05, -D / 2]], 0.013, steel);
    const shelfTop = topY + 0.053;

    // The scope body.
    const bodyColour = { vintage: '#d9d2bd', eighties: '#cfc6ad', modern: '#2b2d31' }[a.era];
    const body = s.material(bodyColour, { roughness: 0.6, metalness: a.era === 'modern' ? 0.3 : 0.1 });
    const SW = a.era === 'modern' ? 0.38 : 0.44, SH = a.era === 'vintage' ? 0.3 : 0.2, SD = a.era === 'modern' ? 0.14 : 0.42;
    const scopeY = shelfTop + SH / 2 + 0.015;
    const scopeZ = a.era === 'modern' ? 0.05 : 0;
    s.box([SW, SH, SD], [0, scopeY, scopeZ], body);
    for (const x of [-1, 1]) s.box([0.02, 0.03, 0.02], [x * (SW / 2 - 0.05), shelfTop + 0.008, scopeZ + SD / 2 - 0.05], rubber);
    if (a.era !== 'modern') s.box([SW * 0.6, 0.012, 0.03], [0, scopeY + SH / 2 + 0.006, scopeZ - 0.05], dark);
    const frontZ = scopeZ + SD / 2;
    if (a.era === 'modern') {
      s.box([0.1, 0.05, 0.1], [0, shelfTop + 0.035, scopeZ - 0.06], dark);
      s.box([0.2, 0.012, 0.08], [0, shelfTop + 0.006, scopeZ - 0.06], dark);
    }

    // The screen: a canvas redrawn every frame with the wobbling trace.
    const palette = SCREENS[a.screen];
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = a.era === 'vintage' ? 256 : 192;
    const ctx = canvas.getContext('2d')!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const glowColour = new THREE.Color(palette.glow);
    const screenMaterial = new THREE.MeshStandardMaterial({ map: texture, emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: mix(0.8, 1.2, mood.cheer), roughness: 0.3 });
    const sw = a.era === 'vintage' ? SH * 0.72 : a.era === 'modern' ? SW * 0.66 : SW * 0.5;
    const sh = a.era === 'vintage' ? SH * 0.72 : SH * 0.72;
    const screenX = a.era === 'vintage' ? -SW * 0.2 : a.era === 'modern' ? -SW * 0.1 : -SW * 0.21;
    const screenGeometry = a.era === 'vintage' ? new THREE.CircleGeometry(sw / 2, 32) : new THREE.PlaneGeometry(sw, sh);
    s.mesh(screenGeometry, screenMaterial, [screenX, scopeY + (a.era === 'vintage' ? 0 : 0.01), frontZ + 0.0065]);
    if (a.era === 'vintage') s.ring(sw / 2 + 0.008, 0.008, [screenX, scopeY, frontZ + 0.002], dark);
    else s.box([sw + 0.02, sh + 0.02, 0.006], [screenX, scopeY + 0.01, frontZ + 0.001], dark);

    // Knobs: a few real cylinders for silhouette, and a painted panel for the rest.
    const knob = s.material(a.era === 'modern' ? '#55595f' : '#2b2b2b', { roughness: 0.5 });
    const knobX = a.era === 'vintage' ? SW * 0.2 : a.era === 'modern' ? SW * 0.36 : SW * 0.26;
    const rows = a.era === 'modern' ? 2 : 3, cols = a.era === 'modern' ? 2 : 4;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const kx = knobX + (c - (cols - 1) / 2) * (a.era === 'modern' ? 0.05 : 0.045);
      const ky = scopeY + (r - (rows - 1) / 2) * (SH * 0.26);
      const big = (r + c) % 3 === 0;
      s.cylinder(big ? 0.016 : 0.01, big ? 0.016 : 0.01, 0.018, [kx, ky, frontZ + 0.009], knob, 12).rotation.x = Math.PI / 2;
      s.box([0.003, big ? 0.014 : 0.008, 0.004], [kx, ky + (big ? 0.006 : 0.004), frontZ + 0.019], s.material('#e8e8e8'));
    }
    if (a.era !== 'modern') for (let i = 0; i < 2; i++) s.cylinder(0.009, 0.009, 0.014, [-SW * 0.2 + i * 0.06 + (a.era === 'vintage' ? 0.0 : 0.0), scopeY - SH * 0.42, frontZ + 0.007], s.material('#c9a44a', { metalness: 0.7, roughness: 0.3 }), 10).rotation.x = Math.PI / 2;
    if (a.era === 'modern') for (let i = 0; i < 5; i++) s.box([0.018, 0.01, 0.006], [screenX - 0.1 + i * 0.05, scopeY - sh / 2 - 0.02, frontZ + 0.003], knob);
    // A power light.
    s.ball([0.005, 0.005, 0.005], [SW / 2 - 0.03, scopeY + SH / 2 - 0.025, frontZ + 0.003], s.material('#ff3b2e', { emissive: '#ff3b2e', emissiveIntensity: 1 }), 8);
    if (a.tag !== 'none') {
      const text = { cal: 'CAL DUE', name: "DAVE'S", broken: 'DO NOT ADJUST' }[a.tag as 'cal' | 'name' | 'broken'];
      const paper = a.tag === 'broken' ? '#e8c020' : a.tag === 'cal' ? '#ffffff' : '#d8d2b8';
      s.label(text, 0.11, 0.028, [SW * 0.28, scopeY + SH / 2 - 0.03, frontZ + 0.0025], '#1d1d1f', paper).rotation.z = (random() - 0.5) * 0.2;
    }

    // Probes.
    const bnc = s.material('#c9ccd0', { metalness: 0.75, roughness: 0.3 });
    const probeY = scopeY - SH * 0.42;
    for (const i of [0, 1]) s.cylinder(0.008, 0.008, 0.012, [-SW * 0.2 + i * 0.06, probeY, frontZ + 0.006], bnc, 10).rotation.x = Math.PI / 2;
    if (a.probes === 'coiled') {
      const hookX = SW / 2 + 0.03;
      s.box([0.06, 0.01, 0.01], [SW / 2 + 0.03, scopeY + 0.02, scopeZ], dark);
      for (let i = 0; i < 3; i++) {
        const coil = s.ring(0.065 + i * 0.004, 0.006, [hookX + 0.02 + i * 0.012, scopeY - 0.045, scopeZ], rubber);
        coil.rotation.y = Math.PI / 2;
        coil.rotation.x = (random() - 0.5) * 0.2;
      }
    } else if (a.probes === 'plugged') {
      for (const i of [0, 1]) {
        const x = -SW * 0.2 + i * 0.06;
        s.tube([[x, probeY, frontZ + 0.012], [x + 0.05 * (i ? 1 : -1), probeY - 0.08, frontZ + 0.12], [x + 0.12 * (i ? 1 : -1), shelfTop + 0.02, frontZ + 0.06 + i * 0.05], [x + 0.2 * (i ? 1 : -1), shelfTop + 0.01, frontZ - 0.05]], 0.004, rubber);
        s.cylinder(0.006, 0.004, 0.06, [x + 0.2 * (i ? 1 : -1), shelfTop + 0.015, frontZ - 0.07], s.material(i ? '#c8302c' : '#2a2a2c'), 10).rotation.x = Math.PI / 2;
      }
    } else {
      for (let i = 0; i < 4; i++) {
        const x = SW / 2 - 0.02 + random() * 0.03;
        s.tube([[x, scopeY, scopeZ + (random() - 0.5) * 0.2], [x + 0.08, scopeY - 0.15 - random() * 0.1, scopeZ + (random() - 0.5) * 0.25], [x + 0.03, shelfTop - 0.1 - random() * 0.3, scopeZ + (random() - 0.5) * 0.3], [x + 0.06, lowY + 0.02, scopeZ + (random() - 0.5) * 0.3]], 0.004, i % 2 ? rubber : s.material('#c8302c'));
      }
    }

    // Stacked gear.
    if (a.stacked === 'generator') {
      s.box([0.36, 0.14, 0.3], [0, lowY + 0.0825, 0.02], s.material('#8c8f8a', { roughness: 0.6 }));
      s.cylinder(0.045, 0.045, 0.02, [-0.08, lowY + 0.09, 0.18], dark, 20).rotation.x = Math.PI / 2;
      s.box([0.004, 0.03, 0.006], [-0.08, lowY + 0.105, 0.19], s.material('#e8e8e8'));
      for (let i = 0; i < 4; i++) s.cylinder(0.01, 0.01, 0.014, [0.03 + i * 0.035, lowY + 0.07, 0.177], knob, 10).rotation.x = Math.PI / 2;
      s.label('SIGNAL GEN', 0.16, 0.025, [0.06, lowY + 0.12, 0.171], '#1d1d1f', '#d8d4c4');
    } else if (a.stacked === 'supply') {
      const y = scopeY + SH / 2 + 0.07;
      s.box([0.34, 0.14, 0.3], [0, y, scopeZ], s.material('#3b4a5c', { roughness: 0.55 }));
      for (const x of [-0.09, 0.03]) {
        s.box([0.09, 0.06, 0.006], [x, y + 0.02, scopeZ + 0.152], s.material('#f2f0e6'));
        s.box([0.003, 0.04, 0.004], [x + (random() - 0.5) * 0.05, y + 0.02, scopeZ + 0.156], s.material('#c8302c')).rotation.z = (random() - 0.5) * 1.2;
      }
      for (let i = 0; i < 3; i++) s.cylinder(0.012, 0.012, 0.016, [0.1 + i * 0.0, y - 0.03 + i * 0.03 - 0.03, scopeZ + 0.157], knob, 10).rotation.x = Math.PI / 2;
      for (const [i, c] of ['#c8302c', '#1d1d1f'].entries()) s.cylinder(0.007, 0.007, 0.016, [-0.06 + i * 0.03, y - 0.045, scopeZ + 0.157], s.material(c), 8).rotation.x = Math.PI / 2;
    } else if (a.stacked === 'cables') {
      s.box([0.38, 0.2, 0.3], [0, lowY + 0.1125, 0], s.material('#b89468', { roughness: 0.9 }));
      s.box([0.37, 0.004, 0.29], [0, lowY + 0.21, 0], s.material('#a07c52', { roughness: 0.9 }));
      for (let i = 0; i < 8; i++) {
        const colour = ['#1f2124', '#c8302c', '#2a4fb8', '#e8e8e8'][i % 4];
        const loop = s.ring(0.03 + random() * 0.05, 0.004, [(random() - 0.5) * 0.26, lowY + 0.2 + random() * 0.05, (random() - 0.5) * 0.2], s.material(colour));
        loop.rotation.set(random() * 2, random() * 2, random() * 2);
      }
    } else if (a.stacked === 'manual') {
      s.box([0.3, 0.035, 0.22], [0.02, lowY + 0.03, 0], s.material('#f2efe4', { roughness: 0.95 }));
      s.box([0.31, 0.04, 0.012], [0.02, lowY + 0.03, -0.11], s.material('#2a2c30'));
      for (let i = 0; i < 5; i++) s.ring(0.01, 0.003, [-0.1 + i * 0.06, lowY + 0.05, -0.11], steel).rotation.y = Math.PI / 2;
      s.label('MANUAL', 0.16, 0.035, [0.02, lowY + 0.049, 0.0], '#5a5a5a', '#f2efe4').rotation.x = -Math.PI / 2;
    }
    if (a.mug) {
      const mugY = a.stacked === 'supply' ? scopeY + SH / 2 + 0.14 : scopeY + SH / 2;
      const mx = SW / 2 - 0.08, mz = scopeZ - 0.12;
      s.cylinder(0.04, 0.036, 0.095, [mx, mugY + 0.0475, mz], s.material(['#f2efe4', '#c8302c', '#2a4fb8', '#3f7a5a'][Math.floor(random() * 4)], { roughness: 0.5 }), 16);
      s.cylinder(0.035, 0.035, 0.004, [mx, mugY + 0.092, mz], s.material('#4a2e1c'), 16);
      s.ring(0.022, 0.006, [mx + 0.045, mugY + 0.05, mz], s.material('#f2efe4', { roughness: 0.5 }));
    }

    // Draw the trace.
    const w = canvas.width, h = canvas.height;
    const wobble = mix(0.15, 1, mood.energy);
    const drawTrace = (time: number) => {
      ctx.fillStyle = palette.bed;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = palette.grid;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 1; i < 10; i++) { ctx.moveTo((i / 10) * w, 0); ctx.lineTo((i / 10) * w, h); }
      for (let i = 1; i < 8; i++) { ctx.moveTo(0, (i / 8) * h); ctx.lineTo(w, (i / 8) * h); }
      ctx.stroke();
      ctx.strokeStyle = palette.glow;
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.shadowColor = palette.glow;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      const amp = h * 0.3;
      const phase = time * 2.2 * wobble;
      if (a.trace === 'lissajous') {
        for (let i = 0; i <= 200; i++) {
          const t = (i / 200) * Math.PI * 2;
          const x = w / 2 + Math.sin(3 * t + phase) * w * 0.38;
          const y = h / 2 + Math.sin(2 * t) * amp;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
      } else {
        for (let i = 0; i <= w; i += 2) {
          const t = (i / w) * Math.PI * 4;
          let y = 0;
          if (a.trace === 'sine') y = Math.sin(t + phase) * amp;
          else if (a.trace === 'flatline') y = Math.sin(t * 7 + phase * 3) * 1.2;
          else if (a.trace === 'noise') y = (Math.sin(t * 13 + phase * 5) * 0.5 + Math.sin(t * 37 + phase * 11) * 0.3 + Math.sin(t * 5.3 - phase * 2) * 0.4) * amp;
          else if (a.trace === 'square') { const sq = Math.sign(Math.sin(t + phase)); y = sq * amp * 0.8 + Math.sin(t * 25 + phase) * Math.exp(-((t + phase) % Math.PI) * 3) * amp * 0.4; }
          else { const cycle = (t + phase) % 1.6; y = cycle < 0.12 ? -amp * 0.9 : cycle < 0.2 ? amp * 0.3 : -amp * 0.1 + Math.sin(t * 2) * 3; }
          const yy = h / 2 - y + (a.trace === 'flatline' ? 0 : Math.sin(i * 0.3 + time * 9) * wobble * 1.5);
          if (i === 0) ctx.moveTo(i, yy); else ctx.lineTo(i, yy);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = palette.glow;
      ctx.font = '12px monospace';
      ctx.fillText(a.trace === 'flatline' ? '0 V' : `${(1 + Math.round(wobble * 4))}V/div`, 6, h - 6);
      texture.needsUpdate = true;
    };
    drawTrace(0);
    void glowColour;
    let last = -1;
    return s.finish({
      update: (_dt, time) => {
        if (time - last < 1 / 20) return;
        last = time;
        drawTrace(time);
      },
    });
  },
});
