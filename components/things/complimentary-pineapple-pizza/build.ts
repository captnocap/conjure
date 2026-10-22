import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P = [number, number, number];

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineThing({
  questions: {
    topping: choice('What is on the pizza?', {
      pineapple: 'Yellow pineapple chunks and pink ham on cheese: the classic argument.',
      anchovy: 'Grey anchovies laid across it like little fish on a beach.',
      raisin: 'Raisins. Just raisins, on cheese.',
      cheese: 'Plain cheese, pale and sweating.',
      mystery: 'Something grey-green and unidentifiable, lumpy, possibly looking back at you.',
      everything: 'Pineapple, anchovies and raisins together, a pizza built out of spite.',
    }),
    gone: score('How much of it has been eaten?', ['Untouched, all eight slices', 'One slice missing', 'Half gone', 'One lonely slice left', 'Nothing but discarded crusts']),
    lid: choice('What is on the inside of the lid?', {
      smiley: 'A big hand-drawn smiley face in marker.',
      free: 'A bright FREE! sticker.',
      enjoy: 'ENJOY YOUR WAIT written in marker.',
      biohazard: 'A biohazard sticker someone thought was funny.',
      plain: 'Just the pizzeria print and grease.',
    }),
    visitor: choice('Who or what is on it?', {
      nothing: 'Nothing at all.',
      fly: 'A fly, circling, landing, circling again.',
      tongs: 'A pair of steel serving tongs laid across the box.',
      both: 'A fly, and tongs that nobody has used.',
    }),
    box: choice('What state is the box in?', {
      fresh: 'A crisp new box, lid standing straight up.',
      sagging: 'Lid sagging forward, grease soaking through the bottom.',
      ancient: 'Grey, flattened and dusty, the cardboard gone soft with age.',
    }),
    stand: choice('What is it sitting on?', {
      table: 'A small laminate side table.',
      chair: 'A moulded plastic chair pulled out of the row.',
      stack: 'A stack of old magazines.',
      floor: 'Directly on the floor.',
    }),
    card: noul('Is there a folded HELP YOURSELF card beside it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const jitter = (amount: number) => (random() - 0.5) * amount;
    const cardboardTint = a.box === 'ancient' ? '#9b9382' : '#c89c62';
    const cardboard = s.material(cardboardTint, { roughness: 0.95 });
    const cardboardIn = s.material(a.box === 'ancient' ? '#b7b0a0' : '#dcc9a4', { roughness: 0.95 });

    // ---- The stand ----
    let top = 0;
    if (a.stand === 'table') {
      top = 0.55;
      const laminate = s.material(mood.cheer > 0.5 ? '#d6c9a8' : '#8a7f6a', { roughness: 0.5 });
      const legs = s.material('#3a3a3c', { metalness: 0.6, roughness: 0.4 });
      s.box([0.56, 0.03, 0.56], [0, top - 0.015, 0], laminate);
      s.box([0.56, 0.012, 0.56], [0, top - 0.036, 0], s.material('#2a2a2c'));
      for (const x of [-0.24, 0.24]) for (const z of [-0.24, 0.24]) s.cylinder(0.014, 0.012, top - 0.04, [x, (top - 0.04) / 2, z], legs, 10);
    } else if (a.stand === 'chair') {
      top = 0.45;
      const plastic = s.material(['#d9802d', '#c7bca0', '#3d7f86', '#8a3d3d'][Math.floor(random() * 4)], { roughness: 0.45 });
      const steel = s.material('#8e9397', { metalness: 0.7, roughness: 0.4 });
      s.box([0.46, 0.035, 0.44], [0, top - 0.017, 0], plastic);
      const back = s.box([0.46, 0.36, 0.03], [0, top + 0.2, -0.22], plastic);
      back.rotation.x = -0.18;
      s.box([0.46, 0.06, 0.06], [0, top - 0.05, -0.2], plastic);
      for (const x of [-0.19, 0.19]) {
        s.rod([x, 0, 0.2], [x, top - 0.035, 0.18], 0.012, steel);
        s.rod([x, 0, -0.2], [x, top - 0.035, -0.18], 0.012, steel);
        s.box([0.08, 0.012, 0.1], [x, 0.006, 0.2], steel);
        s.box([0.08, 0.012, 0.1], [x, 0.006, -0.2], steel);
      }
    } else if (a.stand === 'stack') {
      const n = 6 + Math.floor(random() * 5);
      for (let i = 0; i < n; i++) {
        const mag = s.box([0.3, 0.012, 0.24], [jitter(0.04), 0.006 + i * 0.012, jitter(0.04)], s.material(['#d3453a', '#2d6fb5', '#efe3c6', '#3e9b63', '#e9c43a'][i % 5], { roughness: 0.6 }));
        mag.rotation.y = jitter(0.5);
      }
      top = n * 0.012;
    }

    // ---- The box ----
    const B = 0.42;
    const boxGroup = new THREE.Group();
    boxGroup.position.set(0, top, 0);
    boxGroup.rotation.y = jitter(0.4);
    s.root.add(boxGroup);
    const part = <T extends THREE.Object3D>(child: T) => { boxGroup.add(child); return child; };
    const sag = a.box === 'sagging' ? 1 : a.box === 'ancient' ? 0.6 : 0;
    const wallH = 0.045;
    part(s.box([B, 0.01, B], [0, 0.005, 0], cardboard));
    part(s.box([B, wallH, 0.012], [0, wallH / 2, B / 2 - 0.006], cardboard));
    for (const x of [-1, 1]) part(s.box([0.012, wallH, B], [x * (B / 2 - 0.006), wallH / 2, 0], cardboard));
    part(s.box([B, wallH, 0.012], [0, wallH / 2, -B / 2 + 0.006], cardboard));
    if (sag > 0 || mood.wear > 0.6) {
      const grease = new THREE.MeshStandardMaterial({ color: '#7a5a2a', transparent: true, opacity: 0.4 + sag * 0.3, roughness: 0.3, depthWrite: false });
      for (let i = 0; i < 3 + sag * 3; i++) { const g = part(s.mesh(new THREE.CircleGeometry(0.05 + random() * 0.07, 16), grease, [jitter(B * 0.7), 0.0105, jitter(B * 0.7)])); g.rotation.x = -Math.PI / 2; g.castShadow = false; }
    }
    // The lid, hinged at the back.
    const lidMap = paint(512, 512, (c, w, h) => {
      c.fillStyle = a.box === 'ancient' ? '#b7b0a0' : '#dcc9a4'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(150,100,40,0.18)';
      for (let i = 0; i < 4 + sag * 4; i++) { c.beginPath(); c.arc(random() * w, random() * h, 30 + random() * 70, 0, 7); c.fill(); }
      c.fillStyle = '#b4302b'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = 'bold 54px serif'; c.fillText('INFERNO PIZZA', w / 2, 70);
      c.font = '26px serif'; c.fillText('hot since the beginning', w / 2, 112);
      c.strokeStyle = '#b4302b'; c.lineWidth = 6; c.beginPath(); c.arc(w / 2, 300, 150, 0, 7); c.stroke();
      if (a.lid === 'smiley') {
        c.strokeStyle = '#1b1b1f'; c.lineWidth = 14; c.beginPath(); c.arc(w / 2, 300, 120, 0, 7); c.stroke();
        c.beginPath(); c.arc(w / 2, 310, 80, 0.3, Math.PI - 0.3); c.stroke();
        c.fillStyle = '#1b1b1f'; for (const dx of [-45, 45]) { c.beginPath(); c.arc(w / 2 + dx, 260, 13, 0, 7); c.fill(); }
      } else if (a.lid === 'free') {
        c.save(); c.translate(w / 2, 300); c.rotate(-0.3);
        c.fillStyle = '#ffe53a'; c.beginPath(); for (let i = 0; i < 24; i++) { const r = i % 2 ? 150 : 125; c.lineTo(Math.cos(i / 24 * 6.283) * r, Math.sin(i / 24 * 6.283) * r); } c.closePath(); c.fill();
        c.fillStyle = '#d6232a'; c.font = 'bold 96px sans-serif'; c.fillText('FREE!', 0, 10); c.restore();
      } else if (a.lid === 'enjoy') {
        c.fillStyle = '#1b1b1f'; c.font = 'bold 60px sans-serif'; c.fillText('ENJOY', w / 2, 260); c.fillText('YOUR WAIT', w / 2, 330);
      } else if (a.lid === 'biohazard') {
        c.save(); c.translate(w / 2, 300);
        c.fillStyle = '#f0a500'; c.beginPath(); c.moveTo(0, -150); c.lineTo(140, 95); c.lineTo(-140, 95); c.closePath(); c.fill();
        c.strokeStyle = '#1b1b1f'; c.lineWidth = 14;
        for (let i = 0; i < 3; i++) { const t = -Math.PI / 2 + i * 2.094; c.beginPath(); c.arc(Math.cos(t) * 34, Math.sin(t) * 34 + 10, 40, 0, 7); c.stroke(); }
        c.fillStyle = '#1b1b1f'; c.beginPath(); c.arc(0, 10, 16, 0, 7); c.fill();
        c.restore();
      }
    });
    const lid = new THREE.Group();
    lid.position.set(0, wallH, -B / 2);
    lid.rotation.x = -(Math.PI / 2 + 0.2) + sag * 0.55;
    part(lid);
    // The inside of a closed lid is its underside, so the print goes on local -y.
    const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(B, 0.012, B), [cardboard, cardboard, cardboard, cardboardIn, cardboard, cardboard]);
    lidMesh.position.set(0, 0.006, B / 2);
    lidMesh.castShadow = lidMesh.receiveShadow = true;
    lid.add(lidMesh);
    const lidPrint = s.mesh(new THREE.PlaneGeometry(B - 0.03, B - 0.03), new THREE.MeshStandardMaterial({ map: lidMap, roughness: 0.9 }), [0, -0.0008, B / 2]);
    lidPrint.rotation.x = Math.PI / 2;
    lid.add(lidPrint);
    for (const x of [-1, 1]) { const flap = s.box([0.012, wallH, B], [x * (B / 2 - 0.006), -wallH / 2, B / 2], cardboard); lid.add(flap); }
    lid.add(s.box([B, wallH, 0.012], [0, -wallH / 2, B - 0.006], cardboard));

    // ---- The pizza ----
    const R = 0.185;
    const slices = 8;
    const gone = Math.round(a.gone * 8);
    const crustsOnly = gone >= 8;
    const missing = new Set<number>();
    let k = Math.floor(random() * slices);
    for (let i = 0; i < Math.min(gone, 7); i++) { missing.add(k % slices); k += 1; }
    const crust = s.material(a.box === 'ancient' ? '#a8905e' : '#d9a85a', { roughness: 0.8 });
    const cheese = s.material(a.topping === 'mystery' ? '#b7b37a' : a.box === 'ancient' ? '#c9b870' : '#f2d060', { roughness: 0.5 });
    const sauce = s.material('#a8321c', { roughness: 0.6 });
    const pizzaY = 0.012;
    const toppingSpots: { at: P; size: number; kind: number }[] = [];
    for (let i = 0; i < slices; i++) {
      const t0 = (i / slices) * Math.PI * 2, span = (Math.PI * 2) / slices;
      if (missing.has(i) && !crustsOnly) continue;
      if (crustsOnly) {
        // A gnawed crust, flung back into the box.
        const arc = part(s.ring(R - 0.012, 0.011, [jitter(0.05), pizzaY + 0.011, jitter(0.05)], crust, span * (0.6 + random() * 0.4)));
        arc.rotation.set(Math.PI / 2, 0, t0 + jitter(0.6));
        continue;
      }
      const base = part(s.mesh(new THREE.CylinderGeometry(R - 0.004, R - 0.004, 0.012, 10, 1, false, t0, span), crust, [0, pizzaY + 0.006, 0]));
      const red = part(s.mesh(new THREE.CylinderGeometry(R - 0.02, R - 0.02, 0.004, 10, 1, false, t0, span), sauce, [0, pizzaY + 0.014, 0]));
      const top = part(s.mesh(new THREE.CylinderGeometry(R - 0.024, R - 0.024, 0.006, 10, 1, false, t0 + 0.02, span - 0.04), cheese, [0, pizzaY + 0.019, 0]));
      void base; void red; void top;
      const arc = part(s.ring(R - 0.012, 0.012, [0, pizzaY + 0.012, 0], crust, span - 0.03));
      arc.rotation.set(Math.PI / 2, 0, t0 + 0.015);
      // Toppings on this slice, in its wedge. CylinderGeometry's theta runs from +x toward +z... sample and keep what falls inside.
      const count = a.topping === 'cheese' ? 0 : a.topping === 'everything' ? 7 : 5;
      for (let j = 0; j < count; j++) {
        const r = 0.04 + random() * (R - 0.08), ang = t0 + span * (0.12 + random() * 0.76);
        toppingSpots.push({ at: [Math.sin(ang) * r, pizzaY + 0.024, Math.cos(ang) * r], size: 1, kind: a.topping === 'everything' ? j % 3 : 0 });
      }
    }
    if (toppingSpots.length) {
      const yellow = s.material('#f3c73c', { roughness: 0.4 });
      const ham = s.material('#e58a8c', { roughness: 0.6 });
      const fish = s.material('#7a7f80', { roughness: 0.4, metalness: 0.3 });
      const raisin = s.material('#3a2422', { roughness: 0.7 });
      const mystery = s.material('#6f7f5e', { roughness: 0.9 });
      const kinds = a.topping === 'everything' ? ['pineapple', 'anchovy', 'raisin'] : [a.topping];
      for (const [kindIndex, kind] of kinds.entries()) {
        const spots = toppingSpots.filter((spot) => spot.kind === kindIndex);
        if (!spots.length) continue;
        if (kind === 'pineapple') {
          part(s.scatter(new THREE.BoxGeometry(0.022, 0.012, 0.018), yellow, spots.map((spot, i) => ({ at: spot.at, size: 1 + (i % 3) * 0.15 }))));
          part(s.scatter(new THREE.CylinderGeometry(0.02, 0.02, 0.004, 10), ham, spots.map((spot) => ({ at: [spot.at[0] + jitter(0.05), spot.at[1] - 0.003, spot.at[2] + jitter(0.05)] as P, size: 1 }))));
        } else if (kind === 'anchovy') {
          for (const spot of spots) { const f = part(s.box([0.012, 0.006, 0.05], spot.at, fish)); f.rotation.y = random() * Math.PI; }
        } else if (kind === 'raisin') {
          part(s.scatter(new THREE.SphereGeometry(0.006, 6, 5), raisin, spots.flatMap((spot) => [spot, { at: [spot.at[0] + jitter(0.03), spot.at[1], spot.at[2] + jitter(0.03)] as P, size: 1 }]).map((spot) => ({ at: spot.at, size: 1 }))));
        } else if (kind === 'mystery') {
          part(s.scatter(new THREE.SphereGeometry(0.012, 7, 6), mystery, spots.map((spot) => ({ at: spot.at, size: 0.7 + random() * 0.8 }))));
          // Two of the lumps are looking at you.
          const eye = s.material('#f4f4f0', { roughness: 0.3 });
          const pupil = s.material('#101010');
          for (const spot of spots.slice(0, 2)) {
            part(s.ball([0.009, 0.009, 0.009], [spot.at[0], spot.at[1] + 0.012, spot.at[2]], eye, 10));
            part(s.ball([0.004, 0.004, 0.004], [spot.at[0] + 0.004, spot.at[1] + 0.014, spot.at[2] + 0.007], pupil, 6));
          }
        }
      }
    }
    // Crumbs and a smear where slices were lifted.
    if (gone > 0) part(s.scatter(new THREE.BoxGeometry(0.006, 0.003, 0.006), crust, Array.from({ length: 6 + gone * 3 }, () => ({ at: [jitter(B * 0.8), 0.012, jitter(B * 0.8)] as P, size: 0.6 + random() }))));

    // ---- Napkin, card, tongs, fly ----
    const side = random() < 0.5 ? -1 : 1;
    const napkin = s.box([0.11, 0.006, 0.11], [side * (B / 2 + 0.09), top + 0.003, 0.08], s.material('#f6f4ee', { roughness: 1 }));
    napkin.rotation.y = jitter(0.8);
    s.box([0.1, 0.004, 0.05], [side * (B / 2 + 0.09), top + 0.008, 0.08], s.material('#f6f4ee', { roughness: 1 })).rotation.y = napkin.rotation.y;
    if (a.card) {
      const card = s.label('HELP YOURSELF', 0.16, 0.075, [-side * (B / 2 + 0.1), top + 0.04, 0.1], '#1f1f24', '#f3eee0');
      card.rotation.set(-0.35, side * 0.4, 0);
      const backing = s.box([0.16, 0.075, 0.004], [-side * (B / 2 + 0.1), top + 0.04, 0.1 - 0.03], s.material('#e9e3d2'));
      backing.rotation.set(0.35, side * 0.4, 0);
    }
    if (a.visitor === 'tongs' || a.visitor === 'both') {
      const steel = s.material('#c9cdd0', { metalness: 0.85, roughness: 0.3 });
      const tongs = new THREE.Group();
      tongs.position.set(0.05, wallH + 0.008, B / 2 - 0.02); tongs.rotation.y = 0.4 + jitter(0.4);
      for (const dx of [-0.012, 0.012]) { const arm = s.box([0.012, 0.006, 0.26], [dx * 2, 0, 0], steel); arm.rotation.y = dx * 2; tongs.add(arm); }
      tongs.add(s.box([0.03, 0.012, 0.02], [0, 0, -0.13], steel));
      boxGroup.add(tongs);
    }
    let fly: THREE.Group | null = null;
    if (a.visitor === 'fly' || a.visitor === 'both') {
      fly = new THREE.Group();
      fly.add(s.ball([0.006, 0.005, 0.009], [0, 0, 0], s.material('#15151a', { roughness: 0.3 }), 8));
      const wing = new THREE.MeshStandardMaterial({ color: '#dfe6ee', transparent: true, opacity: 0.5, depthWrite: false });
      for (const x of [-1, 1]) { const w = s.mesh(new THREE.PlaneGeometry(0.012, 0.006), wing, [x * 0.008, 0.004, -0.002]); w.rotation.x = -Math.PI / 2; w.rotation.z = x * 0.5; w.castShadow = false; fly.add(w); }
      fly.position.set(0.05, pizzaY + 0.1, 0.05);
      boxGroup.add(fly);
    }

    const rate = mix(0.6, 2.5, mood.energy);
    return s.finish({
      footprint: 0.35,
      update: (_dt, time) => {
        if (!fly) return;
        const t = time * rate;
        const landed = Math.sin(t * 0.7) > 0.6;
        const r = landed ? 0.08 : 0.1 + Math.sin(t * 1.3) * 0.05;
        fly.position.set(Math.cos(t * 2.1) * r, pizzaY + (landed ? 0.03 : 0.09 + Math.sin(t * 5) * 0.02), Math.sin(t * 1.7) * r);
        fly.rotation.y = -t * 2.1;
      },
    });
  },
});
