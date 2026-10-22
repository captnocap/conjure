import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';
import { chain, hook } from './chain';

type P3 = [number, number, number];

/** A canvas-painted texture: no fonts, images or network. */
function paint(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const rgba = (hex: THREE.ColorRepresentation, alpha: number) => {
  const c = new THREE.Color(hex);
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${alpha})`;
};

/** Push vertices along their normals by smooth waves, so a primitive reads as a dipped, lumpy shell. */
function lumpy(geometry: THREE.BufferGeometry, amount: number, phase: number) {
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const normal = geometry.attributes.normal as THREE.BufferAttribute;
  const p = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    n.fromBufferAttribute(normal, i);
    const wave = Math.sin(p.x * 13 + phase) * Math.sin(p.y * 11 + phase * 0.7) * Math.sin(p.z * 15 + phase * 1.3)
      + 0.5 * Math.sin(p.x * 31 + p.y * 27 + phase) * Math.cos(p.z * 23 - phase);
    p.addScaledVector(n, wave * amount);
    position.setXYZ(i, p.x, p.y, p.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

export default defineWorld({
  questions: {
    time: choice('When is the pour happening?', {
      day: 'A working day: flat cool daylight slanting down from the one high window, the furnace a warm counterpoint.',
      evening: 'Late afternoon running into evening: the window gone amber, long light, the glow from below taking over.',
      night: 'A night pour: the window black-blue, the room lit by the furnace mouth, the molten metal and a few caged bulbs.',
    }),
    casting: choice('What is being cast in the sand pit?', {
      statue: 'A statue in pieces: tall white shell moulds of a torso, limbs and a head standing in the sand.',
      bell: 'A bell: round domed moulds, mouth down, packed into the sand.',
      plaque: 'Plaques: flat slab moulds standing on edge in rows like gravestones.',
      abstract: 'An abstract sculpture: swelling, knotted, ring-shaped moulds.',
    }),
    state: choice('Where has the day got to?', {
      pouring: 'Mid-pour: a glowing crucible tipped on the hoist over a mould, bronze streaming into its cup, filled cups glowing, sparks and smoke.',
      cooling: 'Cooling: the pour done, the cups crusted dark, thin smoke curling off the sand, everyone waiting.',
      breakout: 'Breaking out: shells cracked open with hammers, raw gold-brown bronze showing through, white shards everywhere.',
      swept: 'Swept and cold: the pit raked flat and empty, the furnace door shut, tools hung up, a quiet day.',
    }),
    walls: choice('What hangs on the back wall?', {
      tools: 'A rail of tongs, pouring shanks and skimmers, and a chalkboard with the pour list.',
      safety: 'Yellow-and-black hazard stripes, red fire extinguishers and a painted warning sign.',
      plaques: 'Finished bronze plaques and a big relief medallion hung like trophies.',
      clock: 'A big round works clock and the sculptor\'s drawings of the commission pinned up.',
    }),
    racks: choice('What fills the steel racks beside the furnace?', {
      castings: 'Raw castings still on their sprues: dusty bronze limbs, heads and lumps with white shell clinging.',
      crucibles: 'Spare crucibles, stacked gold bronze ingots and sacks of shell slurry.',
      finished: 'Finished dark-patinated bronzes waiting for collection, some wrapped in blue blankets.',
      patterns: 'Rubber moulds in white plaster jackets and dark red wax copies.',
    }),
    building: choice('What is the building made of?', {
      brick: 'Old sooty red brick with steel pilasters.',
      shed: 'A ribbed corrugated steel shed, grey and galvanised.',
      block: 'Whitewashed block walls, scrubbed and bright.',
    }),
    floor: choice('What is underfoot?', {
      concrete: 'Cracked grey concrete stained with oil and drifts of spilled sand.',
      plates: 'Steel chequer plates, worn shiny along the walkways.',
      earth: 'Dark packed earth and sand, the old way.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const night = a.time === 'night', evening = a.time === 'evening';
    const pouring = a.state === 'pouring', cooling = a.state === 'cooling', breakout = a.state === 'breakout', swept = a.state === 'swept';
    const SAND = 0.16;
    const PX0 = -0.3, PX1 = 2.3, PZ0 = -3.35, PZ1 = 3.0, PX = (PX0 + PX1) / 2;
    const background = night ? '#7f7c89' : evening ? '#dccdbb' : '#dde0dd';
    const { art: s, world } = diorama(context, {
      background, floor: '#ffffff', width: 14, depth: 11, maxHeight: 3.2, radius: 1.6, pitch: 33, yaw: 26, scale: [0.8, 1.35],
      viewBox: [[-7, 0, -5.5], [7, 5.3, 3.8]],
      slots: [[-1.65, -0.55], [PX, 1.15, SAND, 0.85], [-4.3, 2.7], [4.0, 1.9], [4.3, -2.3], [-3.8, -3.2]],
    });
    const root = world.object;
    const key = world.keyLight!;
    const hemi = root.children.find((node) => (node as THREE.HemisphereLight).isHemisphereLight) as THREE.HemisphereLight | undefined;
    if (night) {
      key.intensity *= 0.28;
      key.color.set('#8ea4d6');
      if (hemi) { hemi.intensity *= 0.6; hemi.color.set('#b9c0dc'); hemi.groundColor.set('#5a4a3e'); }
    } else if (evening) {
      key.color.set('#ffcf98');
      key.intensity *= 0.85;
      if (hemi) hemi.intensity *= 0.7;
    } else {
      // Interior daylight: the room itself dim, the window light and the furnace doing the work.
      key.color.set('#e8efff');
      key.intensity *= 0.9;
      if (hemi) { hemi.intensity *= 0.68; hemi.groundColor.set('#6a645a'); }
    }
    // The key light comes in through the high window on the left wall.
    const fromWindow = new THREE.Vector3(-1.6, 1.3, 0.5).normalize();
    const basePlace = world.place;
    world.place = (items) => {
      basePlace(items);
      const target = key.target.position;
      const distance = key.position.distanceTo(target);
      key.position.copy(target).addScaledVector(fromWindow, distance);
    };

    const wear = mood.wear;
    const steel = s.material('#3f4246', { metalness: 0.6, roughness: 0.5 });
    const darkSteel = s.material('#2a2c2f', { metalness: 0.5, roughness: 0.6 });
    const yellow = s.material('#e0b428', { roughness: 0.6 });
    const chainMat = s.material('#3b3d41', { metalness: 0.75, roughness: 0.45 });
    const glowHue = mix(0.09, 0.05, mood.warmth);
    const glowColour = new THREE.Color().setHSL(glowHue, 1, 0.52);
    const glow = new THREE.MeshStandardMaterial({ color: '#ff8a2a', emissive: glowColour, emissiveIntensity: 1.7, roughness: 0.5 });
    const crust = s.material('#3a2b22', { metalness: 0.5, roughness: 0.6 });
    const bronze = new THREE.MeshStandardMaterial({ color: '#b27b40', metalness: 0.7, roughness: 0.42 });
    const noShadow = (mesh: THREE.Mesh) => { mesh.castShadow = false; return mesh; };

    // ---- Floor.
    const ground = world.ground as THREE.Mesh;
    const groundMat = ground.material as THREE.MeshStandardMaterial;
    const toPx = (x: number, z: number) => [(x + 7) / 14 * 1024, (z + 5.5) / 11 * 1024] as const;
    groundMat.map = paint(1024, 1024, (c) => {
      const base = { concrete: '#8d8981', plates: '#6c7075', earth: '#57493d' }[a.floor];
      c.fillStyle = base;
      c.fillRect(0, 0, 1024, 1024);
      for (let i = 0; i < 160; i++) {
        const x = random() * 1024, y = random() * 1024, r = 10 + random() * 60;
        c.fillStyle = rgba(random() < 0.5 ? '#000000' : '#ffffff', 0.03 + random() * 0.04);
        c.beginPath(); c.ellipse(x, y, r, r * (0.4 + random() * 0.6), random() * 3, 0, 7); c.fill();
      }
      if (a.floor === 'concrete') {
        c.strokeStyle = 'rgba(40,38,34,0.45)';
        c.lineWidth = 2;
        for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(i * 1024 / 5, 0); c.lineTo(i * 1024 / 5, 1024); c.stroke(); c.beginPath(); c.moveTo(0, i * 1024 / 4); c.lineTo(1024, i * 1024 / 4); c.stroke(); }
        c.lineWidth = 1.2;
        for (let i = 0; i < 6 + wear * 10; i++) {
          let x = random() * 1024, y = random() * 1024;
          c.beginPath(); c.moveTo(x, y);
          for (let k = 0; k < 6; k++) { x += (random() - 0.5) * 70; y += (random() - 0.5) * 70; c.lineTo(x, y); }
          c.stroke();
        }
        for (let i = 0; i < 8 + wear * 10; i++) {
          c.fillStyle = 'rgba(25,22,20,0.22)';
          c.beginPath(); c.ellipse(random() * 1024, random() * 1024, 12 + random() * 40, 8 + random() * 25, random() * 3, 0, 7); c.fill();
        }
      } else if (a.floor === 'plates') {
        const plate = 1024 / 7;
        c.strokeStyle = 'rgba(20,22,24,0.7)';
        c.lineWidth = 2.5;
        for (let i = 0; i <= 7; i++) { c.beginPath(); c.moveTo(i * plate, 0); c.lineTo(i * plate, 1024); c.stroke(); c.beginPath(); c.moveTo(0, i * plate * 1.27); c.lineTo(1024, i * plate * 1.27); c.stroke(); }
        c.fillStyle = 'rgba(200,205,210,0.18)';
        for (let y = 4; y < 1024; y += 12) for (let x = (y / 12) % 2 ? 4 : 10; x < 1024; x += 12) { c.save(); c.translate(x, y); c.rotate(((x + y) / 12) % 2 ? 0.7 : -0.7); c.fillRect(-3, -1, 6, 2); c.restore(); }
        // Shiny worn walkway from the front to the furnace.
        const [wx] = toPx(-1.5, 0);
        const g = c.createLinearGradient(wx - 90, 0, wx + 90, 0);
        g.addColorStop(0, 'rgba(220,225,230,0)'); g.addColorStop(0.5, 'rgba(220,225,230,0.18)'); g.addColorStop(1, 'rgba(220,225,230,0)');
        c.fillStyle = g; c.fillRect(wx - 90, 0, 180, 1024);
      } else {
        for (let i = 0; i < 2600; i++) {
          c.fillStyle = rgba(random() < 0.5 ? '#c4a777' : '#2e261f', 0.2 + random() * 0.3);
          c.fillRect(random() * 1024, random() * 1024, 2 + random() * 3, 2 + random() * 3);
        }
      }
      // Sand trodden out of the pit.
      const [x0, z0] = toPx(PX0, PZ0), [x1, z1] = toPx(PX1, PZ1);
      for (let i = 0; i < 70; i++) {
        const side = random() < 0.5;
        const x = side ? (random() < 0.5 ? x0 - random() * 70 : x1 + random() * 70) : x0 + random() * (x1 - x0);
        const y = side ? z0 + random() * (z1 - z0) : z1 + random() * 80;
        c.fillStyle = rgba('#c2a574', 0.15 + random() * 0.25);
        c.beginPath(); c.ellipse(x, y, 6 + random() * 26, 4 + random() * 14, random() * 3, 0, 7); c.fill();
      }
      // Soot around the furnace mouth.
      const [fx, fz] = toPx(PX, -4.0);
      const soot = c.createRadialGradient(fx, fz, 10, fx, fz, 160);
      soot.addColorStop(0, `rgba(20,16,14,${0.35 + wear * 0.3})`); soot.addColorStop(1, 'rgba(20,16,14,0)');
      c.fillStyle = soot; c.fillRect(0, 0, 1024, 1024);
    });
    groundMat.color.set('#ffffff');
    groundMat.roughness = a.floor === 'plates' ? 0.55 : 0.95;
    groundMat.metalness = a.floor === 'plates' ? 0.35 : 0;
    groundMat.needsUpdate = true;

    // ---- Walls: back wall and the left wall, painted, sooted toward the top.
    const WALL_H = 6.2;
    const wallTexture = (metres: number, sootX: number | null) => paint(1024, 512, (c) => {
      const pxPerM = 1024 / metres, py = 512 / WALL_H;
      if (a.building === 'brick') {
        c.fillStyle = '#5a3a30'; c.fillRect(0, 0, 1024, 512);
        const course = 0.13 * py, brickW = 0.3 * pxPerM;
        for (let row = 0; row * course < 512; row++) for (let col = -1; col * brickW < 1024; col++) {
          const tone = new THREE.Color('#9a5240').offsetHSL((random() - 0.5) * 0.02, (random() - 0.5) * 0.1, (random() - 0.5) * 0.12);
          c.fillStyle = `#${tone.getHexString()}`;
          c.fillRect(col * brickW + (row % 2 ? brickW / 2 : 0) + 1, row * course + 1, brickW - 2, course - 2);
        }
      } else if (a.building === 'shed') {
        c.fillStyle = '#9ea4a7'; c.fillRect(0, 0, 1024, 512);
        const rib = 0.16 * pxPerM;
        for (let x = 0; x < 1024; x += rib) {
          const g = c.createLinearGradient(x, 0, x + rib, 0);
          g.addColorStop(0, 'rgba(255,255,255,0.18)'); g.addColorStop(0.5, 'rgba(0,0,0,0.14)'); g.addColorStop(1, 'rgba(255,255,255,0.18)');
          c.fillStyle = g; c.fillRect(x, 0, rib, 512);
        }
        for (let i = 0; i < 10 + wear * 30; i++) {
          const x = random() * 1024, y = random() * 512;
          const g = c.createLinearGradient(0, y, 0, y + 80);
          g.addColorStop(0, 'rgba(120,60,30,0.35)'); g.addColorStop(1, 'rgba(120,60,30,0)');
          c.fillStyle = g; c.fillRect(x, y, 3 + random() * 5, 80);
        }
        for (let i = 1; i < 4; i++) { c.fillStyle = 'rgba(40,40,40,0.25)'; c.fillRect(0, i * 128, 1024, 2); }
      } else {
        c.fillStyle = '#a19e96'; c.fillRect(0, 0, 1024, 512);
        const course = 0.22 * py, blockW = 0.44 * pxPerM;
        for (let row = 0; row * course < 512; row++) for (let col = -1; col * blockW < 1024; col++) {
          const tone = new THREE.Color('#d6d2c7').offsetHSL(0, 0, (random() - 0.5) * 0.04);
          c.fillStyle = `#${tone.getHexString()}`;
          c.fillRect(col * blockW + (row % 2 ? blockW / 2 : 0) + 1.5, row * course + 1.5, blockW - 3, course - 3);
        }
      }
      const top = c.createLinearGradient(0, 0, 0, 512 * 0.6);
      top.addColorStop(0, `rgba(25,20,18,${0.35 + wear * 0.35})`); top.addColorStop(1, 'rgba(25,20,18,0)');
      c.fillStyle = top; c.fillRect(0, 0, 1024, 512);
      const bottom = c.createLinearGradient(0, 512, 0, 512 * 0.8);
      bottom.addColorStop(0, `rgba(40,32,26,${0.2 + wear * 0.3})`); bottom.addColorStop(1, 'rgba(40,32,26,0)');
      c.fillStyle = bottom; c.fillRect(0, 0, 1024, 512);
      if (sootX !== null) {
        const x = sootX * pxPerM;
        const g = c.createRadialGradient(x, 512 * 0.45, 20, x, 512 * 0.35, 300);
        g.addColorStop(0, `rgba(15,12,10,${0.55 + wear * 0.3})`); g.addColorStop(1, 'rgba(15,12,10,0)');
        c.fillStyle = g; c.fillRect(0, 0, 1024, 512);
      }
    });
    const back = noShadow(s.box([14, WALL_H, 0.3], [0, WALL_H / 2, -5.35], new THREE.MeshStandardMaterial({ map: wallTexture(14, PX + 7), roughness: 0.95, metalness: a.building === 'shed' ? 0.3 : 0 })));
    const left = noShadow(s.box([0.3, WALL_H, 11], [-6.85, WALL_H / 2, 0], new THREE.MeshStandardMaterial({ map: wallTexture(11, null), roughness: 0.95, metalness: a.building === 'shed' ? 0.3 : 0 })));
    void back; void left;
    // Pilasters or portal columns.
    const pilaster = a.building === 'block' ? s.material('#d8d4ca') : steel;
    for (const x of [2.8]) noShadow(s.box([0.3, WALL_H, 0.25], [x, WALL_H / 2, -5.1], pilaster));
    for (const z of [-2.4, 3.9]) noShadow(s.box([0.25, WALL_H, 0.3], [-6.62, WALL_H / 2, z], pilaster));

    // ---- The high window in the left wall, and the slanting shaft of daylight from it.
    const win = { y0: 3.3, y1: 4.9, z0: -0.6, z1: 1.8, x: -6.69 };
    const glassColour = night ? '#2c3858' : evening ? '#f4c88e' : '#eef4fa';
    const glass = noShadow(s.mesh(new THREE.PlaneGeometry(win.z1 - win.z0, win.y1 - win.y0), new THREE.MeshBasicMaterial({ color: glassColour }), [win.x, (win.y0 + win.y1) / 2, (win.z0 + win.z1) / 2]));
    glass.rotation.y = Math.PI / 2;
    const frameMat = s.material('#2d3034', { metalness: 0.5 });
    for (let i = 0; i <= 4; i++) noShadow(s.box([0.06, win.y1 - win.y0 + 0.08, 0.05], [win.x + 0.02, (win.y0 + win.y1) / 2, win.z0 + i * (win.z1 - win.z0) / 4], frameMat));
    for (let i = 0; i <= 3; i++) noShadow(s.box([0.06, 0.05, win.z1 - win.z0 + 0.05], [win.x + 0.02, win.y0 + i * (win.y1 - win.y0) / 3, (win.z0 + win.z1) / 2], frameMat));
    noShadow(s.box([0.25, 0.08, win.z1 - win.z0 + 0.3], [win.x + 0.1, win.y0 - 0.06, (win.z0 + win.z1) / 2], frameMat));
    if (wear > 0.55) {
      // A broken pane boarded with ply.
      noShadow(s.box([0.03, (win.y1 - win.y0) / 3 - 0.06, (win.z1 - win.z0) / 4 - 0.06], [win.x + 0.03, win.y0 + (win.y1 - win.y0) * 5 / 6, win.z0 + (win.z1 - win.z0) * 3 / 8], s.material('#a88a5c')));
    }
    {
      const d = new THREE.Vector3(1.6, -1.3, -0.5);
      const top = [[win.y0, win.z0], [win.y1, win.z0], [win.y1, win.z1], [win.y0, win.z1]].map(([y, z]) => new THREE.Vector3(win.x + 0.05, y, z));
      const bottom = top.map((p) => p.clone().addScaledVector(d, (p.y - 0.02) / 1.3));
      const positions: number[] = [];
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        for (const p of [top[i], bottom[i], bottom[j], top[i], bottom[j], top[j]]) positions.push(p.x, p.y, p.z);
      }
      const shaftGeometry = new THREE.BufferGeometry();
      shaftGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const shaftColour = night ? '#7d8fc4' : evening ? '#ffd29a' : '#f1f6ff';
      const shaft = new THREE.Mesh(shaftGeometry, new THREE.MeshBasicMaterial({ color: shaftColour, transparent: true, opacity: night ? 0.04 : 0.14, depthWrite: false, side: THREE.DoubleSide }));
      root.add(shaft);
      const patchGeometry = new THREE.BufferGeometry();
      const patch: number[] = [];
      for (const p of [bottom[0], bottom[1], bottom[2], bottom[0], bottom[2], bottom[3]]) patch.push(p.x, 0.012, p.z);
      patchGeometry.setAttribute('position', new THREE.Float32BufferAttribute(patch, 3));
      root.add(new THREE.Mesh(patchGeometry, new THREE.MeshBasicMaterial({ color: shaftColour, transparent: true, opacity: night ? 0.06 : 0.32, depthWrite: false, side: THREE.DoubleSide })));
    }

    // ---- The furnace: a firebrick block built out from the back wall, its arched mouth glowing.
    const glowLevel = { pouring: 1, cooling: 0.7, breakout: 0.45, swept: 0 }[a.state];
    const FW = 3.0, FH = 3.0, FD = 1.3, FZ = -5.2 + FD / 2;
    const firebrick = paint(512, 512, (c) => {
      c.fillStyle = '#6b5a48'; c.fillRect(0, 0, 512, 512);
      const course = 512 / 24, brickW = 512 / 9;
      for (let row = 0; row < 24; row++) for (let col = -1; col < 10; col++) {
        const tone = new THREE.Color('#cdb184').offsetHSL(0, (random() - 0.5) * 0.08, (random() - 0.5) * 0.12);
        c.fillStyle = `#${tone.getHexString()}`;
        c.fillRect(col * brickW + (row % 2 ? brickW / 2 : 0) + 1.5, row * course + 1.5, brickW - 3, course - 3);
      }
      const g = c.createRadialGradient(256, 300, 40, 256, 200, 330);
      g.addColorStop(0, `rgba(20,14,10,${0.6 + wear * 0.3})`); g.addColorStop(1, 'rgba(20,14,10,0.1)');
      c.fillStyle = g; c.fillRect(0, 0, 512, 512);
    });
    const furnaceMat = new THREE.MeshStandardMaterial({ map: firebrick, roughness: 0.95 });
    s.box([FW, FH, FD], [PX, FH / 2, FZ], furnaceMat);
    s.box([FW + 0.12, 0.12, FD + 0.12], [PX, FH + 0.06, FZ], steel);
    for (const dx of [-1, 1]) s.box([0.1, FH, 0.1], [PX + dx * (FW / 2 + 0.02), FH / 2, FZ + FD / 2 + 0.02], steel);
    // The mouth: an arch of light (or a dark cold hole), a heavy iron frame round it.
    const mouthFront = FZ + FD / 2 + 0.01;
    const mouth = paint(256, 320, (c) => {
      c.clearRect(0, 0, 256, 320);
      c.beginPath();
      c.moveTo(8, 316); c.lineTo(8, 128); c.arc(128, 128, 120, Math.PI, 0); c.lineTo(248, 316); c.closePath();
      if (glowLevel > 0) {
        const g = c.createRadialGradient(128, 220, 10, 128, 190, 200);
        g.addColorStop(0, glowLevel > 0.8 ? '#fff6d0' : '#ffd27a');
        g.addColorStop(0.35, `#${glowColour.clone().lerp(new THREE.Color('#ffd27a'), 0.3).getHexString()}`);
        g.addColorStop(1, glowLevel > 0.6 ? '#a82a08' : '#5a1806');
        c.fillStyle = g;
      } else c.fillStyle = '#1c1714';
      c.fill();
      if (glowLevel === 0) for (let i = 0; i < 14; i++) { c.fillStyle = 'rgba(200,70,20,0.5)'; c.beginPath(); c.arc(40 + random() * 176, 290 + random() * 20, 3 + random() * 4, 0, 7); c.fill(); }
    });
    const mouthPlane = noShadow(s.mesh(new THREE.PlaneGeometry(1.3, 1.62), new THREE.MeshBasicMaterial({ map: mouth, transparent: true, alphaTest: 0.05 }), [PX, 0.35 + 0.81, mouthFront]));
    void mouthPlane;
    const iron = s.material('#2a2624', { metalness: 0.5, roughness: 0.6 });
    for (const dx of [-1, 1]) s.box([0.1, 1.0, 0.08], [PX + dx * 0.7, 0.35 + 0.5, mouthFront + 0.02], iron);
    s.ring(0.7, 0.06, [PX, 1.35, mouthFront + 0.02], iron, Math.PI);
    s.box([1.6, 0.1, 0.25], [PX, 0.3, mouthFront + 0.08], iron);
    // The sliding door: shut over the mouth when the day is done, run aside otherwise.
    const doorX = swept ? PX : PX + 1.55;
    s.box([1.55, 2.0, 0.08], [doorX, 1.15, mouthFront + 0.12], s.material('#4a3f38', { metalness: 0.4, roughness: 0.7 }));
    s.box([1.7, 0.06, 0.06], [doorX, 2.18, mouthFront + 0.12], darkSteel);
    s.box([3.6, 0.08, 0.1], [PX + 0.55, 2.24, mouthFront + 0.1], darkSteel);
    // Hood and flue.
    const hood = s.mesh(new THREE.CylinderGeometry(0.5, 1.4, 0.9, 4, 1), steel, [PX, FH + 0.6, FZ + 0.1]);
    hood.rotation.y = Math.PI / 4;
    s.cylinder(0.32, 0.32, WALL_H - FH - 1.0, [PX, FH + 1.05 + (WALL_H - FH - 1.0) / 2, FZ - 0.1], steel, 16);
    if (glowLevel > 0) {
      const furnaceLight = new THREE.PointLight(glowColour.clone().lerp(new THREE.Color('#ffb070'), 0.3), glowLevel * (night ? 95 : evening ? 60 : 42), 14, 1.3);
      furnaceLight.position.set(PX, 1.1, mouthFront + 0.9);
      root.add(furnaceLight);
      // A heat glow pooled on the floor in front of the mouth.
      const pool = noShadow(s.mesh(new THREE.CircleGeometry(1.4, 32), new THREE.MeshBasicMaterial({ color: glowColour, transparent: true, opacity: 0.16 * glowLevel, depthWrite: false }), [PX, 0.014, mouthFront + 0.5]));
      pool.rotation.x = -Math.PI / 2;
      pool.scale.y = 0.55;
    }

    // ---- The sand pit: a hazard-striped steel kerb round a raised bed of sand.
    const stripes = paint(256, 32, (c) => {
      c.fillStyle = '#e2b320'; c.fillRect(0, 0, 256, 32);
      c.fillStyle = '#1d1d1f';
      for (let x = -32; x < 256; x += 32) { c.beginPath(); c.moveTo(x, 32); c.lineTo(x + 16, 32); c.lineTo(x + 32, 0); c.lineTo(x + 16, 0); c.closePath(); c.fill(); }
    });
    stripes.wrapS = THREE.RepeatWrapping;
    const kerb = (length: number) => {
      const texture = stripes.clone();
      texture.repeat.set(length / 1.2, 1);
      texture.needsUpdate = true;
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7 });
    };
    const KH = 0.26, KT = 0.14;
    s.box([PX1 - PX0 + KT, KH, KT], [PX, KH / 2, PZ1 + KT / 2], kerb(PX1 - PX0));
    s.box([PX1 - PX0 + KT, KH, KT], [PX, KH / 2, PZ0 - KT / 2], kerb(PX1 - PX0));
    const sideA = s.box([KT, KH, PZ1 - PZ0], [PX0 - KT / 2, KH / 2, (PZ0 + PZ1) / 2], kerb(PZ1 - PZ0));
    const sideB = s.box([KT, KH, PZ1 - PZ0], [PX1 + KT / 2, KH / 2, (PZ0 + PZ1) / 2], kerb(PZ1 - PZ0));
    void sideA; void sideB;
    const sandHex = new THREE.Color('#c3a676').lerp(new THREE.Color('#a89a86'), 1 - mood.warmth).getStyle();
    const sandTexture = paint(256, 512, (c) => {
      c.fillStyle = sandHex; c.fillRect(0, 0, 256, 512);
      for (let i = 0; i < 2500; i++) {
        c.fillStyle = rgba(random() < 0.5 ? '#efe0c0' : '#7a6448', 0.15 + random() * 0.25);
        c.fillRect(random() * 256, random() * 512, 1 + random() * 2, 1 + random() * 2);
      }
      if (swept) {
        // Rake lines down the length of the pit.
        c.strokeStyle = 'rgba(90,70,45,0.35)';
        c.lineWidth = 2;
        for (let x = 6; x < 256; x += 10) { c.beginPath(); c.moveTo(x, 0); for (let y = 0; y <= 512; y += 32) c.lineTo(x + Math.sin(y * 0.02 + x) * 2, y); c.stroke(); }
      } else {
        for (let i = 0; i < 40; i++) {
          c.fillStyle = 'rgba(70,55,40,0.25)';
          c.beginPath(); c.ellipse(random() * 256, random() * 512, 6, 10, random() * 3, 0, 7); c.fill();
        }
        // Scorched rings where metal has gone in.
        if (!swept) for (let i = 0; i < 8; i++) {
          const x = random() * 256, y = random() * 512, r = 14 + random() * 26;
          const g = c.createRadialGradient(x, y, 2, x, y, r);
          g.addColorStop(0, 'rgba(40,28,20,0.5)'); g.addColorStop(1, 'rgba(40,28,20,0)');
          c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
        }
      }
    });
    const sand = new THREE.MeshStandardMaterial({ map: sandTexture, roughness: 1 });
    s.box([PX1 - PX0, SAND, PZ1 - PZ0], [PX, SAND / 2, (PZ0 + PZ1) / 2], sand);

    // ---- The moulds standing in the sand.
    const shellTexture = paint(256, 256, (c) => {
      c.fillStyle = '#ece7dd'; c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 1600; i++) {
        const g = 150 + random() * 90;
        c.fillStyle = `rgba(${g},${g - 6},${g - 14},${0.25 + random() * 0.35})`;
        c.fillRect(random() * 256, random() * 256, 1 + random() * 2.5, 1 + random() * 2.5);
      }
      const scorch = pouring ? 0.45 : cooling ? 0.85 : breakout ? 0.7 : 0.2;
      const g = c.createLinearGradient(0, 256, 0, 256 - 150 * scorch);
      g.addColorStop(0, `rgba(70,48,32,${0.3 + scorch * 0.5})`); g.addColorStop(1, 'rgba(70,48,32,0)');
      c.fillStyle = g; c.fillRect(0, 0, 256, 256);
      c.strokeStyle = 'rgba(40,32,28,0.8)';
      for (let i = 0; i < 4 + wear * 6; i++) {
        c.lineWidth = 0.8 + random() * 1.2;
        let x = random() * 256, y = random() * 256;
        c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 5; k++) { x += (random() - 0.5) * 50; y += (random() - 0.5) * 50; c.lineTo(x, y); }
        c.stroke();
      }
    });
    shellTexture.wrapS = shellTexture.wrapT = THREE.RepeatWrapping;
    const shell = new THREE.MeshStandardMaterial({ map: shellTexture, roughness: 0.96 });
    const hole = s.material('#2a2622', { roughness: 0.9 });
    const target: [number, number] = [PX, -1.45];
    const spots: [number, number][] = [target, [PX - 0.68, -2.75], [PX + 0.68, -2.7], [PX - 0.7, -0.15], [PX + 0.72, -0.2], [PX - 0.6, 2.45], [PX + 0.62, 2.5], [PX, -2.95]];
    const mouldCount = swept ? 0 : Math.min(spots.length, 5 + Math.round(mood.density * 3));
    const poured = pouring ? 1 + Math.floor(random() * 3) : 0;
    const cupTops: { x: number; y: number; z: number; fill: 'glow' | 'crust' | 'empty' }[] = [];
    let phase = random() * 10;
    for (let index = 0; index < mouldCount; index++) {
      const [x, z] = spots[index];
      const isTarget = index === 0;
      const fill: 'glow' | 'crust' | 'empty' = pouring ? (isTarget || index <= poured ? 'glow' : 'empty') : cooling || breakout ? 'crust' : 'empty';
      const broken = breakout && index % 3 !== 2;
      const g = new THREE.Group();
      g.position.set(x, SAND - 0.04, z);
      g.rotation.y = (random() - 0.5) * 0.5;
      root.add(g);
      const body = broken ? bronze : shell;
      const part = (geometry: THREE.BufferGeometry, at: P3, rotation: P3 = [0, 0, 0], scale: P3 = [1, 1, 1], material: THREE.Material = body) => {
        const mesh = new THREE.Mesh(broken ? geometry : lumpy(geometry, 0.018, (phase += 1.7)), material);
        mesh.position.set(...at); mesh.rotation.set(...rotation); mesh.scale.set(...scale);
        mesh.castShadow = mesh.receiveShadow = true;
        g.add(mesh);
        return mesh;
      };
      let top = 0.8;
      if (a.casting === 'statue') {
        const variant = index % 3;
        if (variant === 0) { part(new THREE.CapsuleGeometry(0.28, 0.35, 6, 18), [0, 0.32, 0], [0, 0, 0], [1.2, 1, 0.9]); part(new THREE.SphereGeometry(0.17, 18, 12), [0, 0.86, 0]); top = 1.0; }
        else if (variant === 1) { part(new THREE.CapsuleGeometry(0.15, 0.75, 6, 16), [0.06, 0.45, 0], [0, 0, -0.18]); top = 0.95; }
        else { part(new THREE.CylinderGeometry(0.13, 0.2, 0.35, 16), [0, 0.15, 0]); part(new THREE.SphereGeometry(0.24, 18, 14), [0, 0.5, 0], [0, 0, 0], [0.9, 1.1, 1]); top = 0.78; }
      } else if (a.casting === 'bell') {
        const profile: [number, number][] = [[0.58, -0.05], [0.55, 0.06], [0.44, 0.3], [0.38, 0.5], [0.3, 0.66], [0.15, 0.74], [0, 0.76]];
        part(new THREE.LatheGeometry(profile.map(([px, py]) => new THREE.Vector2(px, py)), 28), [0, 0, 0]);
        top = 0.76;
      } else if (a.casting === 'plaque') {
        part(new THREE.BoxGeometry(1.0, 0.8, 0.16, 6, 6, 2), [0, 0.32, 0]);
        top = 0.72;
      } else {
        part(new THREE.SphereGeometry(0.3, 18, 14), [0, 0.18, 0], [0, 0, 0], [1.1, 0.8, 1.1]);
        part(new THREE.TorusGeometry(0.24, 0.08, 10, 24), [0.05, 0.55, 0], [0.3, 0.5, 0.4]);
        part(new THREE.SphereGeometry(0.17, 16, 12), [-0.05, 0.92, 0]);
        top = 1.06;
      }
      // Pour cup on top and vent risers.
      const cupY = top + 0.05;
      part(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 12), [0, top - 0.02, 0]);
      const cup = part(new THREE.CylinderGeometry(0.17, 0.065, 0.2, 18, 1, true), [0, cupY + 0.1, 0]);
      (cup.material as THREE.Material).side = THREE.DoubleSide;
      const fillMat = fill === 'glow' ? glow : fill === 'crust' ? (broken ? bronze : crust) : hole;
      part(new THREE.CylinderGeometry(fill === 'empty' ? 0.1 : 0.15, fill === 'empty' ? 0.1 : 0.15, 0.02, 16), [0, cupY + (fill === 'empty' ? 0.05 : 0.17), 0], [0, 0, 0], [1, 1, 1], fillMat);
      cupTops.push({ x, y: SAND - 0.04 + cupY + 0.18, z, fill });
      const risers = a.casting === 'plaque' ? 2 : 2 + (index % 2);
      for (let r = 0; r < risers; r++) {
        const sideX = (r % 2 ? 1 : -1) * (a.casting === 'plaque' ? 0.38 : 0.2 + random() * 0.08);
        const baseY = top * (0.45 + random() * 0.3);
        const tipY = top + 0.12 + random() * 0.18;
        const from = new THREE.Vector3(sideX * 0.6, baseY, (random() - 0.5) * 0.1), to = new THREE.Vector3(sideX * 1.15, tipY, (random() - 0.5) * 0.15);
        const dir = to.clone().sub(from);
        const rod = part(new THREE.CylinderGeometry(0.03, 0.035, dir.length(), 8), [0, 0, 0]);
        rod.position.copy(from).lerp(to, 0.5);
        rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        part(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 8), [to.x, to.y + 0.01, to.z], [0, 0, 0], [1, 1, 1], fill === 'glow' ? glow : fill === 'crust' ? crust : hole);
      }
      if (broken) {
        // Shell still clinging at the base, and shards round it.
        part(new THREE.CylinderGeometry(0.34, 0.4, 0.22, 16, 1, true), [0, 0.1, 0], [0, 0, 0], [1, 1, a.casting === 'plaque' ? 0.45 : 1], shell).material = shell;
      }
    }
    // Shell shards, everywhere when breaking out, a few otherwise.
    if (!swept) {
      const shardCount = breakout ? 150 : 24;
      const shards = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.2, 0.7), shell, shardCount);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let i = 0; i < shardCount; i++) {
        const inPit = random() < 0.75;
        const x = inPit ? PX0 + 0.1 + random() * (PX1 - PX0 - 0.2) : PX0 - 0.2 - random() * 1.2;
        const z = PZ0 + 0.2 + random() * (PZ1 - PZ0 - 0.4);
        const size = 0.05 + random() * 0.09;
        q.setFromEuler(new THREE.Euler((random() - 0.5) * 0.9, random() * Math.PI, (random() - 0.5) * 0.9));
        m.compose(new THREE.Vector3(x, (inPit ? SAND : 0) + 0.015, z), q, new THREE.Vector3(size, size, size));
        shards.setMatrixAt(i, m);
      }
      shards.instanceMatrix.needsUpdate = true;
      shards.castShadow = shards.receiveShadow = true;
      root.add(shards);
    }

    // ---- The I-beam overhead, its column, and the chain hoist over the target mould.
    const BY = 5.0, BZ = target[1] - 0.33;
    const beamMat = s.material(a.building === 'block' ? '#3d5a7a' : '#4a4d50', { metalness: 0.5, roughness: 0.5 });
    s.box([13.6, 0.04, 0.24], [-0.1, BY + 0.2, BZ], beamMat);
    s.box([13.6, 0.36, 0.035], [-0.1, BY, BZ], beamMat);
    s.box([13.6, 0.04, 0.24], [-0.1, BY - 0.2, BZ], beamMat);
    s.box([0.3, BY + 0.22, 0.3], [6.6, (BY + 0.22) / 2, BZ], beamMat);
    s.rod([6.6, BY - 1.0, BZ], [5.6, BY - 0.2, BZ], 0.05, beamMat);
    s.box([0.4, 0.05, 0.4], [6.6, 0.025, BZ], darkSteel);
    const hoistX = target[0];
    s.box([0.34, 0.1, 0.3], [hoistX, BY - 0.27, BZ], darkSteel);
    for (const dz of [-1, 1]) s.cylinder(0.06, 0.06, 0.03, [hoistX, BY - 0.19, BZ + dz * 0.13], darkSteel, 12).rotation.x = Math.PI / 2;
    s.box([0.32, 0.42, 0.26], [hoistX, BY - 0.55, BZ], yellow);
    s.cylinder(0.15, 0.15, 0.06, [hoistX, BY - 0.52, BZ + 0.15], yellow, 18).rotation.x = Math.PI / 2;
    const hookY = pouring ? 2.75 : cooling ? 3.0 : breakout ? 2.5 : 3.9;
    const swingGroup = new THREE.Group();
    swingGroup.position.set(hoistX, BY - 0.76, BZ);
    root.add(swingGroup);
    chain(s, [[0, 0, 0], [0, (hookY - (BY - 0.76)) / 2, 0], [0, hookY - (BY - 0.76) + 0.05, 0]], 0.08, chainMat, swingGroup);
    hook(s, [0, hookY - (BY - 0.76) + 0.05, 0], 0.32, chainMat, swingGroup);
    // The hand chain hanging in a loop to head height.
    chain(s, [[0.14, -0.05, 0.14], [0.16, -1.4, 0.16], [0.14, -2.5, 0.15], [0.12, -1.4, 0.1], [0.14, -0.05, 0.08]], 0.06, chainMat, swingGroup);
    const streams: THREE.Mesh[] = [];
    if (pouring || cooling) {
      // The crucible hangs in a bail from the hook: tipped and pouring, or drained and dark.
      const crucible = new THREE.Group();
      const hookLocal = hookY - (BY - 0.76) - 0.25;
      crucible.position.set(0, hookLocal, 0);
      crucible.scale.setScalar(1.35);
      swingGroup.add(crucible);
      const bail = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 8, 28, Math.PI), darkSteel);
      bail.position.y = -0.34;
      bail.castShadow = true;
      const pot = new THREE.Group();
      pot.position.y = -0.34;
      pot.rotation.x = pouring ? 0.8 : 0;
      crucible.add(bail, pot);
      const potMesh = new THREE.Mesh(new THREE.LatheGeometry([[0.0, -0.32], [0.2, -0.32], [0.27, -0.12], [0.3, 0.12], [0.29, 0.22], [0.25, 0.22], [0.25, 0.12], [0.0, 0.0]].map(([px, py]) => new THREE.Vector2(px, py)), 24), s.material('#3a3534', { roughness: 0.8 }));
      potMesh.castShadow = true;
      pot.add(potMesh);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.29, 0.1, 24, 1, true), darkSteel);
      band.position.y = 0.0;
      pot.add(band);
      for (const dx of [-1, 1]) { const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 8), darkSteel); pin.position.set(dx * 0.33, 0, 0); pin.rotation.set(0, 0, Math.PI / 2); pot.add(pin); }
      const surface = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.02, 20), pouring ? glow : crust);
      surface.position.y = 0.14;
      pot.add(surface);
      if (pouring) {
        // The lip is toward +z after the tip; the stream falls from it into the target cup.
        swingGroup.updateMatrixWorld(true);
        const lip = new THREE.Vector3(0, 0.22, 0.28).applyMatrix4(pot.matrixWorld);
        const cup = cupTops[0];
        const end = new THREE.Vector3(cup ? cup.x : hoistX, cup ? cup.y - 0.04 : SAND + 0.9, cup ? cup.z : BZ);
        const curve = new THREE.CatmullRomCurve3([lip, lip.clone().add(new THREE.Vector3(0, -0.05, 0.08)), new THREE.Vector3((lip.x + end.x) / 2, (lip.y + end.y) / 2, (lip.z + end.z) / 2 + 0.04), end]);
        const stream = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.05, 8), new THREE.MeshBasicMaterial({ color: '#ffd27a' }));
        root.add(stream);
        const halo = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.11, 8), new THREE.MeshBasicMaterial({ color: glowColour, transparent: true, opacity: 0.3, depthWrite: false }));
        root.add(halo);
        streams.push(halo);
        void stream;
      }
    }
    if (breakout) {
      // A sling hangs from the hook, and sledgehammers lie on the sand.
      chain(s, [[-0.2, hookY - (BY - 0.76) - 0.3, 0], [-0.25, hookY - (BY - 0.76) - 0.8, 0.1], [0, hookY - (BY - 0.76) - 1.0, 0.15], [0.25, hookY - (BY - 0.76) - 0.8, 0.1], [0.2, hookY - (BY - 0.76) - 0.3, 0]], 0.07, chainMat, swingGroup);
      const handle = s.material('#9a7a4c', { roughness: 0.8 });
      for (const [hx, hz, turn] of [[PX - 1.0, 0.6, 0.4], [PX + 0.3, -0.75, -1.2]] as const) {
        const y = hx > PX0 ? SAND : 0;
        const hammer = new THREE.Group();
        hammer.position.set(hx, y + 0.04, hz);
        hammer.rotation.y = turn;
        root.add(hammer);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.9, 8), handle);
        shaft.rotation.z = Math.PI / 2;
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.24), darkSteel);
        head.position.x = 0.45;
        for (const mesh of [shaft, head]) { mesh.castShadow = true; hammer.add(mesh); }
      }
    }

    // ---- Spatter and sparks round the pour, smoke off the filled cups.
    const sparks: THREE.Mesh[] = [];
    if (pouring) {
      const spatter = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), glow, 40);
      const m = new THREE.Matrix4();
      for (let i = 0; i < 40; i++) {
        const angle = random() * Math.PI * 2, r = 0.35 + random() * 0.9;
        const size = 0.012 + random() * 0.02;
        m.makeScale(size, size * 0.4, size).setPosition(target[0] + Math.cos(angle) * r, SAND + 0.005, target[1] + Math.sin(angle) * r);
        spatter.setMatrixAt(i, m);
      }
      spatter.instanceMatrix.needsUpdate = true;
      root.add(spatter);
      const sparkMat = new THREE.MeshBasicMaterial({ color: '#ffc060', transparent: true, opacity: 0.9, depthWrite: false });
      const sparkGeometry = new THREE.BoxGeometry(0.012, 0.012, 1);
      const cup = cupTops[0];
      for (let i = 0; i < 30; i++) {
        const spark = new THREE.Mesh(sparkGeometry, sparkMat);
        const yaw = random() * Math.PI * 2, pitch = 0.2 + random() * 0.9;
        const dir = new THREE.Vector3(Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch), Math.sin(yaw) * Math.cos(pitch));
        const length = 0.1 + random() * 0.3;
        spark.position.set(cup?.x ?? PX, cup?.y ?? 1, cup?.z ?? BZ).addScaledVector(dir, 0.1 + random() * 0.5 + length / 2);
        spark.scale.z = length;
        spark.lookAt(spark.position.clone().add(dir));
        spark.castShadow = false;
        root.add(spark);
        sparks.push(spark);
      }
      const pitLight = new THREE.PointLight(glowColour, night ? 30 : 16, 7, 1.5);
      pitLight.position.set(target[0], 1.4, target[1] + 0.5);
      root.add(pitLight);
    }
    const wisps: { mesh: THREE.Mesh; y: number; phase: number }[] = [];
    if (pouring || cooling) {
      const texture = paint(64, 128, (c) => {
        const g = c.createLinearGradient(0, 128, 0, 0);
        g.addColorStop(0, 'rgba(235,228,218,0.85)'); g.addColorStop(1, 'rgba(235,228,218,0)');
        c.fillStyle = g; c.beginPath(); c.ellipse(32, 64, 20, 64, 0, 0, 7); c.fill();
      });
      const smoke = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: pouring ? 0.4 : 0.28, depthWrite: false, side: THREE.DoubleSide, color: night ? '#b9b2c2' : '#f2eee8' });
      for (const cup of cupTops) {
        if (cup.fill === 'empty') continue;
        for (let k = 0; k < (pouring ? 2 : 1); k++) {
          const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.3 + random() * 0.2, 1.0 + random() * 0.8), smoke);
          const y = cup.y + 0.6 + random() * 0.4;
          plane.position.set(cup.x + (random() - 0.5) * 0.2, y, cup.z + (random() - 0.5) * 0.2);
          plane.rotation.y = random() * Math.PI;
          root.add(plane);
          wisps.push({ mesh: plane, y, phase: random() * 6 });
        }
      }
    }

    // ---- Gas bottles chained along the left wall at the back.
    const bottleCount = 4 + Math.round(mood.density * 3);
    const bottleColours: [string, string][] = [['#2b2d30', '#e8e6e0'], ['#7a2a24', '#7a2a24'], ['#3e5e46', '#3e5e46'], ['#d9d6cf', '#c23a2a'], ['#5a6a7a', '#e0b428']];
    for (let i = 0; i < bottleCount; i++) {
      const z = -4.85 + i * 0.34;
      const [body, shoulder] = bottleColours[Math.floor(random() * bottleColours.length)];
      const big = shoulder === '#c23a2a';
      const r = big ? 0.17 : 0.12, h = big ? 1.1 : 1.45;
      const x = -6.4 + (random() - 0.5) * 0.05;
      s.cylinder(r, r, h, [x, h / 2, z], s.material(body, { roughness: 0.45, metalness: 0.3 }), 16);
      s.mesh(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), s.material(shoulder, { roughness: 0.45 }), [x, h, z]);
      s.cylinder(0.05, 0.06, 0.12, [x, h + r + 0.04, z], s.material('#9a9a92', { metalness: 0.6 }), 10);
    }
    s.box([0.05, 0.05, bottleCount * 0.34 + 0.1], [-6.24, 1.05, -4.85 + (bottleCount - 1) * 0.17], chainMat);

    // ---- The finishing bench along the left wall at the front, with a pegboard over it.
    const benchMat = s.material('#4c4f53', { metalness: 0.5, roughness: 0.55 });
    s.box([0.8, 0.06, 2.3], [-6.25, 0.9, 2.15], benchMat);
    for (const z of [1.1, 3.2]) for (const x of [-6.58, -5.92]) s.box([0.05, 0.87, 0.05], [x, 0.435, z], benchMat);
    s.box([0.7, 0.03, 2.1], [-6.25, 0.25, 2.15], benchMat);
    s.box([0.18, 0.14, 0.12], [-5.88, 1.0, 1.45], s.material('#2f5f9e', { roughness: 0.5 }));
    s.box([0.06, 0.06, 0.3], [-5.82, 1.0, 1.45], darkSteel);
    s.cylinder(0.12, 0.12, 0.04, [-6.2, 1.3, 2.8], s.material('#8a8d90'), 18).rotation.x = Math.PI / 2;
    s.box([0.2, 0.18, 0.3], [-6.2, 1.02, 2.8], s.material('#3a6a4a'));
    s.mesh(new THREE.SphereGeometry(0.11, 16, 12), bronze, [-6.2, 1.04, 2.1]).scale.set(0.9, 1.15, 1);
    s.box([0.16, 0.06, 0.16], [-6.2, 0.96, 2.1], darkSteel);
    const pegboard = paint(256, 256, (c) => {
      c.fillStyle = '#b89a6a'; c.fillRect(0, 0, 256, 256);
      c.fillStyle = 'rgba(60,40,20,0.5)';
      for (let y = 8; y < 256; y += 14) for (let x = 8; x < 256; x += 14) { c.beginPath(); c.arc(x, y, 1.6, 0, 7); c.fill(); }
      c.strokeStyle = '#2a2a2c'; c.fillStyle = '#2a2a2c'; c.lineWidth = 6;
      for (let i = 0; i < 7; i++) {
        const x = 24 + i * 32, y = 60 + (i % 2) * 70;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + (i % 3 - 1) * 6, y + 60 + random() * 30); c.stroke();
        c.fillRect(x - 8, y - 6, 16, 12);
      }
    });
    noShadow(s.mesh(new THREE.PlaneGeometry(2.1, 1.0), new THREE.MeshStandardMaterial({ map: pegboard, roughness: 0.9 }), [-6.69, 1.75, 2.15])).rotation.y = Math.PI / 2;

    // ---- The back wall left of the furnace.
    if (a.walls === 'tools') {
      s.box([4.8, 0.08, 0.1], [-3.3, 2.3, -5.13], darkSteel);
      for (let i = 0; i < 9; i++) {
        const x = -5.4 + i * 0.5;
        const kind = i % 3;
        if (kind === 0) {
          s.rod([x, 2.3, -5.08], [x - 0.08, 1.0, -5.05], 0.018, darkSteel);
          s.rod([x, 2.3, -5.08], [x + 0.08, 1.0, -5.05], 0.018, darkSteel);
          s.ring(0.09, 0.015, [x, 0.98, -5.05], darkSteel, Math.PI).rotation.z = Math.PI;
        } else if (kind === 1) {
          s.rod([x, 2.3, -5.08], [x, 0.7, -5.05], 0.022, darkSteel);
          s.ring(0.17, 0.025, [x, 0.6, -5.05], darkSteel);
        } else {
          s.rod([x, 2.3, -5.08], [x, 1.0, -5.05], 0.015, darkSteel);
          s.cylinder(0.11, 0.11, 0.02, [x, 0.95, -5.05], darkSteel, 14).rotation.x = Math.PI / 2;
        }
      }
      const board = paint(512, 320, (c) => {
        c.fillStyle = '#2a2f2c'; c.fillRect(0, 0, 512, 320);
        c.fillStyle = 'rgba(235,235,225,0.85)';
        c.font = 'bold 34px monospace';
        c.fillText('POUR LIST', 24, 50);
        c.font = '24px monospace';
        const items = { statue: ['TORSO  B-1', 'L ARM  B-2', 'HEAD   B-3', 'R LEG  B-4'], bell: ['BELL 1  410 KG', 'BELL 2  180 KG', 'CLAPPERS', 'METAL 1150 C'], plaque: ['PLAQUE 1-6', 'DATES PANEL', 'CREST', 'METAL 1150 C'], abstract: ['KNOT  A', 'RING  B', 'SWELL C', 'METAL 1150 C'] }[a.casting];
        items.forEach((line, i) => c.fillText(`${swept || i < 2 ? '[x]' : '[ ]'} ${line}`, 24, 100 + i * 46));
      });
      noShadow(s.mesh(new THREE.PlaneGeometry(1.5, 0.95), new THREE.MeshStandardMaterial({ map: board, roughness: 0.9 }), [-5.3, 3.3, -5.19]));
    } else if (a.walls === 'safety') {
      const band = stripes.clone(); band.repeat.set(5.5 / 0.8, 1); band.needsUpdate = true;
      noShadow(s.mesh(new THREE.PlaneGeometry(5.6, 0.45), new THREE.MeshStandardMaterial({ map: band, roughness: 0.8 }), [-3.6, 0.3, -5.19]));
      for (const x of [-5.6, -1.4]) {
        s.cylinder(0.09, 0.09, 0.5, [x, 1.25, -5.08], s.material('#c8261e', { roughness: 0.4 }), 14);
        s.cylinder(0.03, 0.04, 0.08, [x, 1.54, -5.08], darkSteel, 8);
      }
      const sign = s.label('NO WATER NEAR THE POUR', 3.4, 0.6, [-3.5, 3.0, -5.18], '#f2efe6', '#b32a1e');
      sign.castShadow = false;
      const sign2 = s.label('FACE SHIELDS ON', 2.0, 0.42, [-3.5, 2.2, -5.18], '#1d1d1f', '#e2b320');
      sign2.castShadow = false;
    } else if (a.walls === 'plaques') {
      const plaqueMat = (hex: string) => s.material(hex, { metalness: 0.55, roughness: 0.45 });
      for (let i = 0; i < 6; i++) {
        const x = -5.6 + (i % 3) * 0.9, y = 1.8 + Math.floor(i / 3) * 0.9;
        s.box([0.7, 0.5, 0.05], [x, y, -5.17], plaqueMat(['#5a3a22', '#3a5a4a', '#2a2420'][i % 3]));
        s.box([0.56, 0.06, 0.02], [x, y + 0.1, -5.14], plaqueMat('#c89a58'));
        s.box([0.4, 0.04, 0.02], [x, y - 0.06, -5.14], plaqueMat('#c89a58'));
      }
      s.cylinder(0.75, 0.75, 0.08, [-1.9, 2.6, -5.15], plaqueMat('#6a4a2a'), 32).rotation.x = Math.PI / 2;
      s.cylinder(0.45, 0.5, 0.08, [-1.9, 2.6, -5.08], plaqueMat('#8a6a3a'), 28).rotation.x = Math.PI / 2;
      s.mesh(new THREE.SphereGeometry(0.25, 16, 12), plaqueMat('#a8803e'), [-1.9, 2.65, -5.05]).scale.set(1, 1.2, 0.4);
    } else {
      const face = paint(256, 256, (c) => {
        c.fillStyle = '#f2efe6'; c.beginPath(); c.arc(128, 128, 124, 0, 7); c.fill();
        c.strokeStyle = '#1d1d1f'; c.lineWidth = 8; c.stroke();
        for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2; c.lineWidth = i % 3 ? 4 : 9; c.beginPath(); c.moveTo(128 + Math.sin(t) * 100, 128 - Math.cos(t) * 100); c.lineTo(128 + Math.sin(t) * 116, 128 - Math.cos(t) * 116); c.stroke(); }
        const hour = night ? 23 : evening ? 18 : 10 + Math.floor(random() * 5), minute = Math.floor(random() * 60);
        const hourAngle = ((hour % 12) + minute / 60) / 12 * Math.PI * 2, minuteAngle = minute / 60 * Math.PI * 2;
        c.lineWidth = 10; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + Math.sin(hourAngle) * 60, 128 - Math.cos(hourAngle) * 60); c.stroke();
        c.lineWidth = 6; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + Math.sin(minuteAngle) * 92, 128 - Math.cos(minuteAngle) * 92); c.stroke();
      });
      s.cylinder(0.62, 0.62, 0.1, [-2.2, 3.4, -5.15], darkSteel, 32).rotation.x = Math.PI / 2;
      noShadow(s.mesh(new THREE.CircleGeometry(0.56, 32), new THREE.MeshStandardMaterial({ map: face, roughness: 0.6 }), [-2.2, 3.4, -5.09]));
      const drawing = paint(256, 320, (c) => {
        c.fillStyle = '#efe8d8'; c.fillRect(0, 0, 256, 320);
        c.strokeStyle = 'rgba(40,36,32,0.8)'; c.lineWidth = 3;
        c.beginPath();
        if (a.casting === 'bell') { c.moveTo(60, 260); c.quadraticCurveTo(80, 120, 128, 70); c.quadraticCurveTo(176, 120, 196, 260); c.closePath(); }
        else if (a.casting === 'plaque') { c.rect(50, 80, 156, 180); c.moveTo(70, 130); c.lineTo(186, 130); c.moveTo(70, 170); c.lineTo(186, 170); }
        else if (a.casting === 'abstract') { c.arc(128, 220, 50, 0, 7); c.moveTo(178, 140); c.arc(128, 140, 50, 0, 7); c.moveTo(158, 70); c.arc(128, 70, 30, 0, 7); }
        else { c.arc(128, 70, 26, 0, 7); c.moveTo(128, 96); c.lineTo(128, 200); c.moveTo(80, 120); c.lineTo(176, 140); c.moveTo(128, 200); c.lineTo(100, 290); c.moveTo(128, 200); c.lineTo(160, 290); }
        c.stroke();
        c.fillStyle = 'rgba(40,36,32,0.6)'; c.font = '18px serif'; c.fillText('scale 1:1', 20, 305);
      });
      for (let i = 0; i < 3; i++) noShadow(s.mesh(new THREE.PlaneGeometry(0.75, 0.95), new THREE.MeshStandardMaterial({ map: drawing, roughness: 0.9 }), [-5.6 + i * 0.95, 2.6 + (i % 2) * 0.15, -5.19])).rotation.z = (random() - 0.5) * 0.08;
    }

    // ---- Steel racks of castings beside the furnace, against the back wall.
    const rackMat = s.material('#2f5f9e', { roughness: 0.55 });
    const beamColour = s.material('#d9741e', { roughness: 0.55 });
    const RX0 = 3.1, RX1 = 6.4, RZ = -4.75;
    for (const x of [RX0, (RX0 + RX1) / 2, RX1]) for (const dz of [-0.4, 0.4]) s.box([0.07, 3.0, 0.07], [x, 1.5, RZ + dz], rackMat);
    const levels = [0.15, 1.15, 2.15];
    for (const y of levels) for (const dz of [-0.4, 0.4]) s.box([RX1 - RX0 + 0.1, 0.09, 0.06], [(RX0 + RX1) / 2, y, RZ + dz], beamColour);
    for (const y of levels) s.box([RX1 - RX0, 0.03, 0.8], [(RX0 + RX1) / 2, y + 0.05, RZ], s.material('#8a7a5e', { roughness: 0.9 }));
    const perShelf = 3 + Math.round(mood.density * 3);
    const shellPatch = s.material('#ece7dd', { roughness: 0.96 });
    for (const y of levels) for (let i = 0; i < perShelf; i++) {
      const x = RX0 + 0.3 + (i + random() * 0.4) * (RX1 - RX0 - 0.5) / perShelf, z = RZ + (random() - 0.5) * 0.3, base = y + 0.065;
      if (a.racks === 'castings') {
        const kind = (i + Math.round(y)) % 3;
        if (kind === 0) { s.mesh(new THREE.CapsuleGeometry(0.1, 0.3, 4, 10), bronze, [x, base + 0.1, z]).rotation.z = Math.PI / 2; s.ball([0.06, 0.03, 0.06], [x + 0.1, base + 0.2, z], shellPatch, 8); }
        else if (kind === 1) { s.ball([0.15, 0.18, 0.14], [x, base + 0.18, z], bronze, 14); s.rod([x, base + 0.3, z], [x + 0.05, base + 0.55, z], 0.02, bronze); }
        else { s.box([0.3, 0.12, 0.22], [x, base + 0.06, z], bronze); s.ball([0.08, 0.03, 0.07], [x - 0.05, base + 0.13, z], shellPatch, 8); }
      } else if (a.racks === 'crucibles') {
        if (i % 2 === 0) s.lathe([[0, 0], [0.12, 0], [0.17, 0.2], [0.18, 0.36], [0.16, 0.36], [0, 0.05]], s.material('#4a4644', { roughness: 0.85 }), [x, base, z]);
        else for (let k = 0; k < 3; k++) s.box([0.3, 0.07, 0.1], [x, base + 0.035 + k * 0.07, z + (k % 2 ? 0.06 : -0.06)], s.material('#c8964a', { metalness: 0.7, roughness: 0.35 }));
        if (i === perShelf - 1) s.box([0.35, 0.3, 0.3], [x, base + 0.15, z], s.material('#e6e0d2', { roughness: 1 }));
      } else if (a.racks === 'finished') {
        if (i % 2 === 0) { s.box([0.18, 0.1, 0.18], [x, base + 0.05, z], darkSteel); s.ball([0.11, 0.14, 0.12], [x, base + 0.24, z], s.material('#3e3024', { metalness: 0.4, roughness: 0.5 }), 14); }
        else s.box([0.35, 0.5, 0.35], [x, base + 0.25, z], s.material('#2f4f8a', { roughness: 0.95 }));
      } else {
        if (i % 2 === 0) s.ball([0.18, 0.14, 0.16], [x, base + 0.12, z], s.material('#f0ece4', { roughness: 0.95 }), 14);
        else s.mesh(new THREE.CapsuleGeometry(0.06, 0.25, 4, 10), s.material('#7a1e18', { roughness: 0.55 }), [x, base + 0.2, z]).rotation.z = 0.2;
      }
    }

    // ---- Floor clutter: a sand heap with a shovel, a stack of empty crucibles, a broom when swept.
    const heap = s.mesh(lumpy(new THREE.LatheGeometry([[1.1, 0], [1.0, 0.1], [0.75, 0.38], [0.45, 0.62], [0.15, 0.74], [0, 0.76]].map(([x, y]) => new THREE.Vector2(x, y)), 28), 0.05, random() * 10), sand, [5.5, 0, 3.0]);
    heap.scale.set(1, 1, 0.85);
    s.rod([5.3, 0.3, 2.9], [5.0, 1.35, 2.6], 0.022, s.material('#9a7a4c', { roughness: 0.8 }));
    s.box([0.25, 0.32, 0.03], [5.38, 0.17, 2.98], darkSteel).rotation.set(-0.25, 0.4, 0.2);
    for (let k = 0; k < 2 + Math.round(mood.density * 2); k++) s.lathe([[0, 0], [0.13, 0], [0.18, 0.22], [0.19, 0.4], [0.17, 0.4], [0, 0.05]], s.material('#4a4644', { roughness: 0.85 }), [2.9 + (k % 2) * 0.45, Math.floor(k / 2) * 0.38, -3.7 + (k % 2) * 0.1]);
    if (swept) {
      s.rod([PX1 + 0.3, 0.02, 1.4], [PX1 + 0.1, 1.5, 0.8], 0.02, s.material('#9a7a4c'));
      s.box([0.5, 0.08, 0.1], [PX1 + 0.31, 0.06, 1.42], s.material('#3a3028')).rotation.y = 0.3;
    }
    if (night) {
      // Caged work bulbs hung from the beam.
      for (const x of [-3.6, 4.2]) {
        s.rod([x, BY - 0.2, BZ], [x, 3.2, BZ], 0.008, darkSteel);
        noShadow(s.mesh(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffe2a8' }), [x, 3.1, BZ]));
        const bulb = new THREE.PointLight('#ffd9a0', 14, 9, 1.5);
        bulb.position.set(x, 3.0, BZ + 0.2);
        root.add(bulb);
      }
    }

    const energy = mix(0.3, 1.5, mood.energy);
    world.update = (_dt, time) => {
      swingGroup.rotation.z = Math.sin(time * 0.9) * 0.01 * energy;
      for (const { mesh, y, phase: p } of wisps) {
        mesh.position.y = y + ((time * 0.15 * energy + p) % 0.6);
        mesh.rotation.z = Math.sin(time * 0.7 * energy + p) * 0.15;
      }
      sparks.forEach((spark, i) => { spark.visible = Math.sin(time * 23 * energy + i * 2.1) > -0.3; });
      for (const halo of streams) (halo.material as THREE.MeshBasicMaterial).opacity = 0.26 + Math.sin(time * 19) * 0.06;
    };
    return world;
  },
});
