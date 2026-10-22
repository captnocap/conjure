import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Rand = () => number;

/** A vellum page painted locally: ruled lines, script as broken strokes, a coloured initial. */
function pageTexture(random: Rand, written: number, initial: boolean, wear: number, torn: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 340;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#eadfbd';
  g.fillRect(0, 0, 256, 340);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(150,120,70,${0.03 + random() * 0.05 * (0.5 + wear)})`;
    g.beginPath();
    g.ellipse(random() * 256, random() * 340, 10 + random() * 40, 8 + random() * 30, random() * 3, 0, 7);
    g.fill();
  }
  const lines = 22;
  const done = Math.round(lines * written);
  for (let line = 0; line < lines; line++) {
    const y = 34 + line * 13;
    g.fillStyle = 'rgba(120,90,60,0.28)';
    g.fillRect(30, y + 5, 196, 0.8);
    if (line >= done) continue;
    let x = initial && line < 5 ? 86 : 32;
    const end = line === done - 1 && written < 1 ? 60 + random() * 120 : 224;
    while (x < end) {
      const w = 6 + random() * 20;
      g.fillStyle = random() < 0.04 ? '#a02a1c' : '#2a2018';
      for (let k = 0; k < w; k += 3.2) g.fillRect(x + k, y - 3 + random(), 2.1, 7);
      x += w + 5;
    }
  }
  if (initial && done > 0) {
    g.fillStyle = '#1f3f8c';
    g.fillRect(30, 28, 50, 62);
    g.strokeStyle = '#d5a62c';
    g.lineWidth = 7;
    g.strokeRect(36, 34, 38, 50);
    g.fillStyle = '#b0271d';
    g.beginPath();
    g.arc(55, 59, 13, 0, 7);
    g.fill();
  }
  if (torn) {
    g.fillStyle = '#000';
    g.globalCompositeOperation = 'destination-out';
    g.beginPath();
    g.moveTo(256, 150);
    for (let x = 256; x >= 0; x -= 16) g.lineTo(x, 190 + (random() - 0.5) * 50 + (256 - x) * 0.35);
    g.lineTo(0, 340);
    g.lineTo(256, 340);
    g.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A plank whose top has been worn into a shallow double hollow by a sitter. */
function hollowBoard(width: number, thick: number, depth: number, hollow: number) {
  const geometry = new THREE.BoxGeometry(width, thick, depth, 28, 1, 10);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) < 0) continue;
    const x = p.getX(i) / (width * 0.3), z = p.getZ(i) / (depth * 0.55);
    p.setY(i, p.getY(i) - hollow * Math.exp(-(x * x + z * z) * 1.6));
  }
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    form: choice('What kind of desk is it?', {
      trestle: 'A plain plank slope on two shaped board ends, the common desk of a working copyist.',
      carrel: 'A boxed-in study carrel: tall side wings, a back board and a book shelf overhead, private and enclosed.',
      double: 'A two-sided ridge desk with a slope on each face, shared by two scribes back to back.',
      cupboard: 'A slope set on a locked cupboard base with iron strap hinges, where the materials are kept.',
    }),
    height: score('How high does the desk stand?', ['Low, for a hunched sitter', 'Ordinary sitting height', 'High, perched on a tall seat', 'A standing desk']),
    work: choice('What lies on the slope?', {
      bare: 'Nothing: bare oak, scored with old knife marks.',
      blank: 'A fresh sheet, pricked and ruled but not yet written.',
      half: 'A page broken off mid-line, half its ruled lines filled.',
      full: 'A finished page of dense script with a painted initial.',
      copying: 'Two things at once: an open exemplar book propped above, and the copy growing below it.',
    }),
    seat: choice('What does the scribe sit on?', {
      bench: 'A plank bench worn into a hollow by decades of the same sitter.',
      stool: 'A three-legged turned stool.',
      settle: 'A box seat with a tall plank back, to keep the draught off.',
      none: 'Nothing: the seat is gone.',
    }),
    story: choice('What is happening at this desk right now?', {
      working: 'Mid-task: the quill laid across the page, ink open, the scribe gone for a moment.',
      covered: 'Put away for the night: a linen cloth drawn over the page, the quill standing in its horn.',
      vigil: 'A night vigil: a candle stub burning on the ledge beside the work.',
      abandoned: 'Left for years: seat pushed over, cobwebs, a curled forgotten sheet.',
      ransacked: 'Violence: ink thrown down the slope, the page torn, the horn knocked over.',
    }),
    carved: noul('Are the oak ends carved and pierced with tracery?'),
    cushion: noul('Is there a sheepskin on the seat?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const oakTone = new THREE.Color('#9a7345').lerp(new THREE.Color('#4f3b28'), mood.wear * 0.75).offsetHSL((mood.warmth - 0.5) * 0.02 + 0.015, -0.08 + mood.warmth * 0.08, 0);
    const oak = (shift = 0) => s.material(oakTone.clone().offsetHSL(0, 0, shift + (random() - 0.5) * 0.035), { roughness: 0.78 });
    const iron = s.material('#2e2c2b', { metalness: 0.5, roughness: 0.55 });
    const lead = s.material('#6f7377', { metalness: 0.4, roughness: 0.5 });
    const ink = s.material('#15120f', { roughness: 0.3 });

    const W = 0.92;
    const low = mix(0.68, 1.12, a.height);
    const theta = mix(0.5, 0.68, random());
    const L = 0.6;
    const rise = Math.sin(theta) * L, run = Math.cos(theta) * L;
    const top = low + rise;
    const zFront = 0.27, zBack = zFront - run;
    const ledgeD = 0.15;
    const baseBack = a.form === 'double' ? zBack - run : zBack - ledgeD;
    const baseDepth = zFront - baseBack;
    const baseMid = (zFront + baseBack) / 2;

    // ---- the frame ----
    if (a.form === 'cupboard') {
      s.box([W, low - 0.06, baseDepth], [0, (low - 0.06) / 2 + 0.03, baseMid], oak());
      s.box([W + 0.04, 0.05, baseDepth + 0.04], [0, 0.025, baseMid], oak(-0.04));
      s.box([W * 0.62, low - 0.22, 0.02], [0.02, low / 2, zFront + 0.006], oak(0.03));
      for (const y of [low * 0.3, low * 0.72]) {
        s.box([W * 0.34, 0.03, 0.008], [-W * 0.16, y, zFront + 0.02], iron);
        s.cylinder(0.014, 0.014, 0.05, [-W * 0.31, y, zFront + 0.02], iron, 8);
      }
      s.box([0.05, 0.07, 0.012], [W * 0.24, low * 0.52, zFront + 0.02], iron);
      s.ring(0.022, 0.005, [W * 0.24, low * 0.52 - 0.05, zFront + 0.03], iron);
    } else {
      for (const side of [-1, 1]) {
        const x = side * (W / 2 - 0.03);
        s.box([0.045, low - 0.05, baseDepth * 0.72], [x, (low - 0.05) / 2 + 0.05, baseMid], oak());
        s.box([0.075, 0.06, baseDepth + 0.16], [x, 0.03, baseMid + 0.03], oak(-0.04));
        if (a.carved) {
          const dark = s.material('#1c1612');
          for (let i = 0; i < 3; i++) {
            const y = low * 0.34 + i * 0.13;
            s.cylinder(0.035, 0.035, 0.05, [x, y, baseMid], dark, 14).rotation.z = Math.PI / 2;
            for (const dz of [-0.045, 0.045]) s.cylinder(0.022, 0.022, 0.05, [x, y + 0.04, baseMid + dz], dark, 12).rotation.z = Math.PI / 2;
          }
        }
      }
      s.box([W - 0.08, 0.09, 0.035], [0, low * 0.55, baseBack + baseDepth * 0.2], oak(-0.02));
      // The footrest: a rail scuffed pale where the feet go.
      const footY = mix(0.14, 0.34, a.height);
      s.box([W - 0.08, 0.035, 0.11], [0, footY, zFront - 0.02], oak(-0.03));
      s.box([W * 0.34, 0.006, 0.09], [(random() - 0.5) * 0.1, footY + 0.019, zFront - 0.02], s.material(oakTone.clone().offsetHSL(0, -0.1, 0.12 + mood.wear * 0.08)));
      // An under-shelf for the spare quires.
      s.box([W - 0.08, 0.025, baseDepth * 0.6], [0, low - 0.2, baseMid], oak(-0.02));
      const stock = 1 + Math.floor(mood.density * 3.5);
      for (let i = 0; i < stock; i++)
        s.box([0.2 + random() * 0.08, 0.02 + random() * 0.03, 0.26], [-0.25 + i * 0.17 + random() * 0.03, low - 0.17 + random() * 0.01, baseMid + 0.03], s.material(['#e4d7b2', '#7a3b2a', '#d9cba4', '#3f4a39'][i % 4]));
    }

    // ---- the slope(s) ----
    const slopes: Sculpture[] = [];
    for (const face of a.form === 'double' ? [1, -1] : [1]) {
      const t = new Sculpture(context);
      t.root.position.set(0, low + rise / 2, face === 1 ? (zFront + zBack) / 2 : zBack - run / 2);
      t.root.rotation.y = face === 1 ? 0 : Math.PI;
      const tilt = new Sculpture(context);
      tilt.root.rotation.x = theta;
      t.root.add(tilt.root);
      s.root.add(t.root);
      tilt.box([W + 0.06, 0.035, L + 0.02], [0, 0, 0], oak(0.02));
      tilt.box([W + 0.06, 0.05, 0.03], [0, 0.03, L / 2], oak(-0.03));
      slopes.push(tilt);
    }
    const slope = slopes[0];
    if (a.form !== 'double') {
      s.box([W + 0.06, 0.035, ledgeD + 0.02], [0, top + 0.005, zBack - ledgeD / 2], oak(0.01));
      s.box([W, top - low, 0.03], [0, low + (top - low) / 2, zBack - ledgeD + 0.02], oak(-0.03));
    } else s.box([W + 0.08, 0.05, 0.07], [0, top + 0.01, zBack], oak(-0.03));
    for (const side of [-1, 1]) {
      // Triangular cheeks closing the sides under the slope.
      const shape = new THREE.Shape([new THREE.Vector2(zFront, low), new THREE.Vector2(zBack, top), new THREE.Vector2(a.form === 'double' ? zBack - run : zBack - ledgeD, a.form === 'double' ? low : top), new THREE.Vector2(baseBack, low)]);
      const cheek = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: false }), oak(-0.01));
      cheek.rotation.y = -Math.PI / 2;
      cheek.position.set(side * (W / 2 - 0.01) + 0.0175, -0.012, 0);
    }
    if (a.form === 'carrel') {
      const wing = 0.5;
      for (const side of [-1, 1]) s.box([0.035, wing + (top - low), baseDepth * 0.8], [side * (W / 2 + 0.035), low + (wing + top - low) / 2, baseMid - 0.03], oak(-0.02));
      s.box([W + 0.1, wing + 0.1, 0.03], [0, top + wing / 2 - 0.05, baseBack - 0.005], oak(-0.05));
      s.box([W + 0.1, 0.03, 0.3], [0, top + wing * 0.62, baseBack + 0.15], oak());
      const books = 3 + Math.floor(mood.density * 5);
      let bx = -W / 2 + 0.08;
      for (let i = 0; i < books; i++) {
        const w = 0.05 + random() * 0.045, h = 0.17 + random() * 0.07;
        const book = s.box([w, h, 0.18], [bx + w / 2, top + wing * 0.62 + 0.015 + h / 2, baseBack + 0.13], s.material(['#6d2c22', '#2f4638', '#5a4526', '#283a5c', '#7b5a2c'][Math.floor(random() * 5)]));
        if (i === books - 1 && random() < 0.6) { book.rotation.z = -0.3; book.position.x += 0.03; }
        bx += w + 0.006;
      }
    }

    // ---- the work on the slope ----
    const ruined = a.story === 'ransacked';
    const sheetW = 0.42, sheetH = 0.5;
    const written = { bare: 0, blank: 0, half: mix(0.3, 0.65, random()), full: 1, copying: mix(0.25, 0.7, random()) }[a.work];
    const sheet = (target: Sculpture, at: readonly [number, number, number], fraction: number, torn = false) => {
      const material = new THREE.MeshStandardMaterial({ map: pageTexture(random, fraction, a.work === 'full' || a.work === 'copying', mood.wear, torn), roughness: 0.9, side: THREE.DoubleSide, transparent: torn, alphaTest: torn ? 0.5 : 0 });
      const mesh = target.mesh(new THREE.PlaneGeometry(sheetW, sheetH, 6, 1), material, at);
      mesh.rotation.x = -Math.PI / 2;
      return mesh;
    };
    const copyZ = a.work === 'copying' ? 0.03 : 0;
    if (a.work !== 'bare') {
      const leaf = sheet(slope, [-0.05, 0.022, copyZ], written, ruined);
      leaf.rotation.z = (random() - 0.5) * 0.08;
      if (a.story === 'abandoned') {
        // The sheet has curled off its cords.
        const p = leaf.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) p.setZ(i, Math.max(0, p.getX(i) + 0.06) ** 2 * 1.6);
        leaf.geometry.computeVertexNormals();
      } else if (a.story !== 'covered') {
        // Weighted cords: a line across the page with a lead plumb hanging off each side of the board.
        for (const z of [copyZ - 0.19, copyZ + 0.12]) {
          slope.rod([-W / 2 - 0.03, 0.026, z], [W / 2 + 0.03, 0.026, z], 0.0045, s.material('#cdbf9a'));
          for (const side of [-1, 1]) {
            slope.rod([side * (W / 2 + 0.032), 0.026, z], [side * (W / 2 + 0.032), -0.06, z + 0.07], 0.003, s.material('#cdbf9a'));
            slope.ball([0.024, 0.04, 0.024], [side * (W / 2 + 0.032), -0.08, z + 0.085], lead, 10);
          }
        }
      }
    } else {
      for (let i = 0; i < 9; i++) {
        const x = (random() - 0.5) * 0.6, z = (random() - 0.5) * 0.4, len = 0.03 + random() * 0.07;
        slope.box([len, 0.002, 0.0025], [x, 0.019, z], s.material(oakTone.clone().offsetHSL(0, 0, -0.07))).rotation.y = random() * 3;
      }
    }
    if (a.work === 'copying') {
      // The exemplar: a fat open book propped on the top ledge.
      const book = new Sculpture(context);
      const perch = a.form === 'double' ? top + 0.06 : top + 0.03;
      book.root.position.set(0.08, perch, a.form === 'double' ? zBack : zBack - ledgeD * 0.45);
      book.root.rotation.x = -0.35;
      s.root.add(book.root);
      book.box([0.5, 0.34, 0.03], [0, 0.17, 0], s.material('#5b2a20'));
      for (const side of [-1, 1]) {
        const leafMesh = book.mesh(new THREE.PlaneGeometry(0.23, 0.31, 5, 1), new THREE.MeshStandardMaterial({ map: pageTexture(random, 1, side < 0, mood.wear, false), roughness: 0.9, side: THREE.DoubleSide }), [side * 0.118, 0.17, 0.03]);
        const p = leafMesh.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / 0.23 + 0.5) * Math.PI) * 0.014);
        leafMesh.geometry.computeVertexNormals();
        book.box([0.23, 0.31, 0.018], [side * 0.118, 0.17, 0.02], s.material('#e3d6b0'));
      }
    }

    // ---- writing things ----
    const ledgeY = a.form === 'double' ? top + 0.036 : top + 0.024;
    const ledgeZ = a.form === 'double' ? zBack : zBack - ledgeD / 2;
    const hornX = W * 0.3;
    const horn = new Sculpture(context);
    horn.root.position.set(hornX, ledgeY, ledgeZ);
    s.root.add(horn.root);
    horn.lathe([[0.004, -0.09], [0.014, -0.05], [0.024, 0], [0.027, 0.03], [0.02, 0.032]], s.material('#3a2c20', { roughness: 0.35 }));
    horn.cylinder(0.019, 0.019, 0.004, [0, 0.03, 0], ink, 14);
    if (ruined) {
      horn.root.rotation.z = 1.45;
      horn.root.position.set(hornX - 0.1, ledgeY + 0.025, ledgeZ);
      // Ink run down the slope and onto the floor.
      for (let i = 0; i < 5; i++) {
        const x = hornX - 0.16 - i * 0.03 + random() * 0.05;
        const len = 0.18 + random() * 0.36;
        slope.box([0.012 + random() * 0.03, 0.004, len], [x, 0.024, -L / 2 + len / 2 + 0.02], ink);
        slope.cylinder(0.03, 0.03, 0.004, [x, 0.024, -L / 2 + 0.04], ink, 12);
      }
      s.cylinder(0.11, 0.12, 0.004, [hornX - 0.25, 0.002, zFront + 0.1], ink, 18).scale.set(1.5, 1, 0.8);
    }
    const quill = new Sculpture(context);
    quill.rod([0, 0, 0], [0, 0.2, 0], 0.0035, s.material('#e9e2cf'), 0.002);
    quill.ball([0.017, 0.085, 0.003], [0.006, 0.15, 0], s.material('#f1ece0'), 12);
    quill.rod([0, 0, 0], [0, -0.02, 0], 0.001, ink, 0.0035);
    s.root.add(quill.root);
    if (a.story === 'covered') {
      quill.root.position.set(hornX, ledgeY + 0.02, ledgeZ);
      quill.root.rotation.z = -0.25;
      const linen = s.material('#d8d2bf', { roughness: 0.95 });
      slope.box([sheetW + 0.14, 0.012, sheetH + 0.06], [-0.05, 0.03, 0], linen);
      slope.box([sheetW + 0.14, 0.012, 0.16], [-0.05, 0.05 - 0.08 * Math.cos(theta), L / 2 + 0.04 + 0.08 * Math.sin(theta)], linen).rotation.x = Math.PI / 2 - theta;
    } else if (ruined || a.story === 'abandoned') {
      quill.root.position.set(-0.2 + random() * 0.5, 0.006, zFront + 0.25 + random() * 0.1);
      quill.root.rotation.set(Math.PI / 2, 0, random() * 6);
    } else {
      slope.root.add(quill.root);
      quill.root.position.set(0.2, 0.03, 0.12);
      quill.root.rotation.set(-Math.PI / 2, 0, -0.7 + random() * 0.4);
    }
    if (a.story === 'working' || a.story === 'vigil') {
      // Penknife and pounce pot on the ledge.
      s.box([0.012, 0.008, 0.09], [-W * 0.3, ledgeY + 0.005, ledgeZ], s.material('#3b2a1c')).rotation.y = 0.5;
      s.box([0.01, 0.003, 0.07], [-W * 0.3 + 0.036, ledgeY + 0.004, ledgeZ - 0.066], s.material('#b9bcc0', { metalness: 0.7, roughness: 0.3 })).rotation.y = 0.5;
      s.cylinder(0.022, 0.028, 0.045, [-W * 0.08, ledgeY + 0.022, ledgeZ], s.material('#a08a5c'), 12);
    }
    let flame: THREE.Mesh | null = null;
    if (a.story === 'vigil') {
      const cx = -W * 0.4 + 0.02;
      s.cylinder(0.05, 0.055, 0.012, [cx, ledgeY + 0.006, ledgeZ], iron, 14);
      const tall = 0.05 + random() * 0.07;
      s.cylinder(0.02, 0.024, tall, [cx, ledgeY + 0.012 + tall / 2, ledgeZ], s.material('#e6d9ae', { emissive: '#f2c56b', emissiveIntensity: 0.25 }), 12);
      for (let i = 0; i < 4; i++) s.ball([0.008, 0.02 + random() * 0.02, 0.008], [cx + Math.cos(i * 1.7) * 0.022, ledgeY + 0.03, ledgeZ + Math.sin(i * 1.7) * 0.022], s.material('#e6d9ae'), 8);
      flame = s.ball([0.012, 0.03, 0.012], [cx, ledgeY + tall + 0.045, ledgeZ], new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb23c', emissiveIntensity: 2.4 }), 10);
    }
    if (a.story === 'abandoned') {
      // Cobwebs strung from the ledge to the slope and the ends.
      const web = new THREE.MeshStandardMaterial({ color: '#e9e7de', roughness: 1 });
      const anchor: [number, number, number] = [W / 2, top + 0.03, zBack];
      for (let i = 0; i < 7; i++) s.rod(anchor, [W / 2 - 0.05 - random() * 0.3, low + rise * random() * 0.8 + 0.03, zFront - run * random() * 0.6], 0.0015, web);
      for (let i = 0; i < 5; i++) s.rod([-W / 2, low - 0.02, zFront], [-W / 2 + random() * 0.06, 0.08 + random() * 0.3, zFront + 0.03 + random() * 0.12], 0.0015, web);
    }
    if (ruined && a.work !== 'bare') {
      const scrap = sheet(s, [0.25 + random() * 0.15, 0.004, zFront + 0.3], written);
      scrap.scale.set(0.9, 0.45, 1);
      scrap.rotation.z = random() * 3;
    }

    // ---- the seat ----
    if (a.seat !== 'none' && a.height < 0.93) {
      const seat = new Sculpture(context);
      const seatH = Math.max(0.36, low - 0.3);
      const seatW = a.seat === 'stool' ? 0.36 : 0.78;
      const hollow = mix(0.006, 0.03, mood.wear) + 0.006;
      if (a.seat === 'stool') {
        const board = seat.mesh(hollowBoard(0.36, 0.05, 0.36, hollow), oak(0.03), [0, seatH - 0.025, 0]);
        board.geometry.scale(1, 1, 1);
        for (let i = 0; i < 3; i++) {
          const angle = i * 2.094 + 0.5;
          seat.rod([Math.cos(angle) * 0.2, 0, Math.sin(angle) * 0.2], [Math.cos(angle) * 0.1, seatH - 0.04, Math.sin(angle) * 0.1], 0.024, oak(-0.03), 0.018);
        }
        seat.ring(0.13, 0.012, [0, seatH * 0.4, 0], oak(-0.04)).rotation.x = Math.PI / 2;
      } else if (a.seat === 'bench') {
        seat.mesh(hollowBoard(seatW, 0.055, 0.3, hollow), oak(0.03), [0, seatH - 0.0275, 0]);
        for (const side of [-1, 1]) {
          seat.box([0.045, seatH - 0.05, 0.27], [side * (seatW / 2 - 0.09), (seatH - 0.05) / 2, 0], oak(-0.03));
          seat.box([0.05, 0.05, 0.34], [side * (seatW / 2 - 0.09), 0.025, 0], oak(-0.05));
        }
        seat.box([seatW - 0.18, 0.07, 0.03], [0, seatH * 0.55, 0], oak(-0.02));
      } else {
        seat.box([seatW, seatH - 0.05, 0.34], [0, (seatH - 0.05) / 2, 0], oak(-0.03));
        seat.mesh(hollowBoard(seatW + 0.03, 0.05, 0.37, hollow), oak(0.03), [0, seatH - 0.025, 0]);
        seat.box([seatW, 0.36, 0.03], [0, seatH + 0.16, 0.17], oak(-0.01));
        for (const side of [-1, 1]) seat.box([0.03, 0.3, 0.34], [side * (seatW / 2), seatH + 0.1, 0], oak(-0.04));
      }
      if (a.cushion) {
        const fleece = seat.ball([seatW * 0.33, 0.035, 0.16], [0, seatH + 0.012, 0], s.material('#e7e0cc', { roughness: 1 }), 16);
        fleece.rotation.y = (random() - 0.5) * 0.4;
      }
      seat.root.position.set((random() - 0.5) * 0.1, 0, zFront + 0.36 + (a.seat === 'settle' ? 0.06 : 0));
      seat.root.rotation.y = (random() - 0.5) * 0.14;
      if (a.story === 'abandoned' || (ruined && a.seat !== 'settle')) {
        seat.root.rotation.set(Math.PI / 2, 0, 0.3 + random() * 0.5);
        seat.root.position.set(0.1, 0.17, zFront + 0.42);
      }
      s.root.add(seat.root);
    }

    const flicker = mix(0.4, 1.6, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        if (flame) flame.scale.set(0.012, 0.03 * (1 + Math.sin(time * 9 * flicker) * 0.12 + Math.sin(time * 23) * 0.05), 0.012);
      },
    });
  },
});
