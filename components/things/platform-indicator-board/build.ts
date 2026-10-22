import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const DESTINATIONS = {
  churchgate: 'CHURCHGATE, the city terminus at the end of the line.',
  virar: 'VIRAR, the far northern end, the longest and most crowded ride.',
  borivali: 'BORIVALI, a big suburban junction.',
  thane: 'THANE, across the creek.',
  kalyan: 'KALYAN, a distant junction town.',
  panvel: 'PANVEL, the harbour line out over the water.',
  andheri: 'ANDHERI, a short hop that turns back early.',
  home: 'HOME, a destination no real board shows.',
} as const;

const draw7 = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, digit: string, on: string, off: string) => {
  const map: Record<string, string> = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abfgcd', '-': 'g', ' ': '' };
  const t = w * 0.2, lit = map[digit] ?? '';
  const seg: Record<string, [number, number, number, number]> = {
    a: [x + t, y, w - 2 * t, t], g: [x + t, y + h / 2 - t / 2, w - 2 * t, t], d: [x + t, y + h - t, w - 2 * t, t],
    f: [x, y + t * 0.6, t, h / 2 - t], b: [x + w - t, y + t * 0.6, t, h / 2 - t], e: [x, y + h / 2 + t * 0.4, t, h / 2 - t], c: [x + w - t, y + h / 2 + t * 0.4, t, h / 2 - t],
  };
  for (const key of 'abcdefg') { ctx.fillStyle = lit.includes(key) ? on : off; ctx.fillRect(...seg[key]); }
};

export default defineThing({
  questions: {
    display: choice('What kind of indicator is it?', {
      amber: 'A black box of amber dot-matrix LEDs, the modern standard.',
      tricolour: 'Red, green and amber LEDs, a different colour for each line of news.',
      blind: 'An old backlit board: cream glass windows with black painted letters and orange numeral tubes.',
    }),
    destination: choice('Which destination does it show?', DESTINATIONS),
    speed: choice('What kind of train is announced?', {
      fast: 'F, a fast train that skips the small stations.',
      slow: 'S, a slow train that stops everywhere.',
      ladies: 'L, the ladies special.',
    }),
    minutes: score('How many minutes until it leaves?', ['00, it is leaving now', 'Three or four', 'Ten', 'Twenty-five, an age']),
    status: choice('What state is the service in?', {
      running: 'Running to time, the counter ticking down.',
      late: 'Running late, a red LATE beside a number nobody believes.',
      cancelled: 'CANCELLED in red where the minutes should be.',
      dead: 'The board is dark and blank, power gone or the last train long departed.',
    }),
    clock: choice('What clock does it carry?', {
      analogue: 'A round white-faced station clock mounted on top.',
      digital: 'A row of glowing digits in the top corner.',
      none: 'No clock at all.',
    }),
    mount: choice('How is it hung?', {
      truss: 'From a riveted lattice beam between two iron platform columns.',
      bracket: 'From a cantilever arm off a single column, braced with a diagonal strut.',
      legs: 'On its own pair of steel legs, a freestanding totem.',
    }),
    halts: noul('Does a lower strip list the stations the train will stop at?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => mix(lo, hi, random());
    const dead = a.status === 'dead';
    const bw = 2.3, bh = 0.8, bd = 0.26;
    const by = a.mount === 'legs' ? 2.55 : 2.75; // centre height of the box

    const rust = new THREE.Color('#7a4a2c');
    const ironColour = new THREE.Color(a.mount === 'legs' ? '#6c7478' : '#3d5a4c').lerp(rust, mood.wear * 0.5);
    const iron = s.material(ironColour, { metalness: 0.4, roughness: 0.6 });
    const caseMaterial = s.material(new THREE.Color(a.display === 'blind' ? '#2f4a3c' : '#1d1f20').lerp(rust, mood.wear * 0.25), { metalness: 0.3, roughness: 0.55 });
    const dark = s.material('#111213', { roughness: 0.7 });

    const textures: THREE.CanvasTexture[] = [];
    const glow = mix(0.75, 1.25, mood.cheer * 0.5 + mood.energy * 0.5);
    const screen = (w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void, dots = true) => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      const blind = a.display === 'blind';
      ctx.fillStyle = blind ? (dead ? '#4d4a40' : '#f2e9c8') : '#0a0a09';
      ctx.fillRect(0, 0, w, h);
      paint(ctx);
      if (dots && !blind) {
        // Cut the lettering into a dot matrix.
        ctx.fillStyle = '#0a0a09';
        for (let x = 0; x < w; x += 6) ctx.fillRect(x, 0, 2, h);
        for (let y = 0; y < h; y += 6) ctx.fillRect(0, y, w, 2);
        // Dead columns and rows, by wear.
        for (let i = 0; i < mood.wear * 9; i++) random() < 0.5 ? ctx.fillRect(Math.floor(random() * w / 6) * 6, 0, 6, h) : ctx.fillRect(0, Math.floor(random() * h / 6) * 6, w, 6);
      } else if (blind) {
        ctx.fillStyle = `rgba(90,70,40,${0.08 + mood.wear * 0.25})`;
        for (let i = 0; i < 60; i++) ctx.fillRect(random() * w, random() * h, rnd(4, 60), rnd(1, 4));
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      textures.push(texture);
      return new THREE.MeshStandardMaterial({ map: texture, emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: dead ? 0.04 : glow, roughness: 0.5 });
    };

    const amber = '#ffb21e', red = '#ff3b2a', green = '#49e86a';
    const blind = a.display === 'blind';
    const ink = (which: 'time' | 'dest' | 'min' | 'bad') => {
      if (dead) return blind ? '#3a372f' : '#2a2114';
      if (blind) return which === 'bad' ? '#b3261c' : '#15140f';
      if (which === 'bad') return red;
      if (a.display === 'tricolour') return which === 'time' ? red : which === 'dest' ? green : amber;
      return amber;
    };
    const hour = Math.min(23, Math.floor(4.5 + mood.daylight * 17.5)), minute = Math.floor(random() * 60);
    const clockText = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const destination = a.destination.toUpperCase();
    const platform = 1 + Math.floor(random() * 6);
    const cars = random() < 0.5 ? 12 : 15;
    const letter = { fast: 'F', slow: 'S', ladies: 'L' }[a.speed];
    const mins = a.status === 'late' ? Math.round(a.minutes * 25) + 9 + Math.floor(random() * 30) : Math.round(a.minutes * 25);

    // ---- main face: time, platform, destination, speed ---------------------
    const mainW = bw * 0.7, sideW = bw * 0.24;
    const mainFace = screen(768, 320, (ctx) => {
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 54px monospace';
      ctx.fillStyle = ink('time');
      ctx.textAlign = 'left';
      if (a.clock === 'digital') ctx.fillText(clockText, 26, 48);
      else ctx.fillText(`${cars} CAR`, 26, 48);
      ctx.textAlign = 'right';
      ctx.fillText(`PF ${platform}`, 742, 48);
      if (!dead) { ctx.fillStyle = blind ? '#15140f' : 'rgba(255,255,255,0.18)'; ctx.fillRect(20, 88, 728, 4); }
      // Destination, as wide as the window allows.
      ctx.fillStyle = ink('dest');
      ctx.textAlign = 'left';
      ctx.font = 'bold 132px monospace';
      ctx.fillText(destination, 24, 176, 560);
      // Speed letter in its own box.
      ctx.fillStyle = blind ? (dead ? '#3a372f' : a.speed === 'fast' ? '#b3261c' : a.speed === 'ladies' ? '#1f6a44' : '#15140f') : ink(a.speed === 'fast' ? 'bad' : 'min');
      if (blind) { ctx.beginPath(); ctx.arc(676, 176, 62, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = dead ? '#4d4a40' : '#f2e9c8'; }
      else { ctx.lineWidth = 10; ctx.strokeStyle = ctx.fillStyle; ctx.strokeRect(612, 108, 128, 136); }
      ctx.textAlign = 'center';
      ctx.font = 'bold 118px monospace';
      ctx.fillText(letter, 676, 180);
      // Bottom line: the halts, or a faux second-script line.
      ctx.fillStyle = ink('time'); ctx.strokeStyle = ctx.fillStyle;
      if (a.halts) {
        ctx.textAlign = 'left'; ctx.font = 'bold 40px monospace';
        const stops = ['DADAR', 'BANDRA', 'KURLA', 'GHATKOPAR', 'MALAD', 'BHAYANDAR', 'VASAI RD', 'DOMBIVLI', 'VASHI'];
        const from = Math.floor(random() * 5);
        ctx.fillText((a.speed === 'slow' ? 'ALL STNS  ' : '') + stops.slice(from, from + 4).join(' · '), 26, 286, 716);
      } else {
        // The same destination in a headline-barred script.
        ctx.lineWidth = 7; ctx.lineCap = 'round';
        let x = 40;
        for (let g = 0; g < 6; g++) {
          const w = rnd(34, 52);
          ctx.beginPath(); ctx.moveTo(x - 6, 262); ctx.lineTo(x + w + 6, 262); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x + w, 262); ctx.lineTo(x + w, 306); ctx.stroke();
          ctx.beginPath();
          if (g % 2) ctx.arc(x + w * 0.42, 284, w * 0.34, -0.4, Math.PI * 1.3); else { ctx.moveTo(x + 2, 272); ctx.quadraticCurveTo(x + w, 280, x + 6, 306); }
          ctx.stroke();
          x += w + 18;
        }
      }
    });

    // ---- minutes panel -----------------------------------------------------
    const minutesFace = screen(256, 320, (ctx) => {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (a.status === 'cancelled') {
        ctx.fillStyle = ink('bad');
        ctx.font = 'bold 62px monospace';
        ctx.save(); ctx.translate(128, 150); ctx.rotate(-0.0);
        ctx.fillText('CAN-', 0, -70); ctx.fillText('CELL', 0, -10); ctx.fillText('-ED', 0, 50);
        ctx.restore();
        ctx.lineWidth = 12; ctx.strokeStyle = ink('bad');
        ctx.beginPath(); ctx.moveTo(30, 270); ctx.lineTo(226, 270); ctx.stroke();
      } else {
        const on = blind ? (dead ? '#3a2a1c' : '#ff7a1c') : ink('min');
        if (blind) { ctx.fillStyle = '#17120e'; ctx.fillRect(14, 20, 228, 210); }
        const text = dead ? '  ' : String(Math.min(99, mins)).padStart(2, '0');
        draw7(ctx, 34, 40, 82, 170, text[0], on, blind ? '#2a1c12' : '#17130c');
        draw7(ctx, 140, 40, 82, 170, text[1], on, blind ? '#2a1c12' : '#17130c');
        ctx.fillStyle = a.status === 'late' ? ink('bad') : ink('time');
        ctx.font = 'bold 58px monospace';
        ctx.fillText(a.status === 'late' ? 'LATE' : 'MIN', 128, 276);
      }
    });

    // ---- the box -----------------------------------------------------------
    s.box([bw, bh, bd], [0, by, 0], caseMaterial);
    s.box([bw + 0.06, 0.05, bd + 0.08], [0, by + bh / 2 + 0.025, 0], caseMaterial);
    for (const x of [-1, 1]) for (let i = 0; i < 6; i++) s.box([0.008, 0.02, bd * 0.7], [x * (bw / 2 + 0.004), by - 0.25 + i * 0.1, 0], dark);
    const flickers: THREE.MeshStandardMaterial[] = [];
    for (const side of [1, -1]) {
      const z = side * (bd / 2 + 0.004);
      const main = s.mesh(new THREE.PlaneGeometry(mainW, bh * 0.86), mainFace, [side * -(bw * 0.12), by, z]);
      const min = s.mesh(new THREE.PlaneGeometry(sideW, bh * 0.86), minutesFace, [side * (bw * 0.365), by, z]);
      if (side < 0) { main.rotation.y = Math.PI; min.rotation.y = Math.PI; }
      main.castShadow = min.castShadow = false;
      // A hood over the glass.
      s.box([bw + 0.04, 0.02, 0.12], [0, by + bh / 2 - 0.005, side * (bd / 2 + 0.06)], caseMaterial);
    }
    flickers.push(minutesFace);

    // ---- the clock ---------------------------------------------------------
    let secondHand: THREE.Object3D | null = null;
    let topY = by + bh / 2 + 0.05;
    if (a.clock === 'analogue') {
      const cr = 0.36, cy = topY + cr + 0.04;
      const dial = screen(256, 256, (ctx) => {
        ctx.fillStyle = dead ? '#8d8a7c' : '#f7f2df'; ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = '#151515'; ctx.lineCap = 'butt';
        for (let i = 0; i < 12; i++) {
          const t = (i / 12) * Math.PI * 2;
          ctx.lineWidth = i % 3 === 0 ? 12 : 6;
          ctx.beginPath(); ctx.moveTo(128 + Math.sin(t) * 92, 128 - Math.cos(t) * 92); ctx.lineTo(128 + Math.sin(t) * 116, 128 - Math.cos(t) * 116); ctx.stroke();
        }
        const hand = (turn: number, length: number, width: number) => {
          ctx.lineWidth = width; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(128 - Math.sin(turn) * 12, 128 + Math.cos(turn) * 12); ctx.lineTo(128 + Math.sin(turn) * length, 128 - Math.cos(turn) * length); ctx.stroke();
        };
        hand(((hour % 12) + minute / 60) / 12 * Math.PI * 2, 60, 14);
        hand(minute / 60 * Math.PI * 2, 96, 9);
      }, false);
      dial.emissiveIntensity = dead ? 0.02 : 0.45;
      const drum = s.cylinder(cr, cr, 0.16, [0, cy, 0], caseMaterial, 36); drum.rotation.x = Math.PI / 2;
      s.ring(cr, 0.022, [0, cy, 0.08], iron); s.ring(cr, 0.022, [0, cy, -0.08], iron);
      const front = s.mesh(new THREE.CircleGeometry(cr - 0.02, 36), dial, [0, cy, 0.083]);
      const back = s.mesh(new THREE.CircleGeometry(cr - 0.02, 36), dial, [0, cy, -0.083]); back.rotation.y = Math.PI;
      front.castShadow = back.castShadow = false;
      s.box([0.1, 0.06, 0.1], [0, topY + 0.02, 0], iron);
      if (!dead) {
        const pivot = new THREE.Group(); pivot.position.set(0, cy, 0.088);
        const needle = new THREE.Mesh(new THREE.BoxGeometry(0.008, cr * 0.82, 0.004), new THREE.MeshStandardMaterial({ color: '#c8281e' }));
        needle.position.y = cr * 0.3; pivot.add(needle); pivot.rotation.z = -random() * Math.PI * 2;
        s.root.add(pivot); secondHand = pivot;
      }
      topY = cy + cr;
    }

    // ---- the mount ---------------------------------------------------------
    const column = (x: number, h: number) => {
      s.cylinder(0.075, 0.09, h, [x, h / 2, 0], iron, 14);
      s.cylinder(0.14, 0.16, 0.22, [x, 0.11, 0], iron, 14);
      s.cylinder(0.11, 0.1, 0.06, [x, 0.25, 0], iron, 14);
      s.cylinder(0.13, 0.085, 0.16, [x, h - 0.08, 0], iron, 14);
      const rivets: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 6; i++) for (let k = 0; k < 4; k++) { const t = k * Math.PI / 2 + 0.78; rivets.push({ at: [x + Math.cos(t) * 0.086, 0.6 + i * (h - 1) / 5, Math.sin(t) * 0.086], size: 1 }); }
      s.scatter(new THREE.SphereGeometry(0.014, 6, 4), iron, rivets);
    };
    const beamY = Math.max(topY + 0.3, by + bh / 2 + 0.55);
    if (a.mount === 'truss') {
      const half = bw / 2 + 0.45;
      column(-half, beamY + 0.34); column(half, beamY + 0.34);
      for (const y of [beamY, beamY + 0.3]) s.box([half * 2, 0.05, 0.1], [0, y, 0], iron);
      const bays = 8;
      for (let i = 0; i < bays; i++) {
        const x0 = -half + (i / bays) * half * 2, x1 = -half + ((i + 1) / bays) * half * 2;
        s.rod(i % 2 ? [x0, beamY, 0] : [x0, beamY + 0.3, 0], i % 2 ? [x1, beamY + 0.3, 0] : [x1, beamY, 0], 0.016, iron);
      }
      for (const x of [-0.8, 0.8]) s.rod([x, beamY, 0], [x, by + bh / 2 + 0.04, 0], 0.018, iron);
      // A sag of cable from the column to the box.
      s.tube([[-half, beamY - 0.1, 0.05], [-half * 0.7, beamY - 0.5, 0.09], [-bw / 2, by + 0.2, 0.06]], 0.012, dark);
    } else if (a.mount === 'bracket') {
      const cx = -bw / 2 - 0.4;
      column(cx, beamY + 0.5);
      s.box([bw + 0.75, 0.07, 0.1], [cx + (bw + 0.75) / 2, beamY, 0], iron);
      s.rod([cx, beamY + 0.45, 0], [cx + bw * 0.85, beamY + 0.04, 0], 0.02, iron);
      s.rod([cx, beamY - 0.7, 0], [cx + 0.7, beamY - 0.03, 0], 0.02, iron);
      for (const x of [-0.8, 0.8]) s.rod([x, beamY, 0], [x, by + bh / 2 + 0.04, 0], 0.018, iron);
      s.tube([[cx, beamY - 0.2, 0.05], [cx + 0.2, by + 0.5, 0.1], [-bw / 2, by + 0.1, 0.06]], 0.012, dark);
    } else {
      for (const x of [-1, 1]) {
        s.box([0.1, by - bh / 2, 0.14], [x * (bw / 2 - 0.25), (by - bh / 2) / 2, 0], iron);
        s.box([0.34, 0.05, 0.5], [x * (bw / 2 - 0.25), 0.025, 0], iron);
      }
      s.box([bw - 0.5, 0.06, 0.08], [0, 0.9, 0], iron);
    }

    // ---- life on top: pigeons by density, a nest by wear -------------------
    const perchY = a.mount === 'legs' ? by + bh / 2 + 0.05 : beamY + (a.mount === 'truss' ? 0.325 : 0.035);
    const birds = Math.floor(mood.density * 4.5);
    const pigeon = s.material('#6e7582', { roughness: 0.9 });
    for (let i = 0; i < birds; i++) {
      const x = rnd(-bw / 2 + 0.1, bw / 2 - 0.1);
      if (a.mount === 'legs' && a.clock === 'analogue' && Math.abs(x) < 0.45) continue;
      const facing = random() < 0.5 ? 1 : -1;
      s.ball([0.075, 0.06, 0.05], [x, perchY + 0.07, 0], pigeon, 10);
      s.ball([0.032, 0.034, 0.03], [x + facing * 0.06, perchY + 0.14, 0], pigeon, 8);
      s.rod([x - facing * 0.06, perchY + 0.07, 0], [x - facing * 0.15, perchY + 0.03, 0], 0.022, pigeon, 0.006);
    }

    const speed = mix(0.2, 1, mood.energy), jitter = mix(0.05, 0.6, Math.max(mood.wear, mood.energy * 0.7));
    return s.finish({
      update: (_dt, time) => {
        if (dead) return;
        const n = Math.sin(time * 31.7 * speed) * Math.sin(time * 12.3 * speed + 1.3) * Math.sin(time * 5.1 * speed);
        for (const material of flickers) material.emissiveIntensity = glow * (n > 1 - jitter * 1.4 ? 0.25 : 1);
        if (secondHand) secondHand.rotation.z = -Math.floor(time) * Math.PI / 30;
      },
    });
  },
});
