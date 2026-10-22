import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const paint = (width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

export default defineThing({
  questions: {
    light: choice('Which light on the timer is lit?', {
      green: 'Green: the round is on, work.',
      amber: 'Amber: thirty seconds left, empty the tank.',
      red: 'Red: rest, stop, sit down.',
      none: 'None: the box is dark and unplugged, its cable hanging.',
      all: 'All three stuck on at once, a fault nobody has fixed.',
    }),
    bell: choice('What kind of bell is it?', {
      ship: 'A hanging brass ship\'s bell with a knotted lanyard on the clapper.',
      gong: 'A flat domed ringside gong on a plate with a spring hammer and pull lever.',
      buzzer: 'An ugly grey electric buzzer horn with a red push button on a cord.',
      handbell: 'A wooden-handled brass hand bell standing on a little shelf.',
    }),
    state: choice('What is the bell doing right now?', {
      silent: 'Hanging silent, waiting for the next round.',
      ringing: 'Just struck: still shaking, the sound spreading out from it.',
      muffled: 'Muffled: a towel is draped and taped over it so it cannot ring.',
      broken: 'Broken: knocked crooked, its striker lying on the floor below.',
    }),
    pinned: choice('What is pinned to the board beside it?', {
      schedule: 'A typed weekly training schedule in a neat grid.',
      rent: 'A rent notice stamped FINAL in red.',
      obituary: 'A yellowed newspaper obituary clipping with a small photo.',
      card: 'A small fight-night handbill with two names and a date.',
      photo: 'A curling snapshot of a young fighter with gloves up.',
      nothing: 'Nothing any more: a pale rectangle and four tack holes.',
    }),
    display: choice('What does the timer read?', {
      round: '3:00, a round about to begin.',
      ten: '0:10, the last ten seconds.',
      rest: '1:00, a full minute of rest.',
      late: '12:47, a round nobody stopped.',
      dead: 'Nothing: a blank dead display.',
    }),
    board: choice('What is the backing board?', {
      plywood: 'A sheet of bare knotty plywood.',
      green: 'Tongue-and-groove planks in old gymnasium green.',
      pegboard: 'Brown perforated pegboard.',
      chalk: 'A blackboard with round tallies chalked on it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const brass = s.material('#c9a14a', { metalness: 0.85, roughness: mix(0.22, 0.55, mood.wear) });
    const steel = s.material('#7c8488', { metalness: 0.7, roughness: 0.4 });
    const boxPaint = s.material(mood.warmth > 0.5 ? '#3d4a44' : '#3e4650', { metalness: 0.4, roughness: 0.55 });
    const timber = s.material('#6f5238', { roughness: 0.85 });
    const dark = s.material('#1d1c1b', { roughness: 0.7 });
    const cloth = s.material('#e8e2d2', { roughness: 1 });

    // The board.
    const W = 1.05, BH = 1.15, BY = 1.27;
    const boardTex = paint(512, 560, (ctx) => {
      const base = { plywood: '#c9a877', green: '#5f8a6c', pegboard: '#8a6744', chalk: '#2c3531' }[a.board];
      ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 560);
      if (a.board === 'plywood') {
        for (let i = 0; i < 70; i++) {
          ctx.strokeStyle = `rgba(110,80,45,${0.08 + random() * 0.14})`; ctx.lineWidth = 1 + random() * 2;
          const y = random() * 560; ctx.beginPath(); ctx.moveTo(0, y);
          ctx.bezierCurveTo(170, y + (random() - 0.5) * 50, 340, y + (random() - 0.5) * 50, 512, y + (random() - 0.5) * 30); ctx.stroke();
        }
        for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(90,60,35,0.5)'; ctx.beginPath(); ctx.ellipse(random() * 512, random() * 560, 9, 5, 0, 0, 7); ctx.fill(); }
      } else if (a.board === 'green') {
        for (let x = 0; x < 512; x += 64) { ctx.fillStyle = 'rgba(20,40,30,0.55)'; ctx.fillRect(x, 0, 3, 560); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x + 3, 0, 3, 560); }
        for (let i = 0; i < 40 + mood.wear * 160; i++) {
          ctx.fillStyle = random() > 0.5 ? '#a98d68' : '#d8d2bd';
          ctx.fillRect(random() * 512, random() * 560, 3 + random() * 9 * (0.4 + mood.wear), 4 + random() * 22 * (0.4 + mood.wear));
        }
      } else if (a.board === 'pegboard') {
        ctx.fillStyle = '#3c2a1c';
        for (let x = 12; x < 512; x += 24) for (let y = 12; y < 560; y += 24) { ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.fill(); }
      } else {
        for (let i = 0; i < 26; i++) { ctx.fillStyle = `rgba(220,225,215,${0.03 + random() * 0.05})`; ctx.beginPath(); ctx.ellipse(random() * 512, random() * 560, 60 + random() * 90, 20 + random() * 30, random() * 3, 0, 7); ctx.fill(); }
        ctx.strokeStyle = 'rgba(240,240,230,0.85)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.font = 'bold 40px sans-serif'; ctx.fillStyle = 'rgba(240,240,230,0.85)'; ctx.fillText('RDS', 28, 470);
        const tallies = 4 + Math.floor(random() * 9);
        for (let i = 0; i < tallies; i++) {
          const x = 130 + i * 26 + Math.floor(i / 5) * 14;
          ctx.beginPath();
          if (i % 5 === 4) { ctx.moveTo(x - 116, 478); ctx.lineTo(x - 8, 432); } else { ctx.moveTo(x + (random() - 0.5) * 5, 430); ctx.lineTo(x + (random() - 0.5) * 5, 476); }
          ctx.stroke();
        }
      }
      for (let i = 0; i < 30 * mood.wear; i++) { ctx.fillStyle = `rgba(30,25,20,${0.05 + random() * 0.08})`; ctx.beginPath(); ctx.ellipse(random() * 512, random() * 560, 20 + random() * 50, 12 + random() * 30, random() * 3, 0, 7); ctx.fill(); }
    });
    const boardMat = new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.9 });
    s.box([W, BH, 0.035], [0, BY, 0], boardMat);
    s.box([W + 0.06, 0.05, 0.06], [0, BY + BH / 2 + 0.025, 0], timber);
    for (const x of [-1, 1]) {
      s.box([0.07, BY + BH / 2, 0.06], [x * (W / 2 - 0.08), (BY + BH / 2) / 2, -0.048], timber);
      s.box([0.08, 0.05, 0.62], [x * (W / 2 - 0.08), 0.025, -0.02], timber);
      s.rod([x * (W / 2 - 0.08), 0.05, -0.3], [x * (W / 2 - 0.08), 0.62, -0.075], 0.018, timber);
    }
    s.box([W - 0.2, 0.06, 0.04], [0, 0.38, -0.05], timber);
    for (const x of [-1, 1]) for (const y of [-1, 1]) s.cylinder(0.012, 0.012, 0.012, [x * (W / 2 - 0.08), BY + y * (BH / 2 - 0.06), 0.022], steel, 8).rotation.x = Math.PI / 2;

    // The bell, in a group that can shake.
    const bx = -0.25, by = 1.5;
    const bell = new THREE.Group();
    bell.position.set(bx, by + 0.17, 0.17);
    s.root.add(bell);
    const add = (mesh: THREE.Mesh, parent: THREE.Object3D) => { mesh.removeFromParent(); parent.add(mesh); return mesh; };
    let striker: THREE.Object3D | null = null;
    const ringing = a.state === 'ringing', broken = a.state === 'broken', muffled = a.state === 'muffled';
    if (a.bell === 'ship') {
      s.box([0.1, 0.14, 0.02], [bx, by + 0.2, 0.025], steel);
      s.rod([bx, by + 0.23, 0.03], [bx, by + 0.2, 0.17], 0.012, steel);
      s.rod([bx, by + 0.13, 0.03], [bx, by + 0.2, 0.17], 0.008, steel);
      add(s.lathe([[0.001, 0], [0.03, -0.004], [0.045, -0.02], [0.05, -0.05], [0.058, -0.1], [0.075, -0.15], [0.105, -0.185], [0.122, -0.2], [0.115, -0.205], [0.1, -0.19]], brass, [0, -0.02, 0]), bell);
      add(s.cylinder(0.018, 0.024, 0.03, [0, -0.008, 0], brass, 12), bell);
      const clapper = new THREE.Group();
      add(s.rod([0, -0.03, 0], [0, -0.2, 0], 0.005, steel), clapper);
      add(s.ball([0.022, 0.022, 0.022], [0, -0.2, 0], steel, 10), clapper);
      add(s.tube([[0, -0.22, 0], [0.006, -0.27, 0.004], [-0.006, -0.32, 0], [0.004, -0.38, 0.003]], 0.007, cloth), clapper);
      add(s.ball([0.014, 0.018, 0.014], [0.004, -0.39, 0.003], cloth, 8), clapper);
      if (broken) { clapper.position.set(bx + 0.1 + random() * 0.1, 0.03, 0.25 + random() * 0.1); clapper.rotation.set(Math.PI / 2, 0, random() * 3); clapper.position.y = 0.022; s.root.add(clapper); }
      else { bell.add(clapper); striker = clapper; }
    } else if (a.bell === 'gong') {
      bell.position.set(bx, by + 0.02, 0.03);
      add(s.box([0.34, 0.4, 0.02], [0, 0, 0], timber), bell);
      const dome = add(s.lathe([[0.001, 0.06], [0.05, 0.056], [0.1, 0.04], [0.135, 0.012], [0.145, 0], [0.135, 0], [0.1, 0.03]], brass, [0, 0.03, 0.01]), bell);
      dome.rotation.x = Math.PI / 2;
      add(s.cylinder(0.014, 0.014, 0.02, [0, 0.03, 0.075], steel, 10), bell).rotation.x = Math.PI / 2;
      const hammer = new THREE.Group();
      hammer.position.set(0.13, -0.17, 0.04);
      add(s.rod([0, 0, 0], [-0.06, 0.1, 0.02], 0.006, steel), hammer);
      add(s.ball([0.02, 0.02, 0.02], [-0.06, 0.1, 0.02], steel, 10), hammer);
      add(s.rod([0, 0, 0], [0.06, -0.03, 0.02], 0.006, steel), hammer);
      add(s.ball([0.014, 0.014, 0.014], [0.06, -0.03, 0.02], dark, 8), hammer);
      if (broken) { hammer.position.set(bx + 0.12, 0.02, 0.3); hammer.rotation.set(Math.PI / 2, 0, random() * 3); s.root.add(hammer); }
      else { bell.add(hammer); striker = hammer; }
      add(s.cylinder(0.012, 0.012, 0.03, [0.13, -0.17, 0.02], steel, 8), bell).rotation.x = Math.PI / 2;
    } else if (a.bell === 'buzzer') {
      bell.position.set(bx, by + 0.04, 0.03);
      add(s.box([0.2, 0.2, 0.1], [0, 0.04, 0.05], boxPaint), bell);
      const horn = add(s.lathe([[0.03, 0], [0.04, 0.04], [0.07, 0.1], [0.1, 0.14], [0.094, 0.14], [0.064, 0.1], [0.034, 0.04]], s.material('#9aa0a2', { metalness: 0.5, roughness: 0.45, side: THREE.DoubleSide }), [0, 0.04, 0.1]), bell);
      horn.rotation.x = Math.PI / 2 + 0.25;
      add(s.box([0.11, 0.03, 0.004], [0, -0.03, 0.102], s.material('#d9d2b8')), bell);
      s.rod([bx, by - 0.06, 0.05], [bx, by - 0.5, 0.03], 0.012, steel);
      const cord: [number, number, number][] = [[bx + 0.08, by - 0.04, 0.08], [bx + 0.16, by - 0.2, 0.12], [bx + 0.12, by - 0.42, 0.1], [bx + 0.13, by - 0.5, 0.09]];
      if (!broken) {
        s.tube(cord, 0.006, dark);
        s.cylinder(0.022, 0.022, 0.09, [bx + 0.13, by - 0.54, 0.09], dark, 10);
        s.cylinder(0.014, 0.014, 0.012, [bx + 0.13, by - 0.49, 0.09], s.material('#c5281f', { emissive: '#c5281f', emissiveIntensity: 0.4 }), 10);
      } else {
        s.tube([[bx + 0.08, by - 0.04, 0.08], [bx + 0.14, by - 0.12, 0.12], [bx + 0.12, by - 0.18, 0.1]], 0.006, dark);
        const push = s.cylinder(0.022, 0.022, 0.09, [bx + 0.15, 0.022, 0.3], dark, 10); push.rotation.z = Math.PI / 2; push.rotation.y = random() * 2;
      }
    } else {
      s.box([0.3, 0.025, 0.16], [bx, by - 0.12, 0.09], timber);
      for (const x of [-0.1, 0.1]) s.rod([bx + x, by - 0.13, 0.15], [bx + x, by - 0.24, 0.02], 0.008, steel);
      bell.position.set(bx, by - 0.107, 0.1);
      const hand = new THREE.Group();
      add(s.lathe([[0.018, 0.14], [0.03, 0.13], [0.045, 0.1], [0.06, 0.05], [0.085, 0.012], [0.095, 0], [0.085, 0], [0.07, 0.02]], brass), hand);
      add(s.lathe([[0.001, 0.31], [0.015, 0.305], [0.02, 0.27], [0.014, 0.22], [0.018, 0.17], [0.016, 0.14]], s.material('#3a241a', { roughness: 0.5 })), hand);
      hand.scale.setScalar(broken ? 1.35 : 1);
      if (broken) { hand.position.set(bx + 0.12 + random() * 0.1, 0.095, 0.32); hand.rotation.set(0, random() * 3, Math.PI / 2); hand.position.y = 0.125; s.root.add(hand); }
      else { bell.add(hand); striker = hand; }
    }
    bell.scale.setScalar(a.bell === 'buzzer' ? 1.15 : 1.35);
    if (broken) bell.rotation.z = (random() > 0.5 ? 1 : -1) * (0.35 + random() * 0.3);
    if (muffled) {
      const at: [number, number, number] = a.bell === 'ship' ? [bx, by + 0.03, 0.17] : a.bell === 'handbell' ? [bx, by + 0.03, 0.1] : [bx, by + 0.05, 0.11];
      const towel = s.material(mood.cheer > 0.5 ? '#e9e4d4' : '#b9b3a2', { roughness: 1 });
      s.ball(a.bell === 'handbell' ? [0.11, 0.17, 0.1] : a.bell === 'ship' ? [0.15, 0.15, 0.15] : [0.19, 0.19, 0.09], at, towel, 14);
      for (let i = 0; i < 4; i++) s.box([0.07, 0.16 + random() * 0.1, 0.012], [at[0] - 0.12 + i * 0.08, at[1] - 0.17 - random() * 0.04, at[2] + (random() - 0.5) * 0.05], towel).rotation.z = (random() - 0.5) * 0.3;
      const tape = s.material('#8d9296', { metalness: 0.3, roughness: 0.5 });
      s.ring(a.bell === 'handbell' ? 0.108 : a.bell === 'ship' ? 0.152 : 0.17, 0.012, [at[0], at[1] - 0.02, at[2]], tape).rotation.x = a.bell === 'gong' || a.bell === 'buzzer' ? 0.2 : Math.PI / 2;
      s.box([0.2, 0.035, 0.004], [at[0] + 0.02, at[1] + 0.17, 0.02], tape).rotation.z = 0.5;
    }
    const waves: THREE.Mesh[] = [];
    if (ringing) {
      const centre: [number, number, number] = a.bell === 'ship' ? [bx, by - 0.02, 0.17] : a.bell === 'handbell' ? [bx, by, 0.1] : [bx, by + 0.05, 0.12];
      for (let i = 0; i < 3; i++) {
        const wave = s.ring(0.2 + i * 0.075, 0.006, centre, new THREE.MeshBasicMaterial({ color: '#f6d77a', transparent: true, opacity: 0.55 - i * 0.14, depthWrite: false }), Math.PI * 0.5);
        wave.rotation.z = Math.PI * 0.82; wave.castShadow = false;
        const twin = s.ring(0.2 + i * 0.075, 0.006, centre, wave.material as THREE.Material, Math.PI * 0.5);
        twin.rotation.z = -Math.PI * 0.32; twin.castShadow = false;
        waves.push(wave, twin);
      }
    }

    // The interval timer box: display, three hooded lenses, conduit and switch.
    const tx = 0.27, ty = 1.48;
    s.box([0.24, 0.66, 0.13], [tx, ty, 0.085], boxPaint);
    s.box([0.26, 0.02, 0.15], [tx, ty + 0.34, 0.09], boxPaint);
    const reading = { round: '3:00', ten: '0:10', rest: '1:00', late: '12:47', dead: '' }[a.display];
    const unplugged = a.light === 'none';
    const live = reading !== '' && !unplugged;
    const display = s.label(live ? reading : ' ', 0.18, 0.08, [tx, ty + 0.26, 0.152], '#ff5a3c', '#1a0f0d');
    if (live) { const m = display.material as THREE.MeshStandardMaterial; m.emissive = new THREE.Color('#ffffff'); m.emissiveMap = m.map; m.emissiveIntensity = 0.9; }
    const colours = { green: '#27c24c', amber: '#ffb11f', red: '#ee2b1d' } as const;
    const lamps: THREE.MeshStandardMaterial[] = [];
    (['red', 'amber', 'green'] as const).forEach((name, index) => {
      const y = ty + 0.14 - index * 0.165;
      const on = a.light === name || a.light === 'all';
      const lens = new THREE.MeshStandardMaterial({ color: on ? colours[name] : new THREE.Color(colours[name]).multiplyScalar(0.22), emissive: colours[name], emissiveIntensity: on ? 2.2 : 0.02, roughness: 0.25 });
      s.ball([0.058, 0.058, 0.03], [tx, y, 0.15], lens, 16);
      s.ring(0.062, 0.008, [tx, y, 0.152], dark);
      const hood = s.mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.085, 16, 1, true, -Math.PI / 2, Math.PI), s.material('#1d1c1b', { side: THREE.DoubleSide }), [tx, y, 0.19]);
      hood.rotation.x = Math.PI / 2; hood.rotation.z = 0;
      if (on) {
        lamps.push(lens);
        const halo = s.mesh(new THREE.CircleGeometry(0.15, 24), new THREE.MeshBasicMaterial({ color: colours[name], transparent: true, opacity: 0.22, depthWrite: false }), [tx, y, 0.2]);
        halo.castShadow = false; halo.receiveShadow = false;
      }
    });
    s.rod([tx, ty - 0.33, 0.06], [tx, 0.86, 0.03], 0.011, steel);
    s.box([0.09, 0.12, 0.06], [tx, 0.82, 0.045], steel);
    s.box([0.016, 0.04, 0.02], [tx, unplugged ? 0.8 : 0.84, 0.08], dark);
    if (unplugged) {
      s.tube([[tx, 0.76, 0.05], [tx + 0.03, 0.4, 0.09], [tx - 0.02, 0.06, 0.2], [tx - 0.16, 0.012, 0.32], [tx - 0.3, 0.012, 0.28]], 0.007, dark);
      s.box([0.045, 0.024, 0.03], [tx - 0.32, 0.012, 0.28], dark);
    } else s.tube([[tx, 0.76, 0.05], [tx + 0.05, 0.45, 0.04], [tx + 0.14, 0.1, -0.02], [tx + 0.2, 0.01, -0.2]], 0.007, dark);

    // What is pinned to the board.
    const px = mix(-0.2, -0.12, random()), py = 0.98, tilt = (random() - 0.5) * 0.16;
    const pw = a.pinned === 'obituary' ? 0.2 : a.pinned === 'photo' ? 0.24 : 0.32, ph = a.pinned === 'photo' ? 0.28 : 0.42;
    const tack = s.material(a.pinned === 'rent' ? '#c5281f' : '#d8b13a', { metalness: 0.5, roughness: 0.4 });
    if (a.pinned === 'nothing') {
      const ghost = s.mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ color: '#fff6dc', transparent: true, opacity: 0.2, depthWrite: false }), [px, py, 0.019]);
      ghost.rotation.z = tilt; ghost.castShadow = false;
      for (const x of [-1, 1]) for (const y of [-1, 1]) s.cylinder(0.004, 0.004, 0.004, [px + x * pw * 0.46, py + y * ph * 0.46, 0.019], dark, 6).rotation.x = Math.PI / 2;
      s.box([0.05, 0.03, 0.002], [px - pw * 0.44, py + ph * 0.47, 0.02], cloth).rotation.z = 0.6;
    } else {
      const paper = paint(320, Math.round(320 * ph / pw), (ctx) => {
        const w = 320, h = Math.round(320 * ph / pw);
        const age = mix(0, 1, mood.wear);
        ctx.fillStyle = a.pinned === 'obituary' ? '#dccfa4' : a.pinned === 'rent' ? '#f1ebdd' : a.pinned === 'card' ? '#e9c765' : a.pinned === 'photo' ? '#f3efe4' : '#f4f0e2';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#2a2622'; ctx.textAlign = 'center';
        const lines = (x: number, y: number, width: number, count: number, gap: number, weight = 3) => {
          for (let i = 0; i < count; i++) { ctx.fillRect(x, y + i * gap, width * (i === count - 1 ? 0.55 : 0.86 + random() * 0.14), weight); }
        };
        if (a.pinned === 'schedule') {
          ctx.font = 'bold 30px sans-serif'; ctx.fillText('TRAINING', w / 2, 44);
          ctx.fillRect(20, 58, w - 40, 4);
          const rows = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
          rows.forEach((day, i) => {
            const y = 96 + i * 52; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'left'; ctx.fillText(day, 24, y);
            ctx.fillRect(20, y + 14, w - 40, 1.5);
            ctx.fillStyle = '#2a2622'; ctx.fillRect(96, y - 14, 60 + random() * 60, 6); ctx.fillRect(96, y - 2, 90 + random() * 100, 6);
          });
          ctx.strokeStyle = '#b3251c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(54, 88 + Math.floor(random() * 6) * 52, 40, 18, 0, 0, 7); ctx.stroke();
          ctx.fillRect(84, 66, 2, h - 90);
        } else if (a.pinned === 'rent') {
          ctx.font = 'bold 26px serif'; ctx.fillText('NOTICE TO TENANT', w / 2, 46);
          lines(30, 78, w - 60, 4, 18); lines(30, 180, w - 60, 3, 18);
          ctx.font = 'bold 24px monospace'; ctx.fillText('RENT PAST DUE', w / 2, 290);
          lines(30, 320, w - 60, 3, 18);
          ctx.save(); ctx.translate(w / 2, 200); ctx.rotate(-0.28); ctx.strokeStyle = ctx.fillStyle = '#c5281f'; ctx.lineWidth = 7; ctx.globalAlpha = 0.85;
          ctx.strokeRect(-112, -42, 224, 84); ctx.font = 'bold 66px sans-serif'; ctx.fillText('FINAL', 0, 24); ctx.restore();
        } else if (a.pinned === 'obituary') {
          ctx.fillStyle = '#2f2a22'; ctx.font = 'bold 34px serif'; ctx.fillText('OBITUARIES', w / 2, 44);
          ctx.fillRect(16, 56, w - 32, 3);
          ctx.fillStyle = '#8f8468'; ctx.fillRect(70, 76, 180, 190);
          ctx.fillStyle = '#3d372c'; ctx.beginPath(); ctx.ellipse(160, 150, 46, 56, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(160, 266, 92, 62, 0, Math.PI, 7); ctx.fill();
          ctx.fillStyle = '#2f2a22'; ctx.font = 'bold 30px serif'; ctx.fillText('"THE KID"', w / 2, 306); ctx.font = '24px serif'; ctx.fillText('1931 – 2002', w / 2, 338);
          lines(22, 362, w - 44, Math.floor((h - 380) / 16), 16, 4);
        } else if (a.pinned === 'card') {
          ctx.fillStyle = '#b3251c'; ctx.font = 'bold 54px serif'; ctx.fillText('BOXING', w / 2, 62);
          ctx.fillStyle = '#231f1c'; ctx.font = 'bold 24px serif'; ctx.fillText('FRIDAY NIGHT', w / 2, 98);
          ctx.fillRect(24, 112, w - 48, 5);
          ctx.font = 'bold 40px serif'; ctx.fillText('ORTIZ', w / 2, 176); ctx.fillStyle = '#b3251c'; ctx.font = 'bold 30px serif'; ctx.fillText('vs', w / 2, 216);
          ctx.fillStyle = '#231f1c'; ctx.font = 'bold 40px serif'; ctx.fillText('MALLOY', w / 2, 262);
          ctx.fillRect(24, 286, w - 48, 5); ctx.font = 'bold 22px serif'; ctx.fillText('10 ROUNDS', w / 2, 324); ctx.fillText('DOORS 7 P.M.', w / 2, 356);
          ctx.fillStyle = '#b3251c'; ctx.fillRect(24, 376, w - 48, 30);
        } else {
          ctx.fillStyle = '#6e7f8a'; ctx.fillRect(18, 18, w - 36, h - 90);
          ctx.fillStyle = '#c59a78'; ctx.beginPath(); ctx.ellipse(w / 2, 120, 40, 48, 0, 0, 7); ctx.fill();
          ctx.fillStyle = '#e8e2d2'; ctx.beginPath(); ctx.ellipse(w / 2, 280, 84, 110, 0, Math.PI, 7); ctx.fill();
          ctx.fillStyle = '#a8231c'; ctx.beginPath(); ctx.ellipse(w / 2 - 62, 196, 34, 40, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(w / 2 + 62, 196, 34, 40, 0, 0, 7); ctx.fill();
          ctx.fillStyle = '#2a2622'; ctx.fillRect(w / 2 - 34, 82, 68, 20);
          ctx.strokeStyle = '#33405a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(60, h - 36); ctx.bezierCurveTo(110, h - 70, 150, h - 10, 200, h - 44); ctx.bezierCurveTo(220, h - 56, 240, h - 30, 262, h - 40); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        for (let i = 0; i < 12 * age; i++) { ctx.fillStyle = `rgba(120,90,40,${0.06 + random() * 0.08})`; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 20 + random() * 60, 14 + random() * 40, random() * 3, 0, 7); ctx.fill(); }
      });
      const sheet = s.mesh(new THREE.PlaneGeometry(pw, ph, 6, 6), new THREE.MeshStandardMaterial({ map: paper, roughness: 0.9, side: THREE.DoubleSide }), [px, py, 0.024]);
      const curl = mix(0.01, 0.05, mood.wear) + (a.pinned === 'photo' ? 0.02 : 0);
      const pos = sheet.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / ph + 0.5, x = pos.getX(i) / pw; pos.setZ(i, (1 - y) * (1 - y) * curl + Math.abs(x) * (1 - y) * curl * 0.6); }
      sheet.geometry.computeVertexNormals();
      sheet.rotation.z = tilt;
      const tacks = a.pinned === 'obituary' || a.pinned === 'photo' ? [[0, 0.46]] : [[-0.42, 0.45], [0.42, 0.45]];
      for (const [x, y] of tacks) s.ball([0.011, 0.011, 0.007], [px + x * pw * Math.cos(tilt) - y * ph * Math.sin(tilt), py + y * ph, 0.028], tack, 8);
    }

    // Small things that accumulate on a timekeeper's board.
    if (mood.density > 0.3) {
      const hx = -0.42, hy = 0.9;
      s.rod([hx, hy + 0.3, 0.018], [hx, hy + 0.3, 0.05], 0.004, steel);
      s.tube([[hx, hy + 0.3, 0.045], [hx - 0.02, hy + 0.15, 0.03], [hx, hy + 0.02, 0.03], [hx + 0.02, hy + 0.15, 0.03], [hx, hy + 0.3, 0.045]], 0.003, s.material('#a8231c'));
      const watch = s.cylinder(0.04, 0.04, 0.016, [hx, hy - 0.02, 0.03], steel, 20); watch.rotation.x = Math.PI / 2;
      const face = s.cylinder(0.034, 0.034, 0.004, [hx, hy - 0.02, 0.04], s.material('#f1ecde'), 20); face.rotation.x = Math.PI / 2;
      s.rod([hx, hy - 0.02, 0.043], [hx + 0.012, hy + 0.004, 0.043], 0.002, dark);
      s.cylinder(0.008, 0.008, 0.016, [hx, hy + 0.028, 0.03], steel, 8);
    }
    if (mood.density > 0.55) {
      const y = 0.72;
      s.box([0.26, 0.02, 0.1], [0.3, y - 0.1, 0.06], timber);
      s.cylinder(0.035, 0.035, 0.03, [0.24, y - 0.075, 0.07], s.material('#b8281f', { metalness: 0.4 }), 14);
      const roll = s.cylinder(0.03, 0.03, 0.05, [0.35, y - 0.06, 0.07], cloth, 14); roll.rotation.x = Math.PI / 2;
    }
    if (mood.density > 0.75) {
      for (let i = 0; i < 3; i++) {
        const note = s.box([0.07 + random() * 0.04, 0.07 + random() * 0.03, 0.002], [0.02 + random() * 0.1, 0.72 + i * 0.01 + random() * 0.04, 0.02 + i * 0.002], s.material(['#f1e38a', '#e8e2d2', '#f0c2b2'][i]));
        note.rotation.z = (random() - 0.5) * 0.5; note.position.x += i * 0.05 - 0.2;
      }
    }

    const shake = mix(0.25, 1, mood.energy);
    const blink = a.light === 'all';
    return s.finish({
      update: (_dt, time) => {
        if (ringing) {
          const decay = 0.5 + 0.5 * Math.cos(time * 1.3);
          if (a.bell === 'ship') { bell.rotation.z = Math.sin(time * 9) * 0.22 * shake * decay; if (striker) striker.rotation.z = -Math.sin(time * 9 + 0.6) * 0.5 * shake * decay; }
          else if (a.bell === 'handbell') bell.rotation.z = Math.sin(time * 11) * 0.3 * shake * decay;
          else { bell.position.x = bx + Math.sin(time * 60) * 0.004 * shake; if (striker && a.bell === 'gong') striker.rotation.z = Math.abs(Math.sin(time * 9)) * 0.5 * shake; }
          waves.forEach((wave, index) => wave.scale.setScalar(1 + 0.12 * Math.sin(time * 6 * shake - Math.floor(index / 2))));
        }
        if (blink) lamps.forEach((lamp, index) => { lamp.emissiveIntensity = Math.sin(time * (5 + index * 2.3) * shake) > -0.4 ? 2.2 : 0.2; });
        else if (a.light === 'amber') for (const lamp of lamps) lamp.emissiveIntensity = Math.sin(time * 6 * shake) > 0 ? 2.4 : 0.5;
      },
    });
  },
});
