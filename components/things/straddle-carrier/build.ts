import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { chevrons, corrugate, halo, lamp, paint, shade, skin, weather, write } from './paint';

const LINES = {
  oxide: 'Oxide red, the anonymous leasing-company box seen everywhere.',
  blue: 'Deep sea blue with a white line name.',
  green: 'Bottle green, a big Asian carrier.',
  orange: 'Loud safety orange.',
  grey: 'Battleship grey, unmarked, faintly military.',
  magenta: 'Hot magenta, a box that cannot be ignored.',
} as const;
const LINE_PAINT: Record<keyof typeof LINES, [string, string]> = {
  oxide: ['#8e3b2a', 'TRITON'], blue: ['#1f4f86', 'NORDHAV'], green: ['#1f6b4a', 'EVERJADE'],
  orange: ['#e0661c', 'HANSA SUD'], grey: ['#7d8587', ''], magenta: ['#c8257a', 'ONE WAY'],
};
const LIVERY = {
  yellow: 'Plant-hire yellow with black trim, the default machine colour.',
  red: 'Fire-engine red with white lettering.',
  blue: 'Port-authority blue and white.',
  orange: 'Orange and dark grey, a Nordic terminal.',
  white: 'Clean white and pale grey, an automated electric fleet.',
  green: 'Dull green, an old machine kept running.',
} as const;
const LIVERY_PAINT: Record<keyof typeof LIVERY, string> = {
  yellow: '#e8b417', red: '#c22a22', blue: '#2a5c9c', orange: '#e5681d', white: '#e4e6e2', green: '#4d7a55',
};

export default defineThing({
  questions: {
    load: choice('What is it carrying between its legs?', {
      nothing: 'Nothing: the empty spreader hangs high, on its way to fetch a box.',
      twenty: 'One short twenty-foot box.',
      forty: 'One long forty-foot box that fills the whole machine.',
      twin: 'Two twenty-foot boxes of different lines lifted together.',
      reefer: 'A white refrigerated container with a compressor unit on its end.',
      tank: 'A tank container: a steel cylinder inside an open frame, with a hazard diamond.',
      opentop: 'An open-top box with a tarpaulin bulging over something too tall.',
    }),
    line: choice('If it carries a box, which shipping line colour is it?', LINES),
    hoist: score('How high is the load carried?', ['Just clear of the ground', 'Knee high', 'Half way up the legs', 'Hoisted right up under the top frame']),
    livery: choice('What livery is the machine painted in?', LIVERY),
    cab: choice('What is the state of the cab?', {
      occupied: 'Lit warm from inside, a driver silhouetted at the controls.',
      empty: 'Lit, but nobody is in the seat.',
      dark: 'Dark glass, nobody home.',
      open: 'Dark, with the door hanging open onto the access platform.',
      none: 'There is no cab: a driverless machine with a sensor mast where the cab would be.',
    }),
    state: choice('What is the machine doing right now?', {
      working: 'Working: beacon turning, work lights blazing down on the load.',
      parked: 'Parked up between shifts with chocks under the wheels and lights off.',
      broken: 'Broken down: engine cover open, a puddle of oil, cones and an OUT OF SERVICE board.',
      waiting: 'Idling with its lights on, waiting for an instruction that has not come.',
    }),
    marking: choice('What is painted along the top beam?', {
      number: 'A big stencilled fleet number.',
      stripes: 'Black and yellow hazard chevrons from end to end.',
      nickname: 'A nickname hand-painted by the drivers.',
      terminal: 'The terminal operator name in block capitals.',
      bare: 'Nothing: bare paint.',
    }),
    legs: choice('How are the legs built?', {
      box: 'Plain square box-section columns.',
      braced: 'Columns with diagonal knee braces and a lattice of cross ties.',
      tubular: 'Round tubular columns, older and more spidery.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dusk = Math.min(1, Math.abs(mood.daylight - 0.5) * 2);
    const H = 12.4, LX = 3.5, LZ = 1.95;
    const base = LIVERY_PAINT[a.livery];
    const tex = paint(256, 512, (ctx, w, h) => { ctx.fillStyle = base; ctx.fillRect(0, 0, w, h); weather(ctx, w, h, random, mood.wear); });
    const body = skin(tex, { roughness: 0.55 + mood.wear * 0.3, metalness: 0.15 });
    const flat = s.material(base, { metalness: 0.15 });
    const dark = s.material('#2a2d30');
    const steel = s.material('#8b9296', { metalness: 0.6, roughness: 0.4 });
    const rubber = s.material('#1c1c1d', { roughness: 0.95 });
    const lightColour = new THREE.Color('#dfeaff').lerp(new THREE.Color('#ffb24a'), mood.warmth);
    const on = a.state === 'working' || a.state === 'waiting';
    const glow = lamp(lightColour, on ? mix(0.7, 2.2, dusk) : 0.02);
    if (!on) glow.color.set('#55585a');

    // Running gear: two bogie beams, four wheels a side.
    const wheel = new THREE.CylinderGeometry(0.78, 0.78, 0.46, 20).rotateX(Math.PI / 2);
    const hub = new THREE.CylinderGeometry(0.34, 0.34, 0.5, 12).rotateX(Math.PI / 2);
    for (const z of [-LZ, LZ]) {
      s.box([9.4, 0.62, 0.62], [0, 1.85, z], body);
      for (const x of [-3.7, -1.55, 1.55, 3.7]) {
        s.mesh(wheel, rubber, [x, 0.78, z]);
        s.mesh(hub, flat, [x, 0.78, z]);
        s.box([0.22, 1.0, 0.66], [x, 1.3, z], dark);
      }
      s.box([0.5, 0.3, 0.7], [4.85, 1.75, z], dark);
      s.box([0.5, 0.3, 0.7], [-4.85, 1.75, z], dark);
    }

    // Four legs and the top frame.
    for (const x of [-LX, LX]) for (const z of [-LZ, LZ]) {
      if (a.legs === 'tubular') s.cylinder(0.26, 0.3, H - 2.1, [x, (H + 2.1) / 2, z], body, 14);
      else s.box([0.5, H - 2.1, 0.5], [x, (H + 2.1) / 2, z], body);
      s.box([0.7, 0.25, 0.7], [x, 2.25, z], dark);
      if (a.legs !== 'box') {
        s.rod([x, H - 2.6, z], [x - Math.sign(x) * 2.2, H - 0.2, z], 0.1, flat);
        s.rod([x, 2.3, z], [x - Math.sign(x) * 1.5, 1.95, z], 0.09, flat);
      }
    }
    if (a.legs === 'braced') for (const z of [-LZ, LZ]) for (let i = 0; i < 3; i++) {
      const y0 = 3 + i * 2.9;
      for (const x of [-LX, LX]) s.rod([x, y0, z], [x, y0 + 0.01, z], 0.3, dark);
    }
    if (a.legs !== 'box') for (const x of [-LX, LX]) {
      s.rod([x, H - 0.3, -LZ], [x, H - 2.4, 0], 0.07, flat);
      s.rod([x, H - 0.3, LZ], [x, H - 2.4, 0], 0.07, flat);
    }
    const beamText = { number: `SC ${String(2 + Math.floor(random() * 96)).padStart(2, '0')}`, stripes: '', nickname: ['BIG LINDA', 'DADDY LONGLEGS', 'OLD SQUEAKY', 'THE HERON', 'NIGHT NURSE'][Math.floor(random() * 5)], terminal: 'EASTQUAY TERMINAL', bare: '' }[a.marking];
    const beamTex = paint(1024, 64, (ctx, w, h) => {
      if (a.marking === 'stripes') chevrons(ctx, w, h);
      else { ctx.fillStyle = base; ctx.fillRect(0, 0, w, h); }
      const ink = a.livery === 'yellow' || a.livery === 'white' ? '#1c1c1c' : '#f4f1e4';
      if (a.marking === 'nickname') write(ctx, beamText, w / 2, h / 2 + 2, 46, ink, 'italic bold SIZEpx cursive', w * 0.6);
      else if (beamText) write(ctx, beamText, w / 2, h / 2 + 3, 54, ink, 'bold SIZEpx sans-serif', w * 0.7);
      weather(ctx, w, h, random, mood.wear * 0.8);
    });
    const beamSkin = skin(beamTex, { roughness: 0.6 });
    for (const z of [-LZ, LZ]) s.mesh(new THREE.BoxGeometry(9.6, 0.62, 0.62), [flat, flat, flat, flat, beamSkin, beamSkin] as unknown as THREE.Material, [0, H, z]);
    for (const x of [-LX, 0, LX]) s.box([0.5, 0.5, LZ * 2], [x, H, 0], flat);

    // Machinery house, exhaust and handrails on the roof.
    const houseX = -1.6;
    s.box([3.2, 1.3, 1.9], [houseX, H + 0.96, -0.6], body);
    s.box([3.3, 0.1, 2.0], [houseX, H + 1.66, -0.6], dark);
    for (let i = 0; i < 6; i++) s.box([0.08, 0.9, 0.04], [houseX - 1.1 + i * 0.22, H + 0.95, 0.37], dark);
    if (a.livery !== 'white') {
      s.cylinder(0.09, 0.09, 1.5, [houseX - 1.2, H + 2.3, -1.2], steel, 10);
      s.cylinder(0.13, 0.13, 0.4, [houseX - 1.2, H + 1.9, -1.2], dark, 10);
    } else s.box([1.6, 0.5, 1.2], [1.6, H + 0.56, -0.8], s.material('#3e6fa0'));
    const rail = [[-4.7, -2.2], [4.7, -2.2], [4.7, 2.2], [-4.7, 2.2], [-4.7, -2.2]] as const;
    for (let i = 0; i < 4; i++) {
      s.rod([rail[i][0], H + 1.35, rail[i][1]], [rail[i + 1][0], H + 1.35, rail[i + 1][1]], 0.035, steel);
      s.rod([rail[i][0], H + 0.3, rail[i][1]], [rail[i][0], H + 1.35, rail[i][1]], 0.035, steel);
    }
    s.box([9.4, 0.06, 0.7], [0, H + 0.34, 1.9], dark);
    // Ladder up the back leg.
    const rungs = Array.from({ length: 30 }, (_u, i) => ({ at: [-LX - 0.45, 2.6 + i * 0.33, -LZ] as [number, number, number], size: 1 }));
    s.scatter(new THREE.BoxGeometry(0.05, 0.05, 0.5), steel, rungs);
    for (const z of [-LZ - 0.25, -LZ + 0.25]) s.rod([-LX - 0.45, 2.3, z], [-LX - 0.45, H + 0.3, z], 0.03, steel);

    // Cab or sensor mast on the front corner.
    const cx = LX + 1.15, cy = H - 1.35, cz = LZ + 0.35;
    const doorOpen = a.cab === 'open' || (a.state === 'broken' && a.cab === 'dark');
    if (a.cab === 'none') {
      s.cylinder(0.07, 0.09, 2.6, [LX, H + 1.6, LZ], steel, 8);
      s.box([0.5, 0.3, 0.5], [LX, H + 3, LZ], dark);
      s.cylinder(0.16, 0.16, 0.22, [LX, H + 3.3, LZ], lamp('#4fd0ff', on ? 1.6 : 0.1), 12);
      for (const x of [-4.9, 4.9]) s.box([0.2, 0.35, 0.5], [x, 2.2, LZ], dark);
    } else {
      const lit = a.cab === 'occupied' || a.cab === 'empty';
      const windowTex = (wide: boolean, driver: boolean) => paint(wide ? 256 : 160, 160, (ctx, w, h) => {
        if (lit) {
          const g = ctx.createLinearGradient(0, 0, 0, h);
          g.addColorStop(0, '#fff2c0'); g.addColorStop(1, '#f2a843');
          ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#5b3a1e'; ctx.fillRect(0, h * 0.78, w, h * 0.22);
          ctx.fillRect(w * 0.12, h * 0.6, w * 0.16, h * 0.2);
          if (driver) {
            ctx.fillStyle = '#1b1612';
            ctx.beginPath(); ctx.arc(w * 0.56, h * 0.36, h * 0.13, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(w * 0.56, h * 0.86, h * 0.26, h * 0.36, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#f2c21a'; ctx.fillRect(w * 0.56 - h * 0.13, h * 0.24, h * 0.26, h * 0.06);
          } else { ctx.fillStyle = '#3a2a1c'; ctx.fillRect(w * 0.45, h * 0.3, w * 0.22, h * 0.5); }
        } else {
          const g = ctx.createLinearGradient(0, 0, w, h);
          g.addColorStop(0, '#31414d'); g.addColorStop(0.5, '#51636f'); g.addColorStop(0.55, '#243039'); g.addColorStop(1, '#1b242b');
          ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        }
        ctx.strokeStyle = '#17191b'; ctx.lineWidth = 10; ctx.strokeRect(0, 0, w, h);
      });
      const glass = (wide: boolean, driver: boolean) => new THREE.MeshStandardMaterial({ map: windowTex(wide, driver), roughness: 0.25, emissive: lit ? '#ffcf7a' : '#000000', emissiveMap: lit ? windowTex(wide, driver) : null, emissiveIntensity: lit ? mix(0.5, 1.1, dusk) : 0 });
      s.box([1.7, 2.0, 1.7], [cx, cy, cz], body);
      s.box([1.9, 0.12, 1.9], [cx, cy + 1.05, cz], dark);
      s.box([1.9, 0.5, 1.9], [cx, cy - 1.2, cz], dark);
      const front = glass(true, a.cab === 'occupied');
      const side = glass(false, a.cab === 'occupied');
      const pane = (w: number, at: [number, number, number], turn: number, material: THREE.Material) => {
        const mesh = s.mesh(new THREE.PlaneGeometry(w, 1.25), material, at);
        mesh.rotation.y = turn;
        return mesh;
      };
      pane(1.45, [cx, cy + 0.2, cz + 0.86], 0, front);
      pane(1.45, [cx + 0.86, cy + 0.2, cz], Math.PI / 2, side);
      pane(1.45, [cx, cy + 0.2, cz - 0.86], Math.PI, side);
      // Floor window raked forward so the driver can see the load.
      s.box([1.5, 0.06, 0.5], [cx, cy - 0.98, cz + 0.62], lit ? lamp('#ffcf7a', 0.5) : dark);
      s.box([1.2, 0.08, 2.6], [LX - 0.2, cy - 1.0, cz + 0.1], dark);
      if (doorOpen) {
        const door = s.box([0.06, 1.8, 0.8], [cx - 0.86 - 0.02, cy, cz + 0.85 + 0.38], body);
        door.rotation.y = 0.5;
        s.box([0.02, 1.7, 0.7], [cx - 0.845, cy, cz + 0.4], s.material('#101214'));
      }
      s.cylinder(0.12, 0.12, 0.18, [cx + 0.5, cy + 1.2, cz - 0.5], lamp('#ff9a1a', a.state === 'working' ? 2 : 0.05), 12);
    }
    const beacon = s.cylinder(0.14, 0.14, 0.22, [houseX + 1.2, H + 1.82, -0.6], lamp('#ff9a1a', a.state === 'working' ? 2.2 : 0.05), 12);
    const beaconGlow = s.ball([0.7, 0.7, 0.7], [houseX + 1.2, H + 1.85, -0.6], halo('#ffa530', a.state === 'working' ? 0.28 : 0), 12);
    beaconGlow.castShadow = false;

    // Work lights under the frame, pointing down at the load.
    for (const x of [-4.5, 4.5]) for (const z of [-LZ, LZ]) {
      s.box([0.36, 0.2, 0.36], [x, H - 0.42, z], dark);
      s.box([0.3, 0.06, 0.3], [x, H - 0.55, z], glow);
      if (on) {
        const cone = s.mesh(new THREE.ConeGeometry(1.5, 5.5, 16, 1, true), halo(lightColour, mix(0.04, 0.13, dusk)), [x * 0.93, H - 3.3, z * 0.8]);
        cone.castShadow = false;
      }
    }
    for (const z of [-LZ, LZ]) for (const x of [-4.86, 4.86]) s.box([0.06, 0.16, 0.3], [x * 1.045, 1.78, z], x > 0 ? glow : lamp('#e0271c', on ? 1.2 : 0.05));

    // The hanging spreader and its load, hung from a pivot so it can sway.
    const hang = new THREE.Group();
    hang.position.set(0, H - 0.3, 0);
    s.root.add(hang);
    const put = (geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], at: [number, number, number]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(at[0], at[1] - (H - 0.3), at[2]);
      mesh.castShadow = mesh.receiveShadow = true;
      hang.add(mesh);
      return mesh;
    };
    const long = a.load === 'twenty' ? 6.06 : 12.19;
    const boxH = a.load === 'nothing' ? 0 : a.load === 'reefer' ? 2.9 : 2.59;
    const maxBottom = H - 1.6 - boxH - 0.5;
    const bottom = a.load === 'nothing' ? mix(5.5, maxBottom, 0.5 + a.hoist * 0.5) : mix(0.45, maxBottom * 0.82, a.hoist);
    const spreadY = bottom + boxH + 0.22;
    put(new THREE.BoxGeometry(long - 0.2, 0.3, 0.5), flat, [0, spreadY, 0]);
    for (const x of [-long / 2 + 0.15, long / 2 - 0.15]) put(new THREE.BoxGeometry(0.3, 0.34, 2.44), dark, [x, spreadY, 0]);
    for (const x of [-1.6, 1.6]) put(new THREE.BoxGeometry(0.3, 0.3, 2.3), flat, [x, spreadY, 0]);
    for (const x of [-2.4, 2.4]) for (const z of [-1.0, 1.0]) {
      const rope = put(new THREE.CylinderGeometry(0.03, 0.03, H - 0.3 - spreadY, 6), dark, [x, (H - 0.3 + spreadY) / 2, z]);
      rope.castShadow = false;
    }

    const sideTex = (colour: string, name: string, ribs: number, w = 1024) => paint(w, 256, (ctx, cw, ch) => {
      corrugate(ctx, cw, ch, colour, ribs);
      if (name) write(ctx, name, cw * 0.5, ch * 0.42, ch * 0.34, colour === '#ecece6' ? '#2a4f8a' : '#f2efe6', 'bold SIZEpx sans-serif', cw * 0.6);
      write(ctx, `${'TKNU'}${Math.floor(100000 + random() * 899999)}`, cw * 0.86, ch * 0.16, ch * 0.09, '#f2efe6', 'SIZEpx monospace');
      weather(ctx, cw, ch, random, mood.wear);
    });
    const endTex = (colour: string) => paint(256, 256, (ctx, cw, ch) => {
      corrugate(ctx, cw, ch, colour, 6);
      ctx.strokeStyle = shade(colour, -0.45); ctx.lineWidth = 5;
      ctx.strokeRect(6, 6, cw - 12, ch - 12);
      ctx.beginPath(); ctx.moveTo(cw / 2, 6); ctx.lineTo(cw / 2, ch - 6); ctx.stroke();
      ctx.strokeStyle = '#c9cdd0'; ctx.lineWidth = 6;
      for (const x of [0.2, 0.38, 0.62, 0.8]) { ctx.beginPath(); ctx.moveTo(cw * x, 12); ctx.lineTo(cw * x, ch - 12); ctx.stroke(); }
      weather(ctx, cw, ch, random, mood.wear);
    });
    const corners = (len: number, x0: number, h: number) => {
      for (const x of [-len / 2 + 0.09, len / 2 - 0.09]) for (const z of [-1.13, 1.13]) for (const y of [0.06, h - 0.06])
        put(new THREE.BoxGeometry(0.2, 0.14, 0.2), steel, [x0 + x, bottom + y, z]);
    };
    const crate = (len: number, x0: number, colour: string, name: string, h = 2.59) => {
      const sideSkin = skin(sideTex(colour, name, Math.round(len * 3.2), len > 8 ? 1024 : 512));
      const endSkin = skin(endTex(colour));
      const top = new THREE.MeshStandardMaterial({ color: shade(colour, -0.15), roughness: 0.8 });
      put(new THREE.BoxGeometry(len, h, 2.44), [endSkin, endSkin, top, top, sideSkin, sideSkin], [x0, bottom + h / 2, 0]);
      corners(len, x0, h);
    };
    const [lineColour, lineName] = LINE_PAINT[a.line];
    if (a.load === 'twenty') crate(6.06, 0, lineColour, lineName);
    else if (a.load === 'forty') crate(12.19, 0, lineColour, lineName);
    else if (a.load === 'twin') {
      const keys = Object.keys(LINE_PAINT) as (keyof typeof LINES)[];
      const other = LINE_PAINT[keys[(keys.indexOf(a.line) + 1 + Math.floor(random() * 4)) % keys.length]];
      crate(6.0, -3.06, lineColour, lineName);
      crate(6.0, 3.06, other[0], other[1]);
    } else if (a.load === 'reefer') {
      crate(12.19, 0, '#ecece6', lineName || 'COLDSTREAM', 2.9);
      put(new THREE.BoxGeometry(0.25, 2.5, 2.2), s.material('#c9cdcc'), [6.2, bottom + 1.45, 0]);
      const fan = put(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 18), dark, [6.34, bottom + 2.1, 0]);
      fan.rotation.z = Math.PI / 2;
      put(new THREE.BoxGeometry(0.06, 0.9, 1.6), dark, [6.34, bottom + 0.8, 0]);
      put(new THREE.BoxGeometry(0.07, 0.2, 0.4), lamp('#49e07a', 1.5), [6.35, bottom + 1.42, 0.7]);
    } else if (a.load === 'tank') {
      const frame = s.material(lineColour);
      for (const x of [-3, 3]) for (const z of [-1.16, 1.16]) put(new THREE.BoxGeometry(0.14, 2.59, 0.14), frame, [x, bottom + 1.295, z]);
      for (const y of [0.07, 2.52]) {
        for (const z of [-1.16, 1.16]) put(new THREE.BoxGeometry(6.06, 0.14, 0.14), frame, [0, bottom + y, z]);
        for (const x of [-3, 3]) put(new THREE.BoxGeometry(0.14, 0.14, 2.44), frame, [x, bottom + y, 0]);
      }
      const tank = put(new THREE.CapsuleGeometry(1.05, 3.5, 6, 20).rotateZ(Math.PI / 2), s.material('#d8dbd9', { metalness: 0.5, roughness: 0.35 }), [0, bottom + 1.3, 0]);
      tank.scale.set(1, 1, 1);
      const diamond = put(new THREE.PlaneGeometry(0.75, 0.75), skin(paint(128, 128, (ctx, w, h) => { ctx.fillStyle = '#e8231c'; ctx.fillRect(0, 0, w, h); ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-Math.PI / 4); write(ctx, '3', 0, 8, 70, '#ffffff'); ctx.restore(); })), [0, bottom + 1.3, 1.24]);
      diamond.rotation.z = Math.PI / 4;
      put(new THREE.CylinderGeometry(0.25, 0.25, 0.25, 12), steel, [0, bottom + 2.42, 0]);
      for (const x of [-3, 3]) for (const z of [-1.16, 1.16]) for (const y of [0.07, 2.52]) put(new THREE.BoxGeometry(0.2, 0.16, 0.2), steel, [x, bottom + y, z]);
    } else if (a.load === 'opentop') {
      crate(12.19, 0, lineColour, lineName, 2.3);
      const tarp = new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2);
      const lump = put(tarp, s.material('#3f6fb5', { roughness: 0.9 }), [(random() - 0.5) * 3, bottom + 2.25, 0]);
      lump.scale.set(4.6 + random() * 1.2, 0.8 + random() * 0.8, 1.2);
      put(new THREE.BoxGeometry(12.1, 0.12, 2.4), s.material('#3f6fb5', { roughness: 0.9 }), [0, bottom + 2.33, 0]);
    }

    // What the state leaves on the ground.
    const cone = (x: number, z: number) => {
      s.cylinder(0.03, 0.17, 0.5, [x, 0.27, z], s.material('#f0641a'), 10);
      s.box([0.4, 0.03, 0.4], [x, 0.015, z], s.material('#f0641a'));
      s.cylinder(0.075, 0.1, 0.1, [x, 0.32, z], s.material('#f1f1ee'), 10);
    };
    if (a.state === 'parked') {
      for (const z of [-LZ, LZ]) for (const x of [-4.62, 4.62]) s.box([0.34, 0.26, 0.5], [x, 0.13, z], s.material('#e3b11b')).rotation.z = Math.sign(x) * 0.35;
      for (let i = 0; i < Math.round(mood.density * 3); i++) cone(5.4 + random() * 0.6, -2 + i * 2 + random() * 0.4);
    }
    if (a.state === 'broken') {
      const lid = s.box([3.3, 0.08, 1.0], [houseX, H + 2.05, -1.35], body);
      lid.rotation.x = 0.9;
      const puddle = s.cylinder(1.1 + random(), 1.1 + random(), 0.012, [-2 + random() * 2, 0.006, LZ + 1.2], new THREE.MeshStandardMaterial({ color: '#17150f', roughness: 0.08, metalness: 0.6 }), 20);
      puddle.scale.z = 0.6;
      s.box([0.6, 0.3, 0.3], [-3.2, 0.15, LZ + 1.5], s.material('#b32a22'));
      const board = s.label('OUT OF SERVICE', 1.9, 0.5, [LX, 3.6, LZ + 0.27], '#f4f1e4', '#b3201c');
      board.rotation.z = -0.06 + random() * 0.12;
      for (let i = 0; i < 2 + Math.round(mood.density * 4); i++) cone(-5.6 + random() * 11.2, (random() < 0.5 ? -1 : 1) * (LZ + 1.3 + random() * 0.6));
      for (let i = 0; i < Math.round(mood.wear * 2); i++) s.box([0.4, 1.2, 0.03], [LX - 1.2 * i, 2.8, LZ + 0.27], s.material('#e9e2c4')).rotation.z = 0.2 * random();
    }

    const sway = a.load === 'nothing' ? 0.012 : 0.006;
    return s.finish({
      footprint: 5.6,
      update: (_dt, time) => {
        hang.rotation.x = Math.sin(time * 0.9) * sway * mood.energy * (on ? 1 : 0.3);
        if (a.state === 'working') {
          const pulse = 0.5 + 0.5 * Math.sin(time * mix(3, 9, mood.energy));
          (beacon.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + pulse * 2.2;
          (beaconGlow.material as THREE.MeshBasicMaterial).opacity = 0.1 + pulse * 0.25;
        }
      },
    });
  },
});
