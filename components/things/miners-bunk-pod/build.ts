import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const DOORS = {
  number: 'A stencilled unit number, nothing personal.',
  heart: 'A big red heart with an arrow through it.',
  keepout: 'A skull and KEEP OUT in dripping white paint.',
  home: 'HOME in careful letters with a painted flower.',
  tally: 'Rows of tally marks counting the days.',
  sun: "A child's drawing of a yellow sun and a little house.",
  crossed: 'A company logo crossed out with a spray-paint X.',
} as const;
const HULLS = {
  white: 'Ceramic white gone grey with dust.',
  orange: 'Safety orange, visible from orbit.',
  green: 'Army-surplus olive green.',
  silver: 'Bare ribbed aluminium.',
  patched: 'Pale blue, patched with mismatched plates riveted over old holes.',
} as const;
const LIGHTS = {
  dark: 'Dark: the porthole is a black eye.',
  lamp: 'One warm lamp behind the laundry.',
  blazing: 'Every light on, spilling out bright.',
  screen: 'The cold blue flicker of a screen, nothing else.',
} as const;
const WHO = {
  nobody: 'Nobody: no boots by the hatch, the place shut up.',
  one: 'One miner, one pair of boots, a head at the window.',
  crew: 'A whole shift packed in: a row of boots, shoulders crowding the glass.',
  child: 'A family: big boots and one very small pair, a small head at the sill.',
  watcher: 'Someone standing close to the glass, looking out, not moving.',
} as const;

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    light: choice('Is the pod lit?', LIGHTS),
    who: choice('Who is in?', WHO),
    door: choice('What is painted on the hatch?', DOORS),
    hull: choice('What is the hull like?', HULLS),
    laundry: choice('What is hanging on the line inside the window?', {
      work: 'Grey work shirts and socks, all the same.',
      bright: 'Bright mismatched shirts, a striped towel, colour against the dark.',
      smalls: 'Mostly socks and long underwear.',
      bare: 'An empty line with two pegs left on it.',
    }),
    garden: noul('Is there a window box of something green growing under the porthole?'),
    lights: noul('Has someone strung coloured party lights along the roof?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = 1.25, L = 3.7, cy = R + 0.55;
    const hullColour = { white: '#d9d9d2', orange: '#e0762a', green: '#667048', silver: '#b4bbc0', patched: '#9fbdd0' }[a.hull];
    const hull = s.material(hullColour, { metalness: a.hull === 'silver' ? 0.7 : 0.15, roughness: a.hull === 'silver' ? 0.4 : 0.6 });
    const steel = s.material('#7f868b', { metalness: 0.7, roughness: 0.4 });
    const dark = s.material('#2a2d30', { roughness: 0.7 });

    // Dented shell: push the skin in around a scatter of impact points.
    const shell = new THREE.CylinderGeometry(R, R, L, 44, 16, true);
    shell.rotateZ(Math.PI / 2);
    const dents = Array.from({ length: Math.round(4 + mood.wear * 9) }, () => ({ x: (random() - 0.5) * L * 0.9, angle: random() * Math.PI * 2, reach: mix(0.3, 0.7, random()), depth: mix(0.06, 0.2, random()) * mix(0.6, 1.3, mood.wear) }));
    const position = shell.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
      const angle = Math.atan2(y, z);
      let push = 0;
      for (const dent of dents) {
        const around = Math.atan2(Math.sin(angle - dent.angle), Math.cos(angle - dent.angle)) * R;
        const d = Math.hypot(x - dent.x, around) / dent.reach;
        if (d < 1) push += dent.depth * (1 - d * d);
      }
      const k = 1 - Math.min(push, 0.28) / R;
      position.setXYZ(i, x, y * k, z * k);
    }
    shell.computeVertexNormals();
    s.mesh(shell, hull, [0, cy, 0]);
    for (const x of [-1, 1]) s.ball([0.5, R, R], [x * L / 2, cy, 0], hull, 28);
    for (const x of [-1.2, 0, 1.2]) s.ring(R + 0.015, 0.035, [x, cy, 0], steel).rotation.y = Math.PI / 2;
    if (a.hull === 'patched') {
      const plates = ['#b0503a', '#d8d2c0', '#6b7a52', '#c9a23a', '#7d868c'];
      for (let i = 0; i < 6; i++) {
        const angle = mix(-0.5, 1.9, random()), x = (random() - 0.5) * L * 0.8;
        const plate = s.box([mix(0.4, 0.8, random()), mix(0.35, 0.6, random()), 0.03], [x, cy + Math.sin(angle) * (R + 0.01), Math.cos(angle) * (R + 0.01)], s.material(plates[i % plates.length], { metalness: 0.3 }));
        plate.rotation.x = -angle;
      }
    }

    // Cradle and feet.
    for (const x of [-1.2, 1.2]) {
      s.box([0.22, 0.5, R * 1.7], [x, 0.5, 0], dark);
      for (const z of [-1, 1]) {
        s.rod([x, 0.6, z * R * 0.8], [x, 0.04, z * (R + 0.25)], 0.06, steel);
        s.cylinder(0.2, 0.24, 0.06, [x, 0.03, z * (R + 0.25)], dark, 8);
      }
    }
    s.rod([-1.2, 0.4, 0], [1.2, 0.4, 0], 0.05, steel);

    // Porthole with the life inside painted on its glass.
    const glow = { dark: '#18222b', lamp: '#f3b860', blazing: '#fff0c0', screen: '#6fa8e8' }[a.light];
    const lit = a.light !== 'dark';
    const garments = {
      work: ['#8a8f92', '#6f7578', '#9a9c98', '#7c8286'],
      bright: ['#e0483a', '#3f8fd8', '#f0c030', '#48b070', '#d86ab0'],
      smalls: ['#e8e4d8', '#c9c2b0', '#e8e4d8', '#b8483a'],
      bare: [],
    }[a.laundry];
    const window = canvasTexture(256, 256, (ctx) => {
      const sky = ctx.createRadialGradient(128, 110, 10, 128, 128, 150);
      sky.addColorStop(0, glow); sky.addColorStop(1, lit ? '#6b4a2a' : '#0c1217');
      if (a.light === 'screen') { sky.addColorStop(1, '#1a2c48'); }
      ctx.fillStyle = sky; ctx.fillRect(0, 0, 256, 256);
      const ink = lit ? '#2a1c12' : '#3a4852';
      ctx.strokeStyle = ink; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(10, 62); ctx.quadraticCurveTo(128, 84, 246, 58); ctx.stroke();
      const count = a.laundry === 'bare' ? 0 : 4;
      for (let i = 0; i < count; i++) {
        const x = 40 + i * 52 + (random() - 0.5) * 12, y = 70 + Math.sin(i * 1.3) * 5;
        ctx.fillStyle = lit ? garments[Math.floor(random() * garments.length)] : '#33414a';
        const kind = a.laundry === 'smalls' ? (i % 2 ? 'sock' : 'legs') : i === 2 && a.laundry === 'bright' ? 'towel' : random() > 0.6 ? 'sock' : 'shirt';
        if (kind === 'shirt') { ctx.fillRect(x - 16, y, 32, 46); ctx.fillRect(x - 28, y, 56, 16); }
        else if (kind === 'sock') { ctx.fillRect(x - 6, y, 13, 36); ctx.fillRect(x - 6, y + 26, 24, 12); }
        else if (kind === 'legs') { ctx.fillRect(x - 15, y, 30, 16); ctx.fillRect(x - 15, y, 12, 56); ctx.fillRect(x + 3, y, 12, 56); }
        else { ctx.fillRect(x - 18, y, 36, 60); ctx.fillStyle = '#f2f0e8'; for (let k = 0; k < 3; k++) ctx.fillRect(x - 18, y + 8 + k * 18, 36, 7); }
        ctx.fillStyle = ink; ctx.fillRect(x - 3, y - 6, 6, 10);
      }
      if (a.laundry === 'bare') for (const x of [90, 170]) { ctx.fillStyle = ink; ctx.fillRect(x, 60, 6, 14); }
      // Whoever is home, as dark shapes against the light.
      ctx.fillStyle = lit ? '#1c120c' : '#0a0f13';
      const head = (x: number, y: number, r: number) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(x, y + r * 2.6, r * 1.9, r * 1.8, 0, 0, 7); ctx.fill(); };
      if (a.who === 'one') head(150, 196, 22);
      if (a.who === 'crew') { head(70, 200, 22); head(132, 188, 24); head(194, 204, 21); }
      if (a.who === 'child') { head(100, 180, 24); head(168, 222, 15); }
      if (a.who === 'watcher') head(128, 120, 44);
    });
    const px = -0.75, pr = 0.58;
    s.cylinder(pr + 0.1, pr + 0.14, 0.42, [px, cy, R - 0.06], steel, 28).rotation.x = Math.PI / 2;
    s.cylinder(pr, pr, 0.02, [px, cy, R + 0.16], new THREE.MeshStandardMaterial({ map: window, emissiveMap: window, emissive: '#ffffff', emissiveIntensity: lit ? (a.light === 'blazing' ? 1.25 : 0.85) : 0.12, roughness: 0.2 }), 32).rotation.set(Math.PI / 2, Math.PI / 2, 0);
    s.ring(pr + 0.03, 0.05, [px, cy, R + 0.17], dark);
    for (let i = 0; i < 8; i++) s.ball([0.035, 0.035, 0.03], [px + Math.cos(i * Math.PI / 4) * (pr + 0.09), cy + Math.sin(i * Math.PI / 4) * (pr + 0.09), R + 0.15], dark, 6);

    // Hatch with its painting.
    const hx = 0.95, hw = 0.95, hh = 1.55, hy = cy - 0.05;
    const number = String(1 + Math.floor(random() * 98)).padStart(2, '0');
    const doorBase = { white: '#c9c6ba', orange: '#b8b4a6', green: '#8a8a70', silver: '#8f979c', patched: '#c9b88a' }[a.hull];
    const painting = canvasTexture(256, 420, (ctx) => {
      ctx.fillStyle = doorBase; ctx.fillRect(0, 0, 256, 420);
      ctx.strokeStyle = '#00000033'; ctx.lineWidth = 6; ctx.strokeRect(14, 14, 228, 392);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (a.door === 'number') { ctx.fillStyle = '#20242a'; ctx.font = 'bold 150px monospace'; ctx.fillText(number, 128, 230); ctx.fillRect(40, 320, 176, 12); }
      if (a.door === 'heart') {
        ctx.fillStyle = '#d42a3a'; ctx.beginPath(); ctx.moveTo(128, 320); ctx.bezierCurveTo(-20, 210, 50, 110, 128, 180); ctx.bezierCurveTo(206, 110, 276, 210, 128, 320); ctx.fill();
        ctx.strokeStyle = '#20242a'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(30, 300); ctx.lineTo(226, 160); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(226, 160); ctx.lineTo(196, 160); ctx.moveTo(226, 160); ctx.lineTo(220, 190); ctx.stroke();
      }
      if (a.door === 'keepout') {
        ctx.fillStyle = '#f2f0e8'; ctx.beginPath(); ctx.arc(128, 170, 62, 0, 7); ctx.fill(); ctx.fillRect(92, 200, 72, 56);
        ctx.fillStyle = '#20242a'; ctx.beginPath(); ctx.arc(104, 168, 17, 0, 7); ctx.arc(152, 168, 17, 0, 7); ctx.fill();
        for (let i = 0; i < 4; i++) ctx.fillRect(100 + i * 16, 226, 5, 30);
        ctx.fillStyle = '#f2f0e8'; ctx.font = 'bold 54px monospace'; ctx.fillText('KEEP', 128, 310); ctx.fillText('OUT', 128, 364);
        for (const x of [70, 150, 190]) ctx.fillRect(x, 380, 6, 30);
      }
      if (a.door === 'home') {
        ctx.fillStyle = '#2f5fa8'; ctx.font = 'bold 76px serif'; ctx.fillText('HOME', 128, 150);
        ctx.strokeStyle = '#3f8a4a'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(128, 370); ctx.quadraticCurveTo(110, 320, 128, 270); ctx.stroke();
        ctx.fillStyle = '#e04a6a'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(128 + Math.cos(i * 1.05) * 30, 250 + Math.sin(i * 1.05) * 30, 20, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#f0c030'; ctx.beginPath(); ctx.arc(128, 250, 18, 0, 7); ctx.fill();
      }
      if (a.door === 'tally') {
        ctx.strokeStyle = '#20242a'; ctx.lineWidth = 7;
        const groups = 5 + Math.floor(random() * 7);
        for (let g = 0; g < groups; g++) {
          const gx = 40 + (g % 3) * 68, gy = 70 + Math.floor(g / 3) * 82;
          for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(gx + k * 12, gy); ctx.lineTo(gx + k * 12 + 3, gy + 54); ctx.stroke(); }
          ctx.beginPath(); ctx.moveTo(gx - 8, gy + 44); ctx.lineTo(gx + 46, gy + 10); ctx.stroke();
        }
      }
      if (a.door === 'sun') {
        ctx.fillStyle = '#f2c020'; ctx.beginPath(); ctx.arc(170, 120, 44, 0, 7); ctx.fill();
        ctx.strokeStyle = '#f2c020'; ctx.lineWidth = 9; for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.moveTo(170 + Math.cos(i * 0.63) * 56, 120 + Math.sin(i * 0.63) * 56); ctx.lineTo(170 + Math.cos(i * 0.63) * 82, 120 + Math.sin(i * 0.63) * 82); ctx.stroke(); }
        ctx.strokeStyle = '#c0382a'; ctx.lineWidth = 9; ctx.strokeRect(50, 270, 110, 90);
        ctx.beginPath(); ctx.moveTo(40, 272); ctx.lineTo(105, 210); ctx.lineTo(170, 272); ctx.stroke();
        ctx.strokeStyle = '#3f8a4a'; ctx.beginPath(); ctx.moveTo(20, 372); ctx.lineTo(236, 366); ctx.stroke();
      }
      if (a.door === 'crossed') {
        ctx.strokeStyle = '#2a5aa8'; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(128, 200, 70, 0, 7); ctx.stroke();
        ctx.fillStyle = '#2a5aa8'; ctx.beginPath(); ctx.moveTo(128, 150); ctx.lineTo(172, 240); ctx.lineTo(84, 240); ctx.fill();
        ctx.strokeStyle = '#d02a20'; ctx.lineWidth = 22; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(40, 100); ctx.lineTo(216, 310); ctx.moveTo(216, 96); ctx.lineTo(44, 316); ctx.stroke();
      }
    });
    s.box([hw + 0.2, hh + 0.2, 0.7], [hx, hy, R - 0.2], steel);
    s.mesh(new THREE.PlaneGeometry(hw, hh), new THREE.MeshStandardMaterial({ map: painting, roughness: 0.7 }), [hx, hy, R + 0.155]);
    s.ring(0.14, 0.025, [hx + hw * 0.3, hy - 0.05, R + 0.2], dark);
    s.rod([hx + hw * 0.3, hy - 0.05, R + 0.15], [hx + hw * 0.3, hy - 0.05, R + 0.21], 0.03, dark);
    for (const y of [-0.5, 0.5]) s.box([0.08, 0.2, 0.06], [hx - hw / 2 - 0.02, hy + y, R + 0.17], dark);
    s.box([0.3, 0.1, 0.05], [hx, hy + hh / 2 + 0.2, R + 0.14], new THREE.MeshStandardMaterial({ color: lit ? '#9dff9a' : '#4a5550', emissive: lit ? '#4dff5a' : '#000000', emissiveIntensity: lit ? 1.1 : 0 }));

    // Step platform, ladder and the boots clipped by the hatch.
    const stepY = hy - hh / 2 - 0.14;
    s.box([hw + 1.1, 0.07, 0.8], [hx - 0.1, stepY, R + 0.5], steel);
    for (const x of [hx - 0.75, hx + 0.55]) s.rod([x, stepY, R + 0.85], [x, 0, R + 1.1], 0.035, steel);
    for (let i = 1; i <= 2; i++) s.box([1.3, 0.05, 0.2], [hx - 0.1, stepY * (1 - i / 3), R + 0.85 + i * 0.085], steel);
    s.rod([hx - hw / 2 - 0.55, stepY + 0.42, R + 0.2], [hx - hw / 2 - 0.08, stepY + 0.42, R + 0.2], 0.02, dark);
    const bootSets = { nobody: [] as number[], one: [1], crew: [1, 0.95, 1.05], child: [1, 1, 0.5], watcher: [1] }[a.who];
    const bootTints = ['#5a3d28', '#2e3033', '#7a5a32', '#3d4a3a'];
    bootSets.forEach((size, index) => {
      const tint = s.material(size < 0.7 ? '#d8482a' : bootTints[Math.floor(random() * bootTints.length)], { roughness: 0.8 });
      for (const side of [0, 1]) {
        const bx = hx - hw / 2 - 0.14 - index * 0.3 - side * 0.13, bz = R + 0.34 + (random() - 0.5) * 0.05;
        s.box([0.11 * size, 0.09 * size, 0.3 * size], [bx, stepY + 0.035 + 0.045 * size, bz + 0.05 * size], tint);
        s.cylinder(0.055 * size, 0.05 * size, 0.3 * size, [bx, stepY + 0.035 + 0.2 * size, bz - 0.05 * size], tint, 8);
      }
    });

    // Roof clutter: vent stack, radiator fin, antenna, water bottle.
    const top = cy + R;
    s.cylinder(0.11, 0.13, 0.6, [1.2, top + 0.2, -0.2], steel, 10);
    s.cylinder(0.2, 0.2, 0.05, [1.2, top + 0.55, -0.2], dark, 10);
    s.box([1.4, 0.7, 0.05], [-0.5, top + 0.4, -0.35], s.material('#30506a', { metalness: 0.5, roughness: 0.3 })).rotation.x = -0.3;
    s.rod([-0.5, top - 0.1, -0.3], [-0.5, top + 0.2, -0.3], 0.03, steel);
    s.rod([-1.5, top - 0.15, 0], [-1.65, top + 1.3, 0.1], 0.015, steel);
    const tank = s.mesh(new THREE.CapsuleGeometry(0.2, 0.7, 4, 10), s.material('#e8e6de', { roughness: 0.4 }), [-L / 2 - 0.35, cy - 0.2, 0.5]);
    s.ring(0.21, 0.02, [-L / 2 - 0.35, cy - 0.2, 0.5], dark).rotation.x = Math.PI / 2;
    tank.rotation.z = (random() - 0.5) * 0.1;
    if (lit && mood.energy > 0.3) for (let i = 0; i < 3; i++) s.ball([0.2 + i * 0.1, 0.18 + i * 0.08, 0.2 + i * 0.1], [1.2 + i * 0.12, top + 0.8 + i * 0.32, -0.2], new THREE.MeshBasicMaterial({ color: '#f4f8fa', transparent: true, opacity: 0.3 - i * 0.07, depthWrite: false }), 10).castShadow = false;

    if (a.garden) {
      s.box([1.0, 0.2, 0.3], [px, cy - pr - 0.32, R + 0.12], s.material('#8a5a3a'));
      const green = s.material('#4fa84a', { emissive: '#2a6a2a', emissiveIntensity: 0.25 });
      for (let i = 0; i < 9; i++) {
        const gx = px - 0.42 + i * 0.105, height = mix(0.12, 0.34, random());
        s.rod([gx, cy - pr - 0.22, R + 0.14], [gx + (random() - 0.5) * 0.1, cy - pr - 0.22 + height, R + 0.18], 0.02, green, 0.008);
        s.ball([0.05, 0.035, 0.05], [gx + (random() - 0.5) * 0.08, cy - pr - 0.2 + height, R + 0.18], random() > 0.75 ? s.material('#e84a3a') : green, 6);
      }
    }
    if (a.lights) {
      const colours = ['#ff4a3a', '#ffd23a', '#4ad86a', '#4a9aff', '#ff6ad0'];
      const points: [number, number, number][] = [];
      for (let i = 0; i <= 10; i++) points.push([-L / 2 + 0.2 + i * (L - 0.4) / 10, cy + R * 0.86 + Math.abs(Math.sin(i * Math.PI / 2.5)) * -0.14 + 0.05, R * 0.56]);
      s.tube(points, 0.01, dark);
      for (const [index, point] of points.entries()) s.ball([0.055, 0.07, 0.055], [point[0], point[1] - 0.07, point[2]], new THREE.MeshStandardMaterial({ color: colours[index % 5], emissive: colours[index % 5], emissiveIntensity: 1.3 }), 8);
    }
    // Clutter gathers round a lived-in pod.
    for (let i = 0; i < Math.round(mood.density * 5); i++) {
      const x = mix(-L / 2, L / 2 - 1.6, random()), z = R + 0.5 + random() * 0.8;
      if (i % 2) s.box([0.4, 0.34, 0.4], [x, 0.17, z], s.material(['#b98a52', '#3f78a8', '#a4502c'][i % 3])).rotation.y = random();
      else s.cylinder(0.16, 0.16, 0.5, [x, 0.25, z], s.material(['#3f8a6a', '#c9c2a8'][i % 4 ? 0 : 1]), 12);
    }

    return s.finish({ footprint: L / 2 + 0.4 });
  },
});
