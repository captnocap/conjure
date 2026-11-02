import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = [number, number, number];
interface Piece { at: V3; size: V3; rot?: V3; color?: THREE.ColorRepresentation }

function pieces(geometry: THREE.BufferGeometry, material: THREE.Material, items: Piece[], parent: THREE.Object3D) {
  if (!items.length) { geometry.dispose(); return null; }
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), euler = new THREE.Euler();
  items.forEach((item, index) => {
    euler.set(...(item.rot ?? [0, 0, 0]));
    matrix.compose(new THREE.Vector3(...item.at), turn.setFromEuler(euler), new THREE.Vector3(...item.size));
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, new THREE.Color(item.color ?? '#ffffff'));
  });
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export default defineThing({
  questions: {
    colour: choice('What colour is the accordion?', {
      red: 'Deep red pearl with cream trim, the dance-hall classic.',
      ivory: 'Yellowed ivory pearl with gold lettering.',
      black: 'Glossy black with chrome, a serious instrument.',
      blue: 'Sea-blue pearl, a little gaudy.',
      green: 'Bottle-green pearl, old and well loved.',
    }),
    state: choice('What is the accordion doing?', {
      playing: 'Stretched wide on the stool, bellows heaving as if still mid-waltz.',
      resting: 'Sat down for a moment, half closed, still sighing a little.',
      strapped: 'Buckled shut with its strap: the set is over.',
      ground: 'Set down on the pavement, leaning against the stool.',
    }),
    coins: score('How has the day gone, judging by the case?', ['An empty lining', 'A few coppers', 'A decent scatter of coins', 'Heaped with coins and a couple of notes']),
    lining: choice('What is the case lined with?', {
      crimson: 'Crimson velvet.',
      blue: 'Royal blue plush.',
      green: 'Moth-eaten green baize.',
      gold: 'Faded mustard corduroy.',
    }),
    tucked: choice('What is tucked into the lid of the case?', {
      nothing: 'Nothing.',
      woman: 'A small photograph of a woman.',
      child: 'A photograph of a child.',
      village: 'A postcard of a village far away.',
      merci: 'A hand-lettered card that says MERCI.',
      saint: 'A little gilt icon of a saint.',
    }),
    seat: choice('What does the accordion sit on?', {
      folding: 'A folding canvas stool.',
      chair: 'A borrowed wooden cafe chair.',
      crate: 'An upturned plastic crate.',
    }),
    beside: choice('What else is beside the case?', {
      nothing: 'Nothing.',
      beret: 'A beret on the ground.',
      dog: 'A small dog curled asleep.',
      thermos: 'A thermos and a half-eaten sandwich in paper.',
      amp: 'A tiny battered battery amplifier.',
    }),
    grille: choice('What pattern is in the accordion grille?', { zigzag: 'Alternating diagonal vents.', bars: 'Straight horizontal bars.', diamonds: 'A lattice of tiny diamonds.', dots: 'Rows of round perforations.' }),
    bassLayout: choice('How many columns of bass buttons are fitted?', { two: 'A compact two-column bass.', three: 'Three columns.', four: 'Four close columns.', six: 'A full six-column button field.' }),
    bellowsFolds: choice('How closely are the bellows pleated?', { broad: 'Eight broad folds.', normal: 'Thirteen folds.', fine: 'Eighteen fine folds.', tight: 'Twenty-four closely packed folds.' }),
    caseCorners: choice('What protects the corners of the instrument case?', { bare: 'Plain leather corners.', brass: 'Bright brass corner plates.', steel: 'Dull steel corner guards.', stitched: 'Brown leather patches with pale stitches.' }),
    caseHandle: choice('What handle is on the case?', { none: 'The handle is missing.', leather: 'A curved leather grip.', rigid: 'A squared metal carrying handle.', rope: 'A knotted rope replacement.' }),
    musicStand: choice('What holds the busker’s music?', { none: 'No music stand.', low: 'A low folding wire stand with one page.', tall: 'A tall black stand carrying an open score.', board: 'A wooden music board propped on a tripod.' }),
    spareKit: choice('What spare kit waits by the stool?', { none: 'No extra kit.', straps: 'A rolled leather shoulder strap.', metronome: 'A small wooden metronome.', repair: 'An open repair tin with tools and a spare reed plate.' }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const bodyColour = { red: '#a81e28', ivory: '#eadfc2', black: '#1a1a1d', blue: '#1f558f', green: '#1d6a50' }[a.colour];
    const pearl = s.material(bodyColour, { roughness: 0.22, metalness: 0.15 });
    const trim = s.material(a.colour === 'ivory' ? '#b8963e' : a.colour === 'black' ? '#c9cdd0' : '#efe6d0', { roughness: 0.3, metalness: a.colour === 'red' || a.colour === 'blue' || a.colour === 'green' ? 0 : 0.7 });
    const leather = s.material('#3a2618', { roughness: 0.8 });
    const plain = s.material('#ffffff', { roughness: 0.4 });

    // Seat.
    const SX = -0.3, SZ = -0.18;
    let seatY = 0.46;
    if (a.seat === 'folding') {
      const frame = s.material('#8a6a42');
      for (const side of [-1, 1]) {
        s.rod([SX - 0.2, 0, SZ + side * 0.17], [SX + 0.2, 0.45, SZ + side * 0.17], 0.015, frame);
        s.rod([SX + 0.2, 0, SZ + side * 0.17], [SX - 0.2, 0.45, SZ + side * 0.17], 0.015, frame);
      }
      for (const dx of [-0.2, 0.2]) s.rod([SX + dx, 0.45, SZ - 0.17], [SX + dx, 0.45, SZ + 0.17], 0.015, frame);
      s.box([0.4, 0.015, 0.36], [SX, 0.455, SZ], s.material(pick(['#3f5f7a', '#7a3f3a', '#5a6a3a', '#c9b88a']), { roughness: 1 }));
    } else if (a.seat === 'chair') {
      const wood = s.material('#6a4426', { roughness: 0.5 });
      for (const dx of [-0.17, 0.17]) { s.rod([SX + dx, 0, SZ + 0.17], [SX + dx, 0.45, SZ + 0.16], 0.018, wood); s.rod([SX + dx, 0, SZ - 0.2], [SX + dx * 0.95, 0.9, SZ - 0.24], 0.018, wood); }
      s.cylinder(0.21, 0.21, 0.03, [SX, 0.455, SZ], wood, 20);
      s.box([0.36, 0.1, 0.02], [SX, 0.84, SZ - 0.235], wood);
      s.box([0.34, 0.05, 0.02], [SX, 0.66, SZ - 0.225], wood);
    } else {
      seatY = 0.31;
      const crate = s.material(pick(['#c8382c', '#2a62b0', '#e0b020', '#2f8a4f']), { roughness: 0.6 });
      s.box([0.42, 0.03, 0.32], [SX, 0.285, SZ], crate);
      for (const y of [0.04, 0.16]) { s.box([0.42, 0.06, 0.02], [SX, y, SZ + 0.15], crate); s.box([0.42, 0.06, 0.02], [SX, y, SZ - 0.15], crate); s.box([0.02, 0.06, 0.32], [SX - 0.2, y, SZ], crate); s.box([0.02, 0.06, 0.32], [SX + 0.2, y, SZ], crate); }
      for (const dx of [-0.2, 0.2]) for (const dz of [-0.15, 0.15]) s.box([0.03, 0.3, 0.03], [SX + dx, 0.15, SZ + dz], crate);
    }

    const seatGroup=new THREE.Group();seatGroup.name='accordion-seat';seatGroup.add(...s.root.children);s.root.add(seatGroup);seatGroup.updateMatrixWorld(true);
    const seatLift=-new THREE.Box3().setFromObject(seatGroup,true).min.y;seatGroup.position.y+=seatLift;
    seatY=(a.seat==='folding'?.4625:a.seat==='chair'?.47:.3)+seatLift;
    if(a.state!=='ground'){const board=s.box([1.08,.025,.36],[SX,seatY+.0125,SZ],s.material('#8c6945'));board.name='accordion-support-board';seatY+=.025;}
    // The accordion.
    const acc = new THREE.Group(), inner = new THREE.Group();acc.name='accordion-instrument';
    acc.add(inner);
    s.root.add(acc);
    const H = 0.42, Dp = 0.2;
    const treble = new THREE.Group(), bellows = new THREE.Group(), bass = new THREE.Group();
    inner.add(treble, bellows, bass);
    const into = (group: THREE.Group, mesh: THREE.Object3D) => { group.add(mesh); return mesh; };
    // Treble side: body, grille, keyboard.
    into(treble, s.box([0.15, H, Dp], [-0.075, H / 2, 0], pearl));
    into(treble, s.box([0.11, H * 0.82, 0.012], [-0.075, H / 2, Dp / 2 + 0.006], trim));
    const fret: Piece[] = [];
    for (let i = 0; i < 9; i++) {
      if(a.grille==='dots')for(const x of[-.105,-.075,-.045])fret.push({at:[x,.07+i*.035,Dp/2+.013],size:[.009,.009,.004],color:'#22201e'});
      else {fret.push({at:[-.075,.07+i*.035,Dp/2+.013],size:[.09,.009,.004],rot:[0,0,a.grille==='bars'?0:i%2?.5:-.5],color:'#22201e'});if(a.grille==='diamonds')fret.push({at:[-.075,.07+i*.035,Dp/2+.013],size:[.09,.006,.004],rot:[0,0,i%2?-.5:.5],color:'#22201e'});}
    }
    pieces(new THREE.BoxGeometry(1, 1, 1), plain, fret, treble);
    into(treble, s.box([0.035, H * 0.98, 0.075], [-0.165, H / 2 - 0.01, Dp / 2 + 0.01], s.material('#1c1c1e', { roughness: 0.4 })));
    const keys: Piece[] = [];
    for (let i = 0; i < 17; i++) keys.push({ at: [-0.185, 0.012 + i * 0.0235, Dp / 2 + 0.012], size: [0.012, 0.021, 0.07], color: '#f6f2e6' });
    for (let i = 0; i < 16; i++) if (![2, 6, 9, 13].includes(i)) keys.push({ at: [-0.194, 0.024 + i * 0.0235, Dp / 2 - 0.002], size: [0.012, 0.012, 0.04], color: '#151515' });
    pieces(new THREE.BoxGeometry(1, 1, 1), plain, keys, treble);
    // Bass side: body, button field, hand strap.
    into(bass, s.box([0.12, H, Dp], [0.06, H / 2, 0], pearl));
    const buttons: Piece[] = [];
    const bassColumns={two:2,three:3,four:4,six:6}[a.bassLayout];
    for (let c = 0; c < bassColumns; c++) for (let r = 0; r < 12; r++) buttons.push({ at: [0.124, 0.06 + r * 0.027 + c * 0.006, -.06+c*(.12/(bassColumns-1))], size: [0.01, 0.014, 0.014], color: c === 1 && r % 4 === 0 ? '#c9a23a' : '#f1ece0' });
    pieces(new THREE.SphereGeometry(0.6, 8, 6), plain, buttons, bass);
    into(bass, s.box([0.008, H * 0.86, 0.045], [0.135, H / 2, 0.06], leather));
    into(bass, s.box([0.12, 0.02, Dp + 0.004], [0.06, H - 0.03, 0], trim));
    into(treble, s.box([0.15, 0.02, Dp + 0.004], [-0.075, H - 0.03, 0], trim));
    // Bellows: unit length along x, scaled live.
    const folds = {broad:8,normal:13,fine:18,tight:24}[a.bellowsFolds], pleats: Piece[] = [];
    const edge = a.colour === 'black' ? '#b3202a' : a.colour === 'ivory' ? '#7a1f24' : '#e9e0c8';
    for (let i = 0; i < folds; i++) {
      pleats.push({ at: [(i + 0.5) / folds, H / 2, 0], size: [0.62 / folds, H - 0.035, Dp - 0.02], color: '#1e1b1c' });
      pleats.push({ at: [(i + 0.5) / folds, H / 2, 0], size: [0.22 / folds, H - 0.012, Dp - 0.002], color: i % 2 ? edge : '#3a3234' });
    }
    pieces(new THREE.BoxGeometry(1, 1, 1), plain, pleats, bellows);
    // Shoulder straps.
    const strap = s.tube([[-0.1, H - 0.02, -Dp / 2], [-0.12, H * 0.75, -Dp / 2 - 0.1], [-0.1, H * 0.3, -Dp / 2 - 0.12], [-0.08, 0.03, -Dp / 2]], 0.012, leather);
    strap.scale.z = 1;
    treble.add(strap);

    const playing = a.state === 'playing';
    const baseWidth = playing ? 0.42 : a.state === 'resting' ? 0.22 : a.state === 'ground' ? 0.17 : 0.12;
    const amplitude = playing ? mix(0.05, 0.13, mood.energy) : a.state === 'resting' ? 0.025 : a.state === 'ground' ? 0.008 : 0;
    const setWidth = (width: number) => {
      bellows.scale.x = width;
      bass.position.x = width;
      inner.position.x = -width / 2 + 0.015;
    };
    setWidth(baseWidth);
    if (a.state === 'strapped') {
      const band = s.box([baseWidth + 0.3, 0.03, 0.006], [0, H * 0.55, Dp / 2 + 0.004], leather);
      acc.add(band);
      acc.add(s.box([0.03, 0.04, 0.01], [0.02, H * 0.55, Dp / 2 + 0.008], s.material('#c9cdd0', { metalness: 0.8, roughness: 0.3 })));
    }
    if (a.state === 'ground') {
      acc.position.set(SX + 0.02, 0.02, SZ + 0.36);
      acc.rotation.set(-0.22, 0.1 + (random() - 0.5) * 0.2, 0);
    } else {
      acc.position.set(SX, seatY + 0.008, SZ);
      acc.rotation.set(playing ? -0.08 : 0, (random() - 0.5) * 0.3, playing ? 0.06 : 0);
    }

    // The case, open on the ground.
    const CX = 0.42, CZ = 0.3, CW = 0.6, CD = 0.46, CH = 0.13;
    const box = new THREE.Group();
    box.position.set(CX, 0, CZ);
    box.rotation.y = -0.25 + (random() - 0.5) * 0.3;
    s.root.add(box);
    const shell = s.material('#231f1d', { roughness: 0.75 });
    const liningColour = new THREE.Color({ crimson: '#9a1626', blue: '#1f3fa0', green: '#3f6a48', gold: '#b8923a' }[a.lining]);
    liningColour.lerp(new THREE.Color('#7a7468'), mood.wear * 0.35);
    const lining = s.material(liningColour, { roughness: 1 });
    const half = (parent: THREE.Object3D) => {
      parent.add(s.box([CW, 0.02, CD], [0, 0.01, 0], shell));
      parent.add(s.box([CW - 0.03, 0.012, CD - 0.03], [0, 0.026, 0], lining));
      for (const side of [-1, 1]) {
        parent.add(s.box([0.018, CH, CD], [side * (CW / 2 - 0.009), CH / 2, 0], shell));
        parent.add(s.box([CW, CH, 0.018], [0, CH / 2, side * (CD / 2 - 0.009)], shell));
        parent.add(s.box([0.006, CH - 0.03, CD - 0.04], [side * (CW / 2 - 0.02), CH / 2 + 0.01, 0], lining));
      }
    };
    half(box);
    const lid = new THREE.Group();
    lid.position.set(0, CH, -CD / 2);
    lid.rotation.x = -(Math.PI / 2 + 0.25 + random() * 0.2);
    const lidInner = new THREE.Group();
    lidInner.position.set(0, CH, CD / 2);
    lidInner.rotation.x = Math.PI;
    lid.add(lidInner);
    half(lidInner);
    box.add(lid);
    for (const dx of [-0.18, 0.18]) box.add(s.box([0.05, 0.03, 0.012], [dx, CH - 0.03, CD / 2 + 0.006], s.material('#b9bcc0', { metalness: 0.8, roughness: 0.3 })));

    if (a.tucked !== 'nothing') {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 160;
      const g = canvas.getContext('2d')!;
      const sepia = '#d9c8a2';
      g.fillStyle = a.tucked === 'merci' ? '#b08a5a' : a.tucked === 'saint' ? '#c9a23a' : '#f4efe2'; g.fillRect(0, 0, 128, 160);
      if (a.tucked === 'merci') { g.fillStyle = '#1a1a1a'; g.font = 'bold 40px Georgia, serif'; g.textAlign = 'center'; g.fillText('MERCI', 64, 92, 112); }
      else {
        g.fillStyle = a.tucked === 'village' ? '#8fb8d8' : a.tucked === 'saint' ? '#7a2a2a' : sepia; g.fillRect(8, 8, 112, 124);
        g.fillStyle = '#4a3a2a';
        if (a.tucked === 'woman') { g.beginPath(); g.arc(64, 60, 26, 0, 7); g.fill(); g.beginPath(); g.ellipse(64, 132, 44, 40, 0, Math.PI, 0); g.fill(); g.fillStyle = '#2a1f18'; g.beginPath(); g.arc(64, 50, 30, Math.PI, 0); g.fill(); }
        else if (a.tucked === 'child') { g.beginPath(); g.arc(64, 78, 20, 0, 7); g.fill(); g.beginPath(); g.ellipse(64, 132, 28, 30, 0, Math.PI, 0); g.fill(); }
        else if (a.tucked === 'village') { g.fillStyle = '#6a8a4a'; g.fillRect(8, 90, 112, 42); g.fillStyle = '#e9e2d0'; g.fillRect(30, 70, 24, 30); g.fillRect(62, 60, 14, 40); g.fillRect(82, 76, 26, 24); g.fillStyle = '#b3462a'; g.beginPath(); g.moveTo(58, 60); g.lineTo(69, 38); g.lineTo(80, 60); g.fill(); g.fillRect(28, 64, 28, 8); g.fillRect(80, 70, 30, 8); }
        else { g.fillStyle = '#e8c86a'; g.beginPath(); g.arc(64, 52, 26, 0, 7); g.fill(); g.fillStyle = '#3a2418'; g.beginPath(); g.arc(64, 54, 15, 0, 7); g.fill(); g.fillStyle = '#1f3f7a'; g.beginPath(); g.ellipse(64, 132, 34, 56, 0, Math.PI, 0); g.fill(); }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const card = s.mesh(new THREE.PlaneGeometry(0.13, 0.16), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7, side: THREE.DoubleSide }), [(random() - 0.5) * 0.3, 0.036, (random() - 0.5) * 0.1]);
      card.rotation.set(-Math.PI / 2, 0, Math.PI + (random() - 0.5) * 0.4);
      lidInner.add(card);
    }

    // Takings.
    const amount = Math.round(a.coins * a.coins * 150 + a.coins * 6);
    const money: Piece[] = [];
    const metals = ['#c9a23a', '#b9bcc0', '#b06a3a', '#d8c070'];
    for (let i = 0; i < amount; i++) {
      const outside = random() < 0.08;
      const r = 0.009 + random() * 0.005, spread = a.coins > 0.8 ? 0.55 : 0.9;
      const x = outside ? (random() - 0.5) * 1.0 : (random() - 0.5) * (CW - 0.08) * spread, z = outside ? CD / 2 + 0.05 + random() * 0.2 : (random() - 0.5) * (CD - 0.08) * spread;
      const heap = outside ? 0 : Math.max(0, a.coins - 0.7) * 0.12 * Math.max(0, 1 - Math.hypot(x / 0.2, z / 0.16)) * random();
      money.push({ at: [x, (outside ? 0.003 : 0.035) + heap + random() * 0.004, z], size: [r, 0.0025, r], rot: [(random() - 0.5) * 0.5, random() * 3, (random() - 0.5) * 0.5], color: a.coins < 0.4 ? pick(['#b06a3a', '#b06a3a', '#c9a23a']) : pick(metals) });
    }
    pieces(new THREE.CylinderGeometry(1, 1, 1, 10), s.material('#ffffff', { metalness: 0.7, roughness: 0.35 }), money, box);
    if (a.coins > 0.75) for (let i = 0; i < 2 + Math.floor(random() * 3); i++) {
      const note = s.box([0.12, 0.002, 0.062], [(random() - 0.5) * 0.3, 0.05 + i * 0.004 + (a.coins - 0.7) * 0.08, (random() - 0.5) * 0.24], s.material(pick(['#7fa8c8', '#d89a5a', '#8fb88a'])));
      note.rotation.set((random() - 0.5) * 0.3, random() * 3, (random() - 0.5) * 0.3);
      box.add(note);
    }

    // Beside the case.
    const bx = -0.25, bz = 0.62;
    if (a.beside === 'beret') {
      const felt = s.material(mood.cheer > 0.6 ? '#a81e28' : '#1c1c22', { roughness: 1 });
      s.ball([0.13, 0.03, 0.13], [bx, 0.03, bz], felt, 16);
      s.cylinder(0.004, 0.004, 0.025, [bx, 0.065, bz], felt, 6);
    } else if (a.beside === 'dog') {
      const fur = s.material(pick(['#c9a878', '#3a3028', '#e9e2d4', '#8a5a2c']), { roughness: 1 });
      s.ball([0.16, 0.08, 0.12], [bx, 0.08, bz], fur, 14);
      s.ball([0.065, 0.055, 0.065], [bx + 0.15, 0.06, bz + 0.07], fur, 12);
      s.ball([0.035, 0.03, 0.045], [bx + 0.19, 0.05, bz + 0.12], fur, 8);
      s.ball([0.03, 0.012, 0.045], [bx + 0.11, 0.09, bz + 0.09], s.material('#2a2018'), 8);
      s.tube([[bx - 0.14, 0.04, bz - 0.03], [bx - 0.18, 0.03, bz + 0.07], [bx - 0.08, 0.03, bz + 0.14]], 0.018, fur);
    } else if (a.beside === 'thermos') {
      s.cylinder(0.04, 0.04, 0.25, [bx, 0.125, bz], s.material('#2f6a4a', { metalness: 0.4, roughness: 0.4 }), 14);
      s.cylinder(0.042, 0.042, 0.05, [bx, 0.27, bz], s.material('#d0d2d0', { metalness: 0.7 }), 14);
      s.box([0.2, 0.004, 0.18], [bx + 0.2, 0.003, bz + 0.02], s.material('#efe9d8')).rotation.y = 0.4;
      s.box([0.1, 0.035, 0.07], [bx + 0.2, 0.022, bz + 0.02], s.material('#d8b070', { roughness: 0.9 })).rotation.y = 0.4;
    } else if (a.beside === 'amp') {
      s.box([0.22, 0.24, 0.14], [bx, 0.12, bz], s.material('#2a2622', { roughness: 0.9 })).rotation.y = 0.3;
      const face = s.cylinder(0.08, 0.08, 0.01, [bx + 0.022, 0.11, bz + 0.068], s.material('#8a8478', { roughness: 1 }), 16);
      face.rotation.set(Math.PI / 2, 0, -0.3, 'ZYX');
      s.ball([0.008, 0.008, 0.008], [bx - 0.03, 0.225, bz + 0.075], new THREE.MeshStandardMaterial({ color: '#ff3a2a', emissive: '#ff2a1a', emissiveIntensity: 1.5 }), 6);
    }

    const hardware=s.material(a.caseCorners==='brass'?'#b79854':'#9fa8a9',{metalness:.65,roughness:.4});
    if(a.caseCorners!=='bare')for(const x of[-1,1])for(const z of[-1,1]) {
      const mat=a.caseCorners==='stitched'?leather:hardware;
      box.add(s.box([.07,.045,.012],[x*(CW/2-.035),.03,z*(CD/2+.003)],mat));
      box.add(s.box([.012,.045,.07],[x*(CW/2+.003),.03,z*(CD/2-.035)],mat));
      if(a.caseCorners==='stitched')for(let i=0;i<4;i++)box.add(s.box([.006,.002,.003],[x*(CW/2-.06+i*.012),.055,z*(CD/2+.011)],trim));
    }
    if(a.caseHandle==='leather')box.add(s.tube([[-.09,.07,CD/2+.02],[-.06,.07,CD/2+.09],[.06,.07,CD/2+.09],[.09,.07,CD/2+.02]],.012,leather));
    else if(a.caseHandle==='rigid'){box.add(s.rod([-.08,.065,CD/2+.07],[.08,.065,CD/2+.07],.012,hardware));for(const x of[-.08,.08])box.add(s.rod([x,.065,CD/2],[x,.065,CD/2+.07],.01,hardware));}
    else if(a.caseHandle==='rope'){box.add(s.tube([[-.08,.07,CD/2],[0,.07,CD/2+.11],[.08,.07,CD/2]],.009,s.material('#c3aa7e')));for(const x of[-.08,.08])box.add(s.ball([.015,.015,.015],[x,.07,CD/2+.01],leather,8));}
    if(a.musicStand!=='none') {
      const x=.75,z=-.55,h=a.musicStand==='low'?.55:1.05,mat=a.musicStand==='board'?s.material('#9d7953'):s.material('#343a3c');
      for(let i=0;i<3;i++){const t=i*Math.PI*2/3;s.rod([x,.2,z],[x+Math.sin(t)*.21,.012,z+Math.cos(t)*.21],.012,mat);}
      s.rod([x,.15,z],[x,h,z],.012,mat);
      const desk=new THREE.Group();s.root.add(desk);desk.position.set(x,h,z);desk.rotation.x=-.22;
      if(a.musicStand==='low'){for(const dx of[-.2,.2])desk.add(s.rod([dx,-.12,0],[dx,.13,0],.006,mat));for(const y of[-.12,.13])desk.add(s.rod([-.2,y,0],[.2,y,0],.006,mat));}
      else desk.add(s.box([.44,.3,.016],[0,0,0],mat));
      desk.add(s.box([.45,.025,.06],[0,-.14,.025],mat));
      const music=document.createElement('canvas');music.width=256;music.height=192;const pen=music.getContext('2d')!;pen.fillStyle='#e6dcc6';pen.fillRect(0,0,256,192);pen.strokeStyle=pen.fillStyle='#44413b';pen.lineWidth=1;
      for(let row=0;row<3;row++)for(let line=0;line<5;line++){const y=25+row*55+line*5;pen.beginPath();pen.moveTo(14,y);pen.lineTo(242,y);pen.stroke();}
      for(let i=0;i<24;i++){const x=25+(i%8)*28,y=30+Math.floor(i/8)*55+(i%4)*5;pen.beginPath();pen.ellipse(x,y,4,3,-.3,0,Math.PI*2);pen.fill();pen.fillRect(x+3,y-17,1.5,18);}
      const tex=new THREE.CanvasTexture(music);tex.colorSpace=THREE.SRGBColorSpace;desk.add(s.mesh(new THREE.PlaneGeometry(a.musicStand==='low'?.31:.4,.23),new THREE.MeshStandardMaterial({map:tex,side:THREE.DoubleSide}),[0,-.005,.012]));
    }
    if(a.spareKit==='straps'){s.cylinder(.065,.065,.04,[-.75,.02,.1],leather,20);s.box([.045,.005,.18],[-.75,.0025,.2],leather);}
    else if(a.spareKit==='metronome'){s.cylinder(.035,.075,.19,[-.75,.095,.1],s.material('#9b6c3f'),4).rotation.y=Math.PI/4;s.box([.06,.12,.006],[-.75,.12,.149],trim);s.rod([-.75,.055,.155],[-.72,.185,.155],.003,hardware);}
    else if(a.spareKit==='repair'){s.box([.24,.025,.16],[-.75,.0125,.1],hardware);s.box([.24,.08,.01],[-.75,.05,.025],hardware);for(let i=0;i<4;i++)s.rod([-.84+i*.05,.03,.045],[-.84+i*.05,.03,.145],.004,hardware);s.box([.08,.007,.04],[-.75,.03,.12],trim);}
    // The moving instrument stays on its actual support throughout the bellows cycle.
    const vertex=new THREE.Vector3(),matrix=new THREE.Matrix4(),instance=new THREE.Matrix4();
    const settleAccordion=()=>{
      acc.updateWorldMatrix(true,true);s.root.updateWorldMatrix(true,false);
      const inverse=new THREE.Matrix4().copy(s.root.matrixWorld).invert();let lowest=Infinity;
      acc.traverse(node=>{const m=node as THREE.Mesh;if(!m.isMesh)return;const p=m.geometry.getAttribute('position');const count=(m as THREE.InstancedMesh).isInstancedMesh?(m as THREE.InstancedMesh).count:1;
        for(let n=0;n<count;n++){matrix.multiplyMatrices(inverse,m.matrixWorld);if((m as THREE.InstancedMesh).isInstancedMesh){(m as THREE.InstancedMesh).getMatrixAt(n,instance);matrix.multiply(instance);}for(let i=0;i<p.count;i++){vertex.fromBufferAttribute(p,i).applyMatrix4(matrix);lowest=Math.min(lowest,vertex.y);}}
      });
      acc.position.y+=(a.state==='ground'?0:seatY)-lowest;
    };
    settleAccordion();

    const tempo = mix(0.8, 2.6, mood.energy), phase = random() * 6;
    return s.finish({
      update: (_dt, time) => { if (amplitude) {setWidth(baseWidth + Math.sin(time * tempo + phase) * amplitude);settleAccordion();} },
    });
  },
});
