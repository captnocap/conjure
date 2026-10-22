import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const RAINBOW = ['#d8483f', '#e8892c', '#ecc531', '#58a85a', '#3f8fc8', '#5a5fb8', '#9a56b0'];
const PILLS = ['#f4f1ea', '#f4f1ea', '#e8a0a8', '#f0d060', '#9fc4e0', '#c8532f', '#f4f1ea'];

export default defineThing({
  questions: {
    taken: score('How far through the week is it: how many days have been taken?', ['None: freshly filled on Sunday, every lid shut', 'Two or three days gone', 'Past the middle of the week', 'Every compartment open and empty']),
    bottles: choice('How many pill bottles stand around it?', {
      none: 'None: only the organizer itself.',
      one: 'A single amber bottle.',
      few: 'Three or four bottles of different sizes.',
      many: "A whole pharmacy's worth crowding the table, one on its side.",
    }),
    box: choice('What kind of organizer is it?', {
      rainbow: 'A single row with a different bright colour for each day.',
      blue: 'A single row in translucent pharmacy blue with white letters.',
      ampm: 'Two rows, a yellow morning row and a blue evening row.',
      white: 'Chunky white plastic with big black letters for weak eyes.',
    }),
    water: choice('What is there to swallow them with?', {
      full: 'A full glass of water, untouched.',
      half: 'A half-drunk glass of water.',
      empty: 'An empty glass with a last drop in it.',
      tea: 'A cup of tea gone cold instead of water.',
    }),
    glasses: choice('How have the reading glasses been left?', {
      folded: 'Folded neatly, arms crossed.',
      open: 'Open, as if just taken off and put down.',
      chain: 'Open, with a beaded neck chain trailing from the arms.',
      none: 'They are not here: lost again.',
    }),
    story: choice('What else has happened on the table?', {
      nothing: 'Nothing: everything is in order.',
      spilled: 'Pills have been dropped and scattered across the table by unsteady hands.',
      note: "A handwritten schedule in someone else's capitals: what to take and when.",
      bag: 'A stapled white pharmacy bag and a blister strip, a new prescription.',
      clock: 'A small wind-up alarm clock set for the next dose.',
    }),
    under: choice('What does it all sit on?', {
      bare: 'The bare table.',
      tray: 'A small melamine tray that keeps it all together.',
      doily: 'A crocheted mat.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const group = (parent: THREE.Object3D = s.root) => { const g = new THREE.Group(); parent.add(g); return g; };
    const part = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const lathe = (parent: THREE.Object3D, profile: readonly (readonly [number, number])[], material: THREE.Material, x = 0, y = 0, z = 0, segments = 28) =>
      part(parent, new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), segments), material, x, y, z);
    const paint = (width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      draw(canvas.getContext('2d')!);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      return texture;
    };
    const aged = (colour: string) => '#' + new THREE.Color(colour).lerp(new THREE.Color('#c9b98a'), mood.wear * 0.4).getHexString();

    // ---- what it sits on ----------------------------------------------------------------
    let base = 0;
    if (a.under === 'tray') {
      const melamine = s.material(mood.cheer > 0.5 ? '#e8c9a0' : '#9aa7a0', { roughness: 0.4 });
      part(s.root, new THREE.BoxGeometry(0.44, 0.006, 0.3), melamine, 0, 0.003, 0);
      for (const z of [-1, 1]) part(s.root, new THREE.BoxGeometry(0.45, 0.016, 0.008), melamine, 0, 0.008, z * 0.15);
      for (const x of [-1, 1]) part(s.root, new THREE.BoxGeometry(0.008, 0.016, 0.3), melamine, x * 0.221, 0.008, 0);
      base = 0.006;
    } else if (a.under === 'doily') {
      const lace = paint(512, 512, (ctx) => {
        ctx.translate(256, 256); ctx.fillStyle = ctx.strokeStyle = '#efe6cc';
        ctx.beginPath(); ctx.arc(0, 0, 190, 0, 7); ctx.fill();
        for (let i = 0; i < 20; i++) { ctx.save(); ctx.rotate(i * 0.314); ctx.beginPath(); ctx.arc(214, 0, 30, 0, 7); ctx.fill(); ctx.restore(); }
        ctx.globalCompositeOperation = 'destination-out';
        for (let ring = 0; ring < 4; ring++) for (let i = 0; i < 12 + ring * 6; i++) { ctx.save(); ctx.rotate((i / (12 + ring * 6)) * 6.283 + ring * 0.2); ctx.beginPath(); ctx.ellipse(50 + ring * 44, 0, 14, 7 + ring, 0, 0, 7); ctx.fill(); ctx.restore(); }
        for (let i = 0; i < 20; i++) { ctx.save(); ctx.rotate(i * 0.314); ctx.beginPath(); ctx.arc(214, 0, 13, 0, 7); ctx.fill(); ctx.restore(); }
      });
      const mat = part(s.root, new THREE.CircleGeometry(0.2, 40), new THREE.MeshStandardMaterial({ map: lace, alphaTest: 0.5, roughness: 0.95, side: THREE.DoubleSide }), 0, 0.0012, 0.01);
      mat.rotation.x = -Math.PI / 2; mat.scale.set(1.15, 0.8, 1); mat.castShadow = false;
      base = 0.002;
    }

    // ---- pills --------------------------------------------------------------------------
    const tablet = new THREE.CylinderGeometry(0.0042, 0.0042, 0.0022, 12);
    const capsuleGeometry = new THREE.CapsuleGeometry(0.0028, 0.007, 4, 8);
    const pill = (parent: THREE.Object3D, x: number, y: number, z: number, kind = Math.floor(random() * PILLS.length)) => {
      const colour = new THREE.MeshStandardMaterial({ color: PILLS[kind], roughness: 0.4 });
      if (kind >= 5) {
        const capsule = part(parent, capsuleGeometry, colour, x, y + 0.0028, z);
        capsule.rotation.set(Math.PI / 2, 0, random() * 3);
        const half = part(parent, new THREE.CapsuleGeometry(0.0029, 0.0034, 4, 8), new THREE.MeshStandardMaterial({ color: kind === 5 ? '#f4f1ea' : '#3f8fc8', roughness: 0.4 }), x, y + 0.0028, z);
        half.rotation.copy(capsule.rotation); half.translateY(0.0028);
        return capsule;
      }
      const round = part(parent, tablet, colour, x, y + 0.0012, z);
      round.rotation.set((random() - 0.5) * 0.5, random() * 3, (random() - 0.5) * 0.5);
      if (kind === 3) round.scale.set(1.5, 1, 0.9);
      return round;
    };

    // ---- the organizer ------------------------------------------------------------------
    const rows = a.box === 'ampm' ? 2 : 1;
    const big = a.box === 'white' ? 1.22 : 1;
    const CW = 0.031 * big, CD = 0.038 * big, CH = 0.024 * big;
    const organizer = group();
    organizer.position.set(0, base, 0.045);
    organizer.rotation.y = mix(-0.14, 0.14, random());
    const daysTaken = Math.round(a.taken * 7);
    const bodyColour = (day: number, row: number) => a.box === 'rainbow' ? RAINBOW[day] : a.box === 'blue' ? '#3f7fd0' : a.box === 'white' ? '#f0eee6' : row === 0 ? '#eec43a' : '#3f6fc0';
    for (let row = 0; row < rows; row++) {
      // the morning row sits in front; by evening the morning lid of the next day is still shut
      const z = rows === 2 ? (row === 0 ? CD / 2 + 0.001 : -CD / 2 - 0.001) : 0;
      for (let day = 0; day < 7; day++) {
        const x = (day - 3) * CW;
        const colour = aged(bodyColour(day, row));
        const plastic = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.35 + mood.wear * 0.3 });
        // a four-sided lathe is a square cup
        const r = CW / Math.SQRT2;
        const cup = lathe(organizer, [[0, 0.0015], [r - 0.0018, 0.0015], [r - 0.0018, CH], [r, CH], [r, 0], [0, 0]], plastic, x, 0, z, 4);
        cup.rotation.y = Math.PI / 4; cup.scale.z = 1; cup.scale.set(1, 1, 1);
        cup.geometry.rotateY(Math.PI / 4); cup.rotation.y = 0; cup.scale.z = CD / CW;
        const done = day < daysTaken - (rows === 2 && row === 1 && random() < 0.6 ? 1 : 0);
        const today = day === daysTaken;
        const open = done || (today && a.taken < 0.98 && a.taken > 0.02 && random() < 0.6);
        if (!done) {
          const count = 3 + Math.floor(random() * 3);
          for (let i = 0; i < count; i++) pill(organizer, x + (random() - 0.5) * CW * 0.5, 0.002 + i * 0.0016, z + (random() - 0.5) * CD * 0.5, (i * 2 + day) % PILLS.length);
        }
        const letter = paint(64, 80, (ctx) => {
          ctx.fillStyle = colour; ctx.fillRect(0, 0, 64, 80);
          ctx.fillStyle = a.box === 'white' ? '#141416' : a.box === 'rainbow' && day === 2 ? '#3a3020' : '#ffffff';
          ctx.globalAlpha = 1 - mood.wear * 0.55 * random();
          ctx.font = `bold ${rows === 2 ? 38 : 46}px Arial, Helvetica, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(DAYS[day], 32, rows === 2 ? 30 : 38);
          if (rows === 2) { ctx.font = 'bold 17px Arial, Helvetica, sans-serif'; ctx.fillText(row === 0 ? 'AM' : 'PM', 32, 62); }
          else for (let dot = 0; dot < 3; dot++) { ctx.beginPath(); ctx.arc(22 + dot * 10, 68, 2.4, 0, 7); ctx.fill(); }
        });
        const hinge = group(organizer);
        hinge.position.set(x, CH, z - CD / 2);
        const top = new THREE.MeshStandardMaterial({ map: letter, roughness: 0.4 });
        const lid = part(hinge, new THREE.BoxGeometry(CW - 0.0012, 0.0026, CD), [plastic, plastic, top, plastic, plastic, plastic], 0, 0.0013, CD / 2);
        lid.castShadow = true;
        part(hinge, new THREE.BoxGeometry(CW * 0.45, 0.0026, 0.004), plastic, 0, 0.0013, CD + 0.002);
        hinge.rotation.x = open ? -mix(1.7, 2.3, random()) : today && random() < 0.3 ? -0.25 : 0;
        // on the back row an open lid cannot swing through the front row, so it stands upright
        if (open && rows === 2 && row === 0) hinge.rotation.x = -mix(1.35, 1.55, random());
      }
    }

    // ---- water --------------------------------------------------------------------------
    const drinkX = -0.13, drinkZ = -0.07;
    if (a.water === 'tea') {
      const china = s.material('#f1ede2', { roughness: 0.35 });
      lathe(s.root, [[0, 0], [0.062, 0.004], [0.072, 0.013], [0.069, 0.014], [0.04, 0.007], [0, 0.007]], china, drinkX, base, drinkZ);
      lathe(s.root, [[0, 0.008], [0.022, 0.008], [0.027, 0.016], [0.041, 0.062], [0.038, 0.062], [0.024, 0.02], [0, 0.016]], china, drinkX, base, drinkZ);
      part(s.root, new THREE.TorusGeometry(0.016, 0.0045, 6, 14), china, drinkX - 0.048, base + 0.038, drinkZ);
      part(s.root, new THREE.CircleGeometry(0.036, 20), new THREE.MeshStandardMaterial({ color: '#7a4a22', roughness: 0.2 }), drinkX, base + 0.05, drinkZ).rotation.x = -Math.PI / 2;
      part(s.root, new THREE.RingGeometry(0.03, 0.036, 20), new THREE.MeshStandardMaterial({ color: '#b08a5a', roughness: 0.4 }), drinkX, base + 0.0504, drinkZ).rotation.x = -Math.PI / 2;
    } else {
      const glass = new THREE.MeshStandardMaterial({ color: '#dff0f4', transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
      const gh = 0.115;
      lathe(s.root, [[0.029, 0.004], [0.036, gh]], glass, drinkX, base, drinkZ).castShadow = false;
      // a solid foot and rim so the glass still draws as an object
      part(s.root, new THREE.CylinderGeometry(0.03, 0.029, 0.007, 24), new THREE.MeshStandardMaterial({ color: '#c3dbe2', roughness: 0.1 }), drinkX, base + 0.0035, drinkZ);
      part(s.root, new THREE.TorusGeometry(0.036, 0.0013, 6, 32), new THREE.MeshStandardMaterial({ color: '#e9f4f6', roughness: 0.1 }), drinkX, base + gh, drinkZ).rotation.x = Math.PI / 2;
      const level = { full: 0.86, half: 0.45, empty: 0.04 }[a.water as 'full' | 'half' | 'empty'];
      const wh = gh * level;
      const water = part(s.root, new THREE.CylinderGeometry(0.0285 + 0.007 * level, 0.0285, wh, 24), new THREE.MeshStandardMaterial({ color: '#8fc4d8', transparent: true, opacity: 0.55, roughness: 0.05 }), drinkX, base + 0.007 + wh / 2, drinkZ);
      water.castShadow = false;
    }

    // ---- bottles ------------------------------------------------------------------------
    const label = paint(256, 128, (ctx) => {
      ctx.fillStyle = '#f6f4ec'; ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = '#2a4f9a'; ctx.fillRect(0, 0, 256, 22);
      ctx.fillStyle = '#2a2a2e';
      for (let i = 0; i < 5; i++) ctx.fillRect(14, 36 + i * 17, 110 + random() * 110, i === 1 ? 9 : 5);
      ctx.fillStyle = '#d8483f'; ctx.fillRect(170, 96, 70, 20);
    });
    const labelMaterial = new THREE.MeshStandardMaterial({ map: label, roughness: 0.8 });
    const bottle = (x: number, z: number, radius: number, height: number, lying = false, tub = false) => {
      const g = group(); g.position.set(x, base, z);
      const body = new THREE.MeshStandardMaterial({ color: tub ? '#f1eee4' : '#c26a14', roughness: 0.25, emissive: tub ? '#000000' : '#5a2a04', emissiveIntensity: 0.35 });
      part(g, new THREE.CylinderGeometry(radius, radius, height, 24), body, 0, height / 2, 0);
      part(g, new THREE.CylinderGeometry(radius * 0.8, radius, height * 0.08, 24), body, 0, height * 1.04, 0);
      const wrap = part(g, new THREE.CylinderGeometry(radius + 0.0006, radius + 0.0006, height * 0.62, 24, 1, true, random() * 6, 4.6), labelMaterial, 0, height * 0.46, 0);
      wrap.castShadow = false;
      const capColour = new THREE.MeshStandardMaterial({ color: tub ? '#3f7fd0' : '#f4f2ea', roughness: 0.5 });
      if (lying) {
        g.rotation.set(0, random() * 3, Math.PI / 2); g.position.y = base + radius;
        // its cap is off and some of what was in it has rolled out
        part(s.root, new THREE.CylinderGeometry(radius * 0.95, radius * 0.95, height * 0.2, 18), capColour, x + 0.07, base + height * 0.1, z + 0.05);
        for (let i = 0; i < 6; i++) pill(s.root, x - Math.cos(g.rotation.y) * (height + 0.01 + random() * 0.05) + (random() - 0.5) * 0.03, base, z + Math.sin(g.rotation.y) * (height + 0.01 + random() * 0.05) + (random() - 0.5) * 0.03, 0);
      } else {
        part(g, new THREE.CylinderGeometry(radius * 0.95, radius * 0.95, height * 0.2, 18), capColour, 0, height * 1.18, 0);
        g.rotation.y = random() * 6;
      }
    };
    const spots: [number, number][] = [[0.14, -0.07], [0.075, -0.1], [0.19, -0.02], [0.005, -0.11], [0.13, -0.14], [-0.05, -0.12], [0.2, -0.11]];
    const howMany = { none: 0, one: 1, few: 3 + Math.floor(random() * 2), many: 7 }[a.bottles];
    for (let i = 0; i < howMany; i++) {
      const [x, z] = spots[i];
      const lying = a.bottles === 'many' && i === 2;
      bottle(x + (random() - 0.5) * 0.012, z + (random() - 0.5) * 0.012, mix(0.017, 0.027, random()), mix(0.05, 0.095, random()), lying, i === 4);
    }

    // ---- reading glasses ----------------------------------------------------------------
    if (a.glasses !== 'none') {
      const specs = group();
      specs.position.set(-0.11, base, 0.13); specs.rotation.y = mix(-0.5, 0.2, random());
      const frame = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#8a3f2a' : '#2a2a2e', roughness: 0.35 });
      const lens = new THREE.MeshStandardMaterial({ color: '#dfeef2', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false });
      const lensY = 0.021;
      for (const x of [-1, 1]) {
        const rim = part(specs, new THREE.TorusGeometry(0.02, 0.0024, 6, 22), frame, x * 0.026, lensY, 0); rim.scale.set(1.15, 0.9, 1);
        const pane = part(specs, new THREE.CircleGeometry(0.02, 20), lens, x * 0.026, lensY, 0); pane.scale.set(1.15, 0.9, 1); pane.castShadow = false;
        const arm = group(specs); arm.position.set(x * 0.051, lensY + 0.008, 0);
        part(arm, new THREE.BoxGeometry(0.0024, 0.0028, 0.125), frame, 0, 0, -0.0625);
        part(arm, new THREE.BoxGeometry(0.0024, 0.014, 0.0028), frame, 0, -0.006, -0.124).rotation.x = 0.5;
        if (a.glasses === 'folded') { arm.rotation.y = x * 1.42; arm.position.z = -0.003 - (x > 0 ? 0.004 : 0); }
        else arm.rotation.x = -0.13;
      }
      part(specs, new THREE.TorusGeometry(0.007, 0.002, 6, 12, Math.PI), frame, 0, lensY + 0.004, 0);
      if (a.glasses === 'open') specs.rotation.x = 0;
      if (a.glasses === 'chain') {
        const points: [number, number, number][] = [];
        for (let i = 0; i <= 14; i++) { const t = i / 14; points.push([Math.cos(t * Math.PI) * 0.05 + Math.sin(t * 9) * 0.012, 0.003, -0.125 - Math.sin(t * Math.PI) * 0.1 + Math.cos(t * 7) * 0.012]); }
        points[0][1] = points[14][1] = 0.012;
        const chain = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
        const beads = Array.from({ length: 60 }, (_unused, i) => { const p = chain.getPointAt(i / 59); return { at: [p.x, p.y, p.z] as [number, number, number], size: 0.0022, color: i % 5 === 0 ? '#d8b24a' : '#f1ede2' }; });
        const strand = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.3 }), beads.length);
        const m = new THREE.Matrix4();
        beads.forEach((bead, i) => { m.makeScale(bead.size, bead.size, bead.size).setPosition(...bead.at); strand.setMatrixAt(i, m); strand.setColorAt(i, new THREE.Color(bead.color)); });
        strand.castShadow = true; specs.add(strand);
      }
    }

    // ---- the story ----------------------------------------------------------------------
    if (a.story === 'spilled') {
      const n = 8 + Math.round(mood.density * 14);
      for (let i = 0; i < n; i++) { const t = random() * 2.4 - 0.2, r = 0.05 + random() * 0.13; pill(s.root, 0.03 + Math.cos(t) * r, base, 0.1 + Math.sin(t) * r * 0.55); }
    } else if (a.story === 'note') {
      const note = paint(256, 320, (ctx) => {
        ctx.fillStyle = '#fbf7e8'; ctx.fillRect(0, 0, 256, 320);
        ctx.strokeStyle = 'rgba(90,140,200,0.5)'; ctx.lineWidth = 2; for (let y = 50; y < 320; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke(); }
        ctx.fillStyle = '#1f2a6a'; ctx.font = 'bold 24px Arial, Helvetica, sans-serif';
        ['MUM -', 'WHITE: 2 x MORNING', 'PINK: 1 WITH FOOD', 'YELLOW: BEDTIME', 'BLUE ONE: SUNDAYS', 'DO NOT SKIP!!', 'CALL ME. xx'].forEach((line, i) => { ctx.save(); ctx.translate(14, 44 + i * 38); ctx.rotate((random() - 0.5) * 0.04); ctx.fillText(line, 0, 0, 230); ctx.restore(); });
        ctx.strokeStyle = '#c8322c'; ctx.lineWidth = 4; ctx.strokeRect(8, 210, 200, 34);
      });
      const paper = new THREE.MeshStandardMaterial({ color: '#fbf7e8', roughness: 0.9 });
      const sheet = part(s.root, new THREE.BoxGeometry(0.12, 0.0008, 0.15), [paper, paper, new THREE.MeshStandardMaterial({ map: note, roughness: 0.9 }), paper, paper, paper], 0.13, base + 0.0006, 0.12);
      sheet.rotation.y = mix(-0.35, 0.1, random());
    } else if (a.story === 'bag') {
      const paper = s.material('#f3f1ea', { roughness: 0.9 });
      const bag = part(s.root, new THREE.BoxGeometry(0.11, 0.15, 0.035), paper, 0.17, base + 0.075, -0.13);
      bag.rotation.y = mix(-0.4, 0.1, random());
      const fold = part(s.root, new THREE.BoxGeometry(0.11, 0.03, 0.012), paper, 0.17, base + 0.158, -0.125); fold.rotation.set(0.5, bag.rotation.y, 0);
      const cross = s.label('+ Rx', 0.07, 0.035, [0.17 + Math.sin(bag.rotation.y) * 0.018, base + 0.09, -0.13 + Math.cos(bag.rotation.y) * 0.018], '#2f8a57', '#f3f1ea');
      cross.rotation.y = bag.rotation.y;
      // blister strip
      const foil = part(s.root, new THREE.BoxGeometry(0.09, 0.0015, 0.04), new THREE.MeshStandardMaterial({ color: '#c9cdd0', metalness: 0.8, roughness: 0.3 }), 0.13, base + 0.001, 0.13);
      foil.rotation.y = mix(-0.6, 0.3, random());
      for (let i = 0; i < 10; i++) {
        const lx = (i % 5 - 2) * 0.016, lz = (Math.floor(i / 5) - 0.5) * 0.017;
        const dome = part(s.root, new THREE.SphereGeometry(0.005, 8, 6, 0, 6.3, 0, 1.6), new THREE.MeshStandardMaterial({ color: i < 3 ? '#9a9ea2' : '#f4f1ea', roughness: 0.3 }), 0.13 + lx * Math.cos(foil.rotation.y) + lz * Math.sin(foil.rotation.y), base + 0.0017, 0.13 - lx * Math.sin(foil.rotation.y) + lz * Math.cos(foil.rotation.y));
        dome.scale.y = i < 3 ? 0.15 : 0.6;
      }
    } else if (a.story === 'clock') {
      const clock = group(); clock.position.set(0.15, base, 0.1); clock.rotation.y = mix(-0.5, -0.1, random());
      const brass = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#c9a64e' : '#b9bcc0', metalness: 0.85, roughness: 0.3 });
      const dial = paint(128, 128, (ctx) => {
        ctx.fillStyle = '#f6f2e4'; ctx.beginPath(); ctx.arc(64, 64, 64, 0, 7); ctx.fill();
        ctx.fillStyle = '#1b1b1d'; ctx.font = 'bold 15px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let h = 1; h <= 12; h++) ctx.fillText(String(h), 64 + Math.sin(h * 0.5236) * 48, 64 - Math.cos(h * 0.5236) * 48);
        ctx.strokeStyle = '#1b1b1d'; ctx.lineCap = 'round';
        const hour = random() * 6.3, minute = random() * 6.3;
        ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 + Math.sin(hour) * 26, 64 - Math.cos(hour) * 26); ctx.stroke();
        ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 + Math.sin(minute) * 40, 64 - Math.cos(minute) * 40); ctx.stroke();
        ctx.strokeStyle = '#c8322c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 + Math.sin(hour + 1) * 30, 64 - Math.cos(hour + 1) * 30); ctx.stroke();
      });
      const drum = part(clock, new THREE.CylinderGeometry(0.04, 0.04, 0.032, 28), brass, 0, 0.05, 0); drum.rotation.x = Math.PI / 2;
      part(clock, new THREE.CircleGeometry(0.036, 28), new THREE.MeshStandardMaterial({ map: dial, roughness: 0.6 }), 0, 0.05, 0.0165);
      for (const x of [-1, 1]) {
        part(clock, new THREE.SphereGeometry(0.014, 12, 8, 0, 6.3, 0, 1.6), brass, x * 0.024, 0.088, 0).rotation.z = x * -0.45;
        const leg = part(clock, new THREE.CylinderGeometry(0.003, 0.003, 0.03, 6), brass, x * 0.026, 0.013, 0); leg.rotation.z = x * 0.45;
      }
      part(clock, new THREE.TorusGeometry(0.01, 0.002, 6, 12, Math.PI), brass, 0, 0.098, 0);
    }

    return s.finish();
  },
});
