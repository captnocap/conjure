import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];
function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const POLES = {
  barber: 'Red and white barber-pole spirals: the travelling show classic.',
  steel: 'Plain galvanised steel masts, a modern working rig.',
  starry: 'Midnight blue poles scattered with gold stars and gold finials.',
  timber: 'Bare weathered timber spars lashed with rope, a poor old family circus.',
  white: 'All white, bone-pale and ghostly.',
} as const;

export default defineThing({
  questions: {
    bar: choice('What is the trapeze bar doing?', {
      swinging: 'Swinging empty at the top of its arc, as if someone has just let go.',
      still: 'Hanging dead still, straight down.',
      cape: 'Still, with a sequinned cape draped over it and trailing down.',
      snapped: 'One rope has parted: the bar dangles crooked from the other.',
      tied: 'Tied back to the platform with a loop of cord, ready for the next flyer.',
    }),
    net: choice('Is there a safety net beneath?', {
      slack: 'A wide slack net sagging in the middle.',
      taut: 'A tight, well-rigged net.',
      torn: 'A net with a ragged hole torn through the middle.',
      none: 'No net at all.',
    }),
    base: choice('What has been left at the foot of the ladder?', {
      'chalk-slippers': 'A chalk bag and a pair of soft slippers set neatly side by side.',
      slippers: 'Just a pair of slippers, one tipped over.',
      chalk: 'A burst chalk bag in a white dusty patch.',
      roses: 'A bouquet of red roses thrown from the crowd.',
      nothing: 'Nothing at all.',
    }),
    poles: choice('How are the poles finished?', POLES),
    height: score('How high is the rig?', ['A low practice rig, barely overhead', 'Full circus height', 'Dizzying, the bar lost up in the dark']),
    catcher: noul('Is there a second, catcher\'s trapeze hanging at the far end?'),
    pennants: noul('Are strings of pennants flown from the guy lines?'),
    cape: choice('If a cape is draped on the bar, what colour is it?', {
      crimson: 'Crimson with gold sequins.',
      silver: 'Silver-white, glittering like frost.',
      emerald: 'Emerald green with gold sequins.',
      violet: 'Violet with pink sequins.',
      black: 'Black with a scatter of silver stars.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(4.6, 7.6, a.height);
    const HALF = 2.9;
    const NET_Y = Math.min(1.9, H * 0.26);

    const poleMap = paint(64, 256, (c, w, h) => {
      const base = { barber: '#f2ece0', steel: '#aab0b4', starry: '#1b2763', timber: '#8a6a46', white: '#efeee8' }[a.poles];
      c.fillStyle = base;
      c.fillRect(0, 0, w, h);
      if (a.poles === 'barber') {
        c.fillStyle = '#c9222c';
        for (let k = -2; k < 10; k++) {
          c.beginPath();
          c.moveTo(0, k * 64); c.lineTo(w, k * 64 - 64); c.lineTo(w, k * 64 - 32); c.lineTo(0, k * 64 + 32);
          c.fill();
        }
      } else if (a.poles === 'starry') {
        c.fillStyle = '#f0c63c';
        for (let i = 0; i < 14; i++) {
          const x = random() * w, y = random() * h, r = 4 + random() * 5;
          c.beginPath();
          for (let k = 0; k < 10; k++) { const an = (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r; c.lineTo(x + Math.sin(an) * rr, y - Math.cos(an) * rr); }
          c.fill();
        }
      } else if (a.poles === 'timber') {
        c.strokeStyle = '#5c4126';
        for (let i = 0; i < 26; i++) { c.beginPath(); const x = random() * w; c.moveTo(x, 0); c.lineTo(x + (random() - 0.5) * 8, h); c.stroke(); }
        c.fillStyle = '#d8c9a3';
        for (const y of [40, 130, 220]) c.fillRect(0, y, w, 12);
      } else if (a.poles === 'steel') {
        c.fillStyle = '#7d8388';
        for (let y = 0; y < h; y += 64) c.fillRect(0, y, w, 5);
      }
      for (let i = 0; i < mood.wear * 60; i++) {
        c.fillStyle = random() < 0.5 ? '#6f5a45' : '#9a9388';
        c.fillRect(random() * w, random() * h, 2 + random() * 8, 2 + random() * 10);
      }
    });
    poleMap.repeat.set(1, Math.round(H / 2));
    const pole = new THREE.MeshStandardMaterial({ map: poleMap, roughness: 0.6, metalness: a.poles === 'steel' ? 0.5 : 0.05 });
    const gold = s.material(a.poles === 'steel' || a.poles === 'white' ? '#c8ccd0' : '#e0b43a', { metalness: 0.6, roughness: 0.35 });
    const rope = s.material(a.poles === 'white' ? '#c9c6bd' : '#cdb98a', { roughness: 0.95 });
    const steel = s.material('#3a3d42', { metalness: 0.6, roughness: 0.45 });
    const wood = s.material('#9a7146');
    const accent = s.material({ barber: '#c9222c', steel: '#d64a2a', starry: '#1b2763', timber: '#7b3b2a', white: '#efeee8' }[a.poles]);

    // Two masts with base plates and finials, a top cable truss between them.
    for (const x of [-HALF, HALF]) {
      const mast = s.cylinder(0.1, 0.13, H, [x, H / 2, 0], pole, 14);
      mast.rotation.y = random() * 6;
      s.cylinder(0.3, 0.34, 0.08, [x, 0.04, 0], steel, 16);
      s.ball([0.15, 0.15, 0.15], [x, H + 0.12, 0], gold, 14);
      s.mesh(new THREE.ConeGeometry(0.07, 0.34, 10), gold, [x, H + 0.4, 0]);
      // Guy lines to stakes, front and back and outward.
      for (const [gx, gz] of [[1.3, 1.3], [1.3, -1.3], [-0.6, 1.6], [-0.6, -1.6]] as const) {
        const foot: P3 = [x + Math.sign(x) * gx, 0, gz];
        s.rod([x, H - 0.25, 0], foot, 0.022, rope);
        s.rod([foot[0], -0.05, foot[2]], [foot[0] + Math.sign(x) * 0.08, 0.3, foot[2]], 0.03, steel, 0.022);
      }
    }
    s.rod([-HALF, H - 0.12, 0], [HALF, H - 0.12, 0], 0.045, steel);
    s.rod([-HALF, H - 0.7, 0], [HALF, H - 0.12, 0], 0.014, steel);
    s.rod([HALF, H - 0.7, 0], [-HALF, H - 0.12, 0], 0.014, steel);

    // Platform board on the left mast with a ladder up to it.
    const PY = H - 2.3;
    s.box([1.25, 0.09, 1.0], [-HALF + 0.7, PY, 0], wood);
    s.box([1.27, 0.1, 0.06], [-HALF + 0.7, PY - 0.02, 0.5], accent);
    s.box([0.06, 0.1, 1.0], [-HALF + 1.33, PY - 0.02, 0], accent);
    s.rod([-HALF + 1.25, PY - 0.03, 0], [-HALF + 0.06, PY - 0.85, 0], 0.035, steel);
    s.rod([-HALF + 1.3, PY + 0.03, 0.46], [-HALF, H - 0.5, 0], 0.018, rope);
    s.rod([-HALF + 1.3, PY + 0.03, -0.46], [-HALF, H - 0.5, 0], 0.018, rope);
    s.rod([-HALF, PY + 1.05, 0], [-HALF + 0.3, PY + 1.05, 0], 0.025, steel);
    const sway = (random() - 0.5) * 0.25;
    const lx = -HALF - 0.28;
    for (const z of [-0.2, 0.2]) s.tube([[lx + 0.3, PY, z], [lx + sway * 0.6, PY * 0.5, z + sway * 0.4], [lx, 0.02, z + sway]], 0.022, rope);
    const rungs = Math.round(PY / 0.36);
    for (let i = 1; i < rungs; i++) {
      const t = i / rungs, bend = Math.sin(t * Math.PI) * sway * 0.35;
      const x = mix(lx, lx + 0.3, t * t) + bend, z = mix(sway, 0, t) + bend;
      s.rod([x, PY * t, z - 0.2], [x, PY * t, z + 0.2], 0.022, wood);
    }

    // The flying trapeze: a weighted bar on two ropes from the top cable.
    const ROPE = Math.min(2.9, H * 0.38);
    const swing = new THREE.Group();
    swing.position.set(-0.35, H - 0.12, 0);
    const web = s.material(a.poles === 'white' ? '#b9b6ae' : a.poles === 'steel' ? '#d64a2a' : a.poles === 'starry' ? '#e0b43a' : '#c9222c', { roughness: 0.8 });
    const bar = new Sculpture(context);
    const snapped = a.bar === 'snapped';
    bar.rod([0, -ROPE, -0.6], [0, -ROPE, 0.6], 0.045, steel);
    for (const z of [-0.6, 0.6]) {
      bar.cylinder(0.065, 0.065, 0.2, [0, -ROPE, z * 0.84], s.material('#f1ede2'), 10).rotation.x = Math.PI / 2;
      bar.rod([0, 0, z * 0.75], [0, -ROPE, z], 0.032, rope);
      bar.rod([0, -ROPE + 0.7, z * 0.94], [0, -ROPE, z], 0.045, web);
    }
    if (snapped) {
      bar.root.rotation.x = 0;
      // The bar hangs from its one good rope; the parted rope trails from each end.
      const hang = new Sculpture(context);
      hang.rod([0, 0, -0.45], [0, -ROPE, -0.45], 0.032, rope);
      hang.rod([0, -ROPE + 0.7, -0.45], [0, -ROPE, -0.45], 0.045, web);
      hang.rod([0, -ROPE, -0.45], [0.18, -ROPE - 1.15, -0.25], 0.045, steel);
      hang.ball([0.07, 0.07, 0.07], [0.18, -ROPE - 1.15, -0.25], s.material('#f1ede2'), 10);
      hang.tube([[0.18, -ROPE - 1.15, -0.25], [0.3, -ROPE - 1.5, -0.1], [0.2, -ROPE - 2.0, -0.2]], 0.03, web);
      hang.tube([[0, 0, 0.45], [0.08, -0.6, 0.5], [-0.06, -1.2 - random() * 0.5, 0.42]], 0.032, rope);
      bar.root.clear();
      bar.root.add(hang.root);
    }
    swing.add(bar.root);
    s.root.add(swing);

    if (a.bar === 'cape') {
      const hue = { crimson: '#b3182c', silver: '#dfe3ea', emerald: '#14805a', violet: '#6a2ea0', black: '#17161c' }[a.cape];
      const glint = { crimson: '#ffd76a', silver: '#ffffff', emerald: '#ffd76a', violet: '#ff9bd0', black: '#dfe6f2' }[a.cape];
      const capeMap = paint(256, 256, (c, w, h) => {
        c.fillStyle = hue;
        c.fillRect(0, 0, w, h);
        c.fillStyle = glint;
        for (let i = 0; i < 260; i++) { c.beginPath(); c.arc(random() * w, random() * h, 1.2 + random() * 2.4, 0, 7); c.fill(); }
        c.fillRect(0, h - 14, w, 14);
      });
      const cloth = new THREE.MeshStandardMaterial({ map: capeMap, side: THREE.DoubleSide, roughness: 0.45, metalness: 0.25, emissive: glint, emissiveIntensity: 0.06 });
      // Two unequal falls of cloth either side of the bar, rippled.
      for (const [side, drop] of [[1, 1.7 + random() * 0.4], [-1, 0.7 + random() * 0.3]] as const) {
        const geo = new THREE.PlaneGeometry(1.05, drop, 10, 8);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const depth = 0.5 - pos.getY(i) / drop;
          pos.setZ(i, Math.sin(pos.getX(i) * 10 + side) * 0.05 * (0.3 + depth) + side * (0.035 + depth * 0.12));
          pos.setX(i, pos.getX(i) * (1 - depth * 0.25));
        }
        geo.computeVertexNormals();
        const fall = new THREE.Mesh(geo, cloth);
        fall.position.set(0, -ROPE - drop / 2 + 0.03, 0);
        fall.rotation.y = Math.PI / 2;
        fall.castShadow = true;
        bar.root.add(fall);
      }
      bar.cylinder(0.07, 0.07, 1.06, [0, -ROPE + 0.02, 0], cloth, 10).rotation.x = Math.PI / 2;
    }
    

    // Catcher's trapeze: a short swing with a padded bar at the far end.
    const catcher = new THREE.Group();
    if (a.catcher) {
      const c2 = new Sculpture(context);
      const drop = ROPE * 0.72;
      c2.rod([0, -drop, -0.5], [0, -drop, 0.5], 0.06, s.material('#efe9da'));
      for (const z of [-0.5, 0.5]) c2.rod([0, 0, z * 0.7], [0, -drop, z], 0.032, rope);
      for (const z of [-0.5, 0.5]) c2.rod([0, -drop, z], [0, -drop + 0.6, z * 0.92], 0.045, web);
      catcher.add(c2.root);
      catcher.position.set(HALF - 0.8, H - 0.12, 0);
      s.root.add(catcher);
    }

    // Safety net: a sagging grid slung between four short posts with spreader ropes.
    if (a.net !== 'none') {
      const NX = 2.3, NZ = 1.25, sag = a.net === 'taut' ? 0.22 : a.net === 'slack' ? 0.95 : 0.7;
      const netMap = paint(512, 256, (c, w, h) => {
        c.clearRect(0, 0, w, h);
        c.strokeStyle = a.poles === 'white' ? '#f4f2ea' : '#e8dcb8';
        c.lineWidth = 7;
        for (let i = 0; i <= 18; i++) { c.beginPath(); c.moveTo((i * w) / 18, 0); c.lineTo((i * w) / 18, h); c.stroke(); }
        for (let j = 0; j <= 9; j++) { c.beginPath(); c.moveTo(0, (j * h) / 9); c.lineTo(w, (j * h) / 9); c.stroke(); }
        c.lineWidth = 12;
        c.strokeRect(0, 0, w, h);
        if (a.net === 'torn') {
          c.globalCompositeOperation = 'destination-out';
          c.beginPath();
          const cx = w * (0.4 + random() * 0.2), cy = h * 0.5;
          for (let i = 0; i < 16; i++) { const an = (i / 16) * 7, r = (i % 2 ? 46 : 84) + random() * 26; c.lineTo(cx + Math.cos(an) * r * 1.3, cy + Math.sin(an) * r); }
          c.fill();
        }
      });
      netMap.wrapS = netMap.wrapT = THREE.ClampToEdgeWrapping;
      const geo = new THREE.PlaneGeometry(NX * 2, NZ * 2, 24, 12);
      geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i) / NX, v = pos.getZ(i) / NZ;
        pos.setY(i, -sag * (1 - u * u) * (1 - v * v * 0.8) + (random() - 0.5) * 0.02);
      }
      geo.computeVertexNormals();
      const net = s.mesh(geo, new THREE.MeshStandardMaterial({ map: netMap, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.95 }), [0, NET_Y, 0]);
      net.castShadow = false;
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        const top: P3 = [x * (NX + 0.25), NET_Y + 0.06, z * (NZ + 0.2)];
        s.rod([top[0] + x * 0.12, 0, top[2] + z * 0.1], top, 0.045, pole);
        s.rod(top, [x * NX, NET_Y, z * NZ], 0.016, rope);
        s.rod(top, [top[0] + x * 0.5, 0, top[2] + z * 0.5], 0.014, rope);
      }
      if (a.net === 'torn') for (let i = 0; i < 5; i++) {
        const x = (random() - 0.5) * 0.9, z = (random() - 0.5) * 0.6;
        s.rod([x, NET_Y - sag * 0.85, z], [x + (random() - 0.5) * 0.2, NET_Y - sag - 0.3 - random() * 0.4, z], 0.012, rope);
      }
    }

    // What was left at the foot of the ladder.
    const bx = -HALF + 0.9, bz = 0.95;
    const slipper = (x: number, z: number, turn: number, tipped: boolean) => {
      const g = new Sculpture(context);
      const satin = s.material(a.poles === 'starry' ? '#e9d9a0' : '#f0b9c4', { roughness: 0.5 });
      g.ball([0.055, 0.03, 0.12], [0, 0.03, 0], satin, 12);
      g.ball([0.04, 0.012, 0.07], [0, 0.052, -0.03], s.material('#3a2a2a'), 10);
      g.root.scale.setScalar(1.9);
      g.root.position.set(x, tipped ? 0.03 : 0, z);
      g.root.rotation.set(0, turn, tipped ? 1.4 : 0);
      s.root.add(g.root);
    };
    const chalkBag = (burst: boolean) => {
      const cloth = s.material('#3f5f8a', { roughness: 0.95 });
      const bag = s.lathe([[0.001, 0], [0.17, 0.02], [0.22, 0.17], [0.17, 0.34], [0.1, 0.39], [0.15, 0.46]], cloth, [bx + 0.45, 0, bz + 0.05]);
      const dust = s.material('#f6f4ee', { roughness: 1 });
      const puff = s.cylinder(0.1, 0.1, 0.03, [bx + 0.45, 0.41, bz + 0.05], dust, 12);
      if (burst) {
        bag.rotation.z = 1.35;
        bag.position.y = 0.2;
        puff.visible = false;
        s.cylinder(0.65, 0.7, 0.012, [bx + 0.05, 0.006, bz + 0.1], dust, 18).scale.set(1, 1, 0.7);
        for (let i = 0; i < 7; i++) s.ball([0.05, 0.03, 0.05], [bx + (random() - 0.6) * 0.7, 0.02, bz + (random() - 0.4) * 0.5], dust, 8);
      }
    };
    if (a.base === 'chalk-slippers') { chalkBag(false); slipper(bx - 0.08, bz + 0.05, 0.25, false); slipper(bx + 0.06, bz + 0.06, 0.18, false); }
    else if (a.base === 'slippers') { slipper(bx - 0.1, bz, 0.9, false); slipper(bx + 0.15, bz + 0.2, -0.6, true); }
    else if (a.base === 'chalk') chalkBag(true);
    else if (a.base === 'roses') {
      const stem = s.material('#2f6a3a'), petal = s.material('#b3182c'), wrap = s.material('#f1ead8');
      const g = new Sculpture(context);
      g.mesh(new THREE.ConeGeometry(0.16, 0.5, 12, 1, true), wrap, [0, 0.25, 0]).rotation.x = Math.PI;
      for (let i = 0; i < 9; i++) {
        const an = random() * 7, r = random() * 0.12;
        g.ball([0.06, 0.055, 0.06], [Math.cos(an) * r, 0.52 + random() * 0.06, Math.sin(an) * r], petal, 8);
      }
      g.cylinder(0.02, 0.02, 0.2, [0, -0.08, 0], stem, 6);
      g.root.rotation.set(0, random() * 6, 1.45);
      g.root.scale.setScalar(1.6);
      g.root.position.set(bx + 0.2, 0.2, bz + 0.1);
      s.root.add(g.root);
      for (let i = 0; i < 6; i++) s.ball([0.035, 0.008, 0.03], [bx + (random() - 0.2) * 0.9, 0.008, bz + (random() - 0.5) * 0.7], petal, 6);
    }

    if (a.pennants) {
      const hues = ['#c9222c', '#f0c63c', '#f2ece0', '#1f6aa8', '#2f8a56'];
      const flag = new THREE.ConeGeometry(0.15, 0.4, 3);
      const pts: { at: P3; size: number; color: string }[] = [];
      for (const x of [-HALF, HALF]) for (const gz of [1.3, -1.3]) for (let i = 1; i < 8; i++) {
        const t = i / 8.5;
        pts.push({ at: [mix(x, x + Math.sign(x) * 1.3, t), mix(H - 0.25, 0, t) - 0.22, mix(0, gz, t)], size: 1, color: hues[Math.floor(random() * hues.length)] });
      }
      flag.rotateX(Math.PI);
      s.scatter(flag, new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }), pts);
    }

    // Pose and motion. The bar is caught mid-arc so a still frame reads as movement.
    const amp = a.bar === 'swinging' ? mix(0.6, 0.95, mood.energy) : a.bar === 'tied' ? 0 : a.bar === 'snapped' ? 0.1 : mix(0.015, 0.06, mood.energy);
    const rest = a.bar === 'tied' ? -0.7 : 0;
    const phase = a.bar === 'swinging' ? 1.1 + random() * 0.6 : random() * 6;
    const rate = Math.sqrt(9.81 / ROPE);
    const pose = (time: number) => {
      swing.rotation.z = rest + amp * Math.sin(time * rate + phase);
      catcher.rotation.z = (a.bar === 'swinging' ? -0.4 : -0.04) * mix(0.4, 1, mood.energy) * Math.sin(time * rate * 1.15 + phase);
    };
    pose(0);
    return s.finish({ footprint: HALF + 0.6, update: (_dt, time) => pose(time) });
  },
});
