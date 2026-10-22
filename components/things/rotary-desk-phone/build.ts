import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];
const NOTES = {
  blank: 'Nothing: a clean pad.',
  number: 'A phone number, KL5-0142, underlined twice.',
  tip: 'A tip-off: DOCK 9, MIDNIGHT.',
  yes: 'SHE SAID YES!',
  hospital: 'The word HOSPITAL and a room number.',
  dont: 'DON\'T ANSWER, in capitals.',
  doodle: 'Only doodles: spirals and boxes from a very long hold.',
} as const;
const NOTE_LINES: Record<keyof typeof NOTES, string[]> = {
  blank: [], number: ['KL5-0142'], tip: ['DOCK 9', 'MIDNIGHT'], yes: ['SHE SAID', 'YES!'], hospital: ['HOSPITAL', 'RM 412'], dont: ["DON'T", 'ANSWER'], doodle: [],
};

function paint(width: number, height: number, draw: (g: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export default defineThing({
  questions: {
    state: choice('What is the phone doing?', {
      hook: 'Sitting silent on the hook, waiting.',
      ringing: 'Ringing hard, the receiver rattling in its cradle.',
      off: 'The receiver is off the hook, laid down beside the phone while someone goes to fetch someone.',
      dangling: 'The receiver has been dropped and hangs swinging on its cord.',
      cut: 'The cord has been cut or torn out: the receiver lies loose with a frayed end.',
    }),
    count: choice('How many phones are there?', {
      one: 'A single telephone.',
      two: 'Two side by side, one of them the important one.',
      bank: 'A bank of four in a row, a news desk or a campaign office.',
    }),
    model: choice('What kind of telephone is it?', {
      bakelite: 'A squat 1940s bakelite desk set, all weight and curves.',
      candlestick: 'An upright candlestick phone with a separate earpiece on a hook.',
      fifties: 'A rounded 1950s desk set, the standard issue.',
      keyset: 'An office key set with a row of lit line buttons under the dial.',
    }),
    colour: choice('What colour is it?', {
      black: 'Black, like nearly all of them.',
      red: 'Red: the hotline.',
      ivory: 'Ivory, a little yellowed.',
      green: 'Avocado green.',
      pink: 'Powder pink.',
      beige: 'Office beige.',
    }),
    rests: choice('What does it sit on?', {
      books: 'A stack of fat telephone directories.',
      desk: 'A cut corner of a steel desk top.',
      table: 'A little wooden telephone table with a shelf below.',
      crate: 'An upturned wooden crate, a makeshift office.',
    }),
    note: choice('What is written on the message pad beside it?', NOTES),
    extras: choice('What else is by the phone?', {
      nothing: 'Nothing.',
      rolodex: 'A fat rotary card file of contacts.',
      ashtray: 'An ashtray crowded with stubs from waiting.',
      flowers: 'A small vase of flowers.',
      clock: 'A wind-up alarm clock.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const n = { one: 1, two: 2, bank: 4 }[a.count];
    const pitchX = 0.3;
    const COLOURS = { black: '#1b1c1e', red: '#b8231f', ivory: '#e6dcbf', green: '#7c8a45', pink: '#e6a7ae', beige: '#cdbb98' };
    const chrome = s.material('#d2d6d8', { metalness: 0.9, roughness: 0.22 });
    const dark = s.material('#161719', { roughness: 0.5 });
    const brass = s.material('#c79a3a', { metalness: 0.85, roughness: 0.28 });
    const paper = s.material(mood.wear > 0.6 ? '#e6dcb9' : '#f3efe2', { roughness: 0.9 });

    const dialTexture = paint(256, 256, (g) => {
      g.fillStyle = '#e9e4d4';
      g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
      g.fillStyle = '#2a2b2e';
      g.beginPath(); g.arc(128, 128, 118, 0, 7); g.fill();
      g.font = 'bold 26px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (let i = 0; i < 10; i++) {
        const angle = -0.35 - i * 0.52;
        const x = 128 + Math.cos(angle) * 84, y = 128 + Math.sin(angle) * 84;
        g.fillStyle = '#f3efe2';
        g.beginPath(); g.arc(x, y, 19, 0, 7); g.fill();
        g.fillStyle = '#1a1a1c';
        g.fillText(String((i + 1) % 10), x, y + 1);
      }
      g.fillStyle = '#f3efe2';
      g.beginPath(); g.arc(128, 128, 44, 0, 7); g.fill();
      g.fillStyle = '#1a1a1c';
      g.font = 'bold 15px monospace';
      g.fillText('KL5', 128, 120);
      g.fillText('0142', 128, 138);
    });
    const dialMaterial = new THREE.MeshStandardMaterial({ map: dialTexture, roughness: 0.4 });

    // What it rests on.
    const W = n * pitchX + 0.2, D = 0.4;
    let top = 0;
    const bookColours = ['#e3c23a', '#eeeae0', '#8fb0c8', '#d98a3a'];
    const bookStack = (x: number, z: number, from: number, count: number) => {
      let y = from;
      for (let i = 0; i < count; i++) {
        const h = 0.05 + random() * 0.035, turn = (random() - 0.5) * 0.35;
        const cover = s.box([0.24, h, 0.3], [x, y + h / 2, z], s.material(bookColours[Math.floor(random() * bookColours.length)], { roughness: 0.8 }));
        cover.rotation.y = turn;
        const pages = s.box([0.228, h - 0.012, 0.302], [x + 0.004, y + h / 2, z], paper);
        pages.rotation.y = turn;
        y += h;
      }
      return y;
    };
    const tops: number[] = [];
    if (a.rests === 'books') {
      for (let i = 0; i < n; i++) tops.push(bookStack((i - (n - 1) / 2) * pitchX, 0, 0, 2 + Math.floor(random() * 3)));
      top = Math.max(...tops);
    } else if (a.rests === 'desk') {
      top = 0.3;
      s.box([W, 0.04, D], [0, top - 0.02, 0], s.material('#8b9391', { metalness: 0.35, roughness: 0.45 }));
      s.box([W - 0.05, 0.005, D - 0.05], [0, top + 0.001, 0], s.material('#5f6f66', { roughness: 0.8 }));
      s.box([W - 0.06, top - 0.04, D - 0.06], [0, (top - 0.04) / 2, 0], s.material('#7a8280', { metalness: 0.3, roughness: 0.5 }));
      s.box([W - 0.12, 0.1, 0.02], [0, top - 0.11, D / 2 - 0.025], s.material('#8b9391', { metalness: 0.35, roughness: 0.45 }));
      s.box([0.12, 0.014, 0.02], [0, top - 0.11, D / 2 - 0.008], chrome);
    } else if (a.rests === 'table') {
      top = 0.62;
      const wood = s.material('#7a5232', { roughness: 0.5 });
      s.box([W, 0.03, D], [0, top - 0.015, 0], wood);
      s.box([W - 0.08, 0.06, D - 0.08], [0, top - 0.06, 0], wood);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.rod([sx * (W / 2 - 0.05), top - 0.03, sz * (D / 2 - 0.05)], [sx * (W / 2 - 0.03), 0, sz * (D / 2 - 0.03)], 0.02, wood, 0.012);
      s.box([W - 0.1, 0.02, D - 0.1], [0, 0.22, 0], wood);
      bookStack(-0.02, 0, 0.23, 1 + Math.round(mood.density * 2));
    } else {
      top = 0.34;
      const slat = s.material('#a8824f', { roughness: 0.9 });
      for (let i = 0; i < 5; i++) s.box([W, 0.02, D / 5 - 0.012], [0, top - 0.01, -D / 2 + D / 10 + i * D / 5], slat);
      for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) s.box([0.02, 0.085, D], [sx * (W / 2 - 0.01), 0.05 + i * 0.105, 0], slat);
      for (const sz of [-1, 1]) for (let i = 0; i < 3; i++) s.box([W, 0.085, 0.02], [0, 0.05 + i * 0.105, sz * (D / 2 - 0.01)], slat);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.box([0.03, top - 0.02, 0.03], [sx * (W / 2 - 0.035), (top - 0.02) / 2, sz * (D / 2 - 0.035)], slat);
    }

    const coil = (from: THREE.Vector3, to: THREE.Vector3, sag: number, material: THREE.Material, turns = 16) => {
      const middle = from.clone().lerp(to, 0.5);
      middle.y -= sag;
      const guide = new THREE.QuadraticBezierCurve3(from, middle, to);
      const points: THREE.Vector3[] = [];
      const steps = turns * 7;
      const tangent = new THREE.Vector3(), n1 = new THREE.Vector3(), n2 = new THREE.Vector3();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const centre = guide.getPoint(t);
        guide.getTangent(t, tangent);
        n1.set(tangent.z, 0.3, -tangent.x).cross(tangent).normalize();
        n2.crossVectors(tangent, n1);
        const fade = Math.min(1, t * 8, (1 - t) * 8);
        const angle = t * turns * Math.PI * 2;
        points.push(centre.addScaledVector(n1, Math.cos(angle) * 0.011 * fade).addScaledVector(n2, Math.sin(angle) * 0.011 * fade));
      }
      return s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), steps * 2, 0.0035, 5), material);
    };

    const which = Math.floor(random() * n);
    const special = n > 1 ? Math.floor(random() * n) : -1;
    const handsets: THREE.Group[] = [];
    const swings: THREE.Group[] = [];
    const blinkers: THREE.MeshStandardMaterial[] = [];
    const ringMarks: THREE.Mesh[] = [];

    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * pitchX;
      const y = a.rests === 'books' ? tops[i] : top + 0.004;
      const colourKey = n > 1 && i === special ? (a.colour === 'red' ? 'black' : 'red') : a.colour;
      const state = i === which ? a.state : 'hook';
      const body = s.material(COLOURS[colourKey], { roughness: 0.28, metalness: 0.05 });
      const phone = new THREE.Group();
      phone.position.set(x, y, 0.02);
      phone.rotation.y = (random() - 0.5) * 0.3;
      s.root.add(phone);
      const on = <T extends THREE.Object3D>(node: T) => { phone.add(node); return node; };
      const handset = new THREE.Group();
      let rest: P3, cordEnd: P3, bodyPort: P3;

      if (a.model === 'candlestick') {
        on(s.lathe([[0, 0], [0.075, 0], [0.078, 0.012], [0.06, 0.03], [0.03, 0.045], [0.02, 0.06], [0.017, 0.07], [0.017, 0.27], [0.024, 0.28], [0.024, 0.3], [0, 0.31]], body));
        on(s.cylinder(0.019, 0.019, 0.012, [0, 0.16, 0], brass, 14));
        const horn = on(s.lathe([[0.012, 0], [0.014, 0.03], [0.03, 0.055], [0.04, 0.062], [0.036, 0.064], [0.01, 0.04]], dark, [0, 0.295, 0.012]));
        horn.rotation.x = 1.15;
        on(s.cylinder(0.03, 0.03, 0.03, [0, 0.295, 0], body, 14)).rotation.z = Math.PI / 2;
        on(s.rod([-0.02, 0.22, 0], [-0.075, 0.225, 0], 0.005, brass));
        on(s.ring(0.014, 0.004, [-0.085, 0.225, 0], brass, Math.PI * 1.5)).rotation.x = Math.PI / 2;
        const face = on(s.mesh(new THREE.CircleGeometry(0.034, 24), dialMaterial, [0, 0.036, 0.058]));
        face.rotation.x = -0.95;
        handset.add(s.lathe([[0.006, 0], [0.012, 0.01], [0.014, 0.1], [0.022, 0.125], [0.03, 0.14], [0.03, 0.15], [0, 0.15]], dark));
        handset.children[0].position.y = -0.15;
        rest = [-0.085, 0.235, 0];
        cordEnd = [0, -0.15, 0];
        bodyPort = [-0.05, 0.02, -0.04];
      } else {
        const old = a.model === 'bakelite';
        const profile = new THREE.Shape();
        const pts = old ? [[0.11, 0], [0.11, 0.025], [0.055, 0.045], [0.02, 0.115], [-0.05, 0.115], [-0.085, 0.04], [-0.1, 0.02], [-0.1, 0]] : [[0.115, 0], [0.115, 0.035], [0.02, 0.1], [-0.06, 0.1], [-0.105, 0.04], [-0.105, 0]];
        pts.forEach(([z, py], index) => (index ? profile.lineTo(z, py) : profile.moveTo(z, py)));
        const width = old ? 0.17 : 0.2;
        const hull = on(s.mesh(new THREE.ExtrudeGeometry(profile, { depth: width, bevelEnabled: true, bevelSize: 0.014, bevelThickness: 0.014, bevelSegments: 3 }), body));
        hull.rotation.y = -Math.PI / 2;
        hull.position.x = width / 2;
        const [fz, fy, tilt] = old ? [0.04, 0.078, 0.48] : [0.07, 0.07, 0.97];
        const nz = Math.sin(tilt), ny = Math.cos(tilt);
        const face = on(s.mesh(new THREE.CircleGeometry(old ? 0.058 : 0.062, 32), dialMaterial, [0, fy + ny * 0.016, fz + nz * 0.016]));
        face.rotation.x = -(Math.PI / 2 - tilt);
        const ringMesh = on(s.ring(old ? 0.058 : 0.062, 0.005, [0, fy + ny * 0.014, fz + nz * 0.014], old ? dark : chrome));
        ringMesh.rotation.x = -(Math.PI / 2 - tilt);
        on(s.rod([0.05, fy + ny * 0.016 - 0.03 * nz, fz + nz * 0.016 + 0.03 * ny], [0.04, fy + ny * 0.03 - 0.02 * nz, fz + nz * 0.03 + 0.02 * ny], 0.003, chrome));
        const cradleY = old ? 0.115 : 0.1;
        for (const side of [-1, 1]) {
          on(s.box([0.035, 0.04, 0.07], [side * 0.075, cradleY + 0.022, -0.02], body));
          on(s.box([0.035, 0.022, 0.012], [side * 0.075, cradleY + 0.05, -0.05], body));
          on(s.box([0.035, 0.022, 0.012], [side * 0.075, cradleY + 0.05, 0.01], body));
          on(s.cylinder(0.008, 0.008, 0.02, [side * 0.04, cradleY + 0.024, -0.02], chrome, 8));
        }
        if (a.model === 'keyset') for (let k = 0; k < 6; k++) {
          const lit = k === 5 ? false : random() < 0.45;
          const button = new THREE.MeshStandardMaterial({ color: k === 5 ? '#c2261c' : lit ? '#fff3c4' : '#d9d5c8', emissive: k === 5 ? '#c2261c' : '#ffd66b', emissiveIntensity: k === 5 ? 0.6 : lit ? 1.6 : 0, roughness: 0.3 });
          on(s.box([0.024, 0.014, 0.02], [-0.078 + k * 0.031, 0.036, 0.118], button));
          if (lit && blinkers.length < 3) blinkers.push(button);
        }
        // Handset: an arched grip with two cups.
        const grip = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-0.095, 0, 0], [-0.06, 0.028, 0], [0, 0.036, 0], [0.06, 0.028, 0], [0.095, 0, 0]].map((p) => new THREE.Vector3(...p))), 16, old ? 0.017 : 0.015, 8), body);
        grip.castShadow = true;
        handset.add(grip);
        for (const side of [-1, 1]) {
          const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.032, 16), body);
          cup.position.set(side * 0.098, -0.008, 0);
          cup.castShadow = true;
          const grille = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.004, 16), dark);
          grille.position.set(side * 0.098, -0.025, 0);
          handset.add(cup, grille);
        }
        rest = [0, cradleY + 0.067, -0.02];
        cordEnd = [-0.098, -0.02, 0];
        bodyPort = [-width / 2 - 0.01, 0.025, -0.05];
      }
      phone.add(handset);
      handset.position.set(...rest);

      // Where the receiver is.
      const stick = a.model === 'candlestick';
      const drop = y - 0.04;
      let cut = false;
      if (state === 'off' || (state === 'dangling' && drop < 0.16) || state === 'cut') {
        handset.position.set(stick ? -0.17 : -0.02, stick ? 0.03 : 0.035, stick ? 0.1 : 0.17);
        handset.rotation.set(stick ? Math.PI / 2 : Math.PI, 0.4 + random() * 0.5, stick ? 0.3 : 0);
        if (!stick) handset.position.y = 0.03;
        cut = state === 'cut';
      } else if (state === 'dangling') {
        const pivot = new THREE.Group();
        pivot.position.set(stick ? -0.1 : -0.12, 0.0, 0.2);
        phone.add(pivot);
        pivot.add(handset);
        handset.position.set(0, -Math.min(drop - 0.06, 0.34) - (stick ? 0 : 0.1), 0);
        handset.rotation.set(0, random() * 3, stick ? 0 : Math.PI / 2);
        pivot.rotation.z = 0.12;
        swings.push(pivot);
      } else if (state === 'ringing') {
        handset.rotation.z = 0.08;
        handsets.push(handset);
        const mark = new THREE.MeshStandardMaterial({ color: '#ffb52a', emissive: '#ff9a1c', emissiveIntensity: 1.6, depthWrite: false, transparent: true, opacity: 0.95 });
        for (const side of [-1, 1]) for (let k = 0; k < 3; k++) {
          const arc = on(s.ring(0.05 + k * 0.035, 0.005, [side * 0.12, (stick ? 0.3 : 0.2), 0], mark, 0.9));
          arc.rotation.z = side > 0 ? -0.1 : Math.PI - 0.8;
          arc.castShadow = false;
          ringMarks.push(arc);
        }
      }
      // Coiled cord from the receiver to the body, and a line cord trailing away.
      phone.updateMatrixWorld(true);
      const end = handset.localToWorld(new THREE.Vector3(...cordEnd));
      const port = phone.localToWorld(new THREE.Vector3(...bodyPort));
      const cordMaterial = stick ? s.material('#5a4630', { roughness: 0.9 }) : body;
      if (cut) {
        const stubEnd = end.clone().add(new THREE.Vector3(-0.09, 0.0, 0.03));
        stubEnd.y = y + 0.012;
        coil(end, stubEnd, 0.0, cordMaterial, 6);
        const frayed = port.clone().add(new THREE.Vector3(-0.08, -0.012, 0.06));
        coil(port, frayed, 0.0, cordMaterial, 5);
        for (const tip of [stubEnd, frayed]) for (let k = 0; k < 3; k++) s.rod(tip.toArray() as P3, [tip.x - 0.012 + random() * 0.01, tip.y + (random() - 0.3) * 0.02, tip.z + (random() - 0.5) * 0.03], 0.001, brass);
      } else {
        const cord = coil(end, port, state === 'dangling' ? 0.02 : 0.05, cordMaterial, state === 'hook' || state === 'ringing' ? 12 : 18);
        if (state === 'dangling' && swings.length) { /* the cord stays put; the receiver sways slightly beneath it */ void cord; }
      }
      const back = phone.localToWorld(new THREE.Vector3(0.03, 0.02, -0.1));
      s.tube([[back.x, back.y, back.z], [back.x + 0.02, y + 0.006, back.z - 0.06], [back.x + 0.08 + random() * 0.05, y + 0.006, -D / 2 - 0.02], [back.x + 0.1, Math.max(0.006, y - 0.2), -D / 2 - 0.06], [back.x + 0.16, 0.006, -D / 2 - 0.1 - random() * 0.05]], 0.004, dark);
    }

    // Message pad and pencil, in front of the phones.
    const padX = n === 1 ? 0.0 : (which - (n - 1) / 2) * pitchX + 0.14;
    const padOnTop = a.rests !== 'books';
    const padY = padOnTop ? top + 0.004 : 0;
    const padZ = padOnTop ? D / 2 - 0.055 : 0.3;
    const lines = NOTE_LINES[a.note];
    const padTexture = paint(256, 320, (g) => {
      g.fillStyle = '#f4e68c';
      g.fillRect(0, 0, 256, 320);
      g.strokeStyle = '#9ab0c8';
      g.lineWidth = 2;
      for (let ly = 60; ly < 320; ly += 30) { g.beginPath(); g.moveTo(0, ly); g.lineTo(256, ly); g.stroke(); }
      g.strokeStyle = '#d98a8a';
      g.beginPath(); g.moveTo(34, 0); g.lineTo(34, 320); g.stroke();
      g.fillStyle = '#8a6a1c';
      g.fillRect(0, 0, 256, 26);
      g.strokeStyle = '#1b2f6b';
      g.fillStyle = '#1b2f6b';
      g.lineWidth = 6;
      g.lineCap = 'round';
      if (a.note === 'doodle') {
        for (let k = 0; k < 4; k++) {
          const cx = 60 + random() * 140, cy = 80 + random() * 190;
          g.beginPath();
          for (let t = 0; t < 22; t += 0.3) g.lineTo(cx + Math.cos(t) * t * 2.2, cy + Math.sin(t) * t * 2.2);
          g.stroke();
          g.strokeRect(30 + random() * 160, 60 + random() * 200, 40, 40);
        }
      } else {
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.rotate(-0.06);
        const size = Math.min(84, 400 / Math.max(1, ...lines.map((line) => line.length)));
        g.font = `italic 900 ${size}px sans-serif`;
        lines.forEach((line, index) => g.fillText(line, 124, 170 + (index - (lines.length - 1) / 2) * size * 1.15, 236));
        if (lines.length) { g.beginPath(); g.moveTo(30, 180 + lines.length * size * 0.62); g.lineTo(226, 172 + lines.length * size * 0.62); g.stroke(); }
      }
    });
    const pad = new THREE.Group();
    pad.position.set(padX, padY, padZ);
    pad.rotation.y = (random() - 0.5) * 0.5;
    s.root.add(pad);
    pad.add(s.box([0.13, 0.014, 0.17], [0, 0.007, 0], s.material('#f4e68c')));
    const sheet = s.mesh(new THREE.PlaneGeometry(0.13, 0.17), new THREE.MeshStandardMaterial({ map: padTexture, roughness: 0.9 }), [0, 0.0145, 0]);
    sheet.rotation.x = -Math.PI / 2;
    pad.add(sheet);
    pad.add(s.rod([0.085, 0.006, -0.06], [0.11, 0.006, 0.08], 0.0045, s.material('#e2b23a')));

    // Something else by the phone.
    const ex = -W / 2 + 0.09, ez = padOnTop ? 0.08 : 0.3, ey = padOnTop ? top + 0.004 : 0;
    if (a.extras === 'rolodex') {
      s.box([0.14, 0.02, 0.1], [ex, ey + 0.01, ez], dark);
      for (const side of [-1, 1]) s.cylinder(0.05, 0.05, 0.008, [ex + side * 0.072, ey + 0.06, ez], dark, 18).rotation.z = Math.PI / 2;
      for (let k = 0; k < 16; k++) {
        const card = s.box([0.12, 0.05, 0.002], [ex, ey + 0.06, ez], paper);
        card.rotation.x = k / 16 * Math.PI * 2;
        card.translateY(0.03);
      }
      s.cylinder(0.022, 0.022, 0.012, [ex + 0.084, ey + 0.06, ez], chrome, 12).rotation.z = Math.PI / 2;
    } else if (a.extras === 'ashtray') {
      s.lathe([[0, 0.004], [0.05, 0.004], [0.062, 0.022], [0.055, 0.024], [0.045, 0.01], [0, 0.01]], s.material('#b98a3a', { roughness: 0.15, metalness: 0.2 }), [ex, ey, ez]);
      for (let k = 0; k < 4 + Math.round(mood.density * 8); k++) { const angle = random() * 6.28, r = random() * 0.03; s.rod([ex + Math.cos(angle) * r, ey + 0.016, ez + Math.sin(angle) * r], [ex + Math.cos(angle + 1) * (r + 0.02), ey + 0.024 + random() * 0.012, ez + Math.sin(angle + 1) * (r + 0.02)], 0.004, paper); }
    } else if (a.extras === 'flowers') {
      s.lathe([[0, 0], [0.03, 0], [0.04, 0.05], [0.015, 0.12], [0.02, 0.15], [0, 0.15]], s.material('#d7e5ee', { roughness: 0.15 }), [ex, ey, ez]);
      for (let k = 0; k < 5; k++) {
        const tip: P3 = [ex + (random() - 0.5) * 0.14, ey + 0.24 + random() * 0.1 - mood.wear * 0.08, ez + (random() - 0.5) * 0.14];
        s.rod([ex, ey + 0.14, ez], tip, 0.003, s.material('#4f7a3c'));
        s.ball([0.026, 0.02, 0.026], tip, s.material(['#e56a8d', '#f2c14e', '#f4f0e6', '#c8312b', '#9a6ad0'][k], { roughness: 0.6 }), 10);
      }
    } else if (a.extras === 'clock') {
      s.cylinder(0.055, 0.055, 0.04, [ex, ey + 0.068, ez], brass, 24).rotation.x = Math.PI / 2;
      s.cylinder(0.048, 0.048, 0.004, [ex, ey + 0.068, ez + 0.021], paper, 24).rotation.x = Math.PI / 2;
      s.box([0.004, 0.036, 0.002], [ex + 0.008, ey + 0.08, ez + 0.024], dark).rotation.z = -0.5;
      s.box([0.005, 0.024, 0.002], [ex - 0.008, ey + 0.074, ez + 0.024], dark).rotation.z = 0.9;
      for (const side of [-1, 1]) { s.ball([0.02, 0.014, 0.02], [ex + side * 0.035, ey + 0.126, ez], brass, 12); s.rod([ex + side * 0.03, ey, ez], [ex + side * 0.02, ey + 0.03, ez], 0.005, brass); }
      s.rod([ex - 0.035, ey + 0.14, ez], [ex + 0.035, ey + 0.14, ez], 0.003, dark);
    }

    const energy = mix(0.4, 1.2, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const handset of handsets) { handset.rotation.z = Math.sin(time * 38) * 0.07 * energy; handset.position.y += Math.sin(time * 38) * 0.0002; }
        for (const [index, mark] of ringMarks.entries()) mark.scale.setScalar(1 + ((time * 2.5 * energy + index * 0.13) % 1) * 0.25);
        for (const pivot of swings) pivot.rotation.z = Math.sin(time * 1.8) * 0.16 * energy;
        for (const [index, button] of blinkers.entries()) button.emissiveIntensity = Math.sin(time * (3 + index)) > 0 ? 1.8 : 0.1;
      },
    });
  },
});
