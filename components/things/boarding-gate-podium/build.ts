import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

function paint(width: number, height: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

const GATES = {
  A1: 'A1: the very first gate, right by security.',
  B14: 'B14: an ordinary middle gate.',
  C27: 'C27: far down a long pier.',
  D40: 'D40: the last gate at the end of everything.',
  '13': '13: a bare unlucky number, no letter.',
  '7': '7: a small airport with single-digit gates.',
  Z99: 'Z99: a gate that should not exist.',
} as const;
const MESSAGES = {
  closed: 'GATE CLOSED in white on red.',
  final: 'FINAL CALL in black on amber.',
  boarding: 'NOW BOARDING in white on green.',
  delayed: 'DELAYED, with a new time that keeps moving.',
  agent: 'PLEASE SEE AGENT, though there is no agent.',
  flight: 'A flight number, a city and a departure time on blue.',
  nosignal: 'A blue NO SIGNAL screen.',
  blank: 'Nothing. The screen is off.',
} as const;
const FINISHES = {
  grey: 'Grey laminate with a coloured stripe, standard issue.',
  wood: 'Warm wood veneer with a dark top, an older terminal.',
  white: 'Gloss white with rounded corners, a new low-cost pier.',
  steel: 'Brushed stainless steel, hard and reflective.',
  navy: 'Dark navy panels with a pale top, a flag carrier.',
} as const;
const FINISH: Record<keyof typeof FINISHES, { body: string; top: string; metal: number }> = {
  grey: { body: '#aeb2b3', top: '#55595e', metal: 0.05 },
  wood: { body: '#9a6b42', top: '#2e2a28', metal: 0 },
  white: { body: '#eceeec', top: '#cfd4d6', metal: 0.05 },
  steel: { body: '#b3bbc0', top: '#8c9499', metal: 0.85 },
  navy: { body: '#253660', top: '#d8d4c6', metal: 0.05 },
};
const LIVERY = { blue: '#2463c4', red: '#cf2e2e', teal: '#16938c', orange: '#ee7a1c', purple: '#6a3aa8', green: '#2f8f47' } as const;

export default defineThing({
  questions: {
    gate: choice('What is the gate number on the sign?', GATES),
    state: choice('What state is the desk in?', {
      unstaffed: 'Unstaffed: screens idling, the stool pushed back, nobody coming.',
      closed: 'Closed: screens dark, a CLOSED placard on the counter and a strap across the way through.',
      final: 'Lit for a final call: everything on, the sign flashing, the scanner waiting green.',
      boarding: 'Mid-boarding: lit and busy, a stack of torn stubs on the counter.',
    }),
    message: choice('What does the screen under the gate number say?', MESSAGES),
    finish: choice('What is the desk made of?', FINISHES),
    livery: choice('What colour is the airline stripe and logo?', {
      blue: 'Corporate blue.', red: 'Bright red.', teal: 'Teal.', orange: 'Budget orange.', purple: 'Purple.', green: 'Green.',
    }),
    left: choice('What has been left on the counter?', {
      nothing: 'Nothing.',
      stubs: 'A spilled pile of boarding-pass stubs.',
      radio: 'A handheld radio and a lanyard with an ID badge.',
      coffee: 'A paper coffee cup.',
      passport: "Somebody's forgotten passport.",
      note: 'A handwritten card propped up: BACK IN 5 MIN.',
    }),
    stool: noul('Is there a stool behind the desk?'),
    twin: noul('Is it a double podium, two desks joined with one sign?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const fin = FINISH[a.finish];
    const live = LIVERY[a.livery];
    const on = a.state !== 'closed';
    const hot = a.state === 'final' || a.state === 'boarding';
    const W = a.twin ? 2.5 : 1.35, H = 1.12, D = 0.62;
    const body = s.material(fin.body, { metalness: fin.metal, roughness: fin.metal > 0.5 ? 0.35 : 0.5 });
    const topMat = s.material(fin.top, { metalness: fin.metal * 0.6, roughness: 0.4 });
    const stripe = s.material(live, { roughness: 0.45, emissive: live, emissiveIntensity: hot ? 0.25 : 0.05 });
    const dark = s.material('#1c1e21', { roughness: 0.6 });
    const steel = s.material('#a4abb0', { metalness: 0.85, roughness: 0.3 });
    const round = a.finish === 'white' ? 0.07 : 0.015;

    // The counter: a tall front toward the passenger, a lower worktop behind.
    s.mesh(new RoundedBoxGeometry(W, H - 0.1, 0.1, 3, round > 0.05 ? 0.045 : round), body, [0, (H - 0.1) / 2 + 0.1, D / 2 - 0.05]);
    for (const x of [-W / 2 + 0.03, W / 2 - 0.03]) s.box([0.06, H - 0.3, D - 0.06], [x, (H - 0.3) / 2 + 0.1, -0.03], body);
    if (a.twin) s.box([0.06, H - 0.3, D - 0.06], [0, (H - 0.3) / 2 + 0.1, -0.03], body);
    s.box([W - 0.02, 0.1, D - 0.04], [0, 0.05, -0.01], dark);
    s.mesh(new RoundedBoxGeometry(W + 0.06, 0.045, 0.26, 2, 0.015), topMat, [0, H + 0.02, D / 2 - 0.1]);
    s.box([W - 0.08, 0.035, D - 0.2], [0, 0.82, -0.1], topMat);
    s.box([W - 0.12, 0.02, D - 0.14], [0, 0.42, -0.04], body);
    s.box([W + 0.004, 0.09, 0.012], [0, H - 0.2, D / 2 + 0.002], stripe);
    s.box([W + 0.004, 0.025, 0.012], [0, H - 0.29, D / 2 + 0.002], stripe);
    // Airline roundel: a disc with a swept wing.
    const logo = paint(256, 256, (c) => {
      c.fillStyle = live; c.beginPath(); c.arc(128, 128, 124, 0, 7); c.fill();
      c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(40, 170); c.quadraticCurveTo(120, 150, 216, 70); c.quadraticCurveTo(170, 150, 96, 196); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(60, 120); c.quadraticCurveTo(120, 118, 180, 84); c.quadraticCurveTo(130, 130, 84, 142); c.closePath(); c.fill();
    });
    const desks = a.twin ? [-W / 4, W / 4] : [0];
    for (const x of desks) {
      const disc = s.mesh(new THREE.CircleGeometry(0.17, 32), new THREE.MeshStandardMaterial({ map: logo, roughness: 0.5, emissive: '#ffffff', emissiveMap: logo, emissiveIntensity: hot ? 0.3 : 0.05 }), [x, 0.52, D / 2 + 0.004]);
      disc.castShadow = false;
    }
    // Scuffs from a thousand wheeled bags along the kick plate.
    for (let k = 0; k < Math.round(mood.wear * 9); k++) s.box([0.08 + random() * 0.25, 0.012, 0.004], [(random() - 0.5) * (W - 0.3), 0.14 + random() * 0.2, D / 2 + 0.003], s.material('#3a3a3a', { roughness: 1 })).rotation.z = (random() - 0.5) * 0.3;

    // Agent's kit on each desk: monitor, keyboard, microphone, printer.
    const blink: THREE.MeshStandardMaterial[] = [];
    for (const x of desks) {
      const glow = on ? (a.state === 'unstaffed' ? '#3d6fae' : '#cfe4ff') : '#15171a';
      const screen = new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: on ? mix(0.5, 0.9, mood.cheer) : 0, roughness: 0.3 });
      s.box([0.5, 0.33, 0.035], [x - 0.12, 1.15, -0.08], dark).rotation.x = 0.12;
      const glass = s.box([0.46, 0.29, 0.004], [x - 0.12, 1.15, -0.1], screen);
      glass.rotation.x = 0.12; glass.castShadow = false;
      s.rod([x - 0.12, 0.84, -0.06], [x - 0.12, 1.05, -0.06], 0.02, dark);
      s.box([0.2, 0.015, 0.14], [x - 0.12, 0.845, -0.06], dark);
      s.box([0.4, 0.02, 0.14], [x - 0.12, 0.85, -0.25], dark).rotation.x = -0.08;
      s.box([0.2, 0.14, 0.2], [x + 0.4, 0.91, -0.14], s.material('#d5d2c8', { roughness: 0.6 }));
      s.box([0.11, 0.004, 0.1], [x + 0.4, 0.985, -0.12], s.material('#f5f2e8')).rotation.x = -0.5;
      // Gooseneck microphone on the passenger-side ledge.
      const mx = x + 0.3, bend = (random() - 0.5) * 0.1;
      s.cylinder(0.045, 0.05, 0.02, [mx, H + 0.052, D / 2 - 0.14], dark, 16);
      s.tube([[mx, H + 0.06, D / 2 - 0.14], [mx + bend, H + 0.26, D / 2 - 0.16], [mx + bend * 2, H + 0.36, D / 2 - 0.26], [mx + bend * 2, H + 0.38, D / 2 - 0.34]], 0.007, steel);
      s.ball([0.02, 0.02, 0.032], [mx + bend * 2, H + 0.38, D / 2 - 0.36], dark, 10);
      const lamp = new THREE.MeshStandardMaterial({ color: hot ? '#ff3b30' : '#402020', emissive: hot ? '#ff3b30' : '#000000', emissiveIntensity: 1 });
      s.cylinder(0.008, 0.008, 0.006, [mx + 0.025, H + 0.065, D / 2 - 0.12], lamp, 8);
      if (a.state === 'final') blink.push(lamp);
    }

    // Boarding-pass scanner on its own post at the passenger's right hand.
    const sx = W / 2 + 0.3, sz = D / 2 + 0.12;
    const scanTint = a.state === 'closed' ? '#3a1512' : a.state === 'unstaffed' ? '#d03a2c' : '#35d06a';
    const scanGlow = new THREE.MeshStandardMaterial({ color: scanTint, emissive: scanTint, emissiveIntensity: on ? 1.1 : 0.1, roughness: 0.3 });
    s.cylinder(0.16, 0.18, 0.025, [sx, 0.0125, sz], dark, 24);
    s.cylinder(0.035, 0.035, 0.95, [sx, 0.48, sz], steel, 14);
    const head = s.mesh(new RoundedBoxGeometry(0.2, 0.09, 0.26, 3, 0.03), s.material('#e6e8e6', { roughness: 0.4 }), [sx, 0.99, sz + 0.02]);
    head.rotation.x = 0.5;
    const eye = s.box([0.13, 0.006, 0.13], [sx, 1.033, sz + 0.045], scanGlow);
    eye.rotation.x = 0.5; eye.castShadow = false;
    s.box([0.16, 0.02, 0.03], [sx, 1.075, sz - 0.07], scanGlow).rotation.x = 0.5;
    if (a.state === 'final') blink.push(scanGlow);

    // The pole: gate number in black on wayfinding yellow, and the screen below it.
    const px = a.twin ? 0 : -W / 2 + 0.16, pz = -D / 2 - 0.06, PH = 2.75;
    s.cylinder(0.04, 0.04, PH, [px, PH / 2, pz], steel, 16);
    s.cylinder(0.14, 0.16, 0.03, [px, 0.015, pz], dark, 20);
    const signX = a.twin ? 0 : px + 0.34;
    const gateMap = paint(512, 320, (c, w, h) => {
      c.fillStyle = on ? '#ffd21e' : '#b59a2a'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#141414'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = 'bold 56px sans-serif'; c.fillText('GATE', w / 2, 52);
      c.font = `bold ${a.gate.length > 2 ? 190 : 220}px sans-serif`; c.fillText(a.gate, w / 2, 196, w - 40);
    });
    const gateMat = new THREE.MeshStandardMaterial({ map: gateMap, emissive: '#ffffff', emissiveMap: gateMap, emissiveIntensity: on ? mix(0.4, 0.75, mood.cheer) : 0.04, roughness: 0.5 });
    s.mesh(new RoundedBoxGeometry(0.94, 0.6, 0.12, 2, 0.02), dark, [signX, PH - 0.34, pz]);
    for (const side of [1, -1]) {
      const plate = s.mesh(new THREE.PlaneGeometry(0.88, 0.55), gateMat, [signX, PH - 0.34, pz + side * 0.062]);
      plate.rotation.y = side === 1 ? 0 : Math.PI; plate.castShadow = false;
    }
    const m = a.state === 'closed' && a.message !== 'closed' ? 'blank' : a.message;
    const time = `${String(4 + Math.floor(random() * 2)).padStart(2, '0')}:${String(Math.floor(random() * 12) * 5).padStart(2, '0')}`;
    const city = ['LISBON', 'OSLO', 'DENVER', 'NAIROBI', 'SEOUL', 'LIMA', 'HOME'][Math.floor(random() * 7)];
    const flightNo = `${'ABKLQSTV'[Math.floor(random() * 8)]}${'AEKLNX'[Math.floor(random() * 6)]} ${100 + Math.floor(random() * 899)}`;
    const msgMap = paint(512, 288, (c, w, h) => {
      const fill = { closed: '#b3231c', final: '#f5a31c', boarding: '#1f9148', delayed: '#20232a', agent: '#1c3f8c', flight: '#16356f', nosignal: '#1438c8', blank: '#0d0e10' }[m];
      const ink = m === 'final' ? '#141414' : m === 'delayed' ? '#ffb020' : '#ffffff';
      c.fillStyle = fill; c.fillRect(0, 0, w, h);
      c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle';
      const big = (text: string, y: number, size: number) => { c.font = `bold ${size}px sans-serif`; c.fillText(text, w / 2, y, w - 30); };
      if (m === 'closed') { big('GATE', 90, 100); big('CLOSED', 200, 100); }
      else if (m === 'final') { big('FINAL', 90, 110); big('CALL', 200, 110); }
      else if (m === 'boarding') { big('NOW', 80, 84); big('BOARDING', 190, 96); }
      else if (m === 'delayed') { big('DELAYED', 100, 104); big(`NEW TIME ${time}`, 210, 50); }
      else if (m === 'agent') { big('PLEASE SEE', 92, 76); big('AGENT', 196, 104); }
      else if (m === 'flight') { big(flightNo, 60, 60); big(city, 150, 96); big(time, 240, 60); }
      else if (m === 'nosignal') { c.fillStyle = '#0a1c70'; c.fillRect(150, 110, 212, 68); c.fillStyle = '#ffffff'; big('NO SIGNAL', 144, 36); }
    });
    const lit = m !== 'blank';
    const msgMat = new THREE.MeshStandardMaterial({ map: msgMap, emissive: '#ffffff', emissiveMap: msgMap, emissiveIntensity: lit ? mix(0.5, 0.9, mood.cheer) : 0, roughness: 0.3 });
    s.mesh(new RoundedBoxGeometry(0.98, 0.58, 0.07, 2, 0.015), dark, [signX, PH - 1.0, pz]);
    const msg = s.mesh(new THREE.PlaneGeometry(0.92, 0.52), msgMat, [signX, PH - 1.0, pz + 0.037]);
    msg.castShadow = false;
    if (!a.twin) for (const y of [PH - 0.34, PH - 1.0]) s.box([0.2, 0.04, 0.04], [px + 0.05, y, pz - 0.03], steel);
    if (a.state === 'final') {
      const beacon = new THREE.MeshStandardMaterial({ color: '#ffb020', emissive: '#ffb020', emissiveIntensity: 1.2, roughness: 0.3 });
      s.cylinder(0.05, 0.06, 0.08, [px, PH + 0.04, pz], beacon, 14);
      blink.push(beacon);
    }

    // What the shift left behind.
    const cy = H + 0.043, cz = D / 2 - 0.1, cx = desks[0] - 0.3 + random() * 0.1;
    if (a.state === 'closed') {
      const card = s.label('CLOSED', 0.36, 0.13, [desks[0] - 0.05, cy + 0.07, cz + 0.03], '#ffffff', '#b3231c');
      card.rotation.x = -0.25;
      // The strap pulled across from the scanner post to the desk end.
      const strap = s.box([0.3, 0.05, 0.004], [W / 2 + 0.15, 0.9, sz], s.material(live, { roughness: 0.7 }));
      strap.rotation.y = 0.0;
    }
    const stubs = a.left === 'stubs' || a.state === 'boarding';
    if (stubs) for (let k = 0; k < 14; k++) s.box([0.07, 0.002, 0.03], [cx + (random() - 0.5) * 0.24, cy + 0.002 + k * 0.0022, cz + (random() - 0.5) * 0.12], s.material(k % 3 ? '#f3f0e6' : live)).rotation.y = random() * 3;
    if (a.left === 'radio') {
      s.box([0.06, 0.13, 0.035], [cx, cy + 0.065, cz], dark);
      s.rod([cx + 0.02, cy + 0.13, cz], [cx + 0.02, cy + 0.24, cz], 0.006, dark);
      s.tube([[cx + 0.1, cy + 0.004, cz - 0.05], [cx + 0.2, cy + 0.004, cz + 0.06], [cx + 0.3, cy + 0.004, cz - 0.04], [cx + 0.16, cy + 0.004, cz - 0.08]], 0.006, stripe, true);
      s.box([0.06, 0.004, 0.09], [cx + 0.34, cy + 0.003, cz - 0.02], s.material('#f1f1ec')).rotation.y = 0.5;
    } else if (a.left === 'coffee') {
      s.cylinder(0.04, 0.03, 0.11, [cx, cy + 0.055, cz], s.material('#f0ece0'), 14);
      s.cylinder(0.042, 0.042, 0.012, [cx, cy + 0.115, cz], dark, 14);
    } else if (a.left === 'passport') {
      s.box([0.09, 0.012, 0.125], [cx, cy + 0.006, cz], s.material('#6a1f2a', { roughness: 0.6 })).rotation.y = 0.5 + random();
      s.box([0.03, 0.002, 0.03], [cx, cy + 0.013, cz], s.material('#d9b24a', { metalness: 0.6 }));
    } else if (a.left === 'note') {
      const note = s.label('BACK IN 5 MIN', 0.34, 0.12, [cx + 0.1, cy + 0.065, cz + 0.02], '#28303a', '#f6f1dc');
      note.rotation.set(-0.3, 0, (random() - 0.5) * 0.12);
    }

    if (a.stool) {
      const back = a.state === 'unstaffed' ? 0.25 + random() * 0.3 : 0.05;
      const tx = desks[0] + (random() - 0.5) * 0.3, tz = -D / 2 - 0.3 - back;
      s.cylinder(0.22, 0.24, 0.025, [tx, 0.0125, tz], steel, 20);
      s.cylinder(0.025, 0.025, 0.66, [tx, 0.35, tz], steel, 12);
      s.ring(0.15, 0.012, [tx, 0.3, tz], steel).rotation.x = Math.PI / 2;
      s.cylinder(0.19, 0.17, 0.07, [tx, 0.715, tz], s.material('#2a2c30', { roughness: 0.6 }), 20);
      const rest = s.mesh(new RoundedBoxGeometry(0.34, 0.2, 0.05, 2, 0.02), s.material('#2a2c30', { roughness: 0.6 }), [tx, 1.0, tz - 0.19]);
      s.rod([tx, 0.72, tz - 0.16], [tx, 0.95, tz - 0.2], 0.012, steel);
      if (a.state === 'unstaffed' || a.state === 'closed') {
        // A uniform jacket left over the backrest.
        const jacket = s.mesh(new RoundedBoxGeometry(0.4, 0.42, 0.1, 3, 0.04), s.material(live, { roughness: 0.9 }), [tx, 0.92, tz - 0.2]);
        jacket.rotation.y = rest.rotation.y = (random() - 0.5) * 0.6;
      }
    }

    const pace = mix(1.5, 5, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        const level = Math.sin(time * pace) > 0 ? 1.3 : 0.15;
        for (const material of blink) material.emissiveIntensity = level;
      },
    });
  },
});
