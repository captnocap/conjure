import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const SAUCE = { cheese: { name: ['NACHO', 'CHEESE'], colour: '#ffa51f', deep: '#e0700a' }, chili: { name: ['HOT', 'CHILI'], colour: '#8f2c12', deep: '#4a1408' }, queso: { name: ['QUESO', 'BLANCO'], colour: '#fff0c2', deep: '#e2c98a' } } as const;
type Sauce = keyof typeof SAUCE;

export default defineThing({
  questions: {
    fill: choice('What does it dispense?', {
      cheese: 'Molten orange nacho cheese, the colour of a traffic cone.',
      chili: 'Dark red-brown chili, for dogs and nachos.',
      queso: 'Pale creamy queso blanco.',
      both: 'A double unit: cheese on one side, chili on the other.',
    }),
    panel: choice('What is the backlit front panel artwork?', {
      wave: 'A glossy wave of melted cheese pouring across big block letters.',
      mascot: 'A grinning cartoon cheese wedge with googly eyes.',
      stadium: 'Team stripes and a pennant: GAME DAY.',
      flames: 'Black with flames licking up from the bottom.',
      taped: 'Unlit, with a handwritten OUT OF ORDER note taped over it.',
    }),
    flow: choice('What is the spout doing right now?', {
      drip: 'One fat drip hanging, then falling.',
      strand: 'A long thin stringy strand that never quite breaks.',
      stream: 'A steady stream, as if someone just pressed the button.',
      dried: 'Nothing: a dried stalactite crusted on the nozzle.',
    }),
    tray: choice('What state is the drip tray in?', {
      clean: 'Wiped clean, bare steel grate.',
      crusted: 'Crusted with layered dried blobs.',
      overflowing: 'Overflowing: a pool creeping over the lip and down onto the counter.',
    }),
    abandoned: noul('Does a half-filled tray of nachos sit abandoned in front of it?'),
    hopper: score('How full is the tortilla chip hopper?', ['Crumbs and salt', 'A few handfuls', 'Half', 'Heaped to the lid']),
    jalapenos: choice('What sits beside it?', {
      tub: 'A steel tub of sliced jalapenos with a spoon.',
      trays: 'Only the stack of paper trays.',
      both: 'Jalapeno tub and a tall stack of paper trays.',
      nothing: 'Nothing but the chip hopper.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const steel = s.material('#c3c8c9', { metalness: 0.8, roughness: 0.3 + mood.wear * 0.3 });
    const shell = s.material('#232426', { roughness: 0.5, metalness: 0.2 });
    const wells: Sauce[] = a.fill === 'both' ? ['cheese', 'chili'] : [a.fill];
    const unit = 0.3, W = wells.length * unit + 0.04, D = 0.34, H = 0.5;
    const lit = a.panel !== 'taped';
    const glowColour = new THREE.Color().setHSL(mix(0.11, 0.05, mood.warmth), 1, 0.55);
    const glow = lit ? mix(0.75, 1.5, mood.cheer) : 0.06;

    // Warmer body: dark shell, orange shoulders, a lidded well on top, feet.
    s.box([W, H - 0.04, D], [0, 0.03 + (H - 0.04) / 2, 0], shell);
    s.box([W + 0.012, 0.05, D + 0.012], [0, H - 0.02, 0], s.material('#ff7a14', { roughness: 0.4, emissive: glowColour, emissiveIntensity: glow * 0.25 }));
    s.box([W + 0.012, 0.03, D + 0.012], [0, 0.045, 0], s.material('#ff7a14', { roughness: 0.4 }));
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.018, 0.022, 0.03, [x * (W / 2 - 0.035), 0.015, z * (D / 2 - 0.035)], shell, 10);
    for (let i = 0; i < 6; i++) for (const x of [-1, 1]) s.box([0.004, 0.012, D * 0.5], [x * (W / 2 + 0.001), 0.2 + i * 0.03, -0.03], s.material('#0e0e10'));

    const pulses: { mesh: THREE.Mesh; top: number; bottom: number; phase: number; mode: string }[] = [];
    const trayY = 0.03;
    wells.forEach((sauce, index) => {
      const x = (index - (wells.length - 1) / 2) * unit;
      const spec = SAUCE[sauce];
      const goo = s.material(spec.colour, { roughness: 0.22, emissive: spec.colour, emissiveIntensity: sauce === 'chili' ? 0.05 : 0.22 });
      const crust = s.material(spec.deep, { roughness: 0.8 });
      // Lid with knob.
      s.cylinder(0.105, 0.11, 0.02, [x, H + 0.015, -0.02], steel, 28);
      s.cylinder(0.022, 0.03, 0.03, [x, H + 0.04, -0.02], shell, 14);
      // Backlit panel.
      const art = paint(256, 208, (ctx) => {
        const [top, bottom] = spec.name;
        const block = (value: string, y: number, size: number, fill: string, stroke: string) => { ctx.font = `italic 900 ${size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = 9; ctx.strokeStyle = stroke; ctx.strokeText(value, 128, y, 236); ctx.fillStyle = fill; ctx.fillText(value, 128, y, 236); };
        if (a.panel === 'flames') {
          ctx.fillStyle = '#120a08'; ctx.fillRect(0, 0, 256, 208);
          for (let i = 0; i < 16; i++) { const fx = i * 17 + random() * 8, h = 60 + random() * 90; const g = ctx.createLinearGradient(0, 208, 0, 208 - h); g.addColorStop(0, '#ffe14a'); g.addColorStop(0.5, '#ff6a14'); g.addColorStop(1, 'rgba(200,16,10,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(fx - 16, 208); ctx.quadraticCurveTo(fx - 4, 208 - h * 0.6, fx + 4, 208 - h); ctx.quadraticCurveTo(fx + 10, 208 - h * 0.5, fx + 18, 208); ctx.fill(); }
          block(top, 60, 58, '#ffffff', '#c8100a'); block(bottom, 118, 58, '#ffe14a', '#c8100a');
        } else if (a.panel === 'stadium') {
          ctx.fillStyle = '#152a6e'; ctx.fillRect(0, 0, 256, 208);
          ctx.fillStyle = '#c8102e'; ctx.fillRect(0, 150, 256, 20); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 170, 256, 8); ctx.fillRect(0, 142, 256, 8);
          ctx.fillStyle = spec.colour; ctx.beginPath(); ctx.moveTo(20, 16); ctx.lineTo(236, 40); ctx.lineTo(20, 64); ctx.fill();
          ctx.fillStyle = '#152a6e'; ctx.font = '900 26px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('GAME DAY', 28, 41);
          block(`${top} ${bottom}`, 104, 50, '#ffffff', '#0a1440');
          block('NACHOS', 190, 22, '#ffe14a', '#0a1440');
        } else if (a.panel === 'mascot') {
          ctx.fillStyle = '#d3201c'; ctx.fillRect(0, 0, 256, 208);
          ctx.fillStyle = '#ffd21f'; ctx.beginPath(); ctx.moveTo(40, 190); ctx.lineTo(128, 62); ctx.lineTo(216, 190); ctx.fill();
          ctx.fillStyle = '#e09a14'; for (const [hx, hy, hr] of [[100, 160, 10], [150, 172, 8], [132, 120, 7]]) { ctx.beginPath(); ctx.arc(hx, hy, hr, 0, 7); ctx.fill(); }
          for (const ex of [108, 148]) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ex, 134, 15, 0, 7); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(ex + 4, 137, 7, 0, 7); ctx.fill(); }
          ctx.strokeStyle = '#7a1a0c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(128, 150, 26, 0.3, Math.PI - 0.3); ctx.stroke();
          block(`${top} ${bottom}!`, 34, 40, '#ffffff', '#7a0a08');
        } else {
          const g = ctx.createLinearGradient(0, 0, 0, 208); g.addColorStop(0, '#d3201c'); g.addColorStop(1, '#8f100c');
          ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 208);
          ctx.fillStyle = spec.colour; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(256, 0); ctx.lineTo(256, 44);
          for (let px = 256; px >= 0; px -= 32) { const d = 40 + random() * 60; ctx.bezierCurveTo(px - 4, 44 + d, px - 26, 44 + d, px - 32, 40); }
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(14, 8, 150, 7);
          block(top, 112, 62, '#ffffff', '#5a0a06'); block(bottom, 168, 62, '#ffe14a', '#5a0a06');
        }
        if (mood.wear > 0.3) { ctx.fillStyle = `rgba(90,60,20,${mood.wear * 0.3})`; for (let i = 0; i < mood.wear * 30; i++) ctx.fillRect(random() * 256, random() * 208, 4 + random() * 22, 2 + random() * 5); }
      });
      const panel = s.mesh(new THREE.PlaneGeometry(unit - 0.05, 0.205), new THREE.MeshStandardMaterial({ map: art, roughness: 0.25, emissive: '#ffffff', emissiveMap: art, emissiveIntensity: glow }), [x, H - 0.16, D / 2 + 0.004]);
      s.box([unit - 0.03, 0.225, 0.008], [x, H - 0.16, D / 2 - 0.001], steel);
      if (!lit) {
        const note = paint(200, 150, (ctx) => { ctx.fillStyle = '#f7f3e4'; ctx.fillRect(0, 0, 200, 150); ctx.fillStyle = '#1b2a66'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 40px cursive'; ctx.fillText('OUT OF', 100, 46); ctx.fillText('ORDER', 100, 92); ctx.font = '26px cursive'; ctx.fillText(':(  sorry', 100, 128); ctx.fillStyle = 'rgba(230,220,170,0.9)'; ctx.fillRect(70, 0, 60, 14); });
        const paper = s.mesh(new THREE.PlaneGeometry(0.17, 0.128), new THREE.MeshStandardMaterial({ map: note, roughness: 0.9 }), [x + (random() - 0.5) * 0.03, H - 0.15, D / 2 + 0.008]);
        paper.rotation.z = (random() - 0.5) * 0.25;
      }
      void panel;
      // Nozzle block, push button and spout.
      const spoutY = 0.2, spoutZ = D / 2 + 0.06;
      s.box([0.09, 0.07, 0.09], [x, spoutY + 0.035, D / 2 + 0.04], steel);
      s.cylinder(0.014, 0.018, 0.035, [x, spoutY - 0.015, spoutZ], steel, 12);
      s.cylinder(0.03, 0.03, 0.02, [x, spoutY + 0.08, D / 2 + 0.045], s.material('#e8232e', { roughness: 0.3, emissive: '#ff2a1c', emissiveIntensity: lit ? 0.8 : 0 }), 18);
      s.cylinder(0.036, 0.036, 0.008, [x, spoutY + 0.071, D / 2 + 0.045], shell, 18);
      // Drip tray with grate.
      s.box([unit - 0.06, 0.02, 0.14], [x, trayY + 0.01, D / 2 + 0.06], steel);
      for (let i = 0; i < 9; i++) s.box([0.004, 0.006, 0.12], [x - 0.1 + i * 0.025, trayY + 0.022, D / 2 + 0.06], shell);
      const bottom = trayY + 0.026, topY = spoutY - 0.033;
      // The flow.
      if (a.flow === 'dried') s.cylinder(0.004, 0.014, 0.05 + random() * 0.03, [x, topY - 0.03, spoutZ], crust, 8).rotation.x = Math.PI;
      else if (a.flow === 'stream') {
        const stream = s.cylinder(0.011, 0.008, topY - bottom, [x, (topY + bottom) / 2, spoutZ], goo, 10);
        pulses.push({ mesh: stream, top: topY, bottom, phase: random() * 6, mode: 'stream' });
        s.cylinder(0.04, 0.05, 0.012, [x, bottom + 0.004, spoutZ], goo, 16);
      } else {
        const long = a.flow === 'strand';
        if (long) s.cylinder(0.006, 0.0018, (topY - bottom) * 0.72, [x, topY - (topY - bottom) * 0.36, spoutZ], goo, 8);
        const drop = s.mesh(new THREE.SphereGeometry(0.012, 12, 10), goo, [x, long ? topY - (topY - bottom) * 0.74 : topY - 0.02, spoutZ]);
        drop.scale.set(1, 1.5, 1);
        s.ball([0.013, 0.008, 0.013], [x, topY + 0.002, spoutZ], goo, 10);
        if (!long) pulses.push({ mesh: drop, top: topY - 0.012, bottom: bottom + 0.012, phase: random(), mode: 'drip' });
      }
      // Tray state.
      if (a.tray !== 'clean') {
        const blobs = a.tray === 'crusted' ? 9 + Math.floor(random() * 6) : 5;
        for (let i = 0; i < blobs; i++) s.ball([0.012 + random() * 0.02, 0.004 + random() * 0.01, 0.012 + random() * 0.018], [x + (random() - 0.5) * 0.18, bottom + 0.002, D / 2 + 0.02 + random() * 0.09], a.tray === 'crusted' || random() < 0.4 ? crust : goo, 10);
        if (a.tray === 'crusted') s.cylinder(0.003, 0.016, 0.03 + random() * 0.03, [x, bottom + 0.02, spoutZ], crust, 8);
        else {
          s.box([unit - 0.075, 0.008, 0.125], [x, trayY + 0.025, D / 2 + 0.06], goo);
          const lip = D / 2 + 0.13;
          s.ball([0.07 + random() * 0.04, 0.005, 0.05 + random() * 0.03], [x + (random() - 0.5) * 0.05, 0.004, lip + 0.04], goo, 16);
          for (let i = 0; i < 3; i++) { const dx = x + (random() - 0.5) * 0.16; s.rod([dx, trayY + 0.026, lip], [dx, 0.004, lip + 0.004], 0.007, goo, 0.01); }
        }
      }
      if (mood.wear > 0.5) for (let i = 0; i < 3; i++) s.rod([x + (random() - 0.5) * 0.1, spoutY, D / 2 + 0.003], [x + (random() - 0.5) * 0.1, spoutY - 0.04 - random() * 0.09, D / 2 + 0.003], 0.005, crust, 0.002);
    });

    // Chip hopper on the left: a clear bin in a steel frame, with a scoop door.
    const hx = -(W / 2 + 0.17), hw = 0.27, hh = 0.42, hd = 0.27;
    const clear = new THREE.MeshPhysicalMaterial({ color: '#f6fbff', transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false });
    s.box([hw, hh, hd], [hx, 0.05 + hh / 2, 0], clear).castShadow = false;
    s.box([hw + 0.02, 0.05, hd + 0.02], [hx, 0.025, 0], shell);
    s.box([hw + 0.02, 0.025, hd + 0.02], [hx, 0.05 + hh + 0.0125, 0], s.material('#ff7a14', { roughness: 0.4 }));
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.012, hh, 0.012], [hx + x * hw / 2, 0.05 + hh / 2, z * hd / 2], steel);
    s.label('CHIPS', 0.16, 0.045, [hx, 0.05 + hh - 0.04, hd / 2 + 0.003], '#ffffff', '#d3201c');
    const level = mix(0.03, 0.92, a.hopper) * mix(0.85, 1, mood.density);
    const chipCount = Math.round(mix(10, 230, a.hopper));
    const chipTints = ['#f0c95a', '#e8b84a', '#f6d878', '#d9a23a'];
    const chips = Array.from({ length: chipCount }, () => {
      const cx = hx + (random() - 0.5) * (hw - 0.05), cz = (random() - 0.5) * (hd - 0.05);
      const heap = level * hh * (1 - 0.35 * Math.hypot((cx - hx) / hw, cz / hd) * 2);
      return { at: [cx, 0.058 + random() ** 0.6 * Math.max(heap, 0.01), cz] as [number, number, number], size: mix(0.8, 1.2, random()), color: chipTints[Math.floor(random() * 4)] };
    });
    const chipGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.004, 3);
    const chipMaterial = s.material('#ffffff', { roughness: 0.85 });
    const heap = s.scatter(chipGeometry, chipMaterial, chips);
    const tumble = new THREE.Object3D();
    chips.forEach((chip, i) => { tumble.position.set(...chip.at); tumble.rotation.set(random() * 3, random() * 6, random() * 3); tumble.scale.setScalar(chip.size); tumble.updateMatrix(); heap.setMatrixAt(i, tumble.matrix); });

    // Paper trays and jalapenos on the right.
    const checks = paint(64, 64, (ctx) => { ctx.fillStyle = '#f7f3e6'; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = '#d3201c'; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) ctx.fillRect(i * 8, j * 8, 8, 8); });
    const boatMaterial = new THREE.MeshStandardMaterial({ map: checks, roughness: 0.9 });
    const boat = (at: [number, number, number], turn: number) => {
      const mesh = s.mesh(new THREE.CylinderGeometry(0.085, 0.06, 0.032, 4, 1).rotateY(Math.PI / 4), boatMaterial, at);
      mesh.scale.set(1.25, 1, 0.9);
      mesh.rotation.y = turn;
      return mesh;
    };
    const rx = W / 2 + 0.13;
    if (a.jalapenos === 'trays' || a.jalapenos === 'both') {
      const count = Math.round(mix(4, 22, mood.density) * mix(0.7, 1, random()));
      const z = a.jalapenos === 'both' ? -0.08 : 0.02;
      for (let i = 0; i < count; i++) boat([rx + (random() - 0.5) * 0.006, 0.016 + i * 0.0085, z + (random() - 0.5) * 0.006], (random() - 0.5) * mix(0.03, 0.3, mood.wear));
    }
    if (a.jalapenos === 'tub' || a.jalapenos === 'both') {
      const z = a.jalapenos === 'both' ? 0.14 : 0.04;
      s.lathe([[0.001, 0.004], [0.06, 0.004], [0.075, 0.09], [0.082, 0.09], [0.064, 0], [0.001, 0]], steel, [rx, 0, z]);
      s.cylinder(0.072, 0.066, 0.01, [rx, 0.07, z], s.material('#9fb04a', { roughness: 0.25 }), 18);
      const rings = Array.from({ length: 16 }, () => { const t = random() * 6.3, r = random() * 0.055; return { at: [rx + Math.cos(t) * r, 0.077 + random() * 0.006, z + Math.sin(t) * r] as [number, number, number], size: mix(0.8, 1.3, random()), color: random() < 0.2 ? '#c8d87a' : '#3f8a2a' }; });
      s.scatter(new THREE.TorusGeometry(0.011, 0.004, 5, 10).rotateX(Math.PI / 2), s.material('#ffffff', { roughness: 0.4 }), rings);
      s.rod([rx + 0.02, 0.075, z], [rx + 0.1, 0.15, z - 0.05], 0.004, steel);
    }
    if (a.abandoned) {
      const bx = (random() - 0.5) * 0.1 + (wells.length > 1 ? 0 : 0.02), bz = D / 2 + 0.26 + random() * 0.05;
      boat([bx, 0.016, bz], (random() - 0.5) * 0.8);
      const few = Array.from({ length: 9 + Math.floor(random() * 6) }, () => ({ at: [bx + (random() - 0.5) * 0.14, 0.035 + random() * 0.02, bz + (random() - 0.5) * 0.09] as [number, number, number], size: mix(0.8, 1.1, random()), color: chipTints[Math.floor(random() * 4)] }));
      const plate = s.scatter(chipGeometry, chipMaterial, few);
      few.forEach((chip, i) => { tumble.position.set(...chip.at); tumble.rotation.set((random() - 0.5) * 0.9, random() * 6, (random() - 0.5) * 0.9); tumble.scale.setScalar(chip.size); tumble.updateMatrix(); plate.setMatrixAt(i, tumble.matrix); });
      const spec = SAUCE[wells[0]];
      const goo = s.material(spec.colour, { roughness: 0.25, emissive: spec.colour, emissiveIntensity: 0.15 });
      for (let i = 0; i < 4; i++) s.ball([0.025 + random() * 0.02, 0.008, 0.018 + random() * 0.015], [bx - 0.03 + random() * 0.05, 0.055, bz + (random() - 0.5) * 0.05], goo, 12);
      for (let i = 0; i < 4; i++) s.cylinder(0.01, 0.012, 0.002, [bx + 0.12 + random() * 0.06, 0.001, bz + (random() - 0.5) * 0.1], chipMaterial, 5).material = s.material('#e8b84a');
    }

    const pace = mix(0.25, 1.6, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const pulse of pulses) {
          if (pulse.mode === 'stream') { const w = 1 + Math.sin(time * 9 * pace + pulse.phase) * 0.12; pulse.mesh.scale.set(w, 1, w); continue; }
          const t = (time * pace * 0.5 + pulse.phase) % 1;
          const fall = t < 0.6 ? 0 : ((t - 0.6) / 0.4) ** 2;
          pulse.mesh.position.y = pulse.top - 0.008 - fall * (pulse.top - pulse.bottom);
          pulse.mesh.scale.set(1, t < 0.6 ? 1 + t * 1.3 : 1.6, 1);
        }
      },
    });
  },
});
