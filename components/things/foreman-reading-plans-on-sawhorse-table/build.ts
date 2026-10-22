import * as THREE from 'three';
import { type Figure, Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { type Build, HAT_COLOURS, type P, VEST_COLOURS, arm, boots, bow, drop, hardHat, leg, look, paint, pick, pickSkin, vest, worldOf } from './site';

/** Swing an arm forward until the hand lands on a surface at the given height. */
function reach(person: Figure, side: 'left' | 'right', targetY: number, out: number, bend: number, across: number) {
  let best = 60, error = Infinity;
  for (let forward = 20; forward <= 120; forward += 3) {
    arm(person, side, { forward, out, bend, across });
    const y = worldOf(person.hands[side]).y;
    if (Math.abs(y - targetY) < error) { error = Math.abs(y - targetY); best = forward; }
  }
  arm(person, side, { forward: best, out, bend, across });
}

export default defineThing({
  questions: {
    table: choice('What is on the table?', {
      plans: 'Only the plans, held flat.',
      laptop: 'The plans and an open laptop beside them.',
      lunch: 'The plans pushed aside by a lunch spread: wrappers, a thermos, cups.',
      tools: 'The plans with a cardboard drawing tube, a spirit level and a bucket of bolts.',
    }),
    second: noul('Does a second worker lean in from the end of the table?'),
    vest: choice('What colour is his vest?', {
      orange: 'Orange hi-vis.',
      yellow: 'Yellow hi-vis.',
      lime: 'Lime-green hi-vis.',
      none: 'No vest: a white shirt and a tie, the office man on site.',
    }),
    doing: choice('What is he doing?', {
      points: 'One finger on the drawing, the other hand flat on the sheet.',
      hips: 'Hands on hips, frowning down at the plan.',
      radio: 'Talking into the radio, one hand on the drawing.',
      flat: 'Both hands flat on the table, head down, thinking.',
    }),
    drawing: choice('What is the drawing?', {
      blueprint: 'A blue print, white lines on blue paper.',
      cad: 'A white computer print with fine black lines.',
      redpen: 'A white print marked up all over in red pen.',
      sketch: 'A felt-pen sketch on a flattened cardboard box.',
    }),
    sawhorses: choice('What are the sawhorses?', {
      timber: 'Rough timber sawhorses knocked up on site.',
      plastic: 'Yellow folding plastic sawhorses.',
      steel: 'Grey steel trestles.',
    }),
    weights: choice('What weighs the corners of the sheet down?', {
      radio: 'A two-way radio and a paper coffee cup.',
      brick: 'A brick and a tape measure.',
      hammer: 'A hammer and a phone.',
      nothing: 'Nothing: one corner is curling up in the wind.',
    }),
    hat: choice('What colour is his hard hat?', {
      white: 'White, the foreman\'s.', yellow: 'Yellow.', blue: 'Blue.', orange: 'Orange.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const TOP = 0.82, W = 2.0, D = 1.22, PLY = 0.018;

    // ---- sawhorses and the plywood sheet
    const horse = { timber: s.material('#b89560', { roughness: 0.9 }), plastic: s.material('#f2c21c', { roughness: 0.5 }), steel: s.material('#8d9296', { metalness: 0.5, roughness: 0.5 }) }[a.sawhorses];
    const legW = a.sawhorses === 'plastic' ? 0.06 : 0.04;
    for (const x of [-0.65, 0.65]) {
      const railY = TOP - 0.05;
      s.box([a.sawhorses === 'plastic' ? 0.12 : 0.09, 0.08, 0.95], [x, railY, 0], horse);
      for (const z of [-0.4, 0.4]) for (const side of [-1, 1]) {
        const foot: P = [x + side * 0.22, 0.02, z];
        s.rod(foot, [x + side * 0.03, railY - 0.03, z], legW / 2, horse);
      }
      if (a.sawhorses !== 'plastic') for (const side of [-1, 1]) s.rod([x + side * 0.17, 0.22, -0.4], [x + side * 0.17, 0.22, 0.4], 0.012, horse);
    }
    const plyTexture = paint(256, 160, (c) => {
      c.fillStyle = '#c9a66b'; c.fillRect(0, 0, 256, 160);
      for (let i = 0; i < 70; i++) { c.strokeStyle = `rgba(120,80,40,${0.08 + random() * 0.12})`; c.lineWidth = 1 + random() * 2; c.beginPath(); const y = random() * 160; c.moveTo(0, y); c.bezierCurveTo(80, y + (random() - 0.5) * 20, 170, y + (random() - 0.5) * 20, 256, y + (random() - 0.5) * 10); c.stroke(); }
      for (let i = 0; i < 5; i++) { c.fillStyle = 'rgba(90,60,30,0.3)'; c.beginPath(); c.ellipse(random() * 256, random() * 160, 6 + random() * 8, 4 + random() * 5, random(), 0, Math.PI * 2); c.fill(); }
    });
    const ply = new THREE.MeshStandardMaterial({ map: plyTexture, roughness: 0.9 });
    const sheet = s.box([W, PLY, D], [0, TOP - PLY / 2, 0], ply);
    void sheet;

    // ---- the drawing
    const ink = { blueprint: '#f0f4ff', cad: '#1a1d24', redpen: '#1a1d24', sketch: '#1a1d24' }[a.drawing];
    const paper = { blueprint: '#2b4f9a', cad: '#f4f3ec', redpen: '#f4f3ec', sketch: '#b58a55' }[a.drawing];
    const drawing = paint(512, 352, (c) => {
      c.fillStyle = paper; c.fillRect(0, 0, 512, 352);
      c.strokeStyle = ink; c.lineWidth = a.drawing === 'sketch' ? 4 : 1.5;
      c.strokeRect(24, 24, 464, 304);
      c.strokeRect(24, 300, 464, 28);
      // A column grid with a few rooms, a core and some dimension lines.
      const cols = 5 + Math.floor(random() * 3), rows = 3 + Math.floor(random() * 2);
      for (let i = 0; i <= cols; i++) for (let j = 0; j <= rows; j++) {
        const x = 60 + (i * 400) / cols, y = 50 + (j * 230) / rows;
        c.fillStyle = ink; c.fillRect(x - 4, y - 4, 8, 8);
        if (a.drawing !== 'sketch') { c.lineWidth = 0.6; c.beginPath(); c.moveTo(x, 40); c.lineTo(x, 290); c.stroke(); }
      }
      c.lineWidth = a.drawing === 'sketch' ? 4 : 2;
      for (let k = 0; k < 4; k++) c.strokeRect(60 + random() * 300, 50 + random() * 140, 60 + random() * 120, 50 + random() * 70);
      c.lineWidth = a.drawing === 'sketch' ? 5 : 3;
      c.strokeRect(220, 120, 80, 90);
      c.lineWidth = 1;
      for (let k = 0; k < 6; k++) { const y = 300 - k * 6; c.beginPath(); c.moveTo(60, y); c.lineTo(460, y); c.stroke(); }
      c.fillStyle = ink; c.font = 'bold 18px monospace'; c.fillText(`LEVEL ${20 + Math.floor(random() * 40)}  PLAN`, 300, 320);
      if (a.drawing === 'redpen') {
        c.strokeStyle = '#d8262c'; c.lineWidth = 4;
        for (let k = 0; k < 7; k++) { c.beginPath(); const x = 60 + random() * 380, y = 50 + random() * 230; c.ellipse(x, y, 18 + random() * 20, 12 + random() * 12, random(), 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(x, y); c.lineTo(x + (random() - 0.5) * 120, y + (random() - 0.5) * 80); c.stroke(); }
        c.font = 'bold 22px sans-serif'; c.fillStyle = '#d8262c'; c.fillText('NO', 90 + random() * 200, 90 + random() * 150); c.fillText('?', 300 + random() * 100, 200 + random() * 60);
      }
    });
    const planW = 0.9, planD = 0.62;
    const lunch = a.table === 'lunch';
    const planAt: P = [lunch ? -0.45 : -0.1, TOP + 0.0025, 0.02];
    const plan = s.mesh(new THREE.PlaneGeometry(planW, planD), new THREE.MeshStandardMaterial({ map: drawing, roughness: 0.9, side: THREE.DoubleSide }), planAt);
    plan.rotation.set(-Math.PI / 2, 0, 0.06);
    plan.castShadow = false;
    if (a.weights === 'nothing') {
      const curl = s.mesh(new THREE.CylinderGeometry(0.05, 0.05, planD, 12, 1, true, 0, Math.PI * 0.6), new THREE.MeshStandardMaterial({ color: paper, roughness: 0.9, side: THREE.DoubleSide }), [planAt[0] + planW / 2 - 0.02, TOP + 0.02, planAt[2]]);
      curl.rotation.set(Math.PI / 2, Math.PI * 0.9, 0);
    }
    const dark = s.material('#2a2c30', { roughness: 0.6 });
    const cornerA: P = [planAt[0] - planW / 2 + 0.08, TOP, planAt[2] + planD / 2 - 0.08];
    const cornerB: P = [planAt[0] + planW / 2 - 0.08, TOP, planAt[2] - planD / 2 + 0.08];
    const radioAt = (at: P) => {
      s.box([0.06, 0.16, 0.035], [at[0], at[1] + 0.08, at[2]], dark);
      s.rod([at[0] - 0.02, at[1] + 0.16, at[2]], [at[0] - 0.02, at[1] + 0.3, at[2]], 0.004, dark);
      s.box([0.04, 0.03, 0.004], [at[0], at[1] + 0.12, at[2] + 0.019], s.material('#5aa0d8', { emissive: '#3a80c8', emissiveIntensity: 0.6 }));
    };
    const coffeeAt = (at: P) => { s.cylinder(0.04, 0.032, 0.11, [at[0], at[1] + 0.055, at[2]], s.material('#f1ece2', { roughness: 0.6 }), 14); s.cylinder(0.041, 0.041, 0.012, [at[0], at[1] + 0.112, at[2]], s.material('#f8f8f6', { roughness: 0.4 }), 14); };
    if (a.weights === 'radio') { if (a.doing !== 'radio') radioAt(cornerA); else s.box([0.06, 0.06, 0.06], [cornerA[0], TOP + 0.03, cornerA[2]], s.material('#f2c21c', { roughness: 0.5 })); coffeeAt(cornerB); }
    if (a.weights === 'brick') { s.box([0.2, 0.065, 0.1], [cornerA[0], TOP + 0.033, cornerA[2]], s.material('#9a4a3a', { roughness: 0.95 })); s.box([0.065, 0.065, 0.065], [cornerB[0], TOP + 0.033, cornerB[2]], s.material('#f2c21c', { roughness: 0.5 })); }
    if (a.weights === 'hammer') {
      const handle = s.rod([cornerA[0] - 0.12, TOP + 0.015, cornerA[2] + 0.08], [cornerA[0] + 0.12, TOP + 0.015, cornerA[2] - 0.05], 0.014, s.material('#8a6a44', { roughness: 0.8 }));
      void handle;
      s.box([0.03, 0.03, 0.09], [cornerA[0] + 0.13, TOP + 0.02, cornerA[2] - 0.06], s.material('#4a4c50', { metalness: 0.6, roughness: 0.4 }));
      s.box([0.07, 0.008, 0.14], [cornerB[0], TOP + 0.004, cornerB[2]], dark);
      s.box([0.06, 0.004, 0.12], [cornerB[0], TOP + 0.0085, cornerB[2]], s.material('#9ab8d8', { emissive: '#7aa0d0', emissiveIntensity: 0.5 }));
    }
    if (a.table === 'laptop') {
      const lx = 0.62, lz = -0.1;
      s.box([0.34, 0.015, 0.24], [lx, TOP + 0.0075, lz], s.material('#8d9296', { metalness: 0.5, roughness: 0.4 }));
      const lid = s.box([0.34, 0.22, 0.008], [lx, TOP + 0.12, lz - 0.12], s.material('#8d9296', { metalness: 0.5, roughness: 0.4 }));
      lid.rotation.x = -0.25;
      const screen = s.box([0.31, 0.19, 0.004], [lx, TOP + 0.12, lz - 0.114], s.material('#2a5f9a', { emissive: '#3a78c0', emissiveIntensity: 0.8 }));
      screen.rotation.x = -0.25;
    }
    if (lunch) {
      const wrap = s.material('#efe8d2', { roughness: 0.95 });
      for (let i = 0; i < 4; i++) s.box([0.1 + random() * 0.08, 0.02, 0.08 + random() * 0.06], [0.25 + random() * 0.5, TOP + 0.01, -0.35 + random() * 0.7], wrap).rotation.y = random() * 3;
      s.cylinder(0.045, 0.045, 0.3, [0.5, TOP + 0.15, 0.3], s.material('#2f7a3a', { roughness: 0.45 }), 16);
      for (let i = 0; i < 3; i++) coffeeAt([0.2 + i * 0.16, TOP, 0.42 - i * 0.06]);
      s.ball([0.04, 0.038, 0.04], [0.75, TOP + 0.038, 0.1], s.material('#c8302a', { roughness: 0.4 }), 12);
    }
    if (a.table === 'tools') {
      const tube = s.cylinder(0.04, 0.04, 0.95, [0.45, TOP + 0.04, -0.4], s.material('#b58a55', { roughness: 0.9 }), 12);
      tube.rotation.z = Math.PI / 2;
      const level = s.box([0.8, 0.045, 0.025], [0.3, TOP + 0.0225, 0.45], s.material('#f2c21c', { roughness: 0.5 }));
      void level;
      s.cylinder(0.12, 0.1, 0.17, [0.8, TOP + 0.085, 0.3], s.material('#e8e4da', { roughness: 0.6 }), 14);
      s.scatter(new THREE.CylinderGeometry(0.4, 0.4, 1, 6), s.material('#4a4c50', { metalness: 0.6, roughness: 0.4 }), Array.from({ length: 12 }, () => ({ at: [0.8 + (random() - 0.5) * 0.14, TOP + 0.175, 0.3 + (random() - 0.5) * 0.14] as P, size: 0.028 })));
    }

    // ---- the foreman on the far side of the table, bent over the sheet
    const H = mix(1.72, 1.86, random());
    const build: Build = random() < 0.4 ? 'heavy' : 'average';
    const office = a.vest === 'none';
    const foreman = figure(s, {
      height: H, build, style: 'doll', pose: 'standing', hair: 'none', skin: pickSkin(random),
      top: office ? '#f2f1ea' : pick(random, ['#3a4a6a', '#4a4a50', '#6b5a48']), bottom: office ? '#2a2d36' : '#3f4a5c', shoes: '#3a2a20', sleeves: office ? 'long' : 'short',
    });
    s.root.add(foreman.root);
    foreman.root.position.set(0.05, 0, -D / 2 - 0.22);
    leg(foreman, 'left', { out: 7 });
    leg(foreman, 'right', { out: 7 });
    bow(foreman, a.doing === 'hips' ? 26 : 40);
    look(foreman, a.doing === 'radio' ? 10 : 42, a.doing === 'radio' ? 25 : -6);
    const pointSide = random() < 0.5 ? 'right' : 'left';
    const other = pointSide === 'right' ? 'left' : 'right';
    foreman.root.updateMatrixWorld(true);
    if (a.doing === 'points') { reach(foreman, pointSide, TOP + 0.02, 4, 10, 8); reach(foreman, other, TOP + 0.03, 10, 14, 4); }
    if (a.doing === 'flat') { reach(foreman, 'left', TOP + 0.03, 12, 14, 0); reach(foreman, 'right', TOP + 0.03, 12, 14, 0); }
    if (a.doing === 'radio') { reach(foreman, pointSide, TOP + 0.02, 4, 10, 8); arm(foreman, other, { forward: 48, out: 10, bend: 138, across: 34 }); }
    if (a.doing === 'hips') { arm(foreman, 'left', { forward: -14, out: 40, bend: 102, across: 64 }); arm(foreman, 'right', { forward: -14, out: 40, bend: 102, across: 64 }); }
    drop(foreman);
    hardHat(s, foreman, H, HAT_COLOURS[a.hat]);
    if (!office) vest(s, foreman, H, build, VEST_COLOURS[a.vest]);
    else {
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.035, H * 0.2, 0.01), s.material(pick(random, ['#8a1f2a', '#2a3a8a', '#2a5a3a']), { roughness: 0.6 }));
      tie.position.set(0, H * 0.28 * 0.6, H * 0.036 * 1.35 * (build === 'heavy' ? 1.25 : 1) + 0.006);
      tie.castShadow = true;
      foreman.joints.spine.add(tie);
    }
    boots(s, foreman, H, '#3a2a20');
    foreman.root.updateMatrixWorld(true);
    if (a.doing === 'radio') {
      const hand = worldOf(foreman.hands[other]);
      s.box([0.06, 0.15, 0.035], [hand.x, hand.y + 0.03, hand.z + 0.03], dark);
      s.rod([hand.x - 0.02, hand.y + 0.1, hand.z + 0.03], [hand.x - 0.03, hand.y + 0.26, hand.z + 0.02], 0.004, dark);
    }
    if (a.doing === 'points' || a.doing === 'radio') {
      // The pointing finger, laid on the drawing.
      const hand = worldOf(foreman.hands[pointSide]);
      s.rod([hand.x, hand.y - 0.01, hand.z], [hand.x + (pointSide === 'right' ? 0.02 : -0.02), TOP + 0.01, hand.z + 0.09], 0.011, s.material(foreman.root.children.length ? pickSkin(random) : '#d9b08c'));
    }

    // ---- the second worker leaning in from the end
    let mate: Figure | null = null;
    if (a.second) {
      const HM = mix(1.66, 1.8, random());
      const buildM: Build = random() < 0.3 ? 'slight' : 'average';
      mate = figure(s, { height: HM, build: buildM, style: 'doll', pose: 'standing', hair: 'none', skin: pickSkin(random), top: pick(random, ['#b8302a', '#5b7a9c', '#6e7074']), bottom: '#3f4a5c', shoes: '#5a4030', sleeves: 'short' });
      s.root.add(mate.root);
      mate.root.position.set(W / 2 + 0.3, 0, 0.15);
      mate.root.rotation.y = -Math.PI / 2;
      bow(mate, 30);
      look(mate, 36, 18);
      leg(mate, 'left', { out: 6 });
      leg(mate, 'right', { out: 6 });
      mate.root.updateMatrixWorld(true);
      reach(mate, 'left', TOP + 0.03, 14, 10, 0);
      reach(mate, 'right', TOP + 0.03, 14, 10, 0);
      drop(mate);
      hardHat(s, mate, HM, pick(random, [HAT_COLOURS.yellow, HAT_COLOURS.orange, HAT_COLOURS.blue]));
      vest(s, mate, HM, buildM, pick(random, [VEST_COLOURS.orange, VEST_COLOURS.yellow]));
      boots(s, mate, HM);
    }

    const energy = mood.energy;
    const head = foreman.joints.neck;
    const basePitch = head.rotation.x;
    return s.finish({
      update(dt, time) {
        foreman.update(dt, time);
        mate?.update(dt, time);
        head.rotation.x = basePitch + Math.sin(time * 1.3) * 0.03 * (0.3 + energy);
      },
    });
  },
});
