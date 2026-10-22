import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
type Kind = 'catBlue' | 'catRed' | 'catYellow' | 'catGreen' | 'swirl' | 'tinted' | 'steely' | 'galaxy' | 'tiger' | 'oxblood';

const COLLECTIONS: Record<string, { kinds: Kind[]; tints: string[] }> = {
  catseyes: { kinds: ['catBlue', 'catRed', 'catYellow', 'catGreen', 'catBlue', 'catGreen', 'swirl', 'tinted'], tints: ['#e9f3ee', '#cfe9e2'] },
  jewels: { kinds: ['tinted', 'tinted', 'tinted', 'tinted', 'catBlue', 'catRed'], tints: ['#1f5fc4', '#b3201f', '#1f8f55', '#6a2fa8', '#e09a1c', '#128a94'] },
  agates: { kinds: ['tiger', 'tiger', 'oxblood', 'swirl', 'tinted'], tints: ['#b98a4a', '#6f4a2a', '#d9c7a0'] },
  steelies: { kinds: ['steely', 'steely', 'steely', 'galaxy', 'catBlue', 'tinted'], tints: ['#2a2d33', '#8f969c'] },
  milky: { kinds: ['tinted', 'tinted', 'tinted', 'swirl'], tints: ['#f3c1cd', '#c6e3f2', '#f6eab8', '#cfe9cb', '#e0cdf0', '#f8f4ea'] },
  mixed: { kinds: ['catBlue', 'catRed', 'catYellow', 'catGreen', 'swirl', 'tinted', 'steely', 'galaxy', 'tiger', 'oxblood'], tints: ['#1f5fc4', '#b3201f', '#f3c1cd', '#1f8f55', '#f6eab8', '#e09a1c'] },
};

export default defineThing({
  questions: {
    spread: score('How far have the marbles scattered?', ['A tight heap just outside the bag mouth', 'A fan across the floor', 'Rolled away to every corner']),
    left: score('How much is still in the bag?', ['Emptied flat, everything is out', 'About half', 'Still bulging, only a few have escaped']),
    collection: choice('What sort of marbles are they?', {
      catseyes: 'Classic cat\'s-eyes: clear glass with a twisted blade of colour inside.',
      jewels: 'Clear deep-coloured glass like gemstones: ruby, sapphire, emerald, amber.',
      agates: 'Earthy banded agates and oxbloods, the old expensive kind.',
      steelies: 'Mostly steel ball bearings and dark galaxies, a serious player\'s bag.',
      milky: 'Milky pastel chinas, pink, pale blue and lemon.',
      mixed: 'One of everything, a lifetime of swaps.',
    }),
    shooter: choice('What is the one big shooter marble?', {
      galaxy: 'A midnight-blue galaxy flecked with stars.',
      tiger: 'A honey and brown tiger-eye.',
      steely: 'A heavy steel ball bearing.',
      oxblood: 'A dark red oxblood with black and white wisps.',
      catseye: 'A giant clear cat\'s-eye.',
    }),
    game: choice('Is there a game going on?', {
      none: 'No game: the bag just fell over and spilled.',
      ring: 'A chalk ring on the floor with marbles clustered inside it and the shooter lined up at the edge.',
      row: 'Some of the marbles have been set out in a careful row, being counted or shared out.',
    }),
    bag: choice('What kind of bag is it?', {
      leather: 'A soft brown leather pouch with a thong drawstring.',
      velvet: 'A royal purple velvet bag with a gold cord.',
      calico: 'A hand-sewn cream cotton bag with a red initial stitched on it.',
      sock: 'Not a bag at all: an old striped sock tied with string.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const jit = (range: number) => (random() - 0.5) * 2 * range;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const R = 0.0112;
    const gloss = mix(0.08, 0.45, mood.wear);

    const texture = (width: number, height: number, draw: (g: Ctx) => void, repeat = false) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      draw(canvas.getContext('2d')!);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      if (repeat) map.wrapS = map.wrapT = THREE.RepeatWrapping;
      return map;
    };
    const bands = (g: Ctx, colours: readonly string[], count: number, wave: number, thick: number) => {
      g.lineCap = 'round';
      for (let i = 0; i < count; i++) {
        g.strokeStyle = colours[i % colours.length];
        g.lineWidth = thick * (0.5 + random());
        const y0 = (i / count) * 128 + jit(8), phase = random() * 6;
        g.beginPath();
        for (let x = -8; x <= 264; x += 8) g.lineTo(x, y0 + Math.sin((x / 256) * Math.PI * 2 * 2 + phase) * wave);
        g.stroke();
      }
    };
    const cat = (vane: string, pale: string) => (g: Ctx) => {
      const glass = g.createLinearGradient(0, 0, 0, 128);
      glass.addColorStop(0, '#e8f6f0');
      glass.addColorStop(0.5, '#b7ddd2');
      glass.addColorStop(1, '#8fc4b8');
      g.fillStyle = glass;
      g.fillRect(0, 0, 256, 128);
      g.lineCap = 'round';
      for (let blade = 0; blade < 3; blade++) {
        for (const [colour, width] of [[vane, 30], [pale, 9]] as const) {
          g.strokeStyle = colour;
          g.lineWidth = width;
          g.beginPath();
          for (let y = 22; y <= 106; y += 6) g.lineTo(blade * 85 + 30 + Math.sin((y / 128) * Math.PI * 1.6) * 34, y);
          g.stroke();
        }
      }
    };
    const painters: Record<Kind, (g: Ctx) => void> = {
      catBlue: cat('#1f5fc4', '#8fc0f2'),
      catRed: cat('#c9261f', '#f2a08f'),
      catYellow: cat('#e3a81c', '#fbe9a0'),
      catGreen: cat('#1f8f55', '#a6e0b4'),
      swirl: (g) => { g.fillStyle = '#f4f0e6'; g.fillRect(0, 0, 256, 128); bands(g, ['#c9261f', '#1f5fc4', '#f4f0e6', '#e3a81c'], 7, 14, 12); },
      tinted: (g) => {
        const tone = g.createLinearGradient(0, 0, 0, 128);
        tone.addColorStop(0, '#ffffff');
        tone.addColorStop(0.55, '#e6e6e6');
        tone.addColorStop(1, '#b4b4b4');
        g.fillStyle = tone;
        g.fillRect(0, 0, 256, 128);
        g.fillStyle = 'rgba(255,255,255,0.8)';
        for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(random() * 256, random() * 128, 1 + random() * 2.5, 0, Math.PI * 2); g.fill(); }
      },
      steely: (g) => {
        const tone = g.createLinearGradient(0, 0, 0, 128);
        tone.addColorStop(0, '#f4f6f8');
        tone.addColorStop(0.45, '#aab1b8');
        tone.addColorStop(0.6, '#6f767e');
        tone.addColorStop(1, '#c2c8cd');
        g.fillStyle = tone;
        g.fillRect(0, 0, 256, 128);
      },
      galaxy: (g) => {
        g.fillStyle = '#141c44';
        g.fillRect(0, 0, 256, 128);
        bands(g, ['#2f49a8', '#6a3fa0', '#1f7fa8'], 4, 18, 14);
        g.fillStyle = '#f6f2d8';
        for (let i = 0; i < 70; i++) g.fillRect(random() * 256, random() * 128, 1 + random() * 2.4, 1 + random() * 2.4);
      },
      tiger: (g) => { g.fillStyle = '#c98a2c'; g.fillRect(0, 0, 256, 128); bands(g, ['#5a3416', '#e9bf62', '#8a5220', '#f3d99a'], 9, 9, 10); },
      oxblood: (g) => { g.fillStyle = '#7d1418'; g.fillRect(0, 0, 256, 128); bands(g, ['#1a0f10', '#a81f22', '#efe6da', '#4a0d10'], 7, 16, 8); },
    };
    const materials = new Map<Kind, THREE.MeshStandardMaterial>();
    const glass = (kind: Kind) => {
      let material = materials.get(kind);
      if (!material) {
        material = new THREE.MeshStandardMaterial({ map: texture(256, 128, painters[kind]), roughness: gloss, metalness: kind === 'steely' ? 0.35 : 0.05 });
        materials.set(kind, material);
      }
      return material;
    };

    // ---- The bag: a lathe pouch laid on its side, mouth toward +x, slumped under its own weight ----
    const full = a.left;
    const heading = 0.5 + jit(0.25);
    const lumps = Array.from({ length: 9 }, () => [random() * 6.28, 0.02 + random() * 0.09, 0.6 + random() * 0.6]);
    const profile = [[0.001, 0], [0.034, 0.006], [0.052, 0.036], [0.056, 0.076], [0.046, 0.112], [0.023, 0.134], [0.02, 0.141], [0.033, 0.162], [0.037, 0.17]].map(([r, h]) => new THREE.Vector2(r, h));
    const pouch = new THREE.LatheGeometry(new THREE.SplineCurve(profile).getPoints(40), 40);
    const pouchPosition = pouch.getAttribute('position');
    const squash = mix(0.26, 0.82, full), spreadOut = mix(1.18, 1, full);
    for (let i = 0; i < pouchPosition.count; i++) {
      const h = pouchPosition.getY(i);
      let x = pouchPosition.getX(i), z = pouchPosition.getZ(i);
      const angle = Math.atan2(z, x);
      const body = h < 0.128 ? 1 : 0;
      let swell = 1;
      if (body) for (const [la, lh, strength] of lumps) swell += full * 0.11 * strength * Math.exp(-(((Math.atan2(Math.sin(angle - la), Math.cos(angle - la))) / 0.5) ** 2) - ((h - lh) / 0.022) ** 2);
      else swell += Math.sin(angle * 9) * 0.13 * Math.min(1, (h - 0.128) / 0.02);
      x *= swell; z *= swell;
      // Lay it down: lathe axis becomes +x, cross-section squashes and flattens on the floor.
      const flat = body ? squash : mix(squash, 0.8, Math.min(1, (h - 0.128) / 0.03));
      const y = Math.max(x * flat, -0.056 * squash * 0.72);
      pouchPosition.setXYZ(i, h, y, -z * (body ? spreadOut : 1));
    }
    pouch.computeVertexNormals();
    const floorY = 0.056 * squash * 0.72;
    const cloth = {
      leather: () => texture(128, 128, (g) => {
        g.fillStyle = '#8a5a34';
        g.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 260; i++) { g.fillStyle = random() < 0.5 ? 'rgba(50,28,12,0.16)' : 'rgba(220,170,110,0.14)'; g.beginPath(); g.arc(random() * 128, random() * 128, 2 + random() * 7, 0, Math.PI * 2); g.fill(); }
        g.strokeStyle = '#e2c79a'; g.lineWidth = 2; g.setLineDash([5, 5]);
        g.beginPath(); g.moveTo(4, 0); g.lineTo(4, 128); g.stroke();
      }),
      velvet: () => texture(128, 128, (g) => {
        const sheen = g.createLinearGradient(0, 0, 128, 0);
        sheen.addColorStop(0, '#4a1f7a'); sheen.addColorStop(0.3, '#6f35a8'); sheen.addColorStop(0.55, '#431a70'); sheen.addColorStop(0.8, '#6a30a0'); sheen.addColorStop(1, '#4a1f7a');
        g.fillStyle = sheen;
        g.fillRect(0, 0, 128, 128);
      }),
      calico: () => texture(256, 256, (g) => {
        g.fillStyle = '#ece2c8';
        g.fillRect(0, 0, 256, 256);
        g.strokeStyle = 'rgba(150,130,95,0.3)'; g.lineWidth = 1;
        for (let i = 0; i < 256; i += 5) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
        g.fillStyle = '#c0302a';
        g.font = 'bold 84px Georgia, serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.save(); g.translate(64, 150); g.rotate(-Math.PI / 2); g.fillText(pick(['J', 'M', 'T', 'R', 'S', 'B']), 0, 0); g.restore();
      }),
      sock: () => texture(64, 128, (g) => {
        const [one, two] = pick([['#c9302c', '#efe8d6'], ['#2f5f8f', '#e2a91f'], ['#3d7a52', '#efe8d6'], ['#444a55', '#c9302c']]);
        for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? one : two; g.fillRect(0, i * 8, 64, 8); }
        g.fillStyle = one; g.fillRect(0, 0, 64, 20); g.fillRect(0, 104, 64, 24);
      }),
    }[a.bag]();
    const bagMaterial = new THREE.MeshStandardMaterial({ map: cloth, roughness: a.bag === 'velvet' ? 0.75 : 0.95, side: THREE.DoubleSide });
    bagMaterial.color.lerp(new THREE.Color('#8b8275'), mood.wear * 0.3);
    const bag = new THREE.Group();
    const sack = new THREE.Mesh(pouch, bagMaterial);
    sack.position.y = floorY;
    sack.castShadow = sack.receiveShadow = true;
    bag.add(sack);
    const cordColour = { leather: '#5a3a22', velvet: '#d8ae3e', calico: '#c0302a', sock: '#b89b6a' }[a.bag];
    const cord = s.material(cordColour, { roughness: 0.8 });
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.0235, 0.0028, 6, 24), cord);
    tie.rotation.y = Math.PI / 2;
    tie.scale.set(1, mix(squash, 0.8, 0.35), 1);
    tie.position.set(0.139, floorY, 0);
    tie.castShadow = true;
    bag.add(tie);
    for (const side of [-1, 1]) {
      const path = [[0.139, floorY * 0.6, side * 0.022], [0.12, 0.004, side * 0.05], [0.08 + jit(0.02), 0.003, side * (0.08 + random() * 0.02)], [0.04 + jit(0.03), 0.003, side * (0.07 + random() * 0.04)], [jit(0.03), 0.003, side * (0.1 + random() * 0.03)]] as [number, number, number][];
      const lace = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p))), 24, 0.0024, 6), cord);
      lace.castShadow = true;
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.006, 10, 8), cord);
      bead.position.set(path[4][0], 0.006, path[4][2]);
      bead.castShadow = true;
      bag.add(lace, bead);
    }
    bag.rotation.y = -heading;
    s.root.add(bag);
    const pour = new THREE.Vector3(Math.cos(heading), 0, Math.sin(heading));
    const mouth = pour.clone().multiplyScalar(0.17);

    // ---- Marbles ------------------------------------------------------------------------------
    const collection = COLLECTIONS[a.collection];
    const placed: { at: THREE.Vector3; r: number; kind: Kind; tint: string }[] = [];
    const free = (x: number, z: number, r: number, slack = 1.02) => {
      const local = new THREE.Vector3(x, 0, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), heading);
      if (local.x > -0.01 && local.x < 0.165 && Math.abs(local.z) < 0.062) return false;
      return placed.every((other) => Math.hypot(other.at.x - x, other.at.z - z) > (other.r + r) * slack);
    };
    const drop = (x: number, z: number, r: number, kind = pick(collection.kinds)) => { placed.push({ at: new THREE.Vector3(x, r, z), r, kind, tint: pick(collection.tints) }); };
    const size = () => R * (0.9 + random() * 0.2);
    const total = Math.round(mix(14, 50, mood.density) * mix(1, 0.5, full));

    // The shooter gets its place first.
    const shooterR = R * 1.62;
    let ringCentre: THREE.Vector3 | null = null;
    const ringR = 0.15;
    let shooterAt = mouth.clone().addScaledVector(pour, 0.07 + a.spread * 0.16).add(new THREE.Vector3(jit(0.05), 0, jit(0.05)));
    let used = 0;
    if (a.game === 'ring') {
      ringCentre = mouth.clone().addScaledVector(pour, ringR + 0.05);
      const knuckle = heading + Math.PI * 0.55 + jit(0.3);
      shooterAt = ringCentre.clone().add(new THREE.Vector3(Math.cos(knuckle) * (ringR + 0.012), 0, Math.sin(knuckle) * (ringR + 0.012)));
      const targets = Math.min(13, Math.max(5, Math.round(total * 0.4)));
      for (let i = 0; i < targets; i++) {
        const r = size();
        for (let attempt = 0; attempt < 60; attempt++) {
          const knocked = i > targets - 3;
          const distance = knocked ? ringR * (0.55 + random() * 0.6) : Math.abs(jit(1)) * 0.045 + attempt * 0.0012, angle = random() * Math.PI * 2;
          const x = ringCentre.x + Math.cos(angle) * distance, z = ringCentre.z + Math.sin(angle) * distance;
          if (free(x, z, r)) { drop(x, z, r); used++; break; }
        }
      }
    } else if (a.game === 'row') {
      const count = Math.min(11, Math.max(5, Math.round(total * 0.4)));
      const along = new THREE.Vector3(Math.cos(heading + 1.2), 0, Math.sin(heading + 1.2));
      const start = mouth.clone().addScaledVector(pour, 0.2).addScaledVector(along, -count * R);
      shooterAt = start.clone().addScaledVector(along, -shooterR - R * 1.3);
      let offset = 0;
      for (let i = 0; i < count; i++) {
        const r = size();
        offset += r;
        const p = start.clone().addScaledVector(along, offset).add(new THREE.Vector3(jit(0.0012), 0, jit(0.0012)));
        offset += r + 0.0012;
        drop(p.x, p.z, r, collection.kinds[i % collection.kinds.length]);
        used++;
      }
    }
    placed.push({ at: shooterAt.clone().setY(shooterR), r: shooterR, kind: 'tinted', tint: '#000000' });

    // The spill itself: thick at the mouth, thinning with distance.
    const reach = mix(0.035, 0.3, a.spread), fan = mix(0.55, 1.75, a.spread);
    for (let i = used; i < total; i++) {
      const r = size();
      for (let attempt = 0; attempt < 80; attempt++) {
        const far = Math.abs(jit(1)) ** 1.3 * reach + attempt * 0.003, angle = heading + jit(fan);
        const x = mouth.x + Math.cos(angle) * (far + 0.012), z = mouth.z + Math.sin(angle) * (far + 0.012);
        if (free(x, z, r)) { drop(x, z, r); break; }
      }
    }
    // Two still in the mouth of the bag, about to follow.
    if (full > 0.08) for (let i = 0; i < 2; i++) {
      const r = size(), p = pour.clone().multiplyScalar(0.148 + i * 0.016);
      placed.push({ at: new THREE.Vector3(p.x + jit(0.004), r + 0.002 + i * 0.001, p.z + jit(0.004)), r, kind: pick(collection.kinds), tint: pick(collection.tints) });
    }

    const sphere = new THREE.SphereGeometry(1, 24, 16);
    const matrix = new THREE.Matrix4(), spin = new THREE.Quaternion(), euler = new THREE.Euler();
    for (const kind of new Set(collection.kinds)) {
      const group = placed.filter((marble) => marble.kind === kind && marble.tint !== '#000000');
      if (!group.length) continue;
      const mesh = new THREE.InstancedMesh(sphere, glass(kind), group.length);
      group.forEach((marble, index) => {
        spin.setFromEuler(euler.set(random() * 6.28, random() * 6.28, random() * 6.28));
        mesh.setMatrixAt(index, matrix.compose(marble.at, spin, new THREE.Vector3(marble.r, marble.r, marble.r)));
        if (kind === 'tinted') mesh.setColorAt(index, new THREE.Color(marble.tint));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }
    const shooterKind: Kind = a.shooter === 'catseye' ? pick(['catBlue', 'catRed', 'catGreen'] as const) : a.shooter;
    const shooter = new THREE.Mesh(new THREE.SphereGeometry(shooterR, 32, 20), new THREE.MeshStandardMaterial({ map: texture(256, 128, painters[shooterKind]), roughness: gloss * 0.8, metalness: shooterKind === 'steely' ? 0.35 : 0.05 }));
    shooter.position.copy(shooterAt).setY(shooterR);
    shooter.rotation.set(random() * 6, random() * 6, random() * 6);
    shooter.castShadow = shooter.receiveShadow = true;
    s.root.add(shooter);

    // Chalk ring, drawn in one wobbly go.
    if (ringCentre) {
      const dashes: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 150; i++) {
        if (random() < mood.wear * 0.45) continue;
        const angle = (i / 150) * Math.PI * 2, radius = ringR + Math.sin(angle * 3 + 1) * 0.004 + jit(0.0015);
        dashes.push({ at: [ringCentre.x + Math.cos(angle) * radius, 0.0006, ringCentre.z + Math.sin(angle) * radius], size: 0.8 + random() * 0.5 });
      }
      s.scatter(new THREE.CylinderGeometry(0.0052, 0.0052, 0.0012, 7), new THREE.MeshStandardMaterial({ color: pick(['#f6f3ea', '#f3b4c2', '#a9d0f0', '#f4dc6a']), roughness: 1 }), dashes).castShadow = false;
    }

    const roll = mix(0, 0.012, mood.energy), pace = mix(0.5, 2, mood.energy);
    const home = shooter.position.clone(), turn = new THREE.Vector3(-pour.z, 0, pour.x);
    const startSpin = shooter.quaternion.clone(), step = new THREE.Quaternion();
    return s.finish({
      update: (_dt, time) => {
        const shift = Math.sin(time * pace) * roll;
        shooter.position.copy(home).addScaledVector(pour, shift);
        shooter.quaternion.copy(startSpin).premultiply(step.setFromAxisAngle(turn, -shift / shooterR));
      },
    });
  },
});
