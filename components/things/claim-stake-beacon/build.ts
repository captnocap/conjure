import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score, type BuildContext } from '@conjure/kit';

const OWNERS = {
  company: 'A mining company: a clean enamel plate with a logo band, a barcode and a long claim number.',
  prospector: 'A lone prospector: a hand-painted board, crooked letters, a red rag for a flag.',
  coop: 'A family co-op: a green plate with a pick-and-star badge and a striped homemade pennant.',
  bank: 'The bank: a yellow lien notice and a black-and-yellow pennant.',
  nobody: 'Nobody any more: a scoured blank plate and a grey shred of cloth.',
} as const;
type Owner = keyof typeof OWNERS;
const DISPUTES = {
  none: 'Undisputed, standing straight and alone.',
  defaced: 'Defaced: the number crossed out in red spray and THIEF scrawled over it.',
  doubled: "Doubled: a rival's stake has been driven in right beside it, leaning in.",
  toppled: 'Knocked half over and left leaning, its foot torn out of the rock.',
  shot: 'Shot up: holes punched through the plate, the strobe lens smashed.',
  chained: 'Wrapped in chain with a padlock and a court notice: tied up in law.',
} as const;
const STROBES = { red: 'Red.', amber: 'Amber.', green: 'Green.', white: 'Cold blue-white.', violet: 'Violet.' } as const;
const STROBE_TINT: Record<keyof typeof STROBES, string> = { red: '#ff2a1c', amber: '#ffb020', green: '#3dff6a', white: '#bfe4ff', violet: '#b06aff' };

function texture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void, transparent = false) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  if (!transparent) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height); }
  draw(ctx);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

interface StakeOptions { owner: Owner; height: number; strobe: string; lit: boolean; defaced: boolean; shot: boolean; lean: number; turn: number }

function stake(context: BuildContext, options: StakeOptions) {
  const s = new Sculpture(context);
  const { mood, random } = context;
  const H = options.height;
  const steel = s.material('#8a9196', { metalness: 0.7, roughness: 0.4 });
  const dark = s.material('#2a2d30', { roughness: 0.7 });
  const post = options.owner === 'prospector' ? s.material('#7a5a3a', { roughness: 0.9 }) : options.owner === 'bank' ? s.material('#d8b820') : steel;
  const code = `${'KRVXTM'[Math.floor(random() * 6)]}-${1000 + Math.floor(random() * 8999)}`;

  // The post: an angle iron (or a timber) with a pointed driven foot.
  if (options.owner === 'prospector') s.box([0.1, H, 0.1], [0, H / 2, 0], post).rotation.y = 0.3;
  else { s.box([0.11, H, 0.02], [0, H / 2, 0], post); s.box([0.02, H, 0.11], [-0.045, H / 2, 0.045], post); }
  s.cylinder(0.16, 0.2, 0.08, [0, 0.04, 0], dark, 6);
  for (let i = 0; i < 4; i++) s.cylinder(0.025, 0.025, 0.12, [Math.cos(i * 1.57 + 0.7) * 0.13, 0.08, Math.sin(i * 1.57 + 0.7) * 0.13], steel, 6);

  // Plate.
  const palette = {
    company: { paper: '#eef0ec', ink: '#1c2a40', band: '#1f5fb0' },
    prospector: { paper: '#b08a5a', ink: '#1d1a16', band: '#b08a5a' },
    coop: { paper: '#3f7a52', ink: '#f2efe2', band: '#e8c040' },
    bank: { paper: '#f0d21c', ink: '#1a1a1a', band: '#1a1a1a' },
    nobody: { paper: '#a9aaa4', ink: '#8f908a', band: '#a9aaa4' },
  }[options.owner];
  const plate = texture(320, 200, (ctx) => {
    ctx.fillStyle = palette.paper; ctx.fillRect(0, 0, 320, 200);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = palette.ink;
    if (options.owner === 'company') {
      ctx.fillStyle = palette.band; ctx.fillRect(0, 0, 320, 46);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 28px monospace'; ctx.fillText('MINERAL CLAIM', 160, 24);
      ctx.fillStyle = palette.ink; ctx.font = 'bold 72px monospace'; ctx.fillText(code, 160, 104);
      for (let i = 0; i < 34; i++) ctx.fillRect(40 + i * 7, 154, 2 + Math.floor(random() * 4), 30);
    } else if (options.owner === 'prospector') {
      ctx.save(); ctx.translate(160, 70); ctx.rotate(-0.06); ctx.font = 'bold 86px serif'; ctx.fillText('MINE', 0, 0); ctx.restore();
      ctx.save(); ctx.translate(160, 150); ctx.rotate(0.04); ctx.font = 'bold 50px serif'; ctx.fillText(code, 0, 0); ctx.restore();
    } else if (options.owner === 'coop') {
      ctx.fillStyle = palette.band; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 16 : 38, t = i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(62 + Math.cos(t) * r, 62 + Math.sin(t) * r); }
      ctx.fill();
      ctx.fillStyle = palette.ink; ctx.font = 'bold 44px monospace'; ctx.fillText('CO-OP', 210, 60);
      ctx.font = 'bold 60px monospace'; ctx.fillText(code, 160, 144);
    } else if (options.owner === 'bank') {
      ctx.fillRect(0, 0, 320, 14); ctx.fillRect(0, 186, 320, 14);
      ctx.font = 'bold 54px monospace'; ctx.fillText('LIEN', 160, 50);
      ctx.font = 'bold 32px monospace'; ctx.fillText('NO ENTRY', 160, 104); ctx.font = 'bold 40px monospace'; ctx.fillText(code, 160, 152);
    } else {
      ctx.font = 'bold 64px monospace'; ctx.globalAlpha = 0.5; ctx.fillText(code, 160, 100); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#8a8478'; ctx.lineWidth = 3; for (let i = 0; i < 30; i++) { ctx.beginPath(); const y = random() * 200; ctx.moveTo(random() * 320, y); ctx.lineTo(random() * 320, y + (random() - 0.5) * 20); ctx.stroke(); }
    }
    if (options.defaced) {
      ctx.strokeStyle = '#d0201a'; ctx.lineWidth = 20; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(24, 30); ctx.lineTo(296, 176); ctx.moveTo(296, 24); ctx.lineTo(30, 180); ctx.stroke();
      ctx.fillStyle = '#d0201a'; ctx.font = 'bold 58px serif'; ctx.save(); ctx.translate(160, 100); ctx.rotate(-0.12); ctx.fillText('THIEF', 0, 0); ctx.restore();
    }
    if (options.shot) for (let i = 0; i < 5; i++) {
      const x = 40 + random() * 240, y = 30 + random() * 140;
      ctx.fillStyle = '#d8dadc'; ctx.beginPath(); ctx.arc(x, y, 17, 0, 7); ctx.fill();
      ctx.fillStyle = '#0c0c0e'; ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fill();
    }
    // Grime runs down from the top edge as it ages.
    ctx.fillStyle = `rgba(60,48,36,${mood.wear * 0.35})`; for (let i = 0; i < 12; i++) ctx.fillRect(random() * 320, 0, 6 + random() * 14, 40 + random() * 150);
  });
  const plateY = Math.max(H * 0.6, H - 0.75);
  const board = s.box([0.9, 0.56, 0.035], [0.02, plateY, 0.075], new THREE.MeshStandardMaterial({ map: plate, roughness: 0.6 }));
  board.rotation.z = options.owner === 'prospector' ? (random() - 0.5) * 0.2 : (random() - 0.5) * 0.04 * (1 + mood.wear * 3);
  for (const x of [-0.36, 0.4]) s.cylinder(0.022, 0.022, 0.05, [x, plateY + 0.2, 0.09], dark, 6).rotation.x = Math.PI / 2;

  // Strobe in a wire guard.
  const lens = new THREE.MeshStandardMaterial({ color: options.lit ? options.strobe : '#4a4d50', emissive: options.lit ? options.strobe : '#000000', emissiveIntensity: options.lit ? 1.8 : 0, roughness: 0.25 });
  s.cylinder(0.11, 0.13, 0.12, [0, H + 0.06, 0], dark, 10);
  if (options.shot) { const broken = s.mesh(new THREE.SphereGeometry(0.11, 8, 6, 0, Math.PI * 1.2, 0, Math.PI * 0.6), lens, [0, H + 0.16, 0]); (broken.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide; }
  else s.mesh(new THREE.CapsuleGeometry(0.1, 0.12, 4, 10), lens, [0, H + 0.24, 0]);
  for (let i = 0; i < 4; i++) { const t = i * Math.PI / 2; s.rod([Math.cos(t) * 0.14, H + 0.1, Math.sin(t) * 0.14], [Math.cos(t) * 0.14, H + 0.42, Math.sin(t) * 0.14], 0.012, steel); }
  s.ring(0.14, 0.012, [0, H + 0.42, 0], steel).rotation.x = Math.PI / 2;
  if (options.lit) s.ball([0.5, 0.5, 0.5], [0, H + 0.24, 0], new THREE.MeshBasicMaterial({ color: options.strobe, transparent: true, opacity: 0.14, depthWrite: false }), 12).castShadow = false;

  // Pennant: a tapering cloth, frayed further the harder its life has been.
  const fray = mix(0.1, 0.75, mood.wear);
  const colours = { company: ['#1f5fb0', '#f2f2ee'], prospector: ['#c8281c', '#c8281c'], coop: ['#e8c040', '#3f7a52'], bank: ['#18181a', '#f0d21c'], nobody: ['#8e8e88', '#7c7c76'] }[options.owner];
  const cloth = texture(256, 128, (ctx) => {
    ctx.clearRect(0, 0, 256, 128);
    ctx.beginPath(); ctx.moveTo(0, 0);
    const length = 256 * (1 - fray * 0.45);
    ctx.lineTo(length * 0.5, 14);
    for (let y = 22; y <= 106; y += 12) ctx.lineTo(length * (0.55 + random() * 0.45 * (1 - Math.abs(y - 64) / 80)) - (random() < fray ? 50 * random() : 0), y);
    ctx.lineTo(length * 0.5, 114); ctx.lineTo(0, 128); ctx.closePath(); ctx.clip();
    for (let i = 0; i < 6; i++) { ctx.fillStyle = colours[i % 2]; ctx.fillRect(i * 44, 0, 44, 128); }
    if (options.owner === 'prospector' || options.owner === 'nobody') { ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let i = 0; i < 6; i++) ctx.fillRect(random() * 240, 0, 12, 128); }
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < Math.round(fray * 6); i++) { ctx.beginPath(); ctx.ellipse(60 + random() * 150, 20 + random() * 90, 6 + random() * 12, 4 + random() * 8, random() * 3, 0, 7); ctx.fill(); }
  }, true);
  const flagGeometry = new THREE.PlaneGeometry(1.1, 0.5, 14, 4);
  flagGeometry.translate(0.55, 0, 0);
  const flagBase = Float32Array.from(flagGeometry.attributes.position.array);
  const flag = s.mesh(flagGeometry, new THREE.MeshStandardMaterial({ map: cloth, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }), [0.03, H - 0.32, 0]);
  const phase = random() * 6;
  const wave = (time: number) => {
    const position = flagGeometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = flagBase[i * 3], y = flagBase[i * 3 + 1];
      position.setXYZ(i, x, y - x * x * 0.16 + Math.sin(x * 5 + time * 2 + phase) * 0.03 * x, Math.sin(x * 6.5 - time * 3 + phase + y * 2) * 0.1 * x);
    }
    position.needsUpdate = true;
    flagGeometry.computeVertexNormals();
  };
  wave(0);
  flag.rotation.y = -0.5 + options.turn;

  s.root.rotation.z = options.lean;
  return { root: s.root, lens, wave, height: H };
}

export default defineThing({
  questions: {
    owner: choice('Whose claim is it?', OWNERS),
    dispute: choice('Is the claim disputed?', DISPUTES),
    strobe: choice('What colour is the strobe?', STROBES),
    alive: choice('What is the strobe doing?', {
      flashing: 'Flashing steadily, on duty.',
      steady: 'Stuck on, a hard unblinking point.',
      dead: 'Dead and dark, the battery long gone.',
    }),
    height: score('How tall is the stake?', ['A knee-high peg', 'Chest high', 'Taller than a person', 'A mast you could see from the far rim']),
    foot: choice('What is at its foot?', {
      chips: 'Only the chips thrown up when it was driven.',
      cairn: 'A cairn of stacked stones holding it up.',
      bottles: 'Empty bottles and ration tins from whoever kept watch here.',
      offerings: 'Small offerings: a candle, a ribbon, a coin dish, as at a grave.',
      samples: 'Bagged ore samples lined up and tagged.',
    }),
    guyed: noul('Is it braced with guy wires?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.5, 3.8, a.height);
    const tint = STROBE_TINT[a.strobe];
    const toppled = a.dispute === 'toppled';
    const main = stake(context, { owner: a.owner, height: H, strobe: tint, lit: a.alive !== 'dead' && a.dispute !== 'shot', defaced: a.dispute === 'defaced', shot: a.dispute === 'shot', lean: toppled ? -mix(0.6, 0.95, random()) : (random() - 0.5) * 0.06 * (1 + mood.wear * 2), turn: 0 });
    s.root.add(main.root);
    const steel = s.material('#8a9196', { metalness: 0.7, roughness: 0.4 });
    const stone = s.material('#807b73', { flatShading: true, roughness: 0.95 });
    const lenses = [main.lens];
    const waves = [main.wave];

    if (a.dispute === 'doubled') {
      const others = (Object.keys(OWNERS) as Owner[]).filter((owner) => owner !== a.owner && owner !== 'nobody');
      const rivalTint = Object.values(STROBE_TINT).filter((value) => value !== tint)[Math.floor(random() * 4)];
      const rival = stake(context, { owner: others[Math.floor(random() * others.length)], height: H * mix(0.8, 1.2, random()), strobe: rivalTint, lit: true, defaced: false, shot: false, lean: 0.2, turn: 0.9 });
      rival.root.position.set(-0.95, 0, 0.2);
      rival.root.rotation.y = 0.35;
      s.root.add(rival.root);
      lenses.push(rival.lens); waves.push(rival.wave);
    }
    if (a.dispute === 'chained') {
      const chain = s.material('#5c6266', { metalness: 0.8, roughness: 0.4 });
      for (let i = 0; i < 5; i++) s.ring(0.17 + (i % 2) * 0.03, 0.022, [0, H * 0.25 + i * 0.09, 0.02], chain).rotation.set(Math.PI / 2 + (random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5);
      s.box([0.16, 0.14, 0.06], [0.14, H * 0.25, 0.16], s.material('#c9a23a', { metalness: 0.7 }));
      s.ring(0.05, 0.015, [0.14, H * 0.25 + 0.09, 0.16], steel, Math.PI);
      s.label('COURT ORDER', 0.5, 0.3, [0.06, Math.max(0.5, H * 0.6 - 0.5), 0.1], '#1a1a1a', '#f6f4ea').rotation.z = -0.07;
    }
    if (toppled) {
      // The torn-out socket and the rubble it levered up.
      s.cylinder(0.2, 0.12, 0.05, [0.05, 0.025, 0], s.material('#222224'), 8);
      for (let i = 0; i < 6; i++) s.mesh(new THREE.DodecahedronGeometry(mix(0.06, 0.16, random()), 0), stone, [0.2 + random() * 0.5, 0.06, (random() - 0.5) * 0.6]);
    }

    if (a.guyed && !toppled) for (let i = 0; i < 3; i++) {
      const t = i * Math.PI * 2 / 3 + 0.5, reach = H * 0.55 + 0.3;
      const end: [number, number, number] = [Math.cos(t) * reach, 0.05, Math.sin(t) * reach];
      s.rod([0, H * 0.86, 0], end, 0.012, steel);
      s.rod(end, [end[0] * 1.06, 0.22, end[2] * 1.06], 0.03, steel);
    }

    const rocks: { at: [number, number, number]; size: number; color: string }[] = [];
    for (let i = 0; i < 12; i++) { const t = random() * 7, d = 0.2 + random() * 0.4; rocks.push({ at: [Math.cos(t) * d, 0.04, Math.sin(t) * d], size: mix(0.04, 0.1, random()), color: ['#807b73', '#6b6761', '#99948a'][i % 3] }); }
    s.scatter(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#fff', roughness: 0.95, flatShading: true }), rocks);
    if (a.foot === 'cairn') {
      for (let i = 0; i < 14; i++) { const ring = i < 7 ? 0 : i < 12 ? 1 : 2, t = i * 0.9 + ring; const d = [0.3, 0.2, 0.12][ring];
        const rock = s.mesh(new THREE.DodecahedronGeometry(mix(0.11, 0.16, random()), 0), stone, [Math.cos(t) * d, 0.08 + ring * 0.15, Math.sin(t) * d]); rock.scale.y = 0.65; rock.rotation.y = random() * 3; }
    } else if (a.foot === 'bottles') {
      for (let i = 0; i < 6; i++) {
        const t = random() * 7, d = 0.4 + random() * 0.5, down = random() > 0.5;
        const glass = s.material(['#3f7a4a', '#7a5a2a', '#c8d8d8'][i % 3], { roughness: 0.2, metalness: 0.1 });
        const bottle = s.cylinder(0.035, 0.05, 0.26, [Math.cos(t) * d, down ? 0.05 : 0.13, Math.sin(t) * d], glass, 8);
        if (down) bottle.rotation.set(Math.PI / 2, 0, random() * 3);
      }
      for (let i = 0; i < 3; i++) s.cylinder(0.07, 0.07, 0.1, [0.5 + i * 0.16, 0.05, 0.4 - i * 0.2], s.material('#b9bec2', { metalness: 0.8 }), 10);
    } else if (a.foot === 'offerings') {
      s.cylinder(0.04, 0.04, 0.16, [0.3, 0.08, 0.3], s.material('#f2ead0'), 8);
      s.ball([0.03, 0.05, 0.03], [0.3, 0.2, 0.3], new THREE.MeshStandardMaterial({ color: '#ffd070', emissive: '#ffa030', emissiveIntensity: mix(0.8, 2.2, mood.warmth) }), 8);
      s.cylinder(0.13, 0.09, 0.04, [-0.3, 0.02, 0.35], s.material('#c9a23a', { metalness: 0.8 }), 12);
      for (let i = 0; i < 4; i++) s.box([0.04, 0.3 + random() * 0.2, 0.005], [0.07, H * 0.3 + i * 0.07, 0.03 + i * 0.01], s.material(['#e84a5a', '#f2f0e8', '#4a8ae8', '#e8c040'][i], { side: THREE.DoubleSide })).rotation.z = 0.3 + random() * 0.6;
      for (let i = 0; i < 5; i++) s.ball([0.04, 0.04, 0.04], [-0.1 + i * 0.09, 0.04, 0.5], s.material(['#e8e4d8', '#e84a5a'][i % 2]), 6);
    } else if (a.foot === 'samples') {
      for (let i = 0; i < 5; i++) {
        const sack = s.ball([0.12, 0.15, 0.12], [-0.5 + i * 0.26, 0.13, 0.5 + Math.sin(i) * 0.06], s.material('#b8a67c', { roughness: 0.95 }), 8);
        sack.rotation.z = (random() - 0.5) * 0.3;
        s.box([0.07, 0.09, 0.005], [-0.5 + i * 0.26, 0.3, 0.52], s.material(['#f2f0e8', '#e8c040', '#e86a4a'][i % 3]));
      }
    }

    const rate = mix(1.5, 7, mood.energy);
    return s.finish({
      footprint: 0.9,
      update: (_dt, time) => {
        for (const run of waves) run(time * mix(0.2, 1.6, mood.energy));
        if (a.alive === 'flashing') lenses.forEach((lens, index) => { if (lens.emissiveIntensity > 0 || lens.userData.lit) { lens.userData.lit = true; lens.emissiveIntensity = Math.sin(time * rate + index * 2) > 0.5 ? 2.6 : 0.15; } });
      },
    });
  },
});
