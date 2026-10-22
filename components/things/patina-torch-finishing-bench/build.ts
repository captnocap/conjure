import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

const PATINAS = {
  verdigris: 'Verdigris: chalky blue-green blooming over the bronze, like an old church roof.',
  brown: 'Classic statuary brown: warm chocolate with honey highlights on the high points.',
  black: 'Deep black-brown, almost soot, the high points rubbed back to gold.',
  gilt: 'Gilt: gold leaf being laid on, bright and buttery.',
  ferric: 'Ferric red-brown, transparent and warm like old leather.',
} as const;
type Patina = keyof typeof PATINAS;
/** [patina colour, darker, lighter, haze colour] */
const COLOURS: Record<Patina, [string, string, string, string]> = {
  verdigris: ['#5aa88e', '#2f6c5c', '#9fd3bd', '#7fbfa2'],
  brown: ['#6a3f22', '#3e2414', '#a8713f', '#8a6a4a'],
  black: ['#221c18', '#120f0d', '#5a4532', '#6e6a66'],
  gilt: ['#e0b448', '#a77a22', '#f6dc8a', '#d9cfb8'],
  ferric: ['#8c3f1f', '#5a2412', '#c06a38', '#b07850'],
};

function canvasTexture(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const rgba = (hex: string, alpha: number) => {
  const c = new THREE.Color(hex);
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${alpha})`;
};

/** Raw bronze with the patina going on in blooms: coverage grows with progress until the colour is whole. */
function patinaTexture(random: () => number, patina: Patina, progress: number, text: string | null) {
  const [colour, dark, light] = COLOURS[patina];
  return canvasTexture(256, 256, (c) => {
    c.fillStyle = '#b8864a';
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 30; i++) {
      c.fillStyle = rgba(random() < 0.5 ? '#d9a868' : '#8a5f30', 0.25);
      c.beginPath(); c.ellipse(random() * 256, random() * 256, 10 + random() * 30, 6 + random() * 20, random() * 3, 0, 7); c.fill();
    }
    const blooms = Math.round(mix(3, 140, progress));
    for (let i = 0; i < blooms; i++) {
      const x = random() * 256, y = random() * 256, r = mix(14, 46, progress) * (0.5 + random() * 0.8);
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      const tone = random() < 0.3 ? dark : random() < 0.25 ? light : colour;
      g.addColorStop(0, rgba(tone, 0.95));
      g.addColorStop(0.7, rgba(tone, 0.7));
      g.addColorStop(1, rgba(tone, 0));
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    if (progress > 0.7) {
      c.fillStyle = rgba(colour, (progress - 0.7) * 2.4);
      c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 40; i++) {
        c.fillStyle = rgba(random() < 0.5 ? dark : light, 0.3);
        c.beginPath(); c.ellipse(random() * 256, random() * 256, 4 + random() * 16, 3 + random() * 10, random() * 3, 0, 7); c.fill();
      }
    }
    if (text) {
      // A plaque: a raised border and lettering rubbed back to bright metal.
      c.strokeStyle = '#e2b46c';
      c.lineWidth = 8;
      c.strokeRect(14, 14, 228, 228);
      c.fillStyle = '#e8bd74';
      c.textAlign = 'center';
      c.font = 'bold 30px serif';
      text.split('\n').forEach((line, i, lines) => c.fillText(line, 128, 128 + (i - (lines.length - 1) / 2) * 40, 210));
    }
  });
}

export default defineThing({
  questions: {
    piece: choice('What sits on the turntable being coloured?', {
      head: 'A life-size bronze portrait head on a short neck and block.',
      hand: 'A bronze hand rising from a wrist, fingers curled.',
      bell: 'A small cast bell sitting mouth down, a loop on its crown.',
      plaque: 'A memorial plaque propped on a little easel, raised border and lettering.',
      figurine: 'A bronze figurine of a dancer, arms raised, on a round base.',
    }),
    patina: choice('What colour is the patina?', PATINAS),
    progress: score('How far has the colouring got?', ['Raw sandblasted bronze, the first dab of chemical', 'Patchy: blooms of colour spreading', 'An even coat all over', 'Finished and waxed to a soft sheen']),
    torch: noul('Is the propane torch lit and playing its blue flame on the piece?'),
    bottles: choice('What state are the chemical bottles in?', {
      tidy: 'Lined up in a tidy row along the back edge, labels facing out.',
      knocked: 'Two knocked over, a coloured spill spreading and dripping off the edge.',
      cluttered: 'A crowd of bottles, jars, cups and brushes everywhere.',
    }),
    bench: choice('What kind of bench is it?', {
      steel: 'A welded steel table on angle-iron legs, its plate top blued and scorched.',
      wood: 'A heavy old timber bench, its top burnt black in rings.',
    }),
    bucket: noul('Is there a bucket of water with a sponge beside the bench?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [, , , hazeColour] = COLOURS[a.patina];
    const steelBench = a.bench === 'steel';
    const W = 1.5, Dp = 0.75, TOP = 0.9, plate = steelBench ? 0.04 : 0.08;

    // ---- The bench.
    const topTexture = canvasTexture(512, 256, (c) => {
      c.fillStyle = steelBench ? '#5d6064' : '#8a6842';
      c.fillRect(0, 0, 512, 256);
      if (!steelBench) {
        c.strokeStyle = 'rgba(60,40,22,0.35)';
        for (let i = 0; i < 6; i++) { c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 20 + i * 42); c.lineTo(512, 20 + i * 42); c.stroke(); }
      }
      for (let i = 0; i < 300; i++) {
        c.fillStyle = `rgba(0,0,0,${0.05 + random() * 0.08})`;
        c.fillRect(random() * 512, random() * 256, 2 + random() * 6, 1 + random() * 2);
      }
      // Scorch rings and heat colours where the turntable stands.
      const cx = 512 * 0.4, cy = 256 * 0.45;
      const scorch = mix(0.5, 0.95, mood.wear);
      for (let ring = 4; ring >= 0; ring--) {
        const r = 30 + ring * 22;
        const g = c.createRadialGradient(cx, cy, r * 0.4, cx, cy, r);
        const tone = steelBench ? ['#2a2b33', '#3f4c78', '#7a5a8a', '#b08a46', '#5d6064'][ring] : ['#140d08', '#20140c', '#3a2414', '#5a3a20', '#8a6842'][ring];
        g.addColorStop(0, rgba(tone, scorch));
        g.addColorStop(1, rgba(tone, 0));
        c.fillStyle = g;
        c.fillRect(0, 0, 512, 256);
      }
      for (let i = 0; i < 6 + mood.wear * 10; i++) {
        const x = random() * 512, y = random() * 256, r = 10 + random() * 30;
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(20,14,10,0.55)');
        g.addColorStop(1, 'rgba(20,14,10,0)');
        c.fillStyle = g;
        c.fillRect(x - r, y - r, r * 2, r * 2);
      }
      // Old patina splashes.
      for (let i = 0; i < 18; i++) {
        c.fillStyle = rgba(COLOURS[(['verdigris', 'brown', 'ferric', 'black'] as Patina[])[Math.floor(random() * 4)]][0], 0.35 + random() * 0.3);
        c.beginPath(); c.ellipse(random() * 512, random() * 256, 3 + random() * 14, 2 + random() * 8, random() * 3, 0, 7); c.fill();
      }
    });
    const topMat = new THREE.MeshStandardMaterial({ map: topTexture, metalness: steelBench ? 0.5 : 0, roughness: steelBench ? 0.55 : 0.85 });
    const frame = steelBench ? s.material('#3c3f43', { metalness: 0.6, roughness: 0.5 }) : s.material('#6e5134', { roughness: 0.85 });
    s.box([W, plate, Dp], [0, TOP - plate / 2, 0], topMat);
    const leg = steelBench ? 0.05 : 0.09;
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
      s.box([leg, TOP - plate, leg], [dx * (W / 2 - leg / 2 - 0.03), (TOP - plate) / 2, dz * (Dp / 2 - leg / 2 - 0.03)], frame);
    }
    // Rails and a lower shelf.
    const shelfY = 0.18;
    for (const dz of [-1, 1]) s.box([W - 0.08, steelBench ? 0.035 : 0.07, steelBench ? 0.035 : 0.04], [0, TOP - plate - 0.05, dz * (Dp / 2 - 0.05)], frame);
    s.box([W - 0.1, 0.025, Dp - 0.1], [0, shelfY, 0], steelBench ? s.material('#4a4d51', { metalness: 0.4 }) : s.material('#7a5c3c', { roughness: 0.9 }));
    // Things kept on the shelf: a box of rags and spare bottles.
    s.box([0.34, 0.16, 0.26], [-0.45, shelfY + 0.09, 0.05], s.material('#a8875a', { roughness: 0.9 }));
    for (let i = 0; i < 3; i++) s.cylinder(0.04, 0.04, 0.2, [0.15 + i * 0.11, shelfY + 0.11, -0.1], s.material(['#6d4a2a', '#e8e4da', '#3a6a9a'][i], { roughness: 0.4 }), 12);

    // ---- The turntable and the piece on it.
    const tx = -0.15, tz = 0.02;
    const ironMat = s.material('#2c2e31', { metalness: 0.6, roughness: 0.5 });
    s.cylinder(0.13, 0.15, 0.03, [tx, TOP + 0.015, tz], ironMat, 24);
    s.cylinder(0.035, 0.035, 0.1, [tx, TOP + 0.08, tz], ironMat, 12);
    s.cylinder(0.19, 0.19, 0.022, [tx, TOP + 0.14, tz], ironMat, 32);
    const stand = TOP + 0.151, PS = 1.3;
    const progress = a.progress;
    const plaqueText = ['IN MEMORY\nOF THE CREW', 'EST.\n1926', 'FOUNDED\nBY HAND', 'LEST WE\nFORGET'][Math.floor(random() * 4)];
    const pieceMat = new THREE.MeshStandardMaterial({
      map: patinaTexture(random, a.patina, progress, a.piece === 'plaque' ? plaqueText : null),
      metalness: a.patina === 'gilt' ? mix(0.6, 0.9, progress) : mix(0.7, 0.25, progress),
      roughness: progress > 0.85 ? 0.32 : mix(0.4, 0.75, progress),
    });
    const piece = new THREE.Group();
    piece.position.set(tx, stand, tz);
    s.root.add(piece);
    const put = (geometry: THREE.BufferGeometry, at: P3, rotation: P3 = [0, 0, 0], scale: P3 = [1, 1, 1], material: THREE.Material = pieceMat) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.rotation.set(...rotation);
      mesh.scale.set(...scale);
      mesh.castShadow = mesh.receiveShadow = true;
      piece.add(mesh);
      return mesh;
    };
    let pieceTop = 0.3, aim = new THREE.Vector3(tx, stand + 0.15, tz);
    if (a.piece === 'head') {
      put(new THREE.BoxGeometry(0.16, 0.07, 0.15), [0, 0.035, 0], [0, 0, 0], [1, 1, 1], s.material('#1d1c1b', { roughness: 0.6 }));
      put(new THREE.CylinderGeometry(0.05, 0.065, 0.11, 16), [0, 0.12, 0.0]);
      put(new THREE.SphereGeometry(0.12, 24, 18), [0, 0.12, -0.01], [0, 0, 0], [1.2, 0.35, 0.8]);
      put(new THREE.SphereGeometry(0.105, 24, 18), [0, 0.28, 0.01], [0, 0, 0], [0.9, 1.15, 1]);
      put(new THREE.ConeGeometry(0.018, 0.045, 8), [0, 0.275, 0.115], [Math.PI / 2, 0, 0]);
      for (const side of [-1, 1]) put(new THREE.SphereGeometry(0.022, 10, 8), [side * 0.095, 0.28, 0.0], [0, 0, 0], [0.5, 1, 0.8]);
      put(new THREE.SphereGeometry(0.108, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), [0, 0.3, -0.005], [-0.2, 0, 0], [0.92, 1.05, 1.02]);
      pieceTop = 0.42;
      aim.set(tx, stand + 0.26 * PS, tz);
    } else if (a.piece === 'hand') {
      put(new THREE.CylinderGeometry(0.08, 0.09, 0.04, 20), [0, 0.02, 0], [0, 0, 0], [1, 1, 1], s.material('#1d1c1b', { roughness: 0.6 }));
      put(new THREE.CapsuleGeometry(0.04, 0.12, 4, 12), [0, 0.12, 0]);
      put(new THREE.BoxGeometry(0.13, 0.13, 0.05, 2, 2, 1), [0, 0.25, 0.01]);
      for (let i = 0; i < 4; i++) {
        const length = [0.09, 0.11, 0.105, 0.085][i];
        const curl = 0.25 + i * 0.12;
        put(new THREE.CapsuleGeometry(0.016, length, 4, 10), [-0.048 + i * 0.032, 0.32 + length * 0.4, 0.01 + Math.sin(curl) * length * 0.4], [curl, 0, (i - 1.5) * -0.08]);
      }
      put(new THREE.CapsuleGeometry(0.018, 0.07, 4, 10), [0.08, 0.25, 0.03], [0.3, 0, -0.9]);
      pieceTop = 0.42;
      aim.set(tx, stand + 0.25 * PS, tz);
    } else if (a.piece === 'bell') {
      const profile: [number, number][] = [[0.0, 0.3], [0.05, 0.3], [0.075, 0.285], [0.085, 0.25], [0.088, 0.19], [0.098, 0.12], [0.12, 0.065], [0.155, 0.022], [0.172, 0.0], [0.158, 0.0], [0.14, 0.02], [0.0, 0.03]];
      put(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 36), [0, 0.0, 0]);
      put(new THREE.TorusGeometry(0.04, 0.014, 8, 20), [0, 0.335, 0]);
      put(new THREE.TorusGeometry(0.162, 0.008, 6, 36), [0, 0.012, 0], [Math.PI / 2, 0, 0]);
      put(new THREE.TorusGeometry(0.089, 0.006, 6, 36), [0, 0.22, 0], [Math.PI / 2, 0, 0]);
      pieceTop = 0.37;
      aim.set(tx, stand + 0.15 * PS, tz);
    } else if (a.piece === 'plaque') {
      const wood = s.material('#8a6a45', { roughness: 0.85 });
      put(new THREE.BoxGeometry(0.04, 0.32, 0.03), [-0.1, 0.15, -0.08], [-0.3, 0, 0], [1, 1, 1], wood);
      put(new THREE.BoxGeometry(0.04, 0.32, 0.03), [0.1, 0.15, -0.08], [-0.3, 0, 0], [1, 1, 1], wood);
      put(new THREE.BoxGeometry(0.3, 0.03, 0.06), [0, 0.04, 0.02], [0, 0, 0], [1, 1, 1], wood);
      const board = new THREE.Group();
      board.position.set(0, 0.2, -0.02);
      board.rotation.x = -0.28;
      piece.add(board);
      const face = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.025), [pieceMat, pieceMat, pieceMat, pieceMat, pieceMat, pieceMat]);
      face.castShadow = face.receiveShadow = true;
      board.add(face);
      const relief = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 20), pieceMat);
      relief.rotation.x = Math.PI / 2;
      relief.position.set(0, 0.115, 0.016);
      relief.castShadow = true;
      board.add(relief);
      pieceTop = 0.4;
      aim.set(tx, stand + 0.2 * PS, tz);
    } else {
      put(new THREE.CylinderGeometry(0.07, 0.08, 0.035, 24), [0, 0.0175, 0], [0, 0, 0], [1, 1, 1], s.material('#1d1c1b', { roughness: 0.6 }));
      const dancer = figure(s, { height: 0.34, build: 'slight', pose: 'reaching', style: 'mannequin', hair: 'bun', face: 'blank' });
      dancer.joints.shoulders.right.rotation.set(-2.6, 0, -0.3);
      dancer.joints.hips.left.rotation.set(-0.5, 0, 0.3);
      dancer.joints.knees.left.rotation.x = 0.9;
      dancer.joints.ankles.left.rotation.x = -0.4;
      dancer.settle();
      dancer.root.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        (mesh.material as THREE.Material).dispose();
        mesh.material = pieceMat;
      });
      dancer.root.position.y = 0.035;
      piece.add(dancer.root);
      pieceTop = 0.42;
      aim.set(tx, stand + 0.18 * PS, tz);
    }
    piece.rotation.y = (random() - 0.5) * 0.6;
    piece.scale.setScalar(PS);
    pieceTop *= PS;

    // ---- The propane bottle on the floor at the left end, hose up to the torch.
    const tankColour = ['#d9d6cf', '#2f5f9e', '#c9c4b8'][Math.floor(random() * 3)];
    const tankMat = s.material(tankColour, { roughness: 0.5, metalness: 0.2 });
    const kx = -W / 2 - 0.25, kz = 0.05;
    s.lathe([[0, 0], [0.15, 0], [0.155, 0.04], [0.155, 0.4], [0.14, 0.46], [0.09, 0.5], [0.03, 0.52], [0, 0.52]], tankMat, [kx, 0, kz]);
    s.mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 20, 1, true), tankMat, [kx, 0.55, kz]);
    s.cylinder(0.02, 0.025, 0.06, [kx, 0.54, kz], s.material('#b8a050', { metalness: 0.7 }), 10);
    s.cylinder(0.04, 0.04, 0.015, [kx, 0.58, kz], s.material('#2a2a2a'), 14);
    s.box([0.2, 0.06, 0.01], [kx, 0.25, kz + 0.155], s.material('#e9e4d4')).rotation.y = 0;

    // ---- The torch: on a stand aimed at the piece when lit, lying on the bench when not.
    const brass = s.material('#b8963c', { metalness: 0.75, roughness: 0.35 });
    const blackGrip = s.material('#1f1f22', { roughness: 0.7 });
    const torchGroup = new THREE.Group();
    s.root.add(torchGroup);
    const tpart = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P3, rotation: P3 = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.rotation.set(...rotation);
      mesh.castShadow = mesh.receiveShadow = true;
      torchGroup.add(mesh);
      return mesh;
    };
    // Built pointing along +x: grip at the origin, burner tip at x = 0.5.
    tpart(new THREE.CylinderGeometry(0.022, 0.026, 0.16, 12), blackGrip, [0.0, 0, 0], [0, 0, Math.PI / 2]);
    tpart(new THREE.CylinderGeometry(0.01, 0.01, 0.34, 8), s.material('#a6a9ad', { metalness: 0.8, roughness: 0.3 }), [0.25, 0, 0], [0, 0, Math.PI / 2]);
    tpart(new THREE.CylinderGeometry(0.026, 0.02, 0.07, 14), brass, [0.44, 0, 0], [0, 0, Math.PI / 2]);
    tpart(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8), brass, [0.0, 0.035, 0]);
    const flames: THREE.Mesh[] = [];
    let tip = new THREE.Vector3();
    if (a.torch) {
      // A short tripod stand on the bench, the torch resting in its fork, aimed at the piece.
      const from = new THREE.Vector3(0.45, TOP + 0.16, 0.22);
      const dir = aim.clone().sub(from).normalize();
      tip = aim.clone().addScaledVector(dir, -0.27);
      torchGroup.position.copy(tip).addScaledVector(dir, -0.48);
      torchGroup.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
      const forkAt = torchGroup.position.clone().addScaledVector(dir, 0.22);
      s.rod([forkAt.x, TOP, forkAt.z], [forkAt.x, forkAt.y - 0.012, forkAt.z], 0.008, ironMat);
      for (let i = 0; i < 3; i++) {
        const angle = i * Math.PI * 2 / 3;
        s.rod([forkAt.x, TOP + 0.05, forkAt.z], [forkAt.x + Math.cos(angle) * 0.07, TOP + 0.003, forkAt.z + Math.sin(angle) * 0.07], 0.006, ironMat);
      }
      s.ring(0.018, 0.004, [forkAt.x, forkAt.y - 0.012, forkAt.z], ironMat).rotation.x = Math.PI / 2;
      // The flame: an inner blue cone and a pale outer plume, reaching to the metal.
      const inner = new THREE.MeshBasicMaterial({ color: '#4f8cff', transparent: true, opacity: 0.85, depthWrite: false });
      const outer = new THREE.MeshBasicMaterial({ color: '#ffb066', transparent: true, opacity: 0.45, depthWrite: false });
      const flameLength = Math.max(0.12, tip.distanceTo(aim) - 0.06);
      for (const [radius, length, material] of [[0.024, flameLength * 0.5, inner], [0.045, flameLength, outer]] as const) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, length, 12, 1, true), material);
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
        cone.position.copy(tip).addScaledVector(dir, length / 2);
        cone.castShadow = false;
        s.root.add(cone);
        flames.push(cone);
      }
      // Where the flame hits, the metal glows dull orange.
      const hot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshBasicMaterial({ color: '#ff8a3a', transparent: true, opacity: 0.55, depthWrite: false }));
      hot.position.copy(aim).addScaledVector(dir, -0.07);
      hot.castShadow = false;
      s.root.add(hot);
      flames.push(hot);
    } else {
      torchGroup.position.set(0.25, TOP + 0.026, 0.25);
      torchGroup.rotation.y = 0.5 + random() * 0.3;
      torchGroup.updateMatrixWorld(true);
      tip = new THREE.Vector3(0, 0, 0).applyMatrix4(torchGroup.matrixWorld);
    }
    torchGroup.updateMatrixWorld(true);
    const gripEnd = new THREE.Vector3(-0.08, 0, 0).applyMatrix4(torchGroup.matrixWorld);
    s.tube([[kx, 0.6, kz], [kx + 0.05, 0.85, kz + 0.1], [-W / 2 + 0.05, TOP + 0.06, Dp / 2 - 0.05], [gripEnd.x - 0.2, TOP + 0.03, gripEnd.z + 0.05], gripEnd.toArray() as P3], 0.012, s.material('#c2462e', { roughness: 0.6 }));

    // ---- Brushes, rags and the chemical bottles.
    const patinaInk = s.material(COLOURS[a.patina][0], { roughness: 0.8 });
    const wood = s.material('#c49a62', { roughness: 0.8 });
    const brush = (x: number, z: number, turn: number) => {
      const g = new THREE.Group();
      g.position.set(x, TOP + 0.012, z);
      g.rotation.y = turn;
      s.root.add(g);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.014, 0.022), wood);
      handle.position.x = -0.06;
      const bristles = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.016, 0.05), patinaInk);
      bristles.position.x = 0.05;
      for (const mesh of [handle, bristles]) { mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); }
    };
    brush(0.15, 0.27, 0.3);
    brush(-0.5, 0.25, -0.6 + random() * 0.4);
    // A crumpled rag stained with the colour.
    const ragMat = s.material(new THREE.Color('#d8cfc0').lerp(new THREE.Color(COLOURS[a.patina][0]), 0.45), { roughness: 1, flatShading: true });
    for (let i = 0; i < 4; i++) {
      const lump = s.mesh(new THREE.IcosahedronGeometry(1, 0), ragMat, [-0.6 + (random() - 0.5) * 0.12, TOP + 0.025 + random() * 0.015, -0.12 + (random() - 0.5) * 0.1]);
      lump.scale.set(0.05 + random() * 0.03, 0.03 + random() * 0.015, 0.04 + random() * 0.03);
      lump.rotation.set(random(), random() * 3, random());
    }

    const chemicals = ['#2f6c5c', '#8c3f1f', '#3e2414', '#c9a23a', '#3a6a9a', '#e8e4da'];
    const bottleRow: { x: number; z: number }[] = [];
    const count = a.bottles === 'cluttered' ? 10 : 5;
    for (let i = 0; i < count; i++) {
      const x = a.bottles === 'cluttered' ? -0.65 + random() * 1.3 : 0.12 + i * 0.12;
      const z = a.bottles === 'cluttered' ? -0.3 + random() * 0.18 : -0.26;
      if (a.bottles === 'cluttered' && Math.hypot(x - tx, z - tz) < 0.24) continue;
      bottleRow.push({ x, z });
    }
    bottleRow.forEach(({ x, z }, i) => {
      const knocked = a.bottles === 'knocked' && (i === 1 || i === 3);
      const kind = i % 3;
      const g = new THREE.Group();
      s.root.add(g);
      const body = kind === 0 ? '#5a3418' : kind === 1 ? '#ebe7de' : '#e8eef0';
      const height = kind === 0 ? 0.2 : kind === 1 ? 0.17 : 0.22;
      const radius = kind === 2 ? 0.035 : 0.04;
      const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh; };
      add(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 14), s.material(body, { roughness: kind === 0 ? 0.2 : 0.5 }))).position.y = height / 2;
      add(new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.02, radius * 1.02, height * 0.4, 14), s.material(chemicals[(i * 7 + 3) % chemicals.length], { roughness: 0.6 }))).position.y = height * 0.45;
      if (kind === 0) add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.05, 10), s.material('#222'))).position.y = height + 0.025;
      if (kind === 1) add(new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 10), s.material('#e05a2a'))).position.y = height + 0.03;
      if (kind === 2) {
        add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.08), s.material('#2a5fa0'))).position.set(0, height + 0.025, 0.015);
        add(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.02), s.material('#2a5fa0'))).position.set(0, height - 0.01, 0.04);
      }
      if (knocked) {
        g.position.set(x, TOP + radius, z + 0.16);
        g.rotation.set(0, (random() - 0.5) * 0.8, Math.PI / 2);
        // The spill runs from the neck toward the front edge and over it.
        const colour = chemicals[(i * 7 + 3) % chemicals.length];
        const spill = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.08, metalness: 0.1 });
        const pool = s.mesh(new THREE.CylinderGeometry(1, 1, 0.003, 24), spill, [x - 0.18, TOP + 0.002, z + 0.3]);
        pool.scale.set(0.16 + random() * 0.06, 1, 0.1 + random() * 0.04);
        if (i === 1) {
          s.box([0.03, 0.005, Dp / 2 - z - 0.3], [x - 0.2, TOP + 0.002, (z + 0.3 + Dp / 2) / 2], spill);
          s.mesh(new THREE.CapsuleGeometry(0.007, 0.16, 4, 8), spill, [x - 0.2, TOP - 0.1, Dp / 2 + 0.006]);
          const floorPool = s.mesh(new THREE.CylinderGeometry(1, 1, 0.003, 24), spill, [x - 0.2, 0.002, Dp / 2 + 0.12]);
          floorPool.scale.set(0.12, 1, 0.08);
        }
      } else {
        g.position.set(x, TOP, z);
        g.rotation.y = (random() - 0.5) * 0.6;
      }
    });
    if (a.bottles === 'cluttered') {
      // A jar of brushes, a paper cup and a spray bottle crowding in.
      s.cylinder(0.05, 0.045, 0.12, [0.55, TOP + 0.06, 0.1], s.material('#cfe0dc', { roughness: 0.2, transparent: true, opacity: 0.7 }), 14);
      for (let i = 0; i < 3; i++) s.rod([0.55 + (i - 1) * 0.015, TOP + 0.05, 0.1], [0.55 + (i - 1) * 0.04, TOP + 0.24, 0.1 + (random() - 0.5) * 0.05], 0.007, wood);
      s.cylinder(0.04, 0.03, 0.09, [0.38, TOP + 0.045, 0.22], s.material('#f2efe8'), 12);
      brush(0.3, 0.05, 2.2);
    }

    // ---- The bucket of water.
    if (a.bucket) {
      const bx = W / 2 + 0.25, bz = 0.15;
      const zinc = s.material('#a9adb0', { metalness: 0.6, roughness: 0.45 });
      s.mesh(new THREE.LatheGeometry([[0.11, 0], [0.12, 0.005], [0.15, 0.3], [0.158, 0.31], [0.15, 0.3]].map(([x, y]) => new THREE.Vector2(x, y)), 28), zinc, [bx, 0, bz]);
      s.cylinder(0.11, 0.11, 0.01, [bx, 0.005, bz], zinc, 24);
      s.cylinder(0.143, 0.143, 0.006, [bx, 0.27, bz], new THREE.MeshStandardMaterial({ color: new THREE.Color('#5b6e6a').lerp(new THREE.Color(COLOURS[a.patina][0]), 0.3), roughness: 0.05, metalness: 0.2 }), 24);
      s.ring(0.155, 0.005, [bx, 0.31, bz], zinc, Math.PI).rotation.set(0, 0.3, 0);
      const sponge = s.box([0.1, 0.04, 0.07], [bx + 0.03, 0.29, bz - 0.02], s.material('#e3c34a', { roughness: 1 }));
      sponge.rotation.y = 0.4;
    }

    // ---- The haze: thin coloured fumes rising off the hot metal.
    const fumes: { mesh: THREE.Mesh; phase: number; y: number }[] = [];
    const hazeAmount = (a.torch ? 0.6 : 0.2) + (progress > 0.15 && progress < 0.9 ? 0.3 : 0);
    if (hazeAmount > 0.25) {
      const texture = canvasTexture(64, 128, (c) => {
        const g = c.createRadialGradient(32, 64, 4, 32, 64, 32);
        g.addColorStop(0, 'rgba(255,255,255,0.8)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g;
        c.save(); c.scale(1, 2); c.fillRect(0, 0, 64, 64); c.restore();
      });
      const smoke = new THREE.MeshBasicMaterial({ map: texture, color: hazeColour, transparent: true, opacity: 0.32 * hazeAmount + 0.1, depthWrite: false, side: THREE.DoubleSide });
      const n = Math.round(4 + hazeAmount * 5);
      for (let i = 0; i < n; i++) {
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.22 + random() * 0.2, 0.45 + random() * 0.35), smoke);
        const y = stand + pieceTop * 0.7 + 0.15 + random() * 0.45;
        plane.position.set(tx + (random() - 0.5) * 0.25, y, tz + (random() - 0.5) * 0.2);
        plane.rotation.set(0, random() * Math.PI, (random() - 0.5) * 0.4);
        plane.castShadow = false;
        s.root.add(plane);
        fumes.push({ mesh: plane, phase: random() * 6, y });
      }
    }

    const energy = mix(0.3, 1.4, mood.energy);
    return s.finish({
      footprint: 0.95,
      update: (_dt, time) => {
        for (const { mesh, phase, y } of fumes) {
          mesh.position.y = y + ((time * 0.08 * energy + phase) % 0.3);
          mesh.rotation.z = Math.sin(time * 0.6 * energy + phase) * 0.25;
        }
        flames.forEach((flame, i) => {
          const flicker = 1 + Math.sin(time * 31 * energy + i * 1.7) * 0.06 + Math.sin(time * 17 + i) * 0.04;
          flame.scale.set(flicker, flicker, flicker);
        });
      },
    });
  },
});
