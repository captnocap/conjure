import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

function painted(size: [number, number], draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, glow = 0) {
  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = size;
  draw(canvas.getContext('2d')!, size[0], size[1]);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: glow ? 0.25 : 0.85, ...(glow ? { emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: glow } : {}) });
}

export default defineThing({
  questions: {
    container: choice('What are the belongings kept in?', {
      bag: 'A clear zip-top plastic property bag with a white write-on panel, everything visible through it.',
      evidence: 'A clear bag sealed with red evidence tape, this is a case, not a bereavement.',
      envelope: 'A manila paper envelope, its contents tipped out in front of it.',
      loose: 'Nothing: each item laid out on its own in a row to be listed.',
    }),
    tray: choice('What does it rest on?', {
      steel: 'A shallow stainless steel tray, a hospital or mortuary.',
      plastic: 'A grey plastic property tray, a police custody desk or an airport.',
      box: 'An open cardboard box, the things somebody will carry home.',
      felt: 'A square of dark green felt, laid out with care.',
    }),
    carried: choice('Whose pockets were these, judging by what they carried?', {
      commuter: 'An ordinary working adult: wristwatch, wallet, a bunch of keys, a transit card.',
      elder: 'An old person: reading glasses, a pocket watch on a chain, a folded handkerchief, a pill bottle.',
      young: 'Someone young: earbuds, a bracelet, a student card, lip balm and loose coins.',
      traveller: 'A traveller far from home: a passport, a boarding pass, foreign coins, a watch.',
      nobody: 'Almost nothing: a single key, two coins and a bus ticket.',
      shady: 'Someone with secrets: a roll of banknotes, a numbered locker key, a matchbook, dark glasses.',
    }),
    phone: choice('Is there a phone, and what is it doing?', {
      ringing: 'Yes, and it is lighting up with an incoming call from Mum.',
      messages: 'Yes, its lock screen stacked with unanswered messages and missed calls.',
      dark: 'Yes, but the screen is dark and dead.',
      cracked: 'Yes, with the glass shattered in a web of cracks.',
      none: 'No phone.',
    }),
    ring: noul('Is there a wedding ring among the things?'),
    photo: noul('Is there a creased photograph of people among the things?'),
    tag: choice('What is written on the label?', {
      name: 'A full name and a date, properly filled in.',
      unknown: 'UNKNOWN MALE and a number.',
      number: 'Only a case number and a barcode.',
      family: 'RETURN TO FAMILY, underlined.',
      blank: 'Nothing has been written yet.',
    }),
    order: score('How are the things arranged?', ['Squared up in careful rows', 'Set down tidily', 'Tipped out in a loose heap', 'Scattered and overlapping']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const TW = 0.46, TD = 0.34;
    const steel = s.material('#c9d0d1', { metalness: 0.55, roughness: 0.28 });
    const gold = s.material('#d9b04a', { metalness: 0.8, roughness: 0.25 });
    const dark = s.material('#1c1f21', { roughness: 0.5 });
    const leather = s.material(mood.cheer > 0.5 ? '#7a4a2a' : '#3b2a20', { roughness: 0.7 });

    // The surface.
    let y0 = 0.006;
    if (a.tray === 'steel' || a.tray === 'plastic') {
      const paint = a.tray === 'steel' ? steel : s.material('#8a9296', { roughness: 0.6 });
      const lip = a.tray === 'steel' ? 0.022 : 0.04;
      s.box([TW, 0.006, TD], [0, 0.003, 0], paint);
      for (const z of [-1, 1]) s.box([TW + 0.016, lip, 0.008], [0, lip / 2, z * (TD / 2 + 0.004)], paint);
      for (const x of [-1, 1]) s.box([0.008, lip, TD], [x * (TW / 2 + 0.004), lip / 2, 0], paint);
    } else if (a.tray === 'box') {
      const card = s.material('#b89a6a', { roughness: 0.95 });
      s.box([TW, 0.006, TD], [0, 0.003, 0], card);
      for (const z of [-1, 1]) s.box([TW + 0.012, 0.05, 0.006], [0, 0.025, z * (TD / 2 + 0.003)], card);
      for (const x of [-1, 1]) s.box([0.006, 0.05, TD], [x * (TW / 2 + 0.003), 0.025, 0], card);
      for (const x of [-1, 1]) s.box([0.09, 0.004, TD], [x * (TW / 2 + 0.042), 0.03, 0], card).rotation.z = x * 0.45;
    } else {
      s.box([TW + 0.04, 0.004, TD + 0.04], [0, 0.002, 0], s.material('#2f5a44', { roughness: 1 })).rotation.y = (random() - 0.5) * 0.1;
      y0 = 0.004;
    }

    // Lay the items out on a loose grid; "order" loosens it.
    const mess = a.order;
    const cells: [number, number][] = [];
    const wide = a.container === 'envelope';
    for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) cells.push([(col - 1) * 0.135, (row - 0.5) * (wide ? 0.1 : 0.13) + (wide ? 0.06 : 0.01)]);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    let used = 0;
    const place = (build: (g: Sculpture) => void, lift = 0) => {
      const [cx, cz] = cells[used % cells.length];
      const stack = Math.floor(used / cells.length);
      used++;
      const part = new Sculpture(context);
      build(part);
      part.root.position.set(cx * (1 - mess * 0.35) + (random() - 0.5) * mess * 0.07, y0 + lift + stack * 0.012, cz * (1 - mess * 0.3) + (random() - 0.5) * mess * 0.05);
      part.root.rotation.y = (random() - 0.5) * (0.15 + mess * 2.6);
      s.root.add(part.root);
    };
    const coin = (g: Sculpture, x: number, z: number, y = 0, tone = 0) => g.cylinder(0.012, 0.012, 0.002, [x, 0.001 + y, z], [gold, steel, s.material('#b06a3a', { metalness: 0.7, roughness: 0.35 })][tone % 3], 14);
    const watch = (g: Sculpture) => {
      g.box([0.022, 0.003, 0.2], [0, 0.0015, 0], leather);
      g.cylinder(0.021, 0.021, 0.009, [0, 0.0055, 0], steel, 20);
      g.cylinder(0.017, 0.017, 0.002, [0, 0.0105, 0], s.material('#f3f1e6'), 20);
      g.box([0.002, 0.001, 0.012], [0, 0.012, -0.005], dark);
      g.box([0.009, 0.001, 0.002], [0.004, 0.012, 0], dark);
      g.box([0.004, 0.004, 0.006], [0.023, 0.005, 0], steel);
    };
    const keys = (g: Sculpture, n: number, fob: boolean) => {
      g.ring(0.016, 0.0018, [0, 0.002, 0], steel).rotation.x = Math.PI / 2;
      for (let i = 0; i < n; i++) {
        const angle = -0.6 + i * 0.6 + random() * 0.2, metal = i % 2 ? gold : steel;
        const key = new Sculpture(context);
        key.cylinder(0.011, 0.011, 0.0025, [0, 0.002, 0.024], metal, 12);
        key.box([0.006, 0.0025, 0.045], [0, 0.002, 0.055], metal);
        key.box([0.004, 0.0025, 0.006], [0.005, 0.002, 0.066], metal);
        key.root.rotation.y = angle;
        g.root.add(key.root);
      }
      if (fob) g.box([0.026, 0.006, 0.04], [-0.03, 0.003, -0.025], s.material(a.carried === 'shady' ? '#c9382c' : '#2a5a8a', { roughness: 0.5 })).rotation.y = 0.5;
    };
    const card = (g: Sculpture, colour: string, stripe: string) => {
      g.box([0.086, 0.0015, 0.054], [0, 0.001, 0], s.material(colour, { roughness: 0.4 }));
      g.box([0.086, 0.0017, 0.012], [0, 0.001, -0.012], s.material(stripe, { roughness: 0.4 }));
      g.box([0.02, 0.0018, 0.024], [-0.026, 0.001, 0.01], s.material('#e8dcc4'));
    };

    const list: (() => void)[] = [];
    if (a.carried === 'commuter') {
      list.push(() => place(watch));
      list.push(() => place((g) => {
        g.box([0.11, 0.016, 0.09], [0, 0.008, 0], leather);
        g.box([0.1, 0.002, 0.004], [0, 0.017, 0.035], s.material('#c9b58c'));
        g.box([0.06, 0.003, 0.05], [0.035, 0.017, -0.01], s.material('#d9d2bc')).rotation.y = 0.3;
      }));
      list.push(() => place((g) => keys(g, 3, true)));
      list.push(() => place((g) => card(g, '#e9e9e2', '#2a8a6a')));
    } else if (a.carried === 'elder') {
      list.push(() => place((g) => {
        for (const x of [-0.028, 0.028]) g.ring(0.022, 0.0025, [x, 0.003, 0], dark).rotation.x = Math.PI / 2;
        g.box([0.014, 0.003, 0.003], [0, 0.003, -0.004], dark);
        for (const x of [-1, 1]) g.rod([x * 0.05, 0.003, 0], [x * 0.062, 0.003, -0.11], 0.0018, dark);
      }));
      list.push(() => place((g) => {
        g.cylinder(0.026, 0.026, 0.009, [0, 0.0045, 0], gold, 22);
        g.cylinder(0.021, 0.021, 0.002, [0, 0.01, 0], s.material('#f6f1dc'), 22);
        g.box([0.002, 0.001, 0.016], [0, 0.0115, -0.006], dark);
        g.ring(0.007, 0.002, [0, 0.004, -0.033], gold).rotation.x = Math.PI / 2;
        g.tube([[0, 0.003, -0.04], [0.03, 0.003, -0.07], [0.07, 0.003, -0.05], [0.09, 0.003, -0.085], [0.06, 0.003, -0.11]], 0.0022, gold);
      }));
      list.push(() => place((g) => {
        g.box([0.1, 0.008, 0.1], [0, 0.004, 0], s.material('#f1f1ea', { roughness: 1 }));
        g.box([0.1, 0.0085, 0.006], [0, 0.004, 0.03], s.material('#8fa9c9'));
        g.box([0.006, 0.0085, 0.1], [0.03, 0.004, 0], s.material('#8fa9c9'));
      }));
      list.push(() => place((g) => {
        g.cylinder(0.016, 0.016, 0.06, [0, 0.016, 0], new THREE.MeshStandardMaterial({ color: '#d98a2a', transparent: true, opacity: 0.8, roughness: 0.2 }), 14).rotation.x = Math.PI / 2;
        g.cylinder(0.018, 0.018, 0.016, [0, 0.016, 0.036], s.material('#f1f1ea'), 14).rotation.x = Math.PI / 2;
        g.box([0.03, 0.001, 0.035], [0, 0.0325, -0.004], s.material('#f1f1ea'));
      }));
    } else if (a.carried === 'young') {
      list.push(() => place((g) => {
        const white = s.material('#f3f3ee', { roughness: 0.3 });
        g.box([0.05, 0.022, 0.045], [0, 0.011, 0], white);
        for (const x of [0.045, 0.062]) {
          g.ball([0.008, 0.008, 0.008], [x, 0.008, 0.01 - (x - 0.045)], white, 8);
          g.rod([x, 0.006, 0.012], [x + 0.004, 0.004, 0.036], 0.003, white);
        }
      }));
      list.push(() => place((g) => {
        const beads = ['#d9482c', '#e8b83a', '#3a8ac9', '#4aa86a', '#f1f1ea'];
        for (let i = 0; i < 16; i++) g.ball([0.006, 0.006, 0.006], [Math.cos(i * 0.393) * 0.032, 0.006, Math.sin(i * 0.393) * 0.028], s.material(beads[i % 5]), 8);
      }));
      list.push(() => place((g) => card(g, '#f1f1ea', '#6a3a9a')));
      list.push(() => place((g) => {
        g.cylinder(0.009, 0.009, 0.065, [0, 0.009, 0], s.material('#e86a8a', { roughness: 0.4 }), 12).rotation.x = Math.PI / 2;
        for (let i = 0; i < 4; i++) coin(g, 0.03 + random() * 0.04, (random() - 0.5) * 0.07, 0, i);
      }));
    } else if (a.carried === 'traveller') {
      list.push(() => place((g) => {
        g.box([0.088, 0.008, 0.125], [0, 0.004, 0], s.material('#1f2f5a', { roughness: 0.6 }));
        g.ring(0.016, 0.002, [0, 0.0085, -0.005], gold).rotation.x = Math.PI / 2;
        g.box([0.05, 0.001, 0.008], [0, 0.0085, -0.04], gold);
        g.box([0.05, 0.001, 0.006], [0, 0.0085, 0.035], gold);
      }));
      list.push(() => place((g) => {
        g.box([0.19, 0.0012, 0.08], [0, 0.001, 0], s.material('#f1f1ea'));
        g.box([0.19, 0.0014, 0.016], [0, 0.001, -0.032], s.material('#c9382c'));
        g.box([0.03, 0.0014, 0.05], [0.07, 0.001, 0.008], dark);
      }));
      list.push(() => place(watch));
      list.push(() => place((g) => { for (let i = 0; i < 6; i++) coin(g, (random() - 0.5) * 0.07, (random() - 0.5) * 0.07, i * 0.0005, i); }));
    } else if (a.carried === 'nobody') {
      list.push(() => place((g) => keys(g, 1, false)));
      list.push(() => place((g) => { coin(g, -0.012, 0, 0, 1); coin(g, 0.016, 0.012, 0, 2); }));
      list.push(() => place((g) => {
        g.box([0.07, 0.001, 0.035], [0, 0.001, 0], s.material('#f1e6c4'));
        g.box([0.02, 0.0012, 0.035], [-0.02, 0.001, 0], s.material('#d98a2a'));
      }));
    } else {
      list.push(() => place((g) => {
        g.cylinder(0.022, 0.022, 0.07, [0, 0.022, 0], s.material('#7a9a6a', { roughness: 0.8 }), 16).rotation.x = Math.PI / 2;
        g.cylinder(0.0225, 0.0225, 0.008, [0, 0.022, 0], s.material('#c9382c'), 16).rotation.x = Math.PI / 2;
      }));
      list.push(() => place((g) => {
        keys(g, 1, false);
        g.box([0.03, 0.002, 0.045], [-0.03, 0.001, -0.03], s.material('#e8a23a')).rotation.y = 0.5;
      }));
      list.push(() => place((g) => {
        g.box([0.04, 0.005, 0.05], [0, 0.0025, 0], s.material('#b3261e'));
        g.box([0.04, 0.0055, 0.008], [0, 0.0025, 0.018], s.material('#2a1a14'));
      }));
      list.push(() => place((g) => {
        for (const x of [-0.03, 0.03]) g.box([0.05, 0.003, 0.038], [x, 0.004, 0], dark);
        g.box([0.014, 0.003, 0.004], [0, 0.004, -0.012], dark);
        for (const x of [-1, 1]) g.rod([x * 0.055, 0.004, 0], [x * 0.062, 0.004, -0.12], 0.002, dark);
      }));
    }
    if (a.phone !== 'none')
      list.push(() => place((g) => {
        g.box([0.074, 0.009, 0.152], [0, 0.0045, 0], dark);
        const lit = a.phone === 'ringing' || a.phone === 'messages';
        const screen = g.mesh(new THREE.PlaneGeometry(0.068, 0.146), painted([192, 416], (c, w, h) => {
          if (!lit) {
            c.fillStyle = '#0c0f12';
            c.fillRect(0, 0, w, h);
          } else {
            const sky = c.createLinearGradient(0, 0, 0, h);
            sky.addColorStop(0, a.phone === 'ringing' ? '#2a6a4a' : '#27456e');
            sky.addColorStop(1, a.phone === 'ringing' ? '#0f2a2a' : '#6a3a5a');
            c.fillStyle = sky;
            c.fillRect(0, 0, w, h);
            c.fillStyle = '#ffffff';
            c.textAlign = 'center';
            if (a.phone === 'ringing') {
              c.font = 'bold 54px sans-serif';
              c.fillText('Mum', w / 2, 120);
              c.font = '24px sans-serif';
              c.fillText('calling…', w / 2, 160);
              c.fillStyle = '#e8483a';
              c.beginPath(); c.arc(52, 340, 30, 0, 7); c.fill();
              c.fillStyle = '#3ad86a';
              c.beginPath(); c.arc(140, 340, 30, 0, 7); c.fill();
            } else {
              c.font = 'bold 60px sans-serif';
              c.fillText('03:14', w / 2, 84);
              const lines = ['Mum · 7 missed calls', 'where are you?', 'please call me', 'Dad · missed call', 'are you ok??'];
              lines.forEach((line, index) => {
                c.fillStyle = 'rgba(255,255,255,0.85)';
                c.fillRect(10, 116 + index * 58, w - 20, 48);
                c.fillStyle = '#1c2a3a';
                c.font = 'bold 16px sans-serif';
                c.textAlign = 'left';
                c.fillText(line, 20, 146 + index * 58, w - 40);
              });
            }
          }
          if (a.phone === 'cracked') {
            c.strokeStyle = '#dfe6ea';
            const ox = 40 + random() * 110, oy = 80 + random() * 240;
            for (let i = 0; i < 13; i++) {
              c.lineWidth = 1 + random() * 2;
              c.beginPath();
              c.moveTo(ox, oy);
              const angle = i * 0.5 + random() * 0.3;
              c.lineTo(ox + Math.cos(angle) * 140 + random() * 30, oy + Math.sin(angle) * 260 + random() * 30);
              c.lineTo(ox + Math.cos(angle + 0.3) * 300, oy + Math.sin(angle + 0.3) * 420);
              c.stroke();
            }
          }
        }, lit ? mix(0.9, 1.4, 1 - mood.daylight * 0.5) : 0), [0, 0.0095, 0]);
        screen.rotation.x = -Math.PI / 2;
        screen.castShadow = false;
      }));
    if (a.ring)
      list.push(() => place((g) => {
        g.ring(0.0105, 0.0026, [0, 0.0026, 0], gold).rotation.x = Math.PI / 2;
      }));
    if (a.photo)
      list.push(() => place((g) => {
        const photo = g.mesh(new THREE.PlaneGeometry(0.1, 0.075), painted([200, 150], (c, w, h) => {
          c.fillStyle = '#f1ead6';
          c.fillRect(0, 0, w, h);
          c.fillStyle = mood.warmth > 0.5 ? '#d9b27a' : '#9ab3c2';
          c.fillRect(10, 10, w - 20, h - 20);
          c.fillStyle = '#6a8a5a';
          c.fillRect(10, 98, w - 20, 42);
          c.fillStyle = '#3a2f2a';
          for (const [x, r, tall] of [[70, 13, 50], [104, 11, 42], [134, 8, 28]] as const) {
            c.beginPath(); c.arc(x, 110 - tall, r, 0, 7); c.fill();
            c.fillRect(x - r, 110 - tall + r - 2, r * 2, tall);
          }
          c.strokeStyle = 'rgba(255,255,255,0.7)';
          c.lineWidth = 2;
          c.beginPath(); c.moveTo(96, 0); c.lineTo(100, h); c.moveTo(0, 70); c.lineTo(w, 74); c.stroke();
        }), [0, 0.0015, 0]);
        photo.rotation.x = -Math.PI / 2;
        (photo.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      }));
    // Biggest things first so small ones are not buried.
    for (const item of list) item();

    // The label.
    const lines = {
      name: ['PROPERTY OF', 'R. HALE', '14 / 11'],
      unknown: ['UNKNOWN MALE', `No. ${100 + Math.floor(random() * 899)}`],
      number: [`CASE ${10 + Math.floor(random() * 89)}-${1000 + Math.floor(random() * 8999)}`, '|||| || ||| | ||'],
      family: ['RETURN', 'TO FAMILY', '_________'],
      blank: ['NAME ________', 'DATE ________'],
    }[a.tag];
    const label = (w: number, h: number, paper: string) => painted([256, Math.round(256 * h / w)], (c, cw, ch) => {
      c.fillStyle = paper;
      c.fillRect(0, 0, cw, ch);
      c.strokeStyle = c.fillStyle = a.tag === 'blank' ? '#6a7a8a' : '#1d2a4a';
      c.lineWidth = 4;
      c.strokeRect(6, 6, cw - 12, ch - 12);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      lines.forEach((line, index) => {
        c.font = `${a.tag === 'name' && index === 1 ? 'italic 44px serif' : 'bold 30px monospace'}`;
        c.fillText(line, cw / 2, (ch * (index + 1)) / (lines.length + 1), cw - 28);
      });
    });

    if (a.container === 'bag' || a.container === 'evidence') {
      const film = new THREE.MeshStandardMaterial({ color: '#eaf4f6', transparent: true, opacity: 0.32, depthWrite: false, roughness: 0.05 });
      const bw = TW - 0.05, bd = TD - 0.05;
      const bag = s.ball([bw / 2, 0.028, bd / 2], [0, y0 + 0.012, 0.01], film, 20);
      bag.castShadow = false;
      const edge = new THREE.MeshStandardMaterial({ color: '#f4fbfc', transparent: true, opacity: 0.55, roughness: 0.1 });
      s.box([bw, 0.003, 0.006], [0, y0 + 0.004, bd / 2 + 0.008], edge);
      for (const x of [-1, 1]) s.box([0.005, 0.003, bd], [x * bw / 2, y0 + 0.004, 0.01], edge);
      // Zip strip and write-on panel along the back.
      s.box([bw, 0.006, 0.012], [0, y0 + 0.006, -bd / 2 + 0.006], s.material(a.container === 'evidence' ? '#c9282c' : '#3a7ac9', { roughness: 0.4 }));
      const panel = s.mesh(new THREE.PlaneGeometry(0.2, 0.075), label(0.2, 0.075, '#fbfbf6'), [-bw / 2 + 0.115, y0 + 0.042, -bd / 2 + 0.07]);
      panel.rotation.x = -Math.PI / 2 + 0.25;
      if (a.container === 'evidence') {
        const tape = s.box([bw * 0.95, 0.002, 0.03], [0, y0 + 0.043, 0.05], painted([256, 32], (c, w, h) => {
          c.fillStyle = '#c9282c';
          c.fillRect(0, 0, w, h);
          c.fillStyle = '#ffffff';
          c.font = 'bold 20px monospace';
          c.textBaseline = 'middle';
          c.fillText('EVIDENCE  EVIDENCE  EVIDENCE', 4, h / 2);
        }));
        tape.rotation.y = 0.35;
      }
    } else if (a.container === 'envelope') {
      const manila = s.material('#d6b676', { roughness: 0.95 });
      const env = new Sculpture(context);
      env.box([0.26, 0.18, 0.006], [0, 0.09, 0], manila);
      env.box([0.26, 0.07, 0.003], [0, 0.2, -0.015], manila).rotation.x = -0.5;
      env.mesh(new THREE.PlaneGeometry(0.17, 0.085), label(0.17, 0.085, '#f6f1e0'), [-0.02, 0.09, 0.0035]);
      env.cylinder(0.008, 0.008, 0.002, [0, 0.165, 0.004], s.material('#b3261e'), 10).rotation.x = Math.PI / 2;
      env.root.position.set(-0.02, y0, -TD / 2 + 0.035);
      env.root.rotation.set(-0.5, (random() - 0.5) * 0.3, 0);
      s.root.add(env.root);
    } else {
      const tag = s.mesh(new THREE.PlaneGeometry(0.13, 0.06), label(0.13, 0.06, '#e8dcb8'), [TW / 2 - 0.08, y0 + 0.002, TD / 2 - 0.035]);
      tag.rotation.set(-Math.PI / 2, 0, (random() - 0.5) * 0.3);
      for (let i = 0; i < Math.min(used, 6); i++) {
        const [cx, cz] = cells[i];
        const dot = s.mesh(new THREE.PlaneGeometry(0.022, 0.022), painted([32, 32], (c) => {
          c.fillStyle = '#e8c83a';
          c.fillRect(0, 0, 32, 32);
          c.fillStyle = '#1c1f21';
          c.font = 'bold 26px monospace';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText(`${i + 1}`, 16, 17);
        }), [cx - 0.05, y0 + 0.002, cz + 0.05]);
        dot.rotation.x = -Math.PI / 2;
      }
    }
    return s.finish();
  },
});
