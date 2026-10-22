import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
const PRIZES = {
  cats: 'Tiny sitting cats in a dozen colours.',
  robots: 'Little robots and spare mechanical limbs.',
  'mini-food': 'Miniature bowls of noodles and dumplings on keychains.',
  fortunes: 'Rolled paper fortunes and lucky charms.',
  mystery: 'Unmarked black capsules: nobody knows.',
  chips: 'Data chips and blinking implant trinkets.',
  eyes: 'Glass eyeballs that follow you, faintly creepy.',
} as const;
type Prize = keyof typeof PRIZES;
const PRIZE_KEYS = Object.keys(PRIZES) as Prize[];
const CAPSULES: Record<Prize, string[]> = {
  cats: ['#ffb3c7', '#ffe08a', '#a9e5d0', '#c9b6ff', '#ffffff'],
  robots: ['#ff7a1a', '#6f7a86', '#2f7fd0', '#e9e9e4', '#f0c22a'],
  'mini-food': ['#d8352c', '#f0c22a', '#ffffff', '#f08a1c', '#58a83a'],
  fortunes: ['#c8202a', '#e0b23a', '#f4ead8', '#c8202a'],
  mystery: ['#1b1a1e', '#2a2233', '#3a2a55', '#1b1a1e'],
  chips: ['#2fe6ff', '#3dffb0', '#22303a', '#8a7bff'],
  eyes: ['#f4f4f0', '#9fd0f0', '#f4f4f0', '#d8e8d0'],
};
const ICON: Record<Prize, (c: Ctx, x: number, y: number, r: number) => void> = {
  cats(c, x, y, r) { c.beginPath(); c.arc(x, y + r * 0.15, r * 0.7, 0, 6.28); c.fill(); for (const k of [-1, 1]) { c.beginPath(); c.moveTo(x + k * r * 0.7, y - r * 0.1); c.lineTo(x + k * r * 0.6, y - r * 0.95); c.lineTo(x + k * r * 0.15, y - r * 0.45); c.fill(); } },
  robots(c, x, y, r) { c.fillRect(x - r * 0.65, y - r * 0.4, r * 1.3, r * 1.1); c.fillRect(x - r * 0.06, y - r * 0.95, r * 0.12, r * 0.55); c.beginPath(); c.arc(x, y - r * 0.95, r * 0.14, 0, 6.28); c.fill(); },
  'mini-food'(c, x, y, r) { c.beginPath(); c.arc(x, y, r * 0.8, 0, Math.PI); c.closePath(); c.fill(); c.fillRect(x - r * 0.3, y + r * 0.75, r * 0.6, r * 0.14); c.fillRect(x - r * 0.9, y - r * 0.5, r * 1.8, r * 0.1); },
  fortunes(c, x, y, r) { c.fillRect(x - r * 0.35, y - r * 0.85, r * 0.7, r * 1.7); c.beginPath(); c.arc(x, y - r * 0.85, r * 0.35, 0, 6.28); c.arc(x, y + r * 0.85, r * 0.35, 0, 6.28); c.fill(); },
  mystery(c, x, y, r) { c.font = `bold ${r * 2}px monospace`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', x, y); },
  chips(c, x, y, r) { c.fillRect(x - r * 0.55, y - r * 0.55, r * 1.1, r * 1.1); for (let i = -1; i <= 1; i++) { c.fillRect(x - r * 0.95, y + i * r * 0.35 - r * 0.06, r * 1.9, r * 0.12); c.fillRect(x + i * r * 0.35 - r * 0.06, y - r * 0.95, r * 0.12, r * 1.9); } },
  eyes(c, x, y, r) { c.beginPath(); c.arc(x, y, r * 0.85, 0, 6.28); c.stroke(); c.beginPath(); c.arc(x, y, r * 0.38, 0, 6.28); c.fill(); },
};

export default defineThing({
  questions: {
    prizes: choice('What are the prizes?', PRIZES),
    state: choice('What state is the machine in?', {
      stocked: 'Freshly stocked: both tanks full to the top.',
      'picked-over': 'Picked over: a thin layer left, the good ones gone.',
      empty: 'Sold out: bare tanks and a note taped to the front.',
      jammed: 'Jammed: a capsule wedged in the chute, the crank stuck crooked, coins lost.',
      'just-won': 'Someone just won: a capsule waits in the chute and an opened one lies on the ground.',
    }),
    tank: choice('What shape are the capsule tanks?', {
      square: 'Square clear boxes, the classic stacked gachapon.',
      dome: 'Round bubble globes, like an old gumball machine.',
      drum: 'Upright clear cylinders.',
    }),
    colour: choice('What colour are the cabinets?', {
      classic: 'White with red trim.',
      sunny: 'Sun-faded yellow.',
      mint: 'Mint green with cream trim.',
      night: 'Black with glowing edges.',
      mismatched: 'Each cabinet a different colour, bought second-hand one by one.',
    }),
    bank: choice('How many stacks stand together?', {
      one: 'A single lonely stack of two.',
      two: 'Two stacks side by side.',
      three: 'A wall of three stacks.',
    }),
    topper: choice('What is on top?', {
      sign: 'A lit header sign.',
      board: 'A hand-lettered price board.',
      litter: 'Empty capsule halves and a drinks can left behind.',
      nothing: 'Nothing.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const on = <T extends THREE.Object3D>(group: THREE.Object3D, mesh: T) => { group.add(mesh); return mesh; };
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const w = 0.4, h = 0.64, d = 0.38, lower = 0.3, capR = 0.031;
    const stacks = { one: 1, two: 2, three: 3 }[a.bank];
    const palettes = { classic: ['#f1efe8', '#c8202a'], sunny: ['#e8c63a', '#b3541e'], mint: ['#9ed8c0', '#f4ead8'], night: ['#1c1d22', '#ff3d9a'] } as const;
    const dark = s.material('#1b1c20', { roughness: 0.6 });
    const steel = s.material('#b9bfc3', { metalness: 0.65, roughness: 0.3 });
    const clear = new THREE.MeshStandardMaterial({ color: '#eaf6fa', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
    const fade = mood.wear;

    const card = (prize: Prize, accent: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 112;
      const c = canvas.getContext('2d')!;
      c.fillStyle = '#fbf6e6'; c.fillRect(0, 0, 256, 112);
      c.fillStyle = accent; c.fillRect(0, 0, 256, 24);
      c.fillStyle = '#ffffff'; for (let i = 0; i < 7; i++) c.fillRect(14 + i * 20 + random() * 4, 7, 10 + random() * 6, 10);
      const colours = CAPSULES[prize];
      for (let i = 0; i < 5; i++) {
        c.fillStyle = c.strokeStyle = colours[i % colours.length] === '#ffffff' || colours[i % colours.length] === '#f4f4f0' ? '#8a93a0' : colours[i % colours.length];
        c.lineWidth = 5;
        ICON[prize](c, 30 + i * 49, 66, 19);
      }
      c.fillStyle = '#c8202a'; c.beginPath(); c.arc(232, 96, 13, 0, 6.28); c.fill();
      c.fillStyle = `rgba(245,240,225,${fade * 0.55})`; c.fillRect(0, 0, 256, 112); // sun-fade
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7 });
    };

    const capsulePoints: { at: [number, number, number]; size: number; color: string }[] = [];
    const cranks: THREE.Group[] = [];
    const glows: THREE.MeshStandardMaterial[] = [];
    const floor = 0.07;

    for (let column = 0; column < stacks; column++) {
      const x0 = (column - (stacks - 1) / 2) * (w + 0.012);
      for (let level = 0; level < 2; level++) {
        const unit = new THREE.Group();
        unit.position.set(x0, floor + level * h, 0);
        s.root.add(unit);
        const [bodyColour, trimColour] = a.colour === 'mismatched' ? pick(Object.values(palettes)) : palettes[a.colour];
        const body = s.material(bodyColour, { roughness: 0.45 });
        const trim = s.material(trimColour, { roughness: 0.45 });
        const prize: Prize = level === 1 && column === 0 ? a.prizes : random() < 0.5 ? a.prizes : pick(PRIZE_KEYS);
        const night = bodyColour === '#1c1d22';
        // Cabinet.
        on(unit, s.box([w, lower, d], [0, lower / 2, 0], body));
        on(unit, s.box([w, 0.03, d], [0, h - 0.015, 0], trim));
        on(unit, s.box([w - 0.03, h - lower - 0.03, 0.012], [0, lower + (h - lower - 0.03) / 2, -d / 2 + 0.012], body));
        if (night) { const edge = new THREE.MeshStandardMaterial({ color: trimColour, emissive: trimColour, emissiveIntensity: 1.5 }); glows.push(edge); on(unit, s.box([w + 0.004, 0.012, 0.012], [0, lower, d / 2], edge)); on(unit, s.box([w + 0.004, 0.012, 0.012], [0, h - 0.03, d / 2], edge)); }
        // Tank.
        const tankH = h - lower - 0.03, cy = lower + tankH / 2;
        let inside: (x: number, y: number, z: number) => boolean;
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) on(unit, s.box([0.014, tankH, 0.014], [sx * (w / 2 - 0.008), cy, sz * (d / 2 - 0.008)], trim));
        if (a.tank === 'square') {
          on(unit, s.box([w - 0.02, tankH, d - 0.02], [0, cy, 0], clear)).castShadow = false;
          inside = (x, _y, z) => Math.abs(x) < w / 2 - 0.045 && Math.abs(z) < d / 2 - 0.05;
        } else if (a.tank === 'dome') {
          const R = tankH * 0.56;
          on(unit, s.ball([R, R, R], [0, lower + R * 0.82, 0], clear, 24)).castShadow = false;
          on(unit, s.cylinder(R * 0.62, R * 0.7, 0.03, [0, lower + 0.015, 0], trim, 24));
          inside = (x, y, z) => Math.hypot(x, y - (lower + R * 0.82), z) < R - capR - 0.008;
        } else {
          const R = Math.min(w, d) / 2 - 0.02;
          on(unit, s.mesh(new THREE.CylinderGeometry(R, R, tankH, 28, 1, true), clear, [0, cy, 0])).castShadow = false;
          for (const y of [lower + 0.008, lower + tankH - 0.008]) on(unit, s.ring(R, 0.008, [0, y, 0], trim)).rotation.x = Math.PI / 2;
          inside = (x, _y, z) => Math.hypot(x, z) < R - capR - 0.008;
        }
        // Capsules settle in rough layers.
        const share = { stocked: mix(0.82, 1, random()), 'picked-over': mix(0.08, 0.3, random()), empty: 0, jammed: mix(0.4, 0.85, random()), 'just-won': mix(0.3, 0.9, random()) }[a.state];
        const layers = Math.max(a.state === 'empty' ? 0 : 1, Math.round(share * (tankH - 0.03) / (capR * 1.75)));
        const colours = CAPSULES[prize];
        for (let layer = 0; layer < layers; layer++) {
          const y = lower + capR + 0.004 + layer * capR * 1.75, shift = (layer % 2) * capR;
          for (let gx = -w / 2; gx < w / 2; gx += capR * 2.05) for (let gz = -d / 2; gz < d / 2; gz += capR * 2.05) {
            const x = gx + shift + (random() - 0.5) * 0.012, z = gz + shift + (random() - 0.5) * 0.012;
            if (!inside(x, y, z)) continue;
            if (layer === layers - 1 && random() < (a.state === 'picked-over' ? 0.6 : 0.3)) continue; // ragged top
            capsulePoints.push({ at: [x0 + x, floor + level * h + y + (random() - 0.5) * 0.008, z], size: capR, color: pick(colours) });
          }
        }
        // Front: prize card, coin slot, crank, chute.
        const front = d / 2 + 0.002;
        const sheet = on(unit, s.mesh(new THREE.PlaneGeometry(w - 0.05, 0.115), card(prize, trimColour), [0, lower - 0.07, front]));
        sheet.rotation.z = (random() - 0.5) * 0.04 * (1 + mood.wear * 2);
        on(unit, s.box([0.05, 0.07, 0.012], [-0.13, 0.115, front], steel));
        on(unit, s.box([0.006, 0.03, 0.014], [-0.13, 0.125, front], dark));
        const crank = new THREE.Group();
        crank.position.set(0.1, 0.1, front + 0.01);
        unit.add(crank);
        on(crank, s.cylinder(0.05, 0.05, 0.02, [0, 0, 0], steel, 22)).rotation.x = Math.PI / 2;
        on(crank, s.box([0.085, 0.02, 0.022], [0, 0, 0.018], trim));
        on(crank, s.cylinder(0.012, 0.012, 0.02, [0, 0, 0.03], dark, 10)).rotation.x = Math.PI / 2;
        crank.rotation.z = a.state === 'jammed' ? 0.6 + random() * 0.5 : random() < 0.5 ? 0 : Math.PI / 2;
        cranks.push(crank);
        on(unit, s.box([0.13, 0.075, 0.012], [-0.03, 0.05, front - 0.004], dark));
        on(unit, s.box([0.14, 0.012, 0.03], [-0.03, 0.012, front + 0.012], trim));
        const hot = column === Math.floor(random() * stacks) || (column === 0 && level === 0);
        if ((a.state === 'jammed' || a.state === 'just-won') && hot && level === 0)
          on(unit, s.ball([capR, capR, capR], [-0.03 + (a.state === 'jammed' ? 0.02 : 0), 0.05, front + (a.state === 'jammed' ? -0.004 : 0.012)], s.material(pick(colours), { roughness: 0.3 }), 12));
        if (a.state === 'empty' || (a.state === 'jammed' && level === 1 && column === 0)) {
          const note = on(unit, s.label(a.state === 'empty' ? 'SOLD OUT' : 'BROKEN', 0.19, 0.075, [0.02, lower + 0.13, d / 2 + 0.004], '#b3261e', '#f4f1e6'));
          note.rotation.z = (random() - 0.5) * 0.3;
          on(unit, s.box([0.05, 0.016, 0.001], [0.02, lower + 0.166, d / 2 + 0.006], s.material('#d9cf9a', { roughness: 0.6 }))).rotation.z = note.rotation.z;
        }
      }
    }
    // Capsules as one instanced mesh, with a paler cap on each.
    if (capsulePoints.length) {
      const geometry = new THREE.SphereGeometry(1, 10, 7);
      s.scatter(geometry, new THREE.MeshStandardMaterial({ roughness: 0.3 }), capsulePoints);
    }

    // Base with casters.
    const totalW = stacks * (w + 0.012);
    s.box([totalW, 0.04, d], [0, floor - 0.02, 0], dark);
    for (const x of [-totalW / 2 + 0.05, totalW / 2 - 0.05]) for (const z of [-d / 2 + 0.05, d / 2 - 0.05]) s.cylinder(0.025, 0.025, 0.02, [x, 0.025, z], dark, 10).rotation.z = Math.PI / 2;
    const top = floor + h * 2;
    // Topper.
    if (a.topper === 'sign') {
      const signColour = mood.warmth > 0.5 ? '#ff5a3c' : '#ff3d9a';
      const header = s.label(pick(['GACHA', 'CAPSULE', 'LUCKY', '1 COIN']), totalW * 0.9, 0.14, [0, top + 0.09, d / 2 - 0.06], '#ffffff', signColour);
      const lit = header.material as THREE.MeshStandardMaterial;
      lit.emissiveMap = lit.map; lit.emissive = new THREE.Color('#ffffff'); lit.emissiveIntensity = 0.85;
      glows.push(lit);
      s.box([totalW * 0.92, 0.16, 0.08], [0, top + 0.09, d / 2 - 0.105], dark);
    } else if (a.topper === 'board') {
      const board = s.label(pick(['¥300', '1 TRY 200', '2 COINS', 'NO REFUNDS']), Math.min(0.36, totalW * 0.8), 0.16, [0, top + 0.085, 0.02], '#f4f1e6', '#2a3a2e');
      board.rotation.x = -0.25; board.rotation.z = (random() - 0.5) * 0.08;
      s.box([0.05, 0.012, 0.1], [0, top + 0.006, -0.01], dark);
    } else if (a.topper === 'litter') {
      for (let i = 0; i < 4 + Math.round(mood.density * 5); i++) {
        const half = s.mesh(new THREE.SphereGeometry(capR, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), s.material(pick(CAPSULES[a.prizes]), { roughness: 0.3, side: THREE.DoubleSide }), [(random() - 0.5) * (totalW - 0.1), top + (random() < 0.5 ? capR : 0.001), (random() - 0.5) * (d - 0.1)]);
        if (half.position.y > top + 0.01) half.rotation.x = Math.PI + (random() - 0.5) * 0.6;
      }
      s.cylinder(0.03, 0.03, 0.11, [totalW / 2 - 0.07, top + 0.055, -0.06], s.material(pick(['#2f7fd0', '#d8352c', '#3dba6a']), { metalness: 0.5, roughness: 0.3 }), 14);
    }
    // On the ground: lost coins or an opened capsule and its prize.
    if (a.state === 'jammed') for (let i = 0; i < 4; i++) s.cylinder(0.012, 0.012, 0.002, [(random() - 0.5) * 0.4, 0.001, d / 2 + 0.08 + random() * 0.15], s.material('#c9a23a', { metalness: 0.7, roughness: 0.3 }), 10);
    if (a.state === 'just-won') {
      const gx = (random() - 0.5) * 0.2, gz = d / 2 + 0.16;
      const colour = pick(CAPSULES[a.prizes]);
      const lowerHalf = s.mesh(new THREE.SphereGeometry(capR * 1.3, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), s.material(colour, { roughness: 0.3, side: THREE.DoubleSide }), [gx, capR * 1.3, gz]);
      lowerHalf.rotation.z = 0.3;
      const upperHalf = s.mesh(new THREE.SphereGeometry(capR * 1.3, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#eaf6fa', transparent: true, opacity: 0.45, side: THREE.DoubleSide }), [gx + 0.11, 0.002, gz + 0.03]);
      upperHalf.rotation.x = Math.PI;
      upperHalf.position.y = capR * 1.3;
      const toy = s.material(pick(CAPSULES[a.prizes].filter((entry) => entry !== colour).concat('#ffb3c7')), { roughness: 0.4 });
      const tx = gx - 0.1, tz = gz + 0.02;
      if (a.prizes === 'cats') { s.ball([0.022, 0.026, 0.022], [tx, 0.026, tz], toy, 10); s.ball([0.019, 0.017, 0.018], [tx, 0.06, tz], toy, 10); for (const k of [-1, 1]) s.mesh(new THREE.ConeGeometry(0.007, 0.014, 4), toy, [tx + k * 0.011, 0.079, tz]); }
      else if (a.prizes === 'robots') { s.box([0.035, 0.04, 0.025], [tx, 0.02, tz], toy); s.box([0.026, 0.022, 0.022], [tx, 0.052, tz], toy); s.rod([tx, 0.063, tz], [tx, 0.08, tz], 0.002, dark); }
      else if (a.prizes === 'mini-food') { s.lathe([[0.012, 0], [0.03, 0.022], [0.027, 0.022], [0, 0.008]], toy, [tx, 0, tz]); s.ball([0.022, 0.008, 0.022], [tx, 0.02, tz], s.material('#ecd58a'), 8); }
      else if (a.prizes === 'eyes') { s.ball([0.024, 0.024, 0.024], [tx, 0.024, tz], s.material('#f4f4f0', { roughness: 0.15 }), 12); s.ball([0.012, 0.012, 0.006], [tx + 0.006, 0.03, tz + 0.02], s.material('#2f7fd0'), 8); }
      else if (a.prizes === 'chips') { s.box([0.04, 0.006, 0.03], [tx, 0.003, tz], s.material('#1f6b45')); const led = new THREE.MeshStandardMaterial({ color: '#2fe6ff', emissive: '#2fe6ff', emissiveIntensity: 1.6 }); glows.push(led); s.box([0.008, 0.008, 0.008], [tx, 0.008, tz], led); }
      else { const scroll = s.cylinder(0.008, 0.008, 0.05, [tx, 0.008, tz], s.material(a.prizes === 'mystery' ? '#1b1a1e' : '#f4ead8'), 10); scroll.rotation.z = Math.PI / 2; scroll.rotation.y = 0.5; }
    }

    const base = glows.map((material) => material.emissiveIntensity);
    const jamCranks = a.state === 'jammed' ? cranks.map((crank) => crank.rotation.z) : [];
    const energy = mood.energy;
    return s.finish({
      footprint: Math.max(0.3, totalW * 0.5),
      update: (_dt, time) => {
        glows.forEach((material, index) => { material.emissiveIntensity = base[index] * (0.9 + 0.1 * Math.sin(time * 5 + index) - (mood.wear > 0.5 && Math.sin(time * 19 + index * 3) * Math.sin(time * 2.7) > 0.75 ? 0.7 : 0)); });
        jamCranks.forEach((rest, index) => { if (index === 0) cranks[index].rotation.z = rest + Math.max(0, Math.sin(time * mix(2, 7, energy))) ** 8 * 0.18; });
      },
    });
  },
});
