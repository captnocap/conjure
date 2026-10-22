import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const GLAZE = {
  turquoise: { tint: '#2ba9c6', ink: '#10181c', rough: 0.25 },
  cobalt: { tint: '#2444ad', ink: '#0b0d1c', rough: 0.22 },
  green: { tint: '#9cc8a4', ink: '#2b3a2e', rough: 0.4 },
  white: { tint: '#efe9d8', ink: '#4a2a5c', rough: 0.3 },
  wood: { tint: '#dba842', ink: '#8c2a1c', rough: 0.7 },
  mud: { tint: '#94714f', ink: '#3b2a1f', rough: 0.95 },
} as const;

interface Spot { x: number; y: number; z: number; yaw: number; fall: number; roll: number; boss: boolean }

export default defineThing({
  questions: {
    arrangement: choice('How are the figurines kept?', {
      box: 'Standing packed in an open wooden box, heads rising above the rim, the lid set aside.',
      ranks: 'Drawn up on the floor in a parade square, rank behind rank.',
      tiers: 'On stepped museum risers, a row to each step.',
      file: 'One long curving single file, like workers walking to the fields.',
      spilled: 'Tipped out of an overturned box in a heap, a few set back on their feet.',
    }),
    glaze: choice('What are they made of?', {
      turquoise: 'Bright turquoise-blue faience with black details, the classic.',
      cobalt: 'Deep glossy cobalt blue, the richest kind.',
      green: 'Pale green glaze faded almost to grey.',
      white: 'White glaze with purple-black wigs and lettering.',
      wood: 'Carved wood painted yellow with red and black lines.',
      mud: 'Crude unbaked mud pressed in a mould, barely a face.',
    }),
    count: score('How many are there?', ['A handful, eight or so', 'A few dozen', 'A full gang, one for every day of the year']),
    overseers: noul('Are there overseer figures among them: taller, in a kilt, one to every ten workers?'),
    craft: score('How well made are they?', ['Lumpy mass-produced blanks, all slightly different', 'Decent workshop pieces', 'Crisp and identical, every sign of the spell legible']),
    story: choice('What has happened to the gang?', {
      mustered: 'Every one upright and in place, waiting for the call.',
      stragglers: 'A few have toppled where they stood.',
      domino: 'One whole rank has gone over like dominoes.',
      ransacked: 'Most are knocked flat and scattered, some kicked well away.',
      counted: 'An archaeologist has been here: numbered tags, a brush, one figure lifted out onto a cloth.',
    }),
    box: choice('If there is a box, what is it like?', {
      plain: 'A plain plank crate.',
      painted: 'Whitewashed and painted with bright bands and a figure of the owner.',
      shrine: 'A black varnished shrine-box with a vaulted lid and yellow text.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const g = GLAZE[a.glaze];
    const H = 0.17, PX = 0.064, PZ = 0.05;
    const total = Math.min(a.arrangement === 'file' ? 44 : 400, Math.max(6, Math.round(mix(8, 118, a.count ** 1.5) * mix(0.75, 1.25, mood.density))));

    // one mummiform body, lathed and flattened; v follows true height so the paint lines up
    const body = (boss: boolean) => {
      const pts: [number, number][] = [[0, 0], [0.13, 0], [0.145, 0.03], [0.12, 0.1], [0.15, boss ? 0.3 : 0.35], [boss ? 0.21 : 0.17, 0.5], [0.2, 0.68], [0.19, 0.78], [0.1, 0.815], [0.13, 0.86], [0.145, 0.92], [0.11, 0.98], [0, 1]];
      const geo = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 14, Math.PI);
      const pos = geo.getAttribute('position'), uv = geo.getAttribute('uv');
      for (let i = 0; i < pos.count; i++) { uv.setY(i, pos.getY(i)); const y = pos.getY(i); pos.setZ(i, pos.getZ(i) * 0.66 + (y < 0.08 ? 0.03 : 0)); }
      geo.computeVertexNormals();
      return geo;
    };
    const paint = (boss: boolean) => {
      const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 256;
      const c = canvas.getContext('2d')!;
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 256);
      const y = (v: number) => (1 - v) * 256;
      c.fillStyle = c.strokeStyle = g.ink;
      const sharp = mix(0.35, 1, a.craft);
      c.globalAlpha = sharp;
      // wig with a face left clear at the front
      c.fillRect(0, y(1), 128, y(0.8) - y(1));
      for (const side of [-1, 1]) c.fillRect(64 + side * 15 - 6, y(0.8), 12, 22);
      c.globalAlpha = 1; c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(64, y(0.9), 11, 17, 0, 0, 7); c.fill();
      c.fillStyle = c.strokeStyle = g.ink; c.globalAlpha = sharp;
      if (a.glaze !== 'mud' || a.craft > 0.5) { for (const side of [-1, 1]) c.fillRect(64 + side * 5 - 2.5, y(0.915), 5, 3); c.fillRect(60, y(0.87), 8, 2); }
      // crossed arms and hoes
      c.lineWidth = 4;
      for (const side of [-1, 1]) { c.beginPath(); c.moveTo(64 + side * 24, y(0.63)); c.lineTo(64 - side * 8, y(0.71)); c.stroke(); c.beginPath(); c.moveTo(64 - side * 8, y(0.71)); c.lineTo(64 - side * 17, y(0.78)); c.lineTo(64 - side * 10, y(0.8)); c.lineWidth = 2.5; c.stroke(); c.lineWidth = 4; }
      if (boss) { c.globalAlpha = 1; c.fillStyle = '#f4efe2'; c.beginPath(); c.moveTo(42, y(0.56)); c.lineTo(86, y(0.56)); c.lineTo(92, y(0.26)); c.lineTo(36, y(0.26)); c.fill(); c.strokeStyle = g.ink; c.lineWidth = 2; c.stroke(); c.beginPath(); c.moveTo(64, y(0.56)); c.lineTo(64, y(0.26)); c.stroke(); }
      else {
        // bands of the spell around the legs
        const rows = Math.round(mix(2, 7, a.craft));
        for (let r = 0; r < rows; r++) {
          const yy = y(mix(0.56, 0.14, r / Math.max(rows - 1, 1)));
          c.globalAlpha = sharp * 0.8; c.fillRect(28, yy - 7, 72, 1.5);
          for (let x = 32; x < 98; x += 8) { c.globalAlpha = sharp * (0.5 + random() * 0.5); const k = random(); if (k < 0.4) c.fillRect(x, yy - 4, 3 + random() * 3, 7); else if (k < 0.7) { c.beginPath(); c.arc(x + 3, yy, 2.6, 0, 7); c.fill(); } else c.fillRect(x, yy + random() * 3 - 2, 6, 2.5); }
        }
      }
      c.globalAlpha = 1;
      for (let i = 0; i < mood.wear * 18; i++) { c.fillStyle = `rgba(122,104,80,${0.3 + random() * 0.4})`; c.beginPath(); c.ellipse(random() * 128, random() * 256, 4 + random() * 14, 3 + random() * 9, random() * 3, 0, 7); c.fill(); }
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map, roughness: g.rough + mood.wear * 0.4, metalness: 0 });
    };

    // ---- where everyone stands ----
    const spots: Spot[] = [];
    const cols = a.arrangement === 'file' ? total : Math.max(3, Math.round(Math.sqrt(total * 1.5)));
    const rows = Math.ceil(total / cols);
    const boxed = a.arrangement === 'box';
    const px = boxed ? PX : a.arrangement === 'tiers' ? PX * 1.25 : PX * 1.35, pz = boxed ? PZ : a.arrangement === 'tiers' ? PZ * 1.9 : PZ * 1.7;
    const dominoRow = Math.floor(random() * rows);
    const taken = a.story === 'counted' ? Math.floor(random() * Math.min(cols, total)) : -1;
    const fallChance = { mustered: 0, stragglers: 0.1, domino: 0.02, ransacked: 0.72, counted: 0.03 }[a.story] + mood.wear * 0.04;
    const spilled = a.arrangement === 'spilled';
    const boxW = (spilled ? Math.max(3, Math.round(Math.sqrt(total))) : cols) * PX + 0.03, boxD = (spilled ? Math.max(2, Math.round(Math.sqrt(total) * 0.7)) : rows) * PZ + 0.03, boxH = H * 0.6;
    for (let i = 0; i < total; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      if (i === taken) continue;
      const boss = a.overseers && col % 10 === 0 && (a.arrangement !== 'file' || true) && (row === 0 || a.arrangement === 'file' || a.arrangement === 'tiers');
      const jitter = (1 - a.craft) * 0.006 + 0.002;
      let x = (col - (cols - 1) / 2) * px + (random() - 0.5) * jitter * 2, z = ((rows - 1) / 2 - row) * pz + (random() - 0.5) * jitter * 2, y = 0, yaw = (random() - 0.5) * mix(0.5, 0.08, a.craft), fall = 0, roll = 0;
      if (boxed) y = 0.018;
      if (a.arrangement === 'tiers') { y = (rows - 1 - row) * H * 0.42 + 0.02; z = (row - (rows - 1) / 2) * pz; }
      if (a.arrangement === 'file') { const t = col / Math.max(cols - 1, 1) - 0.5; const turns = total > 20 ? 3 : 1.5, span = Math.min(total * PX * 0.62, 1.0) + 0.2, amp = total > 20 ? 0.2 : 0.09; x = t * span; z = Math.sin(t * Math.PI * turns) * amp; yaw += Math.atan2(span, Math.cos(t * Math.PI * turns) * amp * Math.PI * turns); }
      if (spilled) {
        // a fan of tumbled figures in front of the box mouth
        const r = 0.05 + Math.sqrt(random()) * (0.14 + total * 0.0035), an = (random() - 0.5) * 2.1;
        x = Math.sin(an) * r; z = boxH + 0.04 + Math.cos(an) * r; y = random() * 0.02 * Math.max(0, 1 - r * 5) + H * 0.105; fall = random() < 0.5 ? 1 : -1; yaw = random() * Math.PI * 2; roll = (random() - 0.5) * 0.5;
        if (random() < 0.1 + (a.story === 'mustered' ? 0.2 : 0)) { fall = 0; y = 0; x *= 1.7; z += 0.1; yaw = (random() - 0.5) * 0.8; roll = 0; }
      } else if (a.story === 'domino' && row === dominoRow && !boxed) { fall = 0.82 + (col === cols - 1 ? 0.18 : 0); roll = 1; }
      else if (random() < fallChance) {
        if (boxed) { fall = 0.25 + random() * 0.15; yaw = random() * 6; if (a.story === 'ransacked' && random() < 0.6) { fall = random() < 0.5 ? 1 : -1; const an = random() * Math.PI * 2, r = 0.08 + random() * 0.22; x = Math.sin(an) * (boxW / 2 + r); z = Math.cos(an) * (boxD / 2 + r); y = H * 0.105; yaw = random() * 6; } }
        else { fall = random() < 0.5 ? 1 : -1; y += H * 0.105; yaw = random() * 6; if (a.story === 'ransacked') { x += (random() - 0.5) * 0.2; z += (random() - 0.5) * 0.2; } if (a.arrangement === 'tiers' && random() < 0.5) { y = H * 0.105; z = rows * pz / 2 + 0.05 + random() * 0.12; } }
      }
      spots.push({ x, y, z, yaw, fall, roll, boss });
    }

    const tint = new THREE.Color(g.tint).lerp(new THREE.Color('#9a8f7c'), mood.wear * 0.45);
    for (const boss of [false, true]) {
      const list = spots.filter((spot) => spot.boss === boss);
      if (!list.length) continue;
      const mesh = new THREE.InstancedMesh(body(boss), paint(boss), list.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), colour = new THREE.Color();
      list.forEach((spot, i) => {
        const size = H * (boss ? 1.14 : 1) * (1 + (random() - 0.5) * mix(0.3, 0.03, a.craft));
        if (spot.roll === 1) e.set(spot.fall * Math.PI / 2 * 0.98, spot.yaw, 0, 'YXZ');
        else if (Math.abs(spot.fall) === 1) e.set(-spot.fall * Math.PI / 2, spot.yaw, spot.roll, 'YXZ');
        else e.set(spot.fall, spot.yaw, 0, 'YXZ');
        q.setFromEuler(e);
        m.compose(new THREE.Vector3(spot.x, spot.y, spot.z), q, new THREE.Vector3(size, size, size));
        mesh.setMatrixAt(i, m);
        colour.copy(tint).offsetHSL((random() - 0.5) * mix(0.06, 0.01, a.craft), 0, (random() - 0.5) * mix(0.2, 0.04, a.craft));
        mesh.setColorAt(i, colour);
      });
      mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }

    // ---- furniture ----
    const woodTone = { plain: '#a87b4c', painted: '#eee6d0', shrine: '#211c19' }[a.box];
    const wood = s.material(woodTone, { roughness: a.box === 'shrine' ? 0.35 : 0.8 });
    const trim = s.material(a.box === 'shrine' ? '#e0b84a' : a.box === 'painted' ? '#b8402c' : '#7d5732');
    const crate = (group: THREE.Group, w: number, d: number, h: number) => {
      const t = 0.012;
      const add = (size: [number, number, number], at: [number, number, number], mat: THREE.Material) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh; };
      add([w, 0.014, d], [0, 0.011, 0], wood);
      for (const side of [-1, 1]) { add([t, h, d], [side * (w / 2 - t / 2), h / 2 + 0.004, 0], wood); add([w, h, t], [0, h / 2 + 0.004, side * (d / 2 - t / 2)], wood); add([w + 0.004, 0.012, 0.004], [0, h * 0.82, side * (d / 2 + 0.001)], trim); add([0.004, 0.012, d + 0.004], [side * (w / 2 + 0.001), h * 0.82, 0], trim); }
      if (a.box !== 'plain') { add([w + 0.004, 0.012, 0.004], [0, h * 0.2, d / 2 + 0.001], trim); for (let i = 0; i < Math.floor(w / 0.05); i++) add([0.008, h * 0.4, 0.003], [-w / 2 + 0.03 + i * 0.05, h * 0.5, d / 2 + 0.001], s.material(a.box === 'shrine' ? '#e0b84a' : ['#2f5d9c', '#3c8f5a', '#b8402c'][i % 3])); }
      for (const side of [-1, 1]) add([0.03, 0.012, d * 0.9], [side * w * 0.3, 0.002, 0], trim);
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.016, 10), trim); knob.rotation.x = Math.PI / 2; knob.position.set(0, h * 0.62, d / 2 + 0.008); knob.castShadow = true; group.add(knob);
    };
    const lidFor = (w: number, d: number, at: [number, number, number], tilt: number) => {
      const lid = new THREE.Group();
      if (a.box === 'shrine') { const vault = new THREE.Mesh(new THREE.CylinderGeometry(d / 2, d / 2, w, 20, 1, false, -Math.PI / 2, Math.PI), wood); vault.rotation.z = Math.PI / 2; vault.scale.x = 0.55; vault.castShadow = true; lid.add(vault); }
      const flat = new THREE.Mesh(new THREE.BoxGeometry(w + 0.01, 0.012, d + 0.01), wood); flat.castShadow = flat.receiveShadow = true; lid.add(flat);
      const k = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.018, 10), trim); k.position.y = a.box === 'shrine' ? d * 0.28 : 0.014; lid.add(k);
      lid.position.set(...at); lid.rotation.set(0, (random() - 0.5) * 0.4, tilt); s.root.add(lid);
    };
    if (boxed) {
      const group = new THREE.Group(); crate(group, boxW, boxD, boxH); s.root.add(group);
      lidFor(boxW, boxD, [boxW / 2 + 0.03 + boxD * 0.28, boxD * 0.32, -boxD * 0.1], -1.0);
    }
    if (spilled) {
      const group = new THREE.Group(); crate(group, boxW, boxD, boxH); group.rotation.x = Math.PI / 2 + 0.06; group.position.set(0, boxD / 2, 0); s.root.add(group);
      lidFor(boxW, boxD, [boxW / 2 + boxD * 0.45 + 0.06, 0.008, -boxD * 0.1 + 0.12], 0);
    }
    if (a.arrangement === 'tiers') {
      const riser = s.material('#dcdad2', { roughness: 0.85 });
      for (let row = 0; row < rows; row++) { const h = (rows - 1 - row) * H * 0.42 + 0.02; s.box([cols * px + 0.06, h, pz], [0, h / 2, (row - (rows - 1) / 2) * pz], riser); }
    }
    if (a.arrangement === 'ranks' && mood.density > 0.4) s.box([cols * px + 0.1, 0.012, rows * pz + 0.08], [0, 0.006 - 0.012, 0], s.material('#b9a987', { roughness: 0.95 }));
    if (a.story === 'counted') {
      const frontZ = (spilled ? boxH + 0.3 : boxed ? boxD / 2 : a.arrangement === 'file' ? 0.28 : rows * pz / 2) + 0.1;
      s.box([0.2, 0.004, 0.13], [0.02, 0.002, frontZ + 0.02], s.material('#e9e4d6', { roughness: 0.95 }));
      const one = new THREE.Mesh(body(false), paint(false)); (one.material as THREE.MeshStandardMaterial).color.copy(tint); one.scale.setScalar(H); one.rotation.set(-Math.PI / 2, 0.5, 0, 'YXZ'); one.position.set(-0.03, H * 0.105 + 0.004, frontZ + 0.03); one.castShadow = true; s.root.add(one);
      const brush = s.rod([0.07, 0.012, frontZ - 0.02], [0.14, 0.012, frontZ + 0.07], 0.005, s.material('#7a4f2a')); brush.castShadow = true;
      s.box([0.016, 0.01, 0.03], [0.148, 0.012, frontZ + 0.082], s.material('#2a2622')).rotation.y = 0.66;
      for (let i = 0; i < Math.min(5, cols); i++) s.label(String(101 + i * 10 + Math.floor(random() * 9)), 0.036, 0.02, [(i - 2) * 0.09 - 0.19 * 0, 0.011, frontZ - 0.07 + (i % 2) * 0.008], '#333', '#f6f3ea').rotation.x = -0.9;
    }
    if (a.story === 'ransacked') {
      const chips = Array.from({ length: 14 }, () => ({ at: [(random() - 0.5) * (cols * px + 0.3), 0.004, (random() - 0.5) * (rows * pz + 0.3)] as [number, number, number], size: 0.008 + random() * 0.014 }));
      s.scatter(new THREE.TetrahedronGeometry(1), s.material(g.tint, { roughness: g.rough }), chips);
    }
    return s.finish();
  },
});
