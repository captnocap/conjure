import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function heart(c: CanvasRenderingContext2D, x: number, y: number, size: number) {
  c.beginPath();
  c.moveTo(x, y + size * 0.9);
  c.bezierCurveTo(x - size * 1.5, y - size * 0.1, x - size * 0.7, y - size * 1.1, x, y - size * 0.3);
  c.bezierCurveTo(x + size * 0.7, y - size * 1.1, x + size * 1.5, y - size * 0.1, x, y + size * 0.9);
  c.fill();
}

const HEADERS = {
  check: 'CHECK YOUR BLOOD PRESSURE',
  free: 'FREE HEALTH CHECK',
  heart: 'HEART STATION',
  numbers: 'KNOW YOUR NUMBERS',
  coin: 'BLOOD PRESSURE 25c',
} as const;

export default defineThing({
  questions: {
    reading: choice('What does the readout show?', {
      calm: 'A calm, healthy reading in steady green: 118 over 76.',
      alarming: 'An alarming reading in pulsing red: 191 over 124, see a doctor.',
      error: 'An error code; the machine could not make sense of the arm.',
      measuring: 'Mid-measurement: the cuff squeezing, dashes on the screen, a held breath.',
      blank: 'Nothing: a dead dark screen.',
    }),
    era: choice('What era is the machine from?', {
      seventies: 'A 1970s coin-operated cabinet in woodgrain and beige with a round needle gauge.',
      eighties: 'A chunky 1980s beige box with red LED digits and big square buttons.',
      nineties: 'A grey-and-teal 1990s plastic unit with a green-on-black LCD panel.',
      modern: 'A sleek white modern health station with a blue-lit touchscreen.',
    }),
    notice: choice('Is anything taped to it?', {
      none: 'Nothing; it is in service.',
      paper: 'A hand-written OUT OF ORDER sheet taped across the screen.',
      bagged: 'The cuff tunnel is wrapped in a plastic bag and tape, and a sign says SORRY.',
      disclaimer: 'A laminated notice: NOT A SUBSTITUTE FOR MEDICAL ADVICE.',
    }),
    seat: choice('What does the user sit on?', {
      bucket: 'A moulded plastic bucket seat fixed to the platform.',
      bench: 'A flat padded bench wide enough for a large person or a shopping bag.',
      stool: 'A small round stool on a single post.',
    }),
    header: choice('What does the sign on top say?', HEADERS),
    left: choice('What trace of the last user remains?', {
      nothing: 'Nothing.',
      printout: 'A long printed slip curling out of the slot, never taken.',
      basket: 'A shopping basket left on the platform beside the seat.',
      cane: 'A walking cane leaning against the console.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const palette = {
      seventies: { body: '#cdbf9c', trim: '#6b4526', accent: '#c2452e', seat: '#b9502c' },
      eighties: { body: '#d6cdb4', trim: '#5b574f', accent: '#b52a25', seat: '#7a2f2a' },
      nineties: { body: '#b9bfc2', trim: '#2f7f83', accent: '#2f7f83', seat: '#3c4a55' },
      modern: { body: '#f1f3f4', trim: '#2b6fd0', accent: '#2b6fd0', seat: '#dfe4e8' },
    }[a.era];
    const body = s.material(palette.body, { roughness: 0.5 });
    const trim = s.material(palette.trim, { roughness: 0.5 });
    const seatPaint = s.material(palette.seat, { roughness: 0.45 });
    const dark = s.material('#202427', { roughness: 0.6 });
    const steel = s.material('#c5cacc', { metalness: 0.85, roughness: 0.3 });
    const round = a.era === 'modern' ? 0.06 : a.era === 'nineties' ? 0.035 : 0.012;
    const rbox = (size: [number, number, number], at: [number, number, number], material: THREE.Material) =>
      s.mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 4, Math.min(round, Math.min(...size) / 2.2)), material, at);

    // Platform that ties the seat to the console.
    rbox([0.78, 0.07, 1.25], [0, 0.035, 0], a.era === 'seventies' ? trim : dark);
    s.box([0.6, 0.006, 0.5], [0, 0.073, 0.05], s.material('#3a3d40', { roughness: 0.95 }));

    // Console at the back: a pedestal, a sloped desk and a tall screen tower. The sitter faces -z.
    const cz = -0.4;
    rbox([0.7, 0.62, 0.36], [0, 0.38, cz], body);
    const desk = rbox([0.74, 0.1, 0.48], [0, 0.72, cz + 0.07], body);
    desk.rotation.x = 0.12;
    rbox([0.5, 0.56, 0.16], [-0.1, 1.07, cz - 0.08], body);
    if (a.era === 'seventies') {
      s.box([0.705, 0.4, 0.365], [0, 0.34, cz], trim);
      s.box([0.02, 0.05, 0.004], [0.2, 0.62, cz + 0.184], dark);
      s.cylinder(0.03, 0.03, 0.012, [0.2, 0.62, cz + 0.186], steel, 14).rotation.x = Math.PI / 2;
    }
    if (a.era === 'nineties' || a.era === 'modern') s.box([0.71, 0.04, 0.37], [0, 0.1, cz], trim);

    // Arm cuff tunnel on the sitter's left (viewer's right): a sleeve the forearm goes through.
    const cuffX = 0.24, cuffY = 0.86, cuffZ = cz + 0.06;
    const sleeveColour = a.era === 'modern' ? '#2b6fd0' : a.era === 'nineties' ? '#2f7f83' : '#33363a';
    const housing = s.mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.3, 28, 1, true), s.material(palette.body, { roughness: 0.5, side: THREE.DoubleSide }), [cuffX, cuffY, cuffZ]);
    housing.rotation.x = Math.PI / 2;
    s.ring(0.105, 0.016, [cuffX, cuffY, cuffZ + 0.15], trim);
    s.ring(0.105, 0.016, [cuffX, cuffY, cuffZ - 0.15], trim);
    const bladderMaterial = s.material(sleeveColour, { roughness: 0.9, side: THREE.DoubleSide });
    const bladder = s.mesh(new THREE.TorusGeometry(0.07, 0.035, 10, 28), bladderMaterial, [cuffX, cuffY, cuffZ + 0.09]);
    const bladderBack = s.mesh(new THREE.TorusGeometry(0.07, 0.035, 10, 28), bladderMaterial, [cuffX, cuffY, cuffZ - 0.03]);
    s.box([0.2, 0.14, 0.3], [cuffX, 0.76, cuffZ], body);
    // Elbow rest and the big start button.
    rbox([0.16, 0.03, 0.14], [cuffX, 0.765, cz + 0.25], dark).rotation.x = 0.12;
    const button = s.cylinder(0.045, 0.05, 0.03, [-0.2, 0.775, cz + 0.2], s.material(a.reading === 'blank' ? '#5c6a5c' : '#3fae4d', { emissive: '#2fd04a', emissiveIntensity: a.reading === 'blank' ? 0 : 0.4 }), 20);
    button.rotation.x = 0.12;
    if (a.era === 'eighties') for (let i = 0; i < 3; i++) s.box([0.06, 0.02, 0.06], [-0.3 + i * 0.09, 0.765, cz + 0.08], s.material(['#d8c23a', '#c9c9c9', '#b52a25'][i]));

    // The readout.
    const sys = { calm: 118, alarming: 191, error: 0, measuring: 0, blank: 0 }[a.reading] + (a.reading === 'calm' || a.reading === 'alarming' ? Math.floor(random() * 7) - 3 : 0);
    const dia = a.reading === 'calm' ? 76 + Math.floor(random() * 5) : 124 - Math.floor(random() * 6);
    const pulse = a.reading === 'calm' ? 62 + Math.floor(random() * 10) : 104 + Math.floor(random() * 14);
    const screenY = 1.1, screenZ = cz + 0.004;
    let glow: THREE.MeshStandardMaterial | null = null;
    let needle: THREE.Object3D | null = null;
    if (a.era === 'seventies') {
      const dial = paint(256, 256, (c) => {
        c.fillStyle = '#f2ead2';
        c.beginPath(); c.arc(128, 128, 124, 0, 7); c.fill();
        c.lineWidth = 16;
        const arc = (from: number, to: number, colour: string) => { c.strokeStyle = colour; c.beginPath(); c.arc(128, 128, 98, Math.PI * (0.75 + from * 1.5), Math.PI * (0.75 + to * 1.5)); c.stroke(); };
        arc(0, 0.45, '#4f9a55'); arc(0.45, 0.68, '#d9b23a'); arc(0.68, 1, '#c2372b');
        c.fillStyle = '#2a2622';
        c.font = 'bold 20px sans-serif';
        c.textAlign = 'center';
        for (let i = 0; i <= 6; i++) {
          const angle = Math.PI * (0.75 + (i / 6) * 1.5);
          c.fillText(String(40 + i * 40), 128 + Math.cos(angle) * 68, 136 + Math.sin(angle) * 68);
        }
        c.font = 'bold 15px sans-serif';
        c.fillText('mmHg', 128, 200);
      });
      const face = s.mesh(new THREE.CircleGeometry(0.17, 40), new THREE.MeshStandardMaterial({ map: dial, roughness: 0.4 }), [-0.1, screenY + 0.03, screenZ]);
      s.ring(0.172, 0.014, [-0.1, screenY + 0.03, screenZ], steel);
      const level = { calm: 0.33, alarming: 0.9, error: 0.02, measuring: 0.6, blank: 0 }[a.reading];
      needle = new THREE.Group();
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.008, 0.004), s.material('#a01d1d'));
      hand.position.x = 0.05;
      needle.add(hand);
      needle.position.set(-0.1, screenY + 0.03, screenZ + 0.006);
      needle.rotation.z = -Math.PI * (0.75 + level * 1.5);
      needle.userData.rest = needle.rotation.z;
      s.root.add(needle);
      s.cylinder(0.014, 0.014, 0.012, [-0.1, screenY + 0.03, screenZ + 0.008], dark, 12).rotation.x = Math.PI / 2;
      void face;
    } else {
      const ink = a.era === 'eighties' ? (a.reading === 'alarming' ? '#ff3a2a' : '#ff5a3a') : a.reading === 'alarming' ? '#ff4636' : a.reading === 'error' ? '#ffb03a' : a.era === 'modern' ? '#eaf4ff' : '#6dff8a';
      const back = a.era === 'modern' ? (a.reading === 'alarming' ? '#5a1414' : '#1c4f9c') : a.era === 'nineties' ? '#0d1a12' : '#120a0a';
      const map = paint(384, 300, (c, w, h) => {
        c.fillStyle = a.reading === 'blank' ? '#15181a' : back;
        c.fillRect(0, 0, w, h);
        if (a.reading === 'blank') return;
        c.fillStyle = ink;
        c.textBaseline = 'middle';
        c.font = 'bold 22px sans-serif';
        c.textAlign = 'left';
        c.fillText('SYS', 20, 62); c.fillText('DIA', 20, 160); c.fillText('PULSE', 20, 250);
        c.textAlign = 'right';
        c.font = 'bold 96px monospace';
        const big = a.reading === 'error' ? ['Err', 'E-2', '--'] : a.reading === 'measuring' ? ['---', '---', '--'] : [String(sys), String(dia), String(pulse)];
        c.fillText(big[0], w - 70, 62); c.fillText(big[1], w - 70, 160);
        c.font = 'bold 56px monospace';
        c.fillText(big[2], w - 70, 250);
        c.fillStyle = a.reading === 'alarming' ? '#ff5040' : a.reading === 'calm' ? '#5fe07a' : ink;
        heart(c, w - 36, 245, 20);
        if (a.reading === 'alarming') { c.font = 'bold 24px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#ffd23a'; c.fillText('HIGH', w - 36, 100); }
      });
      const face = new THREE.MeshStandardMaterial({ map, roughness: 0.35 });
      if (a.reading !== 'blank') { face.emissive = new THREE.Color('#ffffff'); face.emissiveMap = map; face.emissiveIntensity = 0.85; glow = face; }
      s.box([0.42, 0.34, 0.02], [-0.1, screenY + 0.02, screenZ - 0.006], dark);
      s.mesh(new THREE.PlaneGeometry(0.38, 0.3), face, [-0.1, screenY + 0.02, screenZ + 0.006]);
    }

    // Header sign with a heart.
    const signMap = paint(512, 200, (c, w, h) => {
      c.fillStyle = a.era === 'seventies' ? '#f2e6c4' : a.era === 'modern' ? '#ffffff' : palette.accent;
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#d42a35';
      heart(c, 66, 92, 44);
      c.strokeStyle = '#ffffff'; c.lineWidth = 6;
      c.beginPath(); c.moveTo(28, 96); c.lineTo(52, 96); c.lineTo(62, 70); c.lineTo(74, 118); c.lineTo(82, 96); c.lineTo(104, 96); c.stroke();
      c.fillStyle = a.era === 'seventies' ? '#5a2a1c' : a.era === 'modern' ? palette.accent : '#ffffff';
      c.textBaseline = 'middle';
      c.font = 'bold 46px sans-serif';
      const words = HEADERS[a.header].split(' ');
      const half = Math.ceil(words.length / 2);
      c.fillText(words.slice(0, half).join(' '), 136, 68, 360);
      c.fillText(words.slice(half).join(' '), 136, 132, 360);
    });
    const signLit = a.reading !== 'blank' && a.era !== 'seventies';
    rbox([0.72, 0.3, 0.12], [0, 1.52, cz - 0.08], a.era === 'modern' ? body : trim);
    s.mesh(new THREE.PlaneGeometry(0.66, 0.26), new THREE.MeshStandardMaterial({ map: signMap, roughness: 0.5, emissive: '#ffffff', emissiveMap: signMap, emissiveIntensity: signLit ? mix(0.25, 0.6, mood.cheer) : 0 }), [0, 1.52, cz - 0.018]);
    s.box([0.08, 0.14, 0.08], [-0.1, 1.38, cz - 0.08], body);

    // The seat.
    const sz = 0.33;
    if (a.seat === 'bucket') {
      s.cylinder(0.04, 0.05, 0.36, [0, 0.25, sz], steel, 14);
      rbox([0.46, 0.07, 0.42], [0, 0.46, sz], seatPaint);
      const back = rbox([0.46, 0.3, 0.06], [0, 0.63, sz + 0.2], seatPaint);
      back.rotation.x = 0.16;
    } else if (a.seat === 'bench') {
      for (const x of [-0.24, 0.24]) s.box([0.05, 0.36, 0.3], [x, 0.25, sz], a.era === 'seventies' ? trim : body);
      s.mesh(new RoundedBoxGeometry(0.66, 0.1, 0.4, 4, 0.04), seatPaint, [0, 0.47, sz]);
    } else {
      s.cylinder(0.035, 0.035, 0.4, [0, 0.27, sz], steel, 14);
      s.cylinder(0.12, 0.14, 0.02, [0, 0.08, sz], steel, 20);
      s.cylinder(0.19, 0.18, 0.07, [0, 0.5, sz], seatPaint, 28);
    }

    // Notices.
    if (a.notice === 'paper') {
      const sheet = s.mesh(new THREE.PlaneGeometry(0.4, 0.3), new THREE.MeshStandardMaterial({ roughness: 0.9, map: paint(256, 192, (c, w, h) => {
        c.fillStyle = '#f8f4e4';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#b01c1c';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = 'bold 66px sans-serif';
        c.fillText('OUT OF', w / 2, 58, w - 16);
        c.fillText('ORDER', w / 2, 132, w - 16);
        c.fillRect(30, 172, w - 60, 5);
      }) }), [-0.1, screenY + 0.02, screenZ + 0.02]);
      sheet.rotation.z = (random() - 0.5) * 0.25;
      for (const dx of [-0.15, 0.15]) s.box([0.07, 0.03, 0.002], [-0.1 + dx, screenY + 0.165 + sheet.rotation.z * dx, screenZ + 0.022], s.material('#d8cf9a', { transparent: true, opacity: 0.85 }));
    } else if (a.notice === 'bagged') {
      const bag = s.mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: '#e9edf0', roughness: 0.25, transparent: true, opacity: 0.8 }), [cuffX, cuffY - 0.01, cuffZ + 0.02]);
      bag.scale.set(0.16, 0.16, 0.24);
      for (const dz of [-0.08, 0.1]) s.ring(0.158, 0.012, [cuffX, cuffY - 0.01, cuffZ + dz], s.material('#b9a04a'));
      s.label('SORRY', 0.24, 0.1, [-0.1, screenY - 0.2, screenZ + 0.03], '#b01c1c', '#f6f1df').rotation.z = (random() - 0.5) * 0.2;
    } else if (a.notice === 'disclaimer') {
      s.label('NOT MEDICAL ADVICE', 0.4, 0.07, [-0.1, screenY - 0.2, screenZ + 0.03], '#222222', '#f3e9a6');
    }

    // Traces of the last user.
    let slip: THREE.Mesh | null = null;
    if (a.left === 'printout') {
      const points: [number, number, number][] = [];
      const length = 0.25 + random() * 0.25;
      for (let i = 0; i <= 8; i++) { const t = i / 8; points.push([-0.31, 0.7 - t * length + Math.sin(t * 5) * 0.01, cz + 0.3 + t * 0.06 + Math.sin(t * 7) * 0.025]); }
      s.box([0.09, 0.012, 0.02], [-0.31, 0.7, cz + 0.3], dark);
      const strip = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 16, 0.03, 4), s.material('#f7f4ea', { roughness: 0.9 }));
      strip.scale.z = 1;
      strip.castShadow = true;
      s.root.add(strip);
      slip = strip;
    } else if (a.left === 'basket') {
      const wire = s.material(['#c2302b', '#2c6f3d', '#2a4f9a'][Math.floor(random() * 3)], { roughness: 0.5 });
      const bx = -0.6, bz = 0.3;
      s.box([0.36, 0.02, 0.26], [bx, 0.01, bz], wire);
      for (const [dx, dz, w, d] of [[0, 0.13, 0.38, 0.015], [0, -0.13, 0.38, 0.015], [0.19, 0, 0.015, 0.28], [-0.19, 0, 0.015, 0.28]] as const) {
        s.box([w, 0.012, d], [bx + dx, 0.2, bz + dz], wire);
        s.box([w, 0.012, d], [bx + dx, 0.11, bz + dz], wire);
      }
      for (const dx of [-0.19, 0.19]) for (const dz of [-0.13, 0.13]) s.box([0.012, 0.2, 0.012], [bx + dx, 0.1, bz + dz], wire);
      s.ring(0.12, 0.008, [bx, 0.2, bz], dark, Math.PI);
      s.box([0.1, 0.14, 0.08], [bx - 0.07, 0.09, bz], s.material('#e8e2cf'));
      s.cylinder(0.035, 0.035, 0.12, [bx + 0.08, 0.08, bz + 0.03], s.material('#d98a2b'), 12);
    } else if (a.left === 'cane') {
      const stick = s.material('#6a3f1f', { roughness: 0.45 });
      s.rod([0.5, 0, 0.1], [0.4, 0.86, cz + 0.2], 0.013, stick);
      s.ring(0.05, 0.013, [0.4, 0.865, cz + 0.15], stick, Math.PI).rotation.y = Math.PI / 2;
    }

    const squeeze = a.reading === 'measuring' ? 1 : 0.25;
    const alarm = a.reading === 'alarming';
    return s.finish({
      update: (_dt, time) => {
        const beat = Math.sin(time * mix(1.2, 5, mood.energy));
        const pump = 1 + beat * 0.07 * squeeze * (0.4 + mood.energy);
        bladder.scale.set(pump, pump, 1 + (pump - 1) * 2);
        bladderBack.scale.copy(bladder.scale);
        if (glow) glow.emissiveIntensity = alarm ? 0.6 + Math.max(0, Math.sin(time * mix(3, 9, mood.energy))) * 0.6 : 0.85;
        if (needle) needle.rotation.z = (needle.userData.rest as number) + beat * 0.03 * (a.reading === 'blank' ? 0 : 1 + mood.energy * 3);
        if (slip) slip.rotation.z = beat * 0.01 * mood.energy;
      },
    });
  },
});
