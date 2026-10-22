import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

function placard(lines: readonly string[], width: number, height: number, ink: string, paper: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.max(64, Math.round((512 * height) / width));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5;
  ctx.strokeRect(9, 9, canvas.width - 18, canvas.height - 18);
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const row = (canvas.height - 26) / lines.length;
  lines.forEach((line, index) => {
    ctx.font = `bold ${Math.min(row * 0.72, 760 / Math.max(line.length, 1))}px serif`;
    ctx.fillText(line, 256, 13 + row * (index + 0.52), 480);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, side: THREE.DoubleSide }));
  mesh.castShadow = true;
  return mesh;
}

/** The inventor's working drawing, pasted to the back of the case. */
function diagram(random: () => number, paper: string, ink: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2;
  for (const r of [70, 150, 215]) { ctx.beginPath(); ctx.arc(256, 256, r, 0, Math.PI * 2); ctx.stroke(); }
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(256, 256); ctx.lineTo(256 + Math.cos(angle) * 245, 256 + Math.sin(angle) * 245); ctx.stroke();
  }
  ctx.setLineDash([8, 7]);
  ctx.beginPath(); ctx.moveTo(256, 10); ctx.lineTo(256, 502); ctx.moveTo(10, 256); ctx.lineTo(502, 256); ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 26; i++) {
    const x = 20 + random() * 420, y = 20 + random() * 470, length = 30 + random() * 70;
    ctx.beginPath();
    for (let step = 0; step < length; step += 4) ctx.lineTo(x + step, y + Math.sin(step * 0.9 + i) * 2.5);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    design: choice('Which impossible design is the wheel?', {
      hinged: 'Hinged arms with iron ball weights that fling outward on one side and fold in on the other.',
      hammers: 'A ring of pivoting wooden mallets, heads thrown over the top, after a medieval sketchbook.',
      rolling: 'Curved spokes like a pinwheel with a brass ball rolling along each one.',
      mercury: 'Slanted glass vials half full of quicksilver fixed around the rim.',
    }),
    running: choice('Is it actually running?', {
      running: 'Turning steadily and silently, apparently forever, with no visible cause.',
      creeping: 'Barely creeping round, one weight at a time, as though thinking it over.',
      stopped: 'Stopped dead, with a handwritten apology card propped in the case.',
      cheated: 'Running, but a belt leads from the hub to a small electric motor and a cable trails out of the case.',
      collapsed: 'Seized, with weights dropped off their hinges and lying on the floor of the case.',
    }),
    weights: score('How many weights does the wheel carry?', ['A sparse six', 'A dozen', 'Crowded with sixteen or more']),
    cabinet: choice('What kind of case is it shown in?', {
      mahogany: 'A dark mahogany cabinet with a pediment, like a longcase clock for a lie.',
      scientific: 'A brass-edged all-glass instrument case, cool and laboratory-exact.',
      showman: 'A red and cream fairground cabinet with gilt trim and an arched top.',
      crate: 'A plain pine packing crate with a window cut into the front.',
    }),
    stand: choice('What does the case stand on?', {
      cupboard: 'A matching cupboard base with panelled doors, floor-standing.',
      legs: 'Four turned table legs.',
      pedestal: 'A single turned pedestal column.',
      none: 'Nothing: the case sits directly on whatever is beneath it.',
    }),
    plaque: choice('What does the brass plaque on the case say?', {
      name: 'PERPETUUM MOBILE',
      count: 'A boast of how many revolutions it has made since 1712.',
      assist: 'DO NOT ASSIST THE WHEEL',
      patent: 'PATENT REFUSED',
      blank: 'Nothing: the plaque has been unscrewed, leaving four holes.',
    }),
    backing: choice('What is behind the wheel inside the case?', {
      drawing: 'The inventor’s working drawing, circles and frantic notes on yellowed paper.',
      baize: 'Plain green baize.',
      mirror: 'A dim silvered mirror, doubling the wheel.',
      black: 'Matte black cloth, so the wheel seems to float.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const woodTint = { mahogany: '#5b2c1c', scientific: '#2b2d2f', showman: '#a8262a', crate: '#c7a56c' }[a.cabinet];
    const wood = s.material(woodTint, { roughness: a.cabinet === 'crate' ? 0.9 : 0.5 });
    const trim = s.material({ mahogany: '#3c1c12', scientific: '#b88d3a', showman: '#efe2b8', crate: '#a7854f' }[a.cabinet], a.cabinet === 'scientific' ? { metalness: 0.8, roughness: 0.3 } : {});
    const brass = s.material('#c29a45', { metalness: 0.8, roughness: mix(0.25, 0.5, mood.wear) });
    const iron = s.material('#33363a', { metalness: 0.5, roughness: 0.5 });
    const pale = s.material('#c9a877', { roughness: 0.7 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#dff0ee', transparent: true, opacity: 0.14, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });

    const W = 1.2, H = 1.25, D = 0.38, wall = 0.045;
    const standHeight = { cupboard: 0.78, legs: 0.74, pedestal: 0.8, none: 0 }[a.stand];
    const y0 = standHeight;
    const allGlass = a.cabinet === 'scientific';

    // Stand.
    if (a.stand === 'cupboard') {
      s.box([W + 0.04, standHeight - 0.06, D + 0.04], [0, standHeight / 2 + 0.03, 0], wood);
      s.box([W + 0.12, 0.06, D + 0.1], [0, 0.03, 0], trim);
      for (const x of [-1, 1]) {
        s.box([W / 2 - 0.08, standHeight - 0.22, 0.015], [x * (W / 4), standHeight / 2 + 0.03, D / 2 + 0.025], trim);
        s.ball([0.018, 0.018, 0.018], [x * 0.05, standHeight / 2 + 0.05, D / 2 + 0.045], brass, 10);
      }
    } else if (a.stand === 'legs') {
      s.box([W + 0.06, 0.07, D + 0.08], [0, standHeight - 0.035, 0], wood);
      for (const x of [-1, 1]) for (const z of [-1, 1])
        s.lathe([[0.02, 0], [0.028, 0.05], [0.02, 0.1], [0.034, 0.3], [0.022, 0.5], [0.04, 0.62], [0.04, standHeight - 0.07]], wood, [x * (W / 2 - 0.05), 0, z * (D / 2 - 0.03)]);
      s.rod([-W / 2 + 0.05, 0.16, 0], [W / 2 - 0.05, 0.16, 0], 0.014, wood);
    } else if (a.stand === 'pedestal') {
      s.lathe([[0.3, 0], [0.3, 0.05], [0.14, 0.1], [0.09, 0.22], [0.12, 0.42], [0.075, 0.6], [0.12, 0.72], [0.2, standHeight - 0.03], [0.2, standHeight]], wood);
      s.box([W * 0.8, 0.03, D + 0.04], [0, standHeight - 0.015, 0], wood);
    }

    // Case: floor, top, back, sides and a glazed front.
    s.box([W + 0.06, wall, D + 0.06], [0, y0 + wall / 2, 0], wood);
    s.box([W + 0.06, wall, D + 0.06], [0, y0 + H - wall / 2, 0], wood);
    const backTint = { drawing: '#e5d7a8', baize: '#3f6b4b', mirror: '#aeb9bb', black: '#1d1d20' }[a.backing];
    const backMaterial = a.backing === 'drawing'
      ? new THREE.MeshStandardMaterial({ map: diagram(random, '#e5d7a8', '#4a3320'), roughness: 0.9 })
      : s.material(backTint, a.backing === 'mirror' ? { metalness: 0.95, roughness: 0.12 } : { roughness: 0.95 });
    s.box([W, H, 0.03], [0, y0 + H / 2, -D / 2 + 0.015], wood);
    s.mesh(new THREE.PlaneGeometry(W - 0.1, H - 0.14), backMaterial, [0, y0 + H / 2, -D / 2 + 0.034]);
    for (const x of [-1, 1]) {
      if (allGlass) s.mesh(new THREE.PlaneGeometry(D, H - 0.08), glass, [x * W / 2, y0 + H / 2, 0]).rotation.y = Math.PI / 2;
      else s.box([wall, H, D], [x * (W / 2 - wall / 2 + 0.03), y0 + H / 2, 0], wood);
      for (const z of [-1, 1]) s.box([0.035, H, 0.035], [x * (W / 2 + 0.012), y0 + H / 2, z * (D / 2 + 0.012)], trim);
    }
    const front = D / 2 + 0.012;
    s.box([W + 0.06, 0.13, 0.035], [0, y0 + 0.065, front], a.cabinet === 'scientific' ? trim : wood);
    s.box([W + 0.06, 0.06, 0.035], [0, y0 + H - 0.03, front], trim);
    s.mesh(new THREE.PlaneGeometry(W, H - 0.19), glass, [0, y0 + 0.13 + (H - 0.19) / 2, front]);
    if (allGlass) s.mesh(new THREE.PlaneGeometry(W, D), glass, [0, y0 + H - 0.05, 0]).rotation.x = Math.PI / 2;
    // Tops: each kind of case has its own silhouette.
    const top = y0 + H;
    if (a.cabinet === 'mahogany') {
      const gable = new THREE.Shape([new THREE.Vector2(-W / 2 - 0.08, 0), new THREE.Vector2(W / 2 + 0.08, 0), new THREE.Vector2(0, 0.26)]);
      s.mesh(new THREE.ExtrudeGeometry(gable, { depth: D + 0.1, bevelEnabled: false }), wood, [0, top + 0.04, -D / 2 - 0.05]);
      s.box([W + 0.2, 0.045, D + 0.16], [0, top + 0.02, 0], trim);
      s.lathe([[0.03, 0], [0.045, 0.03], [0.02, 0.07], [0.04, 0.11], [0, 0.17]], brass, [0, top + 0.29, 0]);
    } else if (a.cabinet === 'showman') {
      const arch = new THREE.Shape();
      arch.moveTo(-W / 2 - 0.05, 0); arch.lineTo(W / 2 + 0.05, 0); arch.absarc(0, 0, W / 2 + 0.05, 0, Math.PI, false);
      const header = s.mesh(new THREE.ExtrudeGeometry(arch, { depth: 0.07, bevelEnabled: false }), wood, [0, top, front - 0.06]);
      header.scale.y = 0.55;
      for (let i = 0; i < 9; i++) {
        const angle = (i + 0.5) / 9 * Math.PI;
        s.ball([0.03, 0.03, 0.03], [Math.cos(angle) * (W / 2 - 0.03), top + Math.sin(angle) * (W / 2 - 0.03) * 0.55 * 0.92 + 0.0, front + 0.02], s.material('#ffe9a6', { emissive: '#ffd66b', emissiveIntensity: mix(0.2, 1.1, mood.cheer) }), 10);
      }
      s.box([W + 0.14, 0.04, D + 0.12], [0, top + 0.02, 0], trim);
    } else if (a.cabinet === 'crate') {
      for (const y of [0.25, 0.75]) s.box([W + 0.1, 0.09, 0.02], [0, y0 + H * y, -D / 2 - 0.012], trim);
      for (const x of [-1, 1]) { const handle = s.ring(0.07, 0.012, [x * (W / 2 + 0.035), y0 + H * 0.62, 0], s.material('#8a7a5c'), Math.PI); handle.rotation.set(0, Math.PI / 2, Math.PI); }
      s.label('FRAGILE', 0.36, 0.09, [-W / 2 + 0.24, y0 + H - 0.03, front + 0.02], '#7a2a20', '#c7a56c').rotation.z = 0.04;
    } else {
      s.box([W + 0.1, 0.03, D + 0.1], [0, top + 0.015, 0], trim);
      s.ring(0.06, 0.012, [0, top + 0.09, 0], trim);
    }

    // The wheel.
    const R = 0.4, cy = y0 + 0.13 + (H - 0.19) / 2 + 0.01;
    const count = Math.round(mix(6, 16, a.weights));
    const wheel = new THREE.Group();
    wheel.position.set(0, cy, 0.01);
    s.root.add(wheel);
    const rimPaint = a.design === 'hammers' ? pale : brass;
    wheel.add(s.ring(R * (a.design === 'hinged' || a.design === 'hammers' ? 0.72 : 1), 0.016, [0, 0, 0], rimPaint));
    const hub = s.cylinder(0.055, 0.055, 0.1, [0, 0, 0], brass, 16);
    hub.rotation.x = Math.PI / 2;
    wheel.add(hub);
    const axle = s.cylinder(0.018, 0.018, D - 0.06, [0, cy, 0], iron, 10);
    axle.rotation.x = Math.PI / 2;
    for (const z of [-D / 2 + 0.07, D / 2 - 0.07]) {
      s.rod([-0.2, y0 + wall, z], [0, cy, z], 0.014, iron);
      s.rod([0.2, y0 + wall, z], [0, cy, z], 0.014, iron);
    }
    type Weight = { phi: number; apply(extended: number): void };
    const weights: Weight[] = [];
    const collapsed = a.running === 'collapsed';
    const pivotR = a.design === 'hinged' || a.design === 'hammers' ? R * 0.72 : R;
    for (let i = 0; i < count; i++) {
      const phi = (i / count) * Math.PI * 2;
      const cos = Math.cos(phi), sin = Math.sin(phi);
      const lost = collapsed && random() < 0.6;
      if (a.design === 'hinged' || a.design === 'hammers') {
        wheel.add(s.rod([cos * 0.05, sin * 0.05, 0], [cos * pivotR, sin * pivotR, 0], 0.008, rimPaint));
        wheel.add(s.ball([0.016, 0.016, 0.02], [cos * pivotR, sin * pivotR, 0], iron, 8));
        if (lost) continue;
        const arm = new THREE.Group();
        arm.position.set(cos * pivotR, sin * pivotR, 0.012 * (i % 2 ? 1 : -1));
        const length = R * 0.42;
        if (a.design === 'hinged') {
          arm.add(s.rod([0, 0, 0], [length, 0, 0], 0.007, iron));
          arm.add(s.ball([0.042, 0.042, 0.042], [length, 0, 0], iron, 14));
        } else {
          arm.add(s.rod([0, 0, 0], [length, 0, 0], 0.011, pale));
          arm.add(s.box([0.07, 0.13, 0.07], [length, 0, 0], s.material('#7a4a2a')));
        }
        wheel.add(arm);
        weights.push({ phi, apply: (extended) => { arm.rotation.z = phi + (1 - extended) * 2.05; } });
      } else if (a.design === 'rolling') {
        const points = Array.from({ length: 7 }, (_unused, k) => {
          const t = k / 6, r = mix(0.05, R, t), angle = phi - t * 1.05;
          return [Math.cos(angle) * r, Math.sin(angle) * r, 0] as const;
        });
        wheel.add(s.tube(points, 0.009, brass));
        if (lost) continue;
        const ball = s.ball([0.04, 0.04, 0.04], [0, 0, 0], iron, 14);
        wheel.add(ball);
        weights.push({ phi: phi - 0.6, apply: (extended) => {
          const t = mix(0.3, 0.9, extended), r = mix(0.05, R, t), angle = phi - t * 1.05;
          ball.position.set(Math.cos(angle) * r, Math.sin(angle) * r, 0.045);
        } });
      } else {
        wheel.add(s.rod([cos * 0.05, sin * 0.05, 0], [cos * R, sin * R, 0], 0.007, brass));
        const vial = new THREE.Group();
        vial.position.set(cos * R * 0.84, sin * R * 0.84, 0.03);
        vial.rotation.z = phi + 1.0;
        const tube = s.cylinder(0.026, 0.026, 0.2, [0, 0, 0], new THREE.MeshPhysicalMaterial({ color: '#e8f4f2', transparent: true, opacity: 0.32, roughness: 0.05, depthWrite: false }), 12);
        tube.rotation.z = Math.PI / 2;
        vial.add(tube);
        for (const x of [-0.1, 0.1]) { const cap = s.cylinder(0.028, 0.028, 0.015, [x, 0, 0], brass, 12); cap.rotation.z = Math.PI / 2; vial.add(cap); }
        wheel.add(vial);
        if (lost) continue;
        const slug = s.cylinder(0.021, 0.021, 0.085, [0, 0, 0], s.material('#d5dade', { metalness: 0.95, roughness: 0.12 }), 12);
        slug.rotation.z = Math.PI / 2;
        vial.add(slug);
        weights.push({ phi, apply: (extended) => { slug.position.x = mix(-0.052, 0.052, extended); } });
      }
    }
    if (collapsed) {
      const dropped = count - weights.length;
      for (let i = 0; i < dropped; i++) {
        const x = (random() - 0.5) * (W - 0.3), z = (random() - 0.5) * (D - 0.16);
        if (a.design === 'hammers') s.box([0.07, 0.07, 0.13], [x, y0 + wall + 0.035, z], s.material('#7a4a2a')).rotation.y = random() * 3;
        else if (a.design === 'mercury') s.cylinder(0.03 + random() * 0.03, 0.035 + random() * 0.03, 0.006, [x, y0 + wall + 0.003, z], s.material('#d5dade', { metalness: 0.95, roughness: 0.12 }), 14);
        else s.ball([0.042, 0.042, 0.042], [x, y0 + wall + 0.042, z], iron, 14);
      }
    }

    // The cheat.
    let pulley: THREE.Object3D | null = null;
    if (a.running === 'cheated') {
      const mx = W / 2 - 0.2, my = y0 + wall + 0.08, mz = -0.06;
      s.box([0.2, 0.14, 0.16], [mx, my, mz], s.material('#5d6f78', { metalness: 0.4 }));
      pulley = s.cylinder(0.04, 0.04, 0.03, [mx, my + 0.02, mz + 0.1], iron, 14);
      pulley.rotation.x = Math.PI / 2;
      const belt = s.material('#16161a', { roughness: 0.9 });
      s.rod([mx - 0.04, my + 0.02, mz + 0.1], [-0.05, cy - 0.02, mz + 0.1], 0.006, belt);
      s.rod([mx + 0.03, my + 0.05, mz + 0.1], [0.04, cy + 0.04, mz + 0.1], 0.006, belt);
      const out = W / 2 + 0.05;
      s.tube([[mx + 0.1, my, mz], [out, my - 0.02, mz - 0.02], [out + 0.05, y0 * 0.6, 0.05], [out + 0.12, y0 * 0.2 + 0.03, 0.12], [out + 0.26, 0.012, 0.16 + random() * 0.1], [out + 0.42, 0.012, 0.05]], 0.009, belt);
      s.box([0.05, 0.03, 0.035], [out + 0.44, 0.015, 0.05], s.material('#e8e4d6'));
    }

    // Plaque and cards.
    const plaqueText = { name: ['PERPETUUM MOBILE'], count: [`${(1 + Math.floor(random() * 8))},${100 + Math.floor(random() * 899)},${100 + Math.floor(random() * 899)} REVOLUTIONS`, 'WITHOUT REST SINCE 1712'], assist: ['DO NOT ASSIST', 'THE WHEEL'], patent: ['PATENT REFUSED'], blank: [] as string[] }[a.plaque];
    if (plaqueText.length) {
      const plate = placard(plaqueText, 0.62, 0.105, '#2c2110', '#c9a24c');
      plate.position.set(0, y0 + 0.066, front + 0.019);
      s.root.add(plate);
    } else for (const x of [-0.28, 0.28]) for (const y of [0.035, 0.095]) s.ball([0.007, 0.007, 0.004], [x, y0 + y, front + 0.018], iron, 6);
    if (a.running === 'stopped' || collapsed) {
      const card = placard(collapsed ? ['OUT OF', 'BALANCE'] : [['TEMPORARILY', 'AT REST'], ['SORRY', 'back soon'], ['RESTING', 'do not tap glass']][Math.floor(random() * 3)], 0.4, 0.25, '#2a2a30', mood.wear > 0.6 ? '#ded3b0' : '#f4efdf');
      card.position.set(-W / 2 + 0.3 + random() * 0.1, y0 + 0.275, D / 2 - 0.04);
      card.rotation.set(-0.22, 0.12, (random() - 0.5) * 0.12);
      s.root.add(card);
    }
    // Dust, cracks and clutter follow the mood.
    if (mood.wear > 0.55) {
      const crack = s.material('#f6fbfb', { roughness: 0.3 });
      let x = (random() - 0.5) * 0.6, y = y0 + H * mix(0.35, 0.8, random());
      for (let i = 0; i < 6; i++) {
        const nx = x + (random() - 0.5) * 0.3, ny = y + (random() - 0.4) * 0.26;
        s.rod([x, y, front + 0.004], [nx, Math.min(ny, y0 + H - 0.1), front + 0.004], 0.003, crack);
        if (random() < 0.5) { x = nx; y = Math.min(ny, y0 + H - 0.1); }
      }
    }
    if (mood.density > 0.55) {
      const gears = Math.round(mix(1, 4, mood.density));
      for (let i = 0; i < gears; i++) {
        const gear = s.cylinder(0.05 + random() * 0.04, 0.05 + random() * 0.04, 0.012, [(i % 2 ? 1 : -1) * (W / 2 - 0.12 - random() * 0.05), y0 + H - 0.16 - Math.floor(i / 2) * 0.17, -D / 2 + 0.06], brass, 9);
        gear.rotation.x = Math.PI / 2;
      }
    }

    const speed = { running: mix(0.35, 1.5, mood.energy), creeping: mix(0.04, 0.16, mood.energy), stopped: 0, cheated: mix(0.9, 2.4, mood.energy), collapsed: 0 }[a.running];
    let angle = random() * Math.PI * 2;
    const pose = () => {
      wheel.rotation.z = -angle;
      for (const weight of weights) weight.apply(clamp01(0.5 + Math.cos(weight.phi - angle) * 1.4));
    };
    pose();
    return s.finish({
      update: (dt, time) => {
        if (!speed) return;
        angle += dt * speed * (a.running === 'cheated' ? 1 + Math.sin(time * 7) * 0.25 : 1);
        if (pulley) pulley.rotation.y += dt * speed * 6;
        pose();
      },
    });
  },
});
