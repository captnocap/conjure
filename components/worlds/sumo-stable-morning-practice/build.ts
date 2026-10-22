import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, score } from '@conjure/kit';

type P = [number, number, number];

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

/** Abstract brush marks stacked down a strip, read as a written name without being any real word. */
function brush(c: CanvasRenderingContext2D, random: () => number, x: number, y: number, w: number, h: number, ink: string) {
  c.fillStyle = ink;
  c.strokeStyle = ink;
  const marks = 3 + Math.floor(random() * 3);
  const step = h / marks;
  for (let m = 0; m < marks; m++) {
    const cy = y + step * (m + 0.5);
    c.lineWidth = Math.max(1.5, w * 0.12);
    c.lineCap = 'round';
    const strokes = 2 + Math.floor(random() * 3);
    for (let s = 0; s < strokes; s++) {
      c.beginPath();
      const kind = random();
      if (kind < 0.4) { c.moveTo(x + w * 0.2, cy - step * 0.25 + s * step * 0.18); c.lineTo(x + w * 0.8, cy - step * 0.2 + s * step * 0.18); }
      else if (kind < 0.75) { const sx = x + w * (0.3 + random() * 0.4); c.moveTo(sx, cy - step * 0.35); c.lineTo(sx + (random() - 0.5) * w * 0.3, cy + step * 0.35); }
      else { c.moveTo(x + w * 0.25, cy + step * 0.3); c.quadraticCurveTo(x + w * 0.5, cy - step * 0.1, x + w * 0.8, cy + step * 0.32); }
      c.stroke();
    }
  }
}

const STABLES = {
  old: { post: '#3a2a1d', plaster: '#d9ccae', wains: '#4a3423', trim: '#2c2019' },
  modern: { post: '#b9996f', plaster: '#ecebe5', wains: '#caa97b', trim: '#8f7350' },
  humble: { post: '#585244', plaster: '#aeb49f', wains: '#6b7262', trim: '#46433a' },
} as const;

export default defineWorld({
  questions: {
    stable: choice('What kind of stable is it?', {
      old: 'An old wooden stable in a Tokyo backstreet: smoke-dark timber posts, yellowed plaster, a pendulum clock, enamel lamps.',
      modern: 'A newer concrete stable: white walls, pale pine panelling, fluorescent strips, a plastic wall clock.',
      humble: 'A small poor stable: patched grey-green boards, a single bare bulb, everything mended twice.',
    }),
    hour: choice('What moment of the morning practice is it?', {
      before: 'Twenty to six: the clay smoothed and the sand raked into clean lines, nobody in the ring yet but the youngest.',
      bouts: 'Full practice: the clay scuffed and footprinted, salt scattered, towels flung everywhere.',
      after: 'Practice over: the ring swept with broom marks, practice belts hung up to dry, buckets turned over.',
    }),
    door: choice('What shows through the sliding door?', {
      dawn: 'Open on a grey dawn lane: a neighbour\'s wall, a telephone pole, a lit vending machine.',
      rain: 'Open on rain falling in the lane, the street shining wet.',
      snow: 'Open on snow lying in the lane and still falling.',
      shut: 'Shut: its paper panes glowing pale with the first light.',
    }),
    tablets: score('How many wooden name tablets hang on the rack?', ['A handful: a tiny stable down to its last few men', 'Two rows, an ordinary stable', 'Crowded rows, a big powerful stable']),
    wall: choice('What else hangs on the back wall?', {
      scroll: 'A long hanging scroll of brushed calligraphy beside the shrine.',
      ranking: 'The printed ranking sheet pinned up beside a paper calendar.',
      photos: 'A row of framed photographs of the stable\'s past champions.',
      bare: 'Nothing: bare stained plaster.',
    }),
    platform: choice('What is on the raised tatami platform?', {
      master: 'One purple cushion and a tea tray: the master\'s place.',
      guests: 'A row of cushions laid out for sponsors and visitors.',
      bare: 'Bare tatami, the cushions stacked in a corner.',
    }),
    chores: choice('What chore tools lie about?', {
      broom: 'A bamboo broom and a dustpan left by the ring.',
      rake: 'A wide wooden rake lying on the raked sand.',
      hose: 'A coiled hose and a watering can for damping the clay.',
      none: 'Nothing; everything put away.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const look = STABLES[a.stable];
    const pick = <T,>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
    const dawnSky = new THREE.Color('#aab4c2').lerp(new THREE.Color('#d9c2b4'), Math.max(0, 0.6 - mood.daylight) * 0.8);
    const W = 10.4, D = 8.4, Hw = 2.9;
    const { art: s, world } = diorama(context, {
      background: `#${new THREE.Color('#c9ccd0').lerp(dawnSky, 0.35).getHexString()}`,
      floor: '#d6c49c', width: W, depth: D, maxHeight: 2.1, radius: 1.2, pitch: 33, yaw: 26, scale: [0.8, 1.35],
      slots: [[0.4, 1.25], [-0.9, -0.35], [1.75, -0.05], [-3.0, -3.45, 0.45, 0.85]],
    });
    const wear = mood.wear;
    const hour = a.hour;

    // ---- the sand floor: raked lines before and after practice, kicked about during it
    const ground = world.ground as THREE.Mesh;
    const sandTex = paint(1024, 840, (c) => {
      c.fillStyle = `hsl(40, ${34 - wear * 12}%, ${72 - wear * 10}%)`;
      c.fillRect(0, 0, 1024, 840);
      for (let i = 0; i < 4200; i++) {
        c.fillStyle = random() < 0.5 ? 'rgba(90,70,40,0.16)' : 'rgba(255,250,235,0.2)';
        c.fillRect(random() * 1024, random() * 840, 2, 2);
      }
      if (hour !== 'bouts') {
        c.strokeStyle = 'rgba(120,95,60,0.22)';
        c.lineWidth = 2;
        for (let y = 6; y < 840; y += 9) { c.beginPath(); c.moveTo(0, y); c.lineTo(1024, y + (random() - 0.5) * 3); c.stroke(); }
      } else {
        for (let i = 0; i < 140; i++) {
          c.fillStyle = `rgba(110,85,50,${0.12 + random() * 0.15})`;
          c.beginPath();
          c.ellipse(random() * 1024, random() * 840, 6 + random() * 10, 3 + random() * 4, random() * 3, 0, Math.PI * 2);
          c.fill();
        }
      }
    });
    (ground.material as THREE.MeshStandardMaterial).map = sandTex;
    (ground.material as THREE.MeshStandardMaterial).color.set('#ffffff');
    (ground.material as THREE.MeshStandardMaterial).roughness = 1;

    // ---- the clay ring, sunk flush with the sand, and its straw bales
    const cx = 0.4, cz = 0.55, R = 2.3;
    const clayTone = new THREE.Color('#c39a66').lerp(new THREE.Color('#8f6d4a'), wear * 0.5);
    const clayTex = paint(1024, 1024, (c) => {
      c.fillStyle = `#${clayTone.getHexString()}`;
      c.fillRect(0, 0, 1024, 1024);
      for (let i = 0; i < 3000; i++) {
        c.fillStyle = random() < 0.5 ? 'rgba(70,45,25,0.12)' : 'rgba(255,235,200,0.12)';
        c.fillRect(random() * 1024, random() * 1024, 3, 3);
      }
      if (hour === 'before') {
        c.strokeStyle = 'rgba(255,240,215,0.18)';
        c.lineWidth = 3;
        for (let r = 40; r < 500; r += 22) { c.beginPath(); c.arc(512, 512, r + (random() - 0.5) * 6, 0, Math.PI * 2); c.stroke(); }
      } else if (hour === 'bouts') {
        for (let i = 0; i < 70; i++) {
          const fx = 120 + random() * 780, fy = 120 + random() * 780, turn = random() * 6.28;
          c.save(); c.translate(fx, fy); c.rotate(turn);
          c.fillStyle = 'rgba(70,42,22,0.28)';
          c.beginPath(); c.ellipse(0, 0, 26, 11, 0, 0, Math.PI * 2); c.fill();
          c.beginPath(); c.ellipse(4, 30, 26, 11, 0, 0, Math.PI * 2); c.fill();
          c.restore();
        }
        for (let i = 0; i < 26; i++) {
          c.strokeStyle = 'rgba(60,38,20,0.25)';
          c.lineWidth = 10 + random() * 14;
          c.beginPath();
          const sx = 200 + random() * 620, sy = 200 + random() * 620;
          c.moveTo(sx, sy); c.lineTo(sx + (random() - 0.5) * 220, sy + (random() - 0.5) * 220);
          c.stroke();
        }
        for (let i = 0; i < 260; i++) { c.fillStyle = 'rgba(255,255,255,0.85)'; const ang = random() * 6.28, rr = 380 + random() * 120; c.fillRect(512 + Math.cos(ang) * rr, 512 + Math.sin(ang) * rr, 3, 3); }
      } else {
        c.strokeStyle = 'rgba(90,60,35,0.16)';
        c.lineWidth = 2;
        for (let i = 0; i < 160; i++) {
          const ang = random() * 6.28, rr = random() * 480;
          const x0 = 512 + Math.cos(ang) * rr, y0 = 512 + Math.sin(ang) * rr;
          c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(x0 + 40, y0 - 30, x0 + 90, y0 - 20); c.stroke();
        }
      }
      if (wear > 0.45) {
        c.strokeStyle = 'rgba(50,30,18,0.4)';
        c.lineWidth = 2;
        for (let i = 0; i < Math.round(wear * 22); i++) {
          let x = 200 + random() * 620, y = 200 + random() * 620;
          c.beginPath(); c.moveTo(x, y);
          for (let k = 0; k < 6; k++) { x += (random() - 0.5) * 60; y += (random() - 0.5) * 60; c.lineTo(x, y); }
          c.stroke();
        }
      }
    });
    const clay = s.mesh(new THREE.CircleGeometry(R + 0.02, 64), new THREE.MeshStandardMaterial({ map: clayTex, roughness: 0.92 }), [cx, 0.004, cz]);
    clay.rotation.x = -Math.PI / 2;
    // A darker collar of clay just outside the bales, then the bales themselves.
    const collar = s.mesh(new THREE.RingGeometry(R + 0.08, R + 0.38, 64), s.material(clayTone.clone().multiplyScalar(0.92), { roughness: 0.95 }), [cx, 0.003, cz]);
    collar.rotation.x = -Math.PI / 2;
    const strawTex = paint(64, 256, (c) => {
      c.fillStyle = '#cdb877';
      c.fillRect(0, 0, 64, 256);
      for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '120,100,50' : '240,225,170'},0.35)`; c.fillRect(random() * 64, random() * 256, 1, 18); }
      c.fillStyle = '#6e5b30';
      for (const y of [40, 100, 156, 216]) c.fillRect(0, y, 64, 8);
    });
    const baleN = 20, baleLen = (2 * Math.PI * R) / baleN - 0.06;
    const baleGeo = new THREE.CapsuleGeometry(0.11, baleLen - 0.22, 4, 10);
    baleGeo.rotateZ(Math.PI / 2);
    const straw = new THREE.MeshStandardMaterial({ map: strawTex, color: new THREE.Color('#ffffff').lerp(new THREE.Color('#a59a80'), wear * 0.6), roughness: 0.95 });
    const bales = new THREE.InstancedMesh(baleGeo, straw, baleN);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < baleN; i++) {
      const ang = (i / baleN) * Math.PI * 2 + 0.08;
      q.setFromAxisAngle(up, -(ang + Math.PI / 2) + (random() - 0.5) * 0.03);
      m4.compose(new THREE.Vector3(cx + Math.cos(ang) * R, 0.03, cz + Math.sin(ang) * R), q, one);
      bales.setMatrixAt(i, m4);
    }
    bales.instanceMatrix.needsUpdate = true;
    bales.castShadow = bales.receiveShadow = true;
    s.root.add(bales);
    // The two white starting lines in the middle.
    const chalk = s.material('#f3f1ea', { roughness: 0.8 });
    for (const side of [-1, 1]) s.box([0.06, 0.008, 0.8], [cx + side * 0.36, 0.007, cz - 0.2], chalk);

    // ---- walls: back and left, timber posts over plaster with a boarded dado
    const plasterTex = paint(1024, 270, (c) => {
      c.fillStyle = look.plaster;
      c.fillRect(0, 0, 1024, 270);
      if (a.stable === 'humble') {
        c.strokeStyle = 'rgba(40,45,35,0.35)';
        c.lineWidth = 2;
        for (let x = 0; x < 1024; x += 26) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 270); c.stroke(); }
        for (let i = 0; i < 4; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '120,110,80' : '80,95,85'},0.5)`; c.fillRect(random() * 980, 40 + random() * 160, 40 + random() * 60, 30 + random() * 40); }
      }
      for (let i = 0; i < 10 + wear * 30; i++) {
        c.fillStyle = `rgba(110,90,55,${0.04 + wear * 0.08})`;
        c.beginPath(); c.ellipse(random() * 1024, random() * 270, 20 + random() * 80, 10 + random() * 50, 0, 0, Math.PI * 2); c.fill();
      }
    });
    const plaster = new THREE.MeshStandardMaterial({ map: plasterTex, roughness: 0.95 });
    const post = s.material(look.post, { roughness: 0.7 });
    const wains = s.material(look.wains, { roughness: 0.75 });
    const trim = s.material(look.trim, { roughness: 0.7 });
    const back = -D / 2, left = -W / 2, T = 0.14;
    s.mesh(new THREE.BoxGeometry(W, Hw, T), plaster, [0, Hw / 2, back]);
    s.box([W, 0.95, 0.03], [0, 0.475, back + T / 2 + 0.015], wains);
    s.box([W + 0.1, 0.16, 0.2], [0, Hw - 0.08, back + 0.05], trim);
    for (let i = 0; i <= 6; i++) s.box([0.14, Hw, 0.08], [left + 0.07 + i * ((W - 0.14) / 6), Hw / 2, back + T / 2 + 0.04], post);
    // Left wall with the doorway between z0 and z1.
    const z0 = 0.35, z1 = 2.25, doorH = 1.95;
    const leftWall = (from: number, to: number, y0: number, y1: number) => s.mesh(new THREE.BoxGeometry(T, y1 - y0, to - from), plaster, [left, (y0 + y1) / 2, (from + to) / 2]);
    leftWall(back, z0, 0, Hw);
    leftWall(z1, D / 2, 0, Hw);
    leftWall(z0, z1, doorH, Hw);
    for (const [from, to] of [[back, z0], [z1, D / 2]] as const) s.box([0.03, 0.95, to - from], [left + T / 2 + 0.015, 0.475, (from + to) / 2], wains);
    s.box([0.2, 0.16, D + 0.1], [left + 0.05, Hw - 0.08, 0], trim);
    for (const z of [back + 0.1, -1.6, z0 - 0.07, z1 + 0.07, D / 2 - 0.07]) s.box([0.08, Hw, 0.14], [left + T / 2 + 0.04, Hw / 2, z], post);
    s.box([0.1, 0.12, z1 - z0 + 0.2], [left + T / 2 + 0.05, doorH + 0.06, (z0 + z1) / 2], post);
    s.box([0.3, 0.04, z1 - z0], [left, 0.02, (z0 + z1) / 2], post);

    // ---- outside the door: the lane at dawn, painted and lit
    const shut = a.door === 'shut';
    const laneTex = paint(512, 420, (c) => {
      const sky = c.createLinearGradient(0, 0, 0, 260);
      const top = a.door === 'rain' ? '#7f8894' : a.door === 'snow' ? '#b9bec6' : '#8e9bb0';
      const low = a.door === 'rain' ? '#a3aab2' : a.door === 'snow' ? '#dfe1e4' : `#${dawnSky.getHexString()}`;
      sky.addColorStop(0, top); sky.addColorStop(1, low);
      c.fillStyle = sky; c.fillRect(0, 0, 512, 420);
      // A neighbour's house: a dark wall and a tiled eave.
      c.fillStyle = a.door === 'snow' ? '#6c6a66' : '#55534f';
      c.fillRect(0, 150, 300, 270);
      c.fillStyle = a.door === 'snow' ? '#f1f1f0' : '#3d3c3e';
      c.fillRect(0, 138, 320, 18);
      c.fillStyle = '#d8d2b0'; c.fillRect(60, 210, 70, 50);
      // A telephone pole and its wires.
      c.fillStyle = '#4b4743'; c.fillRect(380, 20, 14, 400);
      c.strokeStyle = '#3c3a38'; c.lineWidth = 2;
      for (const y of [44, 60, 72]) { c.beginPath(); c.moveTo(0, y + 20); c.quadraticCurveTo(200, y + 40, 387, y); c.lineTo(512, y + 12); c.stroke(); }
      // A lit vending machine glowing at the corner.
      c.fillStyle = '#e8eef2'; c.fillRect(420, 250, 70, 130);
      c.fillStyle = '#6aa0c8'; for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) c.fillRect(426 + k * 16, 262 + r * 26, 11, 18);
      // The lane.
      c.fillStyle = a.door === 'snow' ? '#f4f4f2' : a.door === 'rain' ? '#5e636a' : '#8a8780';
      c.fillRect(0, 380, 512, 40);
      if (a.door === 'rain') { c.strokeStyle = 'rgba(230,236,245,0.5)'; c.lineWidth = 1.5; for (let i = 0; i < 160; i++) { const x = random() * 512, y = random() * 400; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 4, y + 22); c.stroke(); } }
      if (a.door === 'snow') { c.fillStyle = 'rgba(255,255,255,0.9)'; for (let i = 0; i < 220; i++) { c.beginPath(); c.arc(random() * 512, random() * 400, 1.5 + random() * 2, 0, 6.28); c.fill(); } }
    });
    const outside = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0 + 0.5, doorH + 0.2), new THREE.MeshStandardMaterial({ map: laneTex, emissive: '#ffffff', emissiveMap: laneTex, emissiveIntensity: 0.55, roughness: 1 }));
    outside.position.set(left - 0.32, (doorH + 0.2) / 2 - 0.02, (z0 + z1) / 2);
    outside.rotation.y = Math.PI / 2;
    s.root.add(outside);
    s.box([0.3, 0.04, z1 - z0 + 0.4], [left - 0.16, -0.02, (z0 + z1) / 2], s.material(a.door === 'snow' ? '#f1f1ef' : a.door === 'rain' ? '#62676d' : '#8d8a83', { roughness: a.door === 'rain' ? 0.2 : 0.95 }));
    // The two sliding panels: slid aside over the wall, or drawn shut with glowing paper panes.
    const paneTex = paint(128, 256, (c) => {
      c.fillStyle = shut ? '#f3eedf' : '#9fb3c4';
      c.fillRect(0, 0, 128, 256);
      c.fillStyle = look.post;
      for (let x = 0; x <= 128; x += 32) c.fillRect(x - 3, 0, 6, 256);
      for (let y = 0; y <= 256; y += 32) c.fillRect(0, y - 3, 128, 6);
      c.fillRect(0, 200, 128, 56);
    });
    const pane = new THREE.MeshStandardMaterial({ map: paneTex, emissive: shut ? '#f4ead0' : '#000000', emissiveMap: shut ? paneTex : null, emissiveIntensity: shut ? 0.35 : 0, roughness: 0.7 });
    const panelW = (z1 - z0) / 2 + 0.03;
    for (let i = 0; i < 2; i++) {
      const zc = shut ? z0 + panelW / 2 + i * (panelW - 0.06) : z1 + 0.15 + panelW / 2 + i * 0.12;
      s.mesh(new THREE.BoxGeometry(0.035, doorH - 0.02, panelW), pane, [left + T / 2 + 0.03 + i * 0.04, doorH / 2, zc]);
    }
    // Light falling through the open door onto the floor.
    if (!shut) {
      const patch = new THREE.Mesh(new THREE.PlaneGeometry(2.6, z1 - z0 + 0.3), new THREE.MeshBasicMaterial({ color: '#f4f0e6', transparent: true, opacity: 0.22 + mood.daylight * 0.1, depthWrite: false }));
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(left + 1.4, 0.006, (z0 + z1) / 2 + 0.25);
      s.root.add(patch);
    }
    // Sandals lined up inside the door, more the fuller the stable.
    const pairs = Math.round(mix(3, 9, mood.density));
    const soles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.11, 0.025, 0.28), s.material('#cbb994', { roughness: 0.9 }), pairs * 2);
    for (let i = 0; i < pairs * 2; i++) {
      const pair = Math.floor(i / 2), side = i % 2 ? 1 : -1;
      q.setFromAxisAngle(up, Math.PI / 2 + (random() - 0.5) * 0.4);
      m4.compose(new THREE.Vector3(left + 0.35 + side * 0.07 + (random() - 0.5) * 0.06, 0.013, z0 + 0.15 + pair * ((z1 - z0 - 0.2) / Math.max(1, pairs - 1)) + side * 0.03 + (pairs > 6 ? (pair % 2) * 0.3 : 0) - 0.15), q, one);
      soles.setMatrixAt(i, m4);
    }
    soles.instanceMatrix.needsUpdate = true;
    soles.castShadow = true;
    s.root.add(soles);

    // ---- the raised tatami platform along the back wall, with its step
    const px0 = left + T / 2, px1 = 0.9, pz0 = back + T / 2, pz1 = back + 1.45, pH = 0.45;
    const pzMid = (pz0 + pz1) / 2;
    const tatamiTex = paint(1024, 256, (c) => {
      c.fillStyle = `hsl(${52 - wear * 12}, ${36 - wear * 12}%, ${63 - wear * 12}%)`;
      c.fillRect(0, 0, 1024, 256);
      for (let y = 0; y < 256; y += 3) { c.fillStyle = `rgba(80,70,30,${0.1 + random() * 0.15})`; c.fillRect(0, y, 1024, 1); }
      c.fillStyle = '#22242b';
      for (let x = 0; x <= 1024; x += 1024 / 3.5) c.fillRect(x - 5, 0, 10, 256);
      c.fillRect(0, 0, 1024, 9); c.fillRect(0, 247, 1024, 9);
    });
    s.box([px1 - px0, pH - 0.02, pz1 - pz0], [(px0 + px1) / 2, (pH - 0.02) / 2, (pz0 + pz1) / 2], wains);
    s.mesh(new THREE.BoxGeometry(px1 - px0, 0.02, pz1 - pz0), new THREE.MeshStandardMaterial({ map: tatamiTex, roughness: 0.9 }), [(px0 + px1) / 2, pH - 0.01, (pz0 + pz1) / 2]);
    s.box([px1 - px0 + 0.02, 0.06, 0.08], [(px0 + px1) / 2, pH - 0.03, pz1 + 0.04], trim);
    s.box([px1 - px0 - 0.6, 0.2, 0.32], [(px0 + px1) / 2 + 0.2, 0.1, pz1 + 0.16], post);
    const cushion = (x: number, z: number, colour: string, turn = 0) => {
      const c = s.box([0.6, 0.07, 0.62], [x, pH + 0.035, z], s.material(colour, { roughness: 0.85 }));
      c.rotation.y = turn;
      return c;
    };
    if (a.platform === 'master') {
      cushion(-1.35, pzMid - 0.05, '#4a2a6a', (random() - 0.5) * 0.08);
      const tray = s.box([0.36, 0.025, 0.26], [-0.7, pH + 0.012, pzMid + 0.05], s.material('#2a1a14', { roughness: 0.3 }));
      void tray;
      s.cylinder(0.06, 0.07, 0.1, [-0.76, pH + 0.075, pzMid + 0.03], s.material('#2c2b2a', { metalness: 0.4, roughness: 0.5 }), 14);
      s.cylinder(0.03, 0.025, 0.05, [-0.6, pH + 0.05, pzMid + 0.09], s.material('#e9e4d8', { roughness: 0.4 }), 12);
      s.cylinder(0.025, 0.02, 0.015, [-0.6, pH + 0.08, pzMid + 0.09], s.material('#8a9a5a', { roughness: 0.2 }), 12);
    } else if (a.platform === 'guests') {
      for (let i = 0; i < 4; i++) cushion(-4.4 + i * 0.95 + (i >= 2 ? 1.1 : 0), pzMid, pick(['#5a2a36', '#3a4a6a', '#4a2a6a']), (random() - 0.5) * 0.1);
    } else {
      for (let i = 0; i < 5; i++) {
        const c = s.box([0.6, 0.07, 0.62], [left + 0.55, pH + 0.035 + i * 0.07, back + 0.55], s.material(['#5a2a36', '#3a4a6a', '#4a2a6a'][i % 3], { roughness: 0.85 }));
        c.rotation.y = (random() - 0.5) * 0.15;
      }
    }

    // ---- the shelf shrine high on the back wall above the platform
    const grow = (from: number, pivot: THREE.Vector3, k: number) => {
      for (const node of s.root.children.slice(from)) { node.position.sub(pivot).multiplyScalar(k).add(pivot); node.scale.multiplyScalar(k); }
    };
    const shrineFrom = s.root.children.length;
    const kx = -1.9, ky = 2.12, kz = back + T / 2 + 0.17;
    const cypress = s.material('#e2cda0', { roughness: 0.6 });
    s.box([1.2, 0.04, 0.34], [kx, ky, kz], cypress);
    for (const side of [-1, 1]) s.box([0.04, 0.2, 0.26], [kx + side * 0.45, ky - 0.12, kz - 0.02], cypress);
    s.box([0.44, 0.05, 0.24], [kx, ky + 0.045, kz - 0.02], cypress);
    s.box([0.3, 0.26, 0.17], [kx, ky + 0.2, kz - 0.03], cypress);
    s.box([0.12, 0.17, 0.01], [kx, ky + 0.18, kz + 0.06], s.material('#b49a6a', { roughness: 0.6 }));
    for (const side of [-1, 1]) {
      const roof = s.box([0.24, 0.025, 0.24], [kx + side * 0.1, ky + 0.37, kz - 0.03], s.material('#5a4630', { roughness: 0.6 }));
      roof.rotation.z = -side * 0.5;
      // A white vase with a sprig of glossy green sakaki on each side.
      s.cylinder(0.025, 0.03, 0.1, [kx + side * 0.36, ky + 0.07, kz], s.material('#f0ede6', { roughness: 0.3 }), 10);
      for (let k = 0; k < 4; k++) s.ball([0.045, 0.03, 0.03], [kx + side * 0.36 + (random() - 0.5) * 0.07, ky + 0.17 + k * 0.035, kz + (random() - 0.5) * 0.04], s.material('#2f5a2a', { roughness: 0.4 }), 8).rotation.z = (random() - 0.5);
    }
    // The straw rope across the front, and its white paper zigzags.
    s.tube([[kx - 0.6, ky - 0.03, kz + 0.19], [kx - 0.3, ky - 0.09, kz + 0.2], [kx, ky - 0.11, kz + 0.2], [kx + 0.3, ky - 0.09, kz + 0.2], [kx + 0.6, ky - 0.03, kz + 0.19]], 0.025, s.material('#c8b475', { roughness: 0.9 }));
    const shideAt: { at: P; size: number }[] = [];
    for (const sx of [-0.38, 0, 0.38]) for (let k = 0; k < 4; k++) shideAt.push({ at: [kx + sx + (k % 2 ? 0.018 : -0.018), ky - 0.15 - k * 0.045 - (sx === 0 ? 0.02 : 0), kz + 0.205], size: 1 });
    s.scatter(new THREE.BoxGeometry(0.045, 0.042, 0.004), s.material('#fbfaf6', { roughness: 0.6, emissive: '#ffffff', emissiveIntensity: 0.08 }), shideAt);
    grow(shrineFrom, new THREE.Vector3(kx, ky, back + T / 2), 1.45);

    // ---- the rack of wooden name tablets: the ranked men on top, everyone else in rows below
    const rows = a.tablets < 0.33 ? 1 : a.tablets < 0.7 ? 2 : 3;
    const tx = 2.65, ty = 1.62, tw = 2.9, th = 0.5 + rows * 0.34;
    const tabletTex = paint(1024, Math.round(1024 * th / tw), (c) => {
      const hgt = c.canvas.height;
      c.fillStyle = look.trim;
      c.fillRect(0, 0, 1024, hgt);
      const rowH = (hgt - 30) / (rows + 1);
      for (let r = 0; r <= rows; r++) {
        const count = r === 0 ? 4 + Math.floor(random() * 3) : Math.round(mix(5, 17, a.tablets)) + Math.floor(random() * 3);
        const gap = 1000 / Math.max(count, 8);
        const wTab = gap * (r === 0 ? 0.78 : 0.7);
        const y = 15 + r * rowH;
        for (let i = 0; i < count; i++) {
          const x = 1012 - (i + 1) * gap;
          c.fillStyle = r === 0 ? '#f0e1bd' : '#e3d2aa';
          c.fillRect(x, y + 4, wTab, rowH - 12);
          brush(c, random, x, y + 10, wTab, rowH - 24, r === 0 ? '#1a1410' : '#2a221c');
        }
      }
    });
    s.mesh(new THREE.BoxGeometry(tw, th, 0.05), new THREE.MeshStandardMaterial({ map: tabletTex, roughness: 0.7 }), [tx, ty + th / 2 - 0.3, back + T / 2 + 0.03]);
    s.box([tw + 0.1, 0.05, 0.1], [tx, ty + th - 0.27, back + T / 2 + 0.05], trim);

    // ---- the clock: a pendulum clock in an old stable, a plain round one otherwise
    const hourAngle = { before: 5.67, bouts: 6.8, after: 9.5 }[hour];
    const clockAt: P = [0.25, 2.35, back + T / 2 + 0.05];
    const faceTex = paint(128, 128, (c) => {
      c.fillStyle = '#f2eee2'; c.beginPath(); c.arc(64, 64, 62, 0, 6.28); c.fill();
      c.fillStyle = '#2a2a2a'; for (let i = 0; i < 12; i++) { const ang = i / 12 * 6.28; c.fillRect(64 + Math.sin(ang) * 50 - 2, 64 - Math.cos(ang) * 50 - 2, 4, 4); }
      c.strokeStyle = '#1a1a1a'; c.lineCap = 'round';
      const hA = (hourAngle / 12) * 6.28, mA = (hourAngle % 1) * 6.28;
      c.lineWidth = 6; c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.sin(hA) * 30, 64 - Math.cos(hA) * 30); c.stroke();
      c.lineWidth = 4; c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.sin(mA) * 46, 64 - Math.cos(mA) * 46); c.stroke();
    });
    const face = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.5 });
    if (a.stable === 'old') {
      s.box([0.34, 0.62, 0.12], [clockAt[0], clockAt[1] - 0.12, clockAt[2]], s.material('#4a2e1c', { roughness: 0.45 }));
      s.mesh(new THREE.CircleGeometry(0.13, 24), face, [clockAt[0], clockAt[1], clockAt[2] + 0.062]);
      s.box([0.2, 0.22, 0.01], [clockAt[0], clockAt[1] - 0.3, clockAt[2] + 0.062], s.material('#a6b4b8', { roughness: 0.1, metalness: 0.3 }));
      s.cylinder(0.04, 0.04, 0.01, [clockAt[0], clockAt[1] - 0.36, clockAt[2] + 0.07], s.material('#c9a440', { metalness: 0.7, roughness: 0.3 }), 14).rotation.x = Math.PI / 2;
    } else {
      s.cylinder(0.17, 0.17, 0.05, clockAt, s.material(a.stable === 'modern' ? '#f4f4f2' : '#3b3d40', { roughness: 0.5 }), 28).rotation.x = Math.PI / 2;
      s.mesh(new THREE.CircleGeometry(0.15, 28), face, [clockAt[0], clockAt[1], clockAt[2] + 0.027]);
    }

    // ---- the wall to the left of the shrine
    const wallZ = back + T / 2 + 0.02;
    const decorFrom = s.root.children.length;
    if (a.wall === 'scroll') {
      const scrollTex = paint(128, 360, (c) => {
        c.fillStyle = '#5a6a5a'; c.fillRect(0, 0, 128, 360);
        c.fillStyle = '#efe8d6'; c.fillRect(16, 40, 96, 280);
        brush(c, random, 34, 60, 60, 240, '#151210');
        c.fillStyle = '#b23a2a'; c.fillRect(72, 290, 14, 14);
      });
      s.mesh(new THREE.PlaneGeometry(0.46, 1.3), new THREE.MeshStandardMaterial({ map: scrollTex, roughness: 0.8 }), [-4.1, 1.55, wallZ]);
      s.cylinder(0.02, 0.02, 0.56, [-4.1, 0.89, wallZ + 0.02], trim, 8).rotation.z = Math.PI / 2;
    } else if (a.wall === 'ranking') {
      const sheetTex = paint(256, 340, (c) => {
        c.fillStyle = '#f1ead8'; c.fillRect(0, 0, 256, 340);
        c.fillStyle = '#1c1814'; c.fillRect(10, 10, 236, 26);
        for (let col = 0; col < 22; col++) for (let k = 0; k < 9; k++) {
          c.fillStyle = k < 2 ? '#a3221c' : '#2a2420';
          c.fillRect(12 + col * 10.5, 48 + k * 30 + (col % 3) * 2, 6, 10 + random() * 14);
        }
      });
      s.mesh(new THREE.PlaneGeometry(0.75, 1.0), new THREE.MeshStandardMaterial({ map: sheetTex, roughness: 0.85 }), [-4.0, 1.55, wallZ]);
      const calTex = paint(128, 160, (c) => {
        c.fillStyle = '#f7f5ef'; c.fillRect(0, 0, 128, 160);
        c.fillStyle = '#7aa0b8'; c.fillRect(0, 0, 128, 60);
        c.fillStyle = '#333'; for (let r = 0; r < 5; r++) for (let k = 0; k < 7; k++) c.fillRect(8 + k * 17, 70 + r * 17, 9, 8);
      });
      s.mesh(new THREE.PlaneGeometry(0.34, 0.44), new THREE.MeshStandardMaterial({ map: calTex, roughness: 0.85 }), [-3.25, 1.5, wallZ]);
    } else if (a.wall === 'photos') {
      for (let i = 0; i < 4; i++) {
        const photo = paint(96, 120, (c) => {
          c.fillStyle = '#1c1a18'; c.fillRect(0, 0, 96, 120);
          c.fillStyle = '#e8e4da'; c.fillRect(8, 8, 80, 104);
          c.fillStyle = `hsl(0,0%,${55 + random() * 15}%)`; c.fillRect(14, 14, 68, 92);
          c.fillStyle = '#3a3836'; c.beginPath(); c.ellipse(48, 52, 14, 17, 0, 0, 6.28); c.fill();
          c.beginPath(); c.ellipse(48, 104, 30, 34, 0, 0, 6.28); c.fill();
        });
        s.mesh(new THREE.PlaneGeometry(0.3, 0.38), new THREE.MeshStandardMaterial({ map: photo, roughness: 0.4 }), [-4.75 + i * 0.42, 2.45, wallZ + 0.005]).rotation.z = (random() - 0.5) * 0.04;
      }
    }

    grow(decorFrom, new THREE.Vector3(-4.0, 1.6, wallZ), 1.25);

    // ---- the teppo post in the back right corner, black at shoulder height from years of slaps
    const pole = new THREE.Group();
    const poleWood = s.material('#9a7448', { roughness: 0.7 });
    const poleMesh = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.14, 0], [0.13, 0.4], [0.115, 2.5], [0, 2.5]].map(([x, y]) => new THREE.Vector2(x, y)), 18), poleWood);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.128, 0.13, 0.55, 18, 1, true), s.material(new THREE.Color('#4a3420').lerp(new THREE.Color('#1e150e'), wear).getStyle(), { roughness: 0.4 }));
    band.position.y = 1.35;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.55), s.material('#6a4c30', { roughness: 0.8 }));
    base.position.y = 0.06;
    for (const mesh of [poleMesh, band, base]) { mesh.castShadow = mesh.receiveShadow = true; pole.add(mesh); }
    pole.position.set(4.55, 0, back + 0.62);
    pole.rotation.z = -0.035;
    s.root.add(pole);
    s.box([0.08, 0.06, 0.56], [4.62, 2.42, back + 0.35], s.material('#3a3a3a', { metalness: 0.6, roughness: 0.4 }));

    // ---- by the ring edge: a bucket of water with a ladle, a dish of salt
    const wood = s.material('#b89a6a', { roughness: 0.75 });
    const hoop = s.material('#4a4744', { metalness: 0.5, roughness: 0.5 });
    const bucket = (x: number, z: number, over: boolean) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.15, 0], [0.17, 0.3], [0.155, 0.3], [0.14, 0.02], [0, 0.02]].map(([u, v]) => new THREE.Vector2(u, v)), 20), wood);
      g.add(body);
      for (const y of [0.06, 0.25]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.155 + y * 0.05, 0.008, 6, 24), hoop); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); }
      if (!over) {
        const water = new THREE.Mesh(new THREE.CircleGeometry(0.15, 20), new THREE.MeshStandardMaterial({ color: '#9fbcc4', roughness: 0.08, metalness: 0.2 }));
        water.rotation.x = -Math.PI / 2; water.position.y = 0.25; g.add(water);
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.06, 12), wood);
        cup.position.set(0.06, 0.33, 0);
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.5, 8), wood);
        handle.rotation.z = Math.PI / 2 - 0.22; handle.position.set(-0.19, 0.37, 0);
        g.add(cup, handle);
      } else { g.rotation.x = Math.PI; g.position.y = 0.3; }
      g.traverse((n) => { const m = n as THREE.Mesh; if (m.isMesh) m.castShadow = m.receiveShadow = true; });
      g.position.x = x; g.position.z = z;
      g.rotation.y = random() * 6;
      s.root.add(g);
    };
    bucket(cx + 2.75, cz + 0.9, hour === 'after');
    if (mood.density > 0.5) bucket(cx + 3.1, cz + 0.45, hour === 'after');
    const saltAt: P = [cx - 2.8, 0, cz - 0.9];
    s.lathe([[0, 0], [0.16, 0], [0.16, 0.02], [0.06, 0.03], [0.04, 0.24], [0.17, 0.27], [0.17, 0.29], [0, 0.29]], s.material('#2a1e18', { roughness: 0.3 }), saltAt);
    s.lathe([[0, 0], [0.14, 0], [0.18, 0.05], [0.16, 0.055], [0, 0.02]], s.material('#c9a870', { roughness: 0.8 }), [saltAt[0], 0.29, saltAt[2]]);
    s.ball([0.13, 0.05, 0.13], [saltAt[0], 0.32, saltAt[2]], s.material('#f8f7f2', { roughness: 0.95 }), 14);

    // ---- towels on a line along the left wall, more in the thick of practice
    const lineZ0 = back + 0.4, lineZ1 = -0.2, lineY = 1.75, lineX = left + T / 2 + 0.12;
    s.rod([lineX, lineY, lineZ0], [lineX, lineY, lineZ1], 0.008, s.material('#d8d0bc'));
    const towelN = Math.round(mix(2, 6, mood.density)) + (hour === 'bouts' ? 0 : 2);
    const towelMat = s.material('#f0ece2', { roughness: 0.95 });
    for (let i = 0; i < towelN; i++) {
      const z = mix(lineZ0 + 0.3, lineZ1 - 0.3, (i + 0.5) / towelN) + (random() - 0.5) * 0.1;
      const towel = s.box([0.03, 0.55 + random() * 0.15, 0.32], [lineX, lineY - 0.3, z], towelMat);
      towel.rotation.x = (random() - 0.5) * 0.08;
    }
    if (hour === 'bouts') {
      for (let i = 0; i < Math.round(mix(2, 6, mood.density)); i++) {
        const ang = random() * 6.28, r = R + 0.6 + random() * 0.6;
        const t = s.box([0.38, 0.03, 0.28], [cx + Math.cos(ang) * r, 0.015, cz + Math.sin(ang) * r * 0.85], towelMat);
        t.rotation.y = random() * 3;
        t.scale.y = 0.6 + random() * 0.8;
      }
    }
    // Practice belts hung to dry once it is over.
    if (hour === 'after') {
      s.rod([left + T / 2 + 0.1, 2.15, z1 + 0.6], [left + T / 2 + 0.1, 2.15, D / 2 - 0.3], 0.025, s.material('#c7b27a', { roughness: 0.6 }));
      const belts = Math.round(mix(2, 5, mood.density));
      for (let i = 0; i < belts; i++) {
        const z = z1 + 0.75 + i * ((D / 2 - z1 - 1.1) / Math.max(1, belts - 1));
        s.box([0.04, 1.3 + random() * 0.3, 0.32], [left + T / 2 + 0.1, 1.4, z], s.material(pick(['#1b1b1e', '#1e2a4a', '#4d5238', '#ebe7dc']), { roughness: 0.85 }));
      }
    }

    // ---- the youngest's chores
    if (a.chores === 'broom') {
      const broom = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.4, 8), s.material('#c9b27a'));
      shaft.position.y = 0.7;
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 12, 1, true), s.material('#8a7445', { roughness: 0.95, side: THREE.DoubleSide }));
      head.position.y = 0.2;
      head.scale.z = 0.4;
      shaft.castShadow = head.castShadow = true;
      broom.add(shaft, head);
      broom.position.set(1.15, 0, pz1 + 0.42);
      broom.rotation.x = -0.32;
      s.root.add(broom);
      const pan = s.box([0.3, 0.02, 0.26], [cx - 2.0, 0.01, cz + 1.9], s.material('#5a7a8a', { roughness: 0.6 }));
      pan.rotation.y = 0.6;
      s.rod([cx - 2.0, 0.02, cz + 1.9], [cx - 1.85, 0.32, cz + 2.15], 0.012, s.material('#a07a4a'));
    } else if (a.chores === 'rake') {
      const rx = cx - 2.6, rz = cz + 2.7;
      s.rod([rx, 0.03, rz], [rx + 1.3, 0.05, rz - 0.6], 0.016, s.material('#b58f5a'));
      const head = s.box([0.06, 0.06, 0.7], [rx, 0.04, rz], s.material('#9a7448'));
      head.rotation.y = Math.atan2(1.3, -0.6) - Math.PI / 2;
    } else if (a.chores === 'hose') {
      const coil: P[] = [];
      for (let i = 0; i <= 60; i++) { const ang = i * 0.42, r = 0.22 + i * 0.002; coil.push([cx + 3.0 + Math.cos(ang) * r, 0.025 + (i % 15) * 0.002, cz - 1.6 + Math.sin(ang) * r]); }
      s.tube(coil, 0.018, s.material('#3f7a4a', { roughness: 0.5 }));
      s.cylinder(0.11, 0.13, 0.26, [cx + 2.55, 0.13, cz - 2.0], s.material('#5f8fae', { roughness: 0.4, metalness: 0.3 }), 16);
      s.rod([cx + 2.65, 0.2, cz - 2.0], [cx + 2.95, 0.32, cz - 2.0], 0.015, s.material('#5f8fae', { metalness: 0.3 }));
    }

    // ---- light: enamel pendants, fluorescent strips or one bare bulb, hung from a tie beam
    const beamZ = -1.45, beamY = Hw + 0.5;
    const glow = new THREE.Color('#fff2d6').lerp(new THREE.Color('#e6f0ff'), a.stable === 'modern' ? 0.8 : 0.1);
    const lamps: THREE.MeshStandardMaterial[] = [];
    const lampMat = () => { const m = new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: 0.9, roughness: 0.4 }); lamps.push(m); return m; };
    const cord = s.material('#222222');
    if (a.stable === 'old') {
      for (const x of [-1.2, 2.0]) {
        s.rod([x, beamY, beamZ], [x, 2.25, beamZ], 0.006, cord);
        s.lathe([[0.02, 0.12], [0.06, 0.1], [0.2, 0], [0.19, -0.005], [0.05, 0.09], [0.015, 0.11]], s.material('#eef0ea', { roughness: 0.3, side: THREE.DoubleSide }), [x, 2.12, beamZ]);
        s.ball([0.05, 0.05, 0.05], [x, 2.15, beamZ], lampMat(), 10);
      }
    } else if (a.stable === 'modern') {
      for (const x of [-2.0, 1.4]) {
        for (const dx of [-0.5, 0.5]) s.rod([x + dx, beamY, beamZ], [x + dx, 2.42, beamZ], 0.005, cord);
        s.box([1.25, 0.05, 0.14], [x, 2.4, beamZ], s.material('#e8e8e4', { roughness: 0.4 }));
        s.box([1.15, 0.035, 0.07], [x, 2.36, beamZ], lampMat());
      }
    } else {
      s.rod([0.5, beamY, beamZ], [0.5, 2.15, beamZ], 0.006, cord);
      s.ball([0.05, 0.065, 0.05], [0.5, 2.1, beamZ], lampMat(), 12);
    }

    // ---- dust hanging in the door's light, drifting with the scene's energy
    const motes = shut ? 0 : Math.round(16 + mood.energy * 30);
    const dust = motes ? new THREE.InstancedMesh(new THREE.SphereGeometry(0.012, 5, 4), new THREE.MeshBasicMaterial({ color: '#fff8ea', transparent: true, opacity: 0.7, depthWrite: false }), motes) : null;
    const moteSeeds = Array.from({ length: motes }, () => [left + 0.3 + random() * 2.2, 0.2 + random() * 1.6, z0 + random() * (z1 - z0), random() * 6.28] as const);
    if (dust) { dust.castShadow = false; s.root.add(dust); }
    const placeMotes = (time: number) => {
      if (!dust) return;
      moteSeeds.forEach(([x, y, z, ph], i) => {
        m4.makeTranslation(x + Math.sin(time * 0.3 + ph) * 0.1, y + Math.sin(time * (0.2 + mood.energy * 0.5) + ph * 2) * 0.12, z + Math.cos(time * 0.25 + ph) * 0.1);
        dust.setMatrixAt(i, m4);
      });
      dust.instanceMatrix.needsUpdate = true;
    };
    placeMotes(0);

    const humble = a.stable === 'humble';
    world.update = (_dt: number, time: number) => {
      placeMotes(time);
      if (humble || a.stable === 'modern') {
        const flicker = 0.9 + Math.sin(time * 37) * 0.03 * mood.energy + (Math.sin(time * 3.1) > 0.995 ? -0.4 : 0);
        for (const m of lamps) m.emissiveIntensity = flicker;
      }
    };
    return world;
  },
});
