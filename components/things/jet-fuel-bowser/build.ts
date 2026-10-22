import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { beacon, cone, crew, rbox, wheel } from './parts';

const BRANDS = {
  scarlet: 'Scarlet cab and a canary yellow tank: a loud 1960s oil major.',
  green: 'Deep green with a white tank and a gold band, old money petrol.',
  blue: 'Royal blue cab, white tank, a red band: a national fuel company.',
  orange: 'Orange and white with a black band, a cheerful discount brand.',
  silver: 'Bare polished aluminium tank with a single red band.',
  olive: 'Military olive drab all over, stencilled in white.',
  white: 'Anonymous white all over, a contractor nobody has heard of.',
} as const;
// cab, tank, band
const SCHEME: Record<keyof typeof BRANDS, [string, string, string]> = {
  scarlet: ['#cf2a26', '#f3c81a', '#cf2a26'], green: ['#1f5a3c', '#f0efe8', '#c9a23a'], blue: ['#1f4fa3', '#f0f1ee', '#cf2a26'],
  orange: ['#ee6d1c', '#f2f0e8', '#222428'], silver: ['#c9ced1', '#c6ccd0', '#cf2a26'], olive: ['#5c6642', '#5c6642', '#3f472e'], white: ['#ecedea', '#ecedea', '#9aa0a3'],
};
const NAMES: Record<keyof typeof BRANDS, string> = { scarlet: 'PETROSOL', green: 'ALBION AVIATION', blue: 'NATIONAL AERO', orange: 'JETSTOP', silver: 'SKYLINE FUELS', olive: 'F-34', white: 'AIRSIDE FUELLING' };

function diamond(top: string, glyph: string, fill: string, ink: string) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = fill; ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.strokeRect(8, 8, 112, 112);
  ctx.save(); ctx.translate(64, 64); ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 44px sans-serif'; ctx.fillText(glyph, 0, 26);
  // A simple flame.
  ctx.beginPath(); ctx.moveTo(0, -42); ctx.bezierCurveTo(22, -18, 16, -4, 0, -2); ctx.bezierCurveTo(-18, -4, -16, -22, -6, -26); ctx.bezierCurveTo(-6, -20, 0, -22, 0, -42); ctx.fill();
  ctx.restore(); void top;
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.7, side: THREE.DoubleSide });
}

export default defineThing({
  questions: {
    brand: choice('Whose colours does it wear?', BRANDS),
    era: choice('What era is the truck?', {
      fifties: 'A 1950s bonneted lorry with a rounded cab, separate mudguards and an oval tank.',
      seventies: 'A 1970s flat-fronted cab-over with a long cylindrical tank and exposed reels.',
      modern: 'A modern low-profile airport refueller: a squat cab below a big slab-sided tank with a pump module at the back.',
    }),
    hose: choice('What is the hose doing?', {
      stowed: 'Wound tight on its reels, nozzles clipped away.',
      ground: 'Pulled out and snaking across the concrete to a nozzle lying on the ground.',
      wing: 'Run up from the lift platform to an unseen wing: it rises and couples to nothing.',
      heap: 'Dumped in a loose tangled heap beside the truck.',
    }),
    cable: choice('Where is the grounding cable?', {
      stowed: 'Wound on its little yellow reel.',
      clipped: 'Pulled out and clipped to an earthing point in the concrete.',
      trailing: 'Trailing loose along the ground behind the truck, forgotten.',
      missing: 'There is no cable: the reel is empty.',
    }),
    platform: score('How high is the rear lift platform raised?', ['Folded right down', 'Knee high', 'Half way', 'Fully up, at wing height']),
    placard: choice('What do the big letters on the tank say?', {
      jet: 'JET A-1', avgas: 'AVGAS 100LL', flammable: 'FLAMMABLE', smoking: 'NO SMOKING', brand: 'The fuel company\'s invented name.', blank: 'Nothing: the lettering has been painted out.',
    }),
    crew: choice('Who is with the truck?', {
      nobody: 'Nobody. It stands unattended.',
      operator: 'A fueller in hi-vis standing on the platform.',
      driver: 'A driver sitting in the cab, waiting.',
      both: 'A driver in the cab and a fueller at the back.',
    }),
    cones: noul('Are safety cones and a fire extinguisher set out around it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [cabHex, tankHex, bandHex] = SCHEME[a.brand];
    const metal = a.brand === 'silver';
    const cabPaint = s.material(cabHex, { roughness: 0.45, metalness: metal ? 0.6 : 0.1 });
    const tankPaint = s.material(tankHex, { roughness: metal ? 0.28 : 0.45, metalness: metal ? 0.8 : 0.1 });
    const band = s.material(bandHex, { roughness: 0.5 });
    const dark = s.material('#2a2d30', { roughness: 0.7 }), tyre = s.material('#1b1c1e', { roughness: 0.9 });
    const hub = s.material('#d9d8d0', { metalness: 0.3 }), steel = s.material('#9aa1a3', { metalness: 0.6, roughness: 0.4 });
    const rubber = s.material('#23211f', { roughness: 0.85 }), yellow = s.material('#f1bd16'), orange = s.material('#f0641e'), white = s.material('#f1efe6');
    const glass = new THREE.MeshStandardMaterial({ color: '#2b3d4e', roughness: 0.15, metalness: 0.5 });
    const lampsOn = mix(0.3, 2.2, Math.abs(mood.daylight - 0.5) * 2);
    const lamp = new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#ffe9a6', emissiveIntensity: lampsOn });
    const vest = s.material('#d8e62a', { emissive: '#8a9a00', emissiveIntensity: 0.25 }), cloth = s.material('#2b3550'), skin = s.material('#c9a58a');
    const ticks: ((time: number, speed: number) => void)[] = [];
    const working = a.hose === 'ground' || a.hose === 'wing';

    const deck = 1.0;            // chassis top
    const tankL = a.era === 'fifties' ? 4.6 : 5.6, tankX = a.era === 'fifties' ? -0.9 : -0.6;
    const ry = a.era === 'fifties' ? 0.82 : 0.95, rz = 1.15;
    const tankY = deck + ry + 0.08;
    const front = tankX + tankL / 2, rear = tankX - tankL / 2;
    const moduleL = 1.5, tailX = rear - moduleL;

    // ---- Chassis and wheels.
    s.box([front - tailX + (a.era === 'fifties' ? 3.2 : 2.2), 0.22, 0.95], [(front + tailX) / 2 + (a.era === 'fifties' ? 1.6 : 1.1), deck - 0.2, 0], dark);
    const frontAxle = front + (a.era === 'fifties' ? 2.1 : a.era === 'modern' ? 1.2 : 1.1);
    const rears = a.era === 'fifties' ? [rear + 1.2] : [rear + 0.6, rear + 1.75];
    for (const z of [-1.02, 1.02]) {
      wheel(s, 0.5, 0.3, [frontAxle, 0.5, z], tyre, hub);
      for (const x of rears) { wheel(s, 0.5, 0.52, [x, 0.5, z * 0.9], tyre, hub); const guard = s.box([1.25, 0.05, 0.6], [x, 1.08, z * 0.9], dark); void guard; }
    }
    // Side lockers and underrun rail between the axles.
    for (const z of [-1.05, 1.05]) { rbox(s, [1.6, 0.5, 0.3], [(frontAxle + rears[rears.length - 1]) / 2, 0.62, z], cabPaint, 0.04); s.box([front - rear, 0.05, 0.05], [tankX, 0.42, z * 1.08], steel); }

    // ---- Cab.
    let cabTop = 0, cabX = 0, seatY = 0;
    if (a.era === 'fifties') {
      cabX = front + 0.85; cabTop = 2.5; seatY = 1.45;
      rbox(s, [1.4, 1.45, 2.1], [cabX, 1.72, 0], cabPaint, 0.3);
      rbox(s, [1.5, 0.85, 1.35], [cabX + 1.4, 1.38, 0], cabPaint, 0.28);
      s.box([0.06, 0.6, 0.9], [cabX + 2.16, 1.36, 0], steel);
      for (let i = 0; i < 7; i++) s.box([0.07, 0.56, 0.035], [cabX + 2.17, 1.36, -0.36 + i * 0.12], dark);
      for (const z of [-1, 1]) {
        const shell = cabPaint.clone(); shell.side = THREE.DoubleSide;
        const g = s.mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.46, 18, 1, true, -Math.PI / 2, Math.PI), shell, [frontAxle, 0.55, z * 1.0]); g.rotation.x = -Math.PI / 2;
        s.ball([0.1, 0.14, 0.14], [cabX + 2.12, 1.5, z * 0.82], lamp, 12);
        s.box([0.62, 0.62, 0.03], [cabX + 0.05, 2.02, z * 1.045], glass);
      }
      s.box([0.03, 0.55, 1.7], [cabX + 0.71, 2.05, 0], glass);
      s.box([0.2, 0.14, 2.3], [cabX + 2.25, 0.72, 0], steel);
    } else if (a.era === 'seventies') {
      cabX = front + 1.15; cabTop = 2.75; seatY = 1.6;
      rbox(s, [1.75, 1.9, 2.4], [cabX, 1.82, 0], cabPaint, 0.1);
      s.box([0.03, 0.75, 2.1], [cabX + 0.875, 2.2, 0], glass);
      for (const z of [-1, 1]) { s.box([0.9, 0.7, 0.03], [cabX + 0.25, 2.2, z * 1.2], glass); s.box([0.05, 0.16, 0.26], [cabX + 0.885, 1.2, z * 0.85], lamp); }
      s.box([0.05, 0.5, 1.5], [cabX + 0.885, 1.5, 0], dark);
      s.box([0.2, 0.24, 2.45], [cabX + 0.9, 0.78, 0], steel);
      s.box([1.5, 0.06, 2.2], [cabX, 2.8, 0], white);
    } else {
      cabX = front + 1.2; cabTop = 2.05; seatY = 1.0;
      rbox(s, [2.0, 1.45, 2.5], [cabX, 1.3, 0], cabPaint, 0.16);
      s.box([0.03, 0.75, 2.2], [cabX + 1.0, 1.55, 0], glass).rotation.z = 0.0;
      for (const z of [-1, 1]) { s.box([1.5, 0.62, 0.03], [cabX + 0.1, 1.6, z * 1.25], glass); s.box([0.05, 0.1, 0.4], [cabX + 1.01, 0.88, z * 0.9], lamp); }
      s.box([0.16, 0.26, 2.55], [cabX + 1.0, 0.62, 0], dark);
    }
    for (const z of [-1, 1]) { s.rod([cabX + 0.6, cabTop - 0.5, z * 1.2], [cabX + 0.75, cabTop - 0.45, z * 1.5], 0.015, steel); s.box([0.04, 0.34, 0.18], [cabX + 0.75, cabTop - 0.45, z * 1.52], dark); }
    ticks.push(beacon(s, [cabX - 0.2, cabTop + (a.era === 'seventies' ? 0.08 : 0), 0], '#ffa51a', working, 1.6));
    if (a.crew === 'driver' || a.crew === 'both') crew(s, [cabX + 0.05, seatY, 0.55], 0, vest, cloth, skin, true);

    // ---- Tank.
    if (a.era === 'modern') {
      rbox(s, [tankL, ry * 2 + 0.25, rz * 2 + 0.1], [tankX, tankY + 0.1, 0], tankPaint, 0.28);
      s.box([tankL + 0.02, 0.26, rz * 2 + 0.13], [tankX, tankY - 0.35, 0], band);
    } else {
      const barrel = s.mesh(new THREE.CylinderGeometry(1, 1, tankL - 0.5, 36), tankPaint, [tankX, tankY, 0]);
      barrel.rotation.z = Math.PI / 2; barrel.scale.set(ry, 1, rz);
      for (const d of [-1, 1]) s.ball([0.34, ry, rz], [tankX + d * (tankL / 2 - 0.25), tankY, 0], tankPaint, 28);
      for (const d of [-0.33, 0, 0.33]) { const hoop = s.mesh(new THREE.CylinderGeometry(1.012, 1.012, 0.09, 36), d === 0 ? band : steel, [tankX + d * tankL, tankY, 0]); hoop.rotation.z = Math.PI / 2; hoop.scale.set(ry, 1, rz); }
      const stripe = s.mesh(new THREE.CylinderGeometry(1.008, 1.008, tankL - 0.9, 36, 1, true, Math.PI / 2 - 0.16, 0.32), band, [tankX, tankY, 0]);
      stripe.rotation.z = Math.PI / 2; stripe.scale.set(ry, 1, rz);
      const stripe2 = s.mesh(new THREE.CylinderGeometry(1.008, 1.008, tankL - 0.9, 36, 1, true, -Math.PI / 2 - 0.16, 0.32), band, [tankX, tankY, 0]);
      stripe2.rotation.z = Math.PI / 2; stripe2.scale.set(ry, 1, rz);
      for (const z of [-0.7, 0.7]) for (const d of [-0.3, 0.3]) s.box([0.5, 0.2, 0.25], [tankX + d * tankL, deck + 0.08, z], dark);
    }
    const tankTop = a.era === 'modern' ? tankY + 0.1 + ry + 0.125 : tankY + ry;
    // Walkway, manholes and a guard rail along the crown.
    s.box([tankL - 0.9, 0.04, 0.6], [tankX, tankTop + 0.03, 0], steel);
    for (const d of [-0.28, 0.05, 0.3]) { s.cylinder(0.24, 0.26, 0.14, [tankX + d * tankL, tankTop + 0.1, 0], dark, 16); s.cylinder(0.2, 0.2, 0.04, [tankX + d * tankL, tankTop + 0.19, 0], steel, 16); }
    for (let i = 0; i <= 5; i++) s.rod([tankX - tankL * 0.4 + i * tankL * 0.16, tankTop, -0.34], [tankX - tankL * 0.4 + i * tankL * 0.16, tankTop + 0.4, -0.34], 0.015, steel);
    s.rod([tankX - tankL * 0.4, tankTop + 0.4, -0.34], [tankX + tankL * 0.4, tankTop + 0.4, -0.34], 0.018, steel);
    // Ladder up the front of the tank.
    if (a.era !== 'modern') {
      for (const z of [0.25, 0.6]) s.rod([rear - 0.02, deck, z], [rear + 0.25, tankTop, z * 0.6], 0.018, steel);
      for (let i = 1; i < 7; i++) { const t = i / 7; s.rod([mix(rear - 0.02, rear + 0.25, t), mix(deck, tankTop, t), mix(0.25, 0.15, t)], [mix(rear - 0.02, rear + 0.25, t), mix(deck, tankTop, t), mix(0.6, 0.36, t)], 0.012, steel); }
    }

    // ---- Lettering and placards.
    const sideZ = a.era === 'modern' ? rz + 0.06 : rz + 0.004;
    const text = { jet: 'JET A-1', avgas: 'AVGAS 100LL', flammable: 'FLAMMABLE', smoking: 'NO SMOKING', brand: NAMES[a.brand], blank: '' }[a.placard];
    const ink = a.brand === 'scarlet' ? '#b41f1c' : a.brand === 'olive' ? '#eeeeea' : a.brand === 'green' ? '#1f5a3c' : a.brand === 'blue' ? '#1f4fa3' : '#222428';
    const paper = '#' + new THREE.Color(tankHex).getHexString();
    for (const z of [1, -1]) {
      if (text) { const l = s.label(text, Math.min(tankL * 0.62, text.length * 0.42), 0.55, [tankX + 0.2, tankY + (a.era === 'modern' ? 0.35 : 0.05), z * (sideZ + 0.006)], ink, paper); if (z < 0) l.rotation.y = Math.PI; }
      else s.box([tankL * 0.5, 0.6, 0.01], [tankX + 0.2, tankY + 0.1, z * (sideZ + 0.003)], s.material('#b9b6ac', { roughness: 0.95 }));
      const haz = s.mesh(new THREE.PlaneGeometry(0.5, 0.5), diamond('', '3', '#d3261f', '#ffffff'), [rear + 0.75, tankY + (a.era === 'modern' ? 0.35 : 0.05), z * (sideZ + 0.012)]);
      haz.rotation.z = Math.PI / 4; if (z < 0) haz.rotation.y = Math.PI;
      const un = s.label(a.placard === 'avgas' ? '1203' : '1863', 0.55, 0.26, [front - 0.6, tankY - (a.era === 'modern' ? 0.75 : 0.5), z * ((a.era === 'modern' ? sideZ : rz * 0.86) + 0.012)], '#111111', '#f08a1c');
      if (z < 0) un.rotation.y = Math.PI;
    }

    // ---- Pump module with hose reels at the back.
    const mx = rear - moduleL / 2 + 0.1;
    rbox(s, [moduleL, 1.25, 2.3], [mx, deck + 0.62, 0], cabPaint, 0.06);
    s.box([moduleL - 0.24, 0.95, 0.06], [mx, deck + 0.62, 1.13], dark);
    const reelAt: [number, number, number] = [mx, deck + 0.62, 1.2];
    const reel = s.cylinder(0.42, 0.42, 0.14, reelAt, steel, 20); reel.rotation.x = Math.PI / 2;
    const coils = a.hose === 'stowed' ? 4 : a.hose === 'heap' ? 1 : 2;
    for (let i = 0; i < coils; i++) s.ring(0.34 - i * 0.065, 0.045, [reelAt[0], reelAt[1], reelAt[2] + 0.05], rubber);
    s.cylinder(0.08, 0.08, 0.2, [reelAt[0], reelAt[1], reelAt[2] + 0.04], dark, 10).rotation.x = Math.PI / 2;
    // Gauges and a deadman panel.
    for (let i = 0; i < 3; i++) s.cylinder(0.07, 0.07, 0.03, [mx - 0.45 + i * 0.16, deck + 1.1, 1.17], white, 12).rotation.x = Math.PI / 2;
    s.box([0.06, 0.2, 0.3], [tailX + 0.07, deck + 0.3, 0.8], new THREE.MeshStandardMaterial({ color: '#c8281e', emissive: '#ff2a1a', emissiveIntensity: lampsOn * 0.5 }));
    s.box([0.06, 0.2, 0.3], [tailX + 0.07, deck + 0.3, -0.8], new THREE.MeshStandardMaterial({ color: '#c8281e', emissive: '#ff2a1a', emissiveIntensity: lampsOn * 0.5 }));

    // ---- Lift platform on a scissor behind the module.
    const lift = mix(0.1, 2.1, a.platform) * (a.hose === 'wing' ? Math.max(1, 0.6 / Math.max(a.platform, 0.05)) : 1);
    const liftH = a.hose === 'wing' ? Math.max(lift, 1.4) : lift;
    const py = deck + 1.3 + liftH, px = mx;
    s.box([moduleL + 0.1, 0.07, 2.2], [px, py, 0], steel);
    const stages = Math.max(1, Math.round(liftH / 0.75));
    for (let i = 0; i < stages; i++) {
      const y0 = deck + 1.26 + (liftH * i) / stages, y1 = deck + 1.26 + (liftH * (i + 1)) / stages;
      for (const z of [-0.85, 0.85]) { s.rod([px - 0.6, y0, z], [px + 0.6, y1, z], 0.03, yellow); s.rod([px + 0.6, y0, z], [px - 0.6, y1, z], 0.03, yellow); }
    }
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) s.rod([px + dx * 0.75, py, dz * 1.05], [px + dx * 0.75, py + 1.0, dz * 1.05], 0.02, yellow);
    for (const h of [0.5, 1.0]) { for (const dz of [-1.05, 1.05]) s.rod([px - 0.75, py + h, dz], [px + 0.75, py + h, dz], 0.018, yellow); s.rod([px - 0.75, py + h, -1.05], [px - 0.75, py + h, 1.05], 0.018, yellow); }
    if (a.crew === 'operator' || a.crew === 'both') crew(s, [px - 0.1, py + 0.04, -0.2], Math.PI * 0.4, vest, cloth, skin, false);

    // ---- Hose.
    const hoseR = 0.055;
    if (a.hose === 'ground') {
      const end: [number, number, number] = [mx - 2.6 - random() * 1.2, hoseR, 3.0 + random() * 0.8];
      s.tube([[reelAt[0], reelAt[1] - 0.38, reelAt[2] + 0.06], [reelAt[0] + 0.1, 0.3, 1.5], [reelAt[0] + 0.9, hoseR, 2.2], [mx + 0.2, hoseR, 3.2 + random() * 0.5], [mx - 1.3, hoseR, 2.4], end], hoseR, rubber);
      s.cylinder(0.09, 0.07, 0.3, [end[0] - 0.12, 0.09, end[2] + 0.06], steel, 12).rotation.z = Math.PI / 2;
      s.ring(0.12, 0.02, [end[0] - 0.28, 0.12, end[2] + 0.06], steel).rotation.y = Math.PI / 2;
    } else if (a.hose === 'wing') {
      const top: [number, number, number] = [px - 0.5, py + 2.1, 0.5];
      s.tube([[reelAt[0], reelAt[1] + 0.38, reelAt[2] + 0.06], [reelAt[0] + 0.2, py - 0.4, 1.45], [px + 0.3, py + 0.5, 1.2], [px, py + 1.3, 0.75], top], hoseR, rubber);
      s.cylinder(0.11, 0.09, 0.26, [top[0], top[1] + 0.1, top[2]], steel, 14);
      s.cylinder(0.16, 0.16, 0.05, [top[0], top[1] + 0.25, top[2]], steel, 16);
    } else if (a.hose === 'heap') {
      const pts: [number, number, number][] = [[reelAt[0], reelAt[1] - 0.38, reelAt[2] + 0.06], [reelAt[0], 0.2, 1.7]];
      const cx = mx - 0.3, cz = 2.6;
      for (let i = 0; i < 16; i++) { const t = i * 0.9 + random() * 0.4, r = 0.45 + random() * 0.45; pts.push([cx + Math.cos(t) * r, hoseR + i * 0.012 + random() * 0.06, cz + Math.sin(t) * r * 0.8]); }
      s.tube(pts, hoseR, rubber);
      s.cylinder(0.09, 0.07, 0.3, [pts[pts.length - 1][0], 0.3, pts[pts.length - 1][2]], steel, 12).rotation.z = 0.9;
    }

    // ---- Grounding cable.
    const gAt: [number, number, number] = [tailX + 0.25, deck + 0.25, 1.2];
    s.cylinder(0.16, 0.16, 0.08, gAt, yellow, 14).rotation.x = Math.PI / 2;
    const wire = s.material('#e9e3c9', { metalness: 0.4, roughness: 0.5 });
    if (a.cable === 'stowed') s.ring(0.12, 0.022, [gAt[0], gAt[1], gAt[2] + 0.04], wire);
    else if (a.cable === 'clipped') {
      const stud: [number, number, number] = [tailX - 1.3 - random() * 0.6, 0.03, 2.3 + random() * 0.5];
      s.tube([gAt, [gAt[0] - 0.2, 0.25, 1.6], [gAt[0] - 0.7, 0.03, 2.2], stud], 0.014, wire);
      s.cylinder(0.14, 0.14, 0.02, stud, steel, 14);
      s.box([0.16, 0.06, 0.05], [stud[0], 0.07, stud[2]], s.material('#cf2a2a'));
    } else if (a.cable === 'trailing') {
      const pts: [number, number, number][] = [gAt, [gAt[0] - 0.3, 0.2, 1.4]];
      for (let i = 1; i <= 4; i++) pts.push([tailX - i * 0.5, 0.02, 1.3 + Math.sin(i * 1.4 + random()) * 0.35]);
      s.tube(pts, 0.014, wire);
      s.box([0.16, 0.06, 0.05], [pts[pts.length - 1][0] - 0.06, 0.04, pts[pts.length - 1][2]], s.material('#cf2a2a'));
    }

    // ---- Dressing.
    if (a.cones) {
      cone(s, cabX + 1.9, 1.7, orange, white); cone(s, tailX - 0.9, -1.6, orange, white); cone(s, tailX - 0.8, 1.7 + random(), orange, white, random() < mood.wear * 0.6 ? 1 + random() * 3 : 0);
      s.cylinder(0.09, 0.09, 0.5, [front + 0.2, 0.25, 1.9], s.material('#cf2a2a'), 12); s.cylinder(0.03, 0.03, 0.14, [front + 0.2, 0.57, 1.9], dark, 8);
    }
    // Drips under the couplings and streaks down the tank as wear rises.
    const stain = new THREE.MeshStandardMaterial({ color: '#3b342c', roughness: 0.3, metalness: 0.2 });
    for (let i = 0; i < Math.round(mood.wear * 5); i++) { const p = s.cylinder(0.2 + random() * 0.35, 0.2, 0.01, [mx + (random() - 0.5) * 2, 0.005, 1.5 + random() * 0.8], stain, 14); p.scale.z = 0.5 + random() * 0.5; p.castShadow = false; }
    const streak = s.material('#6f6658', { roughness: 1 });
    for (let i = 0; i < Math.round(mood.wear * 8); i++) s.box([0.05 + random() * 0.08, 0.3 + random() * 0.4, 0.012], [tankX + (random() - 0.5) * tankL * 0.8, tankY - 0.45, a.era === 'modern' ? sideZ : rz * 0.9], streak);

    const speed = mix(2.5, 9, mood.energy);
    return s.finish({ update: (_dt, time) => { for (const tick of ticks) tick(time, speed); } });
  },
});
