import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score, visibleBounds, disposeTree } from '@conjure/kit';

const TYPES = {
  tank: { drivers: 2, R: 0.6, boiler: 2.5, br: 0.66, pilot: 0 },
  freight: { drivers: 4, R: 0.58, boiler: 4.5, br: 0.76, pilot: 1 },
  express: { drivers: 3, R: 0.86, boiler: 4.1, br: 0.72, pilot: 2 },
  narrow: { drivers: 3, R: 0.46, boiler: 2.9, br: 0.56, pilot: 0 },
} as const;

function rustTexture(random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#d9d2cc';
  ctx.fillRect(0, 0, 256, 256);
  const tones = ['#8a5a3c', '#6b4130', '#b98a62', '#4c3229', '#c9a27a', '#efe9e2'];
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = tones[Math.floor(random() * tones.length)];
    ctx.globalAlpha = 0.1 + random() * 0.28;
    ctx.beginPath();
    ctx.ellipse(random() * 256, random() * 256, 3 + random() * 22, 3 + random() * 16, random() * 3, 0, 6.3);
    ctx.fill();
  }
  for (let i = 0; i < 46; i++) {
    ctx.fillStyle = random() < 0.3 ? '#f3efe8' : '#573528';
    ctx.globalAlpha = 0.14 + random() * 0.22;
    ctx.fillRect(random() * 256, random() * 256, 2 + random() * 5, 30 + random() * 120);
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function tubePlateTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#3b2a24';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#0d0a09';
  for (let row = 0; row < 13; row++)
    for (let col = 0; col < 13; col++) {
      const x = 22 + col * 18 + (row % 2 ? 9 : 0), y = 26 + row * 16;
      if (Math.hypot(x - 128, y - 128) > 104) continue;
      ctx.beginPath();
      ctx.arc(x, y, 5.4, 0, 6.3);
      ctx.fill();
    }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

type Tag = 'mechanic' | 'vida' | 'physics' | 'lovers' | 'tags' | 'number';
function graffitiTexture(random: () => number, kind: Tag, base: string, cheer: number, mirror: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 768, 320);
  for (let i = 0; i < 150; i++) {
    ctx.fillStyle = ['#5a3626', '#8f5a38', '#c08a5c', '#3d2a22'][Math.floor(random() * 4)];
    ctx.globalAlpha = 0.1 + random() * 0.25;
    if (random() < 0.4) ctx.fillRect(random() * 768, random() * 320, 3 + random() * 6, 40 + random() * 200);
    else { ctx.beginPath(); ctx.ellipse(random() * 768, random() * 320, 6 + random() * 40, 5 + random() * 26, 0, 0, 6.3); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  // Rivet rows along the plate edges.
  ctx.fillStyle = 'rgba(40,24,18,0.6)';
  for (let x = 14; x < 768; x += 26) { ctx.fillRect(x, 10, 5, 5); ctx.fillRect(x, 304, 5, 5); }
  const bright = ['#f4f1e8', '#f2d13c', '#39b6e8', '#ef5fa0', '#7fd94a', '#ff7a2e'];
  const dull = ['#e9e6dc', '#c9c2b0', '#9fb0b8', '#d6b87a'];
  const inks = cheer > 0.45 ? bright : dull;
  const ink = () => inks[Math.floor(random() * inks.length)];
  const spray = (text: string, x: number, y: number, size: number, colour: string, tilt = 0) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.font = `bold ${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = colour;
    ctx.shadowBlur = 7;
    ctx.fillStyle = colour;
    ctx.fillText(text, 0, 0, 720);
    ctx.restore();
  };
  if (kind === 'mechanic') {
    spray('SE NECESITA', 384, 70, 66, '#f4f1e8', -0.02);
    spray('UN MECANICO', 384, 160, 72, '#f4f1e8', 0.015);
    spray('CON EXPERIENCIA', 384, 250, 62, '#f4f1e8', -0.01);
  } else if (kind === 'vida') {
    spray('ASI ES', 250, 110, 120, ink(), -0.05);
    spray('LA VIDA', 480, 225, 120, ink(), 0.03);
  } else if (kind === 'physics') {
    spray('E = mc²', 384, 120, 150, '#f4f1e8', -0.03);
    spray('¿y ahora qué?', 430, 250, 60, ink(), 0.04);
  } else if (kind === 'lovers') {
    spray('LUIS ♥ ANA', 300, 110, 90, ink(), -0.06);
    spray('2009', 600, 130, 60, ink(), 0.1);
    spray('estuvimos aquí', 380, 240, 64, ink(), 0.03);
  } else if (kind === 'tags') {
    for (const [word, x, y, size] of [['KRAK', 170, 120, 130], ['ZOE', 520, 100, 120], ['uyu', 330, 245, 90], ['★ 13', 620, 240, 80]] as const) {
      const colour = ink();
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((random() - 0.5) * 0.25);
      ctx.font = `bold ${size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 12;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#16120f';
      ctx.strokeText(word, 0, 0);
      ctx.fillStyle = colour;
      ctx.fillText(word, 0, 0);
      ctx.restore();
    }
  } else {
    ctx.globalAlpha = 0.55;
    spray(`Nº ${100 + Math.floor(random() * 880)}`, 384, 160, 150, '#d9cfb8');
    ctx.globalAlpha = 1;
  }
  void mirror;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    type: choice('What kind of locomotive was it?', {
      tank: 'A short two-axle tank engine, squat and toy-like, tanks along the boiler.',
      freight: 'A long heavy freight engine on four coupled axles, built to drag ore.',
      express: 'A tall-wheeled passenger engine, elegant even as a wreck.',
      narrow: 'A small narrow-gauge mine engine, low and stubby.',
    }),
    state: choice('What is left of it?', {
      weathered: 'Whole but rusted through: smokebox door gone and gaping, everything else still attached.',
      stripped: 'Stripped for scrap: boiler plates peeled away showing the ribs and inner barrel, rods gone.',
      hulk: 'Only a boiler on wheels: the cab and chimney were cut away long ago.',
      toppled: 'Leaning hard to one side and half sunk, a wheel lying loose beside it.',
    }),
    tender: choice('What stands behind it?', {
      tender: 'Its own high-sided tender, still coupled.',
      tank: 'A cylindrical tank wagon.',
      gondola: 'A low open ore wagon with one side dropped.',
      none: 'Nothing: the engine stands alone.',
    }),
    graffiti: choice('If there is a tender or wagon, what is sprayed on it?', {
      mechanic: 'In white capitals: SE NECESITA UN MECANICO CON EXPERIENCIA, a joke for the dead engine.',
      vida: 'ASI ES LA VIDA in huge letters, a shrug.',
      physics: 'An equation, E = mc², and a question under it.',
      lovers: 'Two names, a heart and a year: someone was here together.',
      tags: 'Fat outlined bubble tags in several colours, layered.',
      number: 'No graffiti, only the ghost of its painted running number.',
    }),
    chimney: choice('What is the chimney like, if it still has one?', {
      stovepipe: 'A plain tall stovepipe with a lipped rim.',
      balloon: 'A wide flaring spark-arrestor stack, wild-west style.',
      stump: 'A short broken stump.',
    }),
    skin: choice('What colour has it weathered to?', {
      rust: 'Bright orange-brown rust all over.',
      oxide: 'Dark chocolate oxide, nearly black in the shade.',
      green: 'Patches of the original green paint surviving between the rust.',
      salt: 'Bleached pale and crusted with windblown salt.',
    }),
    sunk: score('How far has it sunk into the ground?', ['Standing clear on its wheel rims', 'Rims bedded in', 'Buried to the axles', 'Half the wheels gone under']),
    visitors: choice('What have visitors left on it?', {
      nobody: 'Nothing: it is alone.',
      child: 'A child sitting on top of the boiler, legs dangling.',
      swing: 'A rope swing with a plank seat hung from a beam out of the cab side.',
      ladder: 'A home-made ladder propped against the boiler.',
      seesaw: 'A plank seesaw improvised over a loose wheel beside it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const spec = TYPES[a.type];
    const { R, br } = spec;
    const wear = mood.wear;
    const rustMap = rustTexture(random);
    const skin = { rust: '#b4602f', oxide: '#5a3a2e', green: '#8b8e70', salt: '#c9b9a4' }[a.skin];
    const paint = (colour: string, repeat = 1, extra: THREE.MeshStandardMaterialParameters = {}) => {
      const map = rustMap.clone();
      map.repeat.set(repeat, repeat);
      map.needsUpdate = true;
      const tint = new THREE.Color(colour).lerp(new THREE.Color('#8a4b2a'), a.skin === 'green' ? 0.1 : wear * 0.15);
      return new THREE.MeshStandardMaterial({ color: tint, map, roughness: 0.9, metalness: 0.15, ...extra });
    };
    const body = paint(skin, 2);
    const dark = paint(new THREE.Color(skin).multiplyScalar(0.55).getStyle(), 1);
    const darker = paint(new THREE.Color(skin).multiplyScalar(0.32).getStyle(), 1);
    const shell = paint(skin, 2, { side: THREE.DoubleSide });
    const black = new THREE.MeshStandardMaterial({ color: '#0e0b0a', roughness: 1 });
    const salt = new THREE.MeshStandardMaterial({ color: '#efece4', roughness: 0.95 });

    const hulk = a.state === 'hulk', stripped = a.state === 'stripped', toppled = a.state === 'toppled';
    const cabLength = 1.5, Lb = spec.boiler, smoke = 0.75;
    const by = 2 * R + 0.06 + br;
    const zFront = cabLength + Lb + smoke;
    const loco = new Sculpture(context);

    // Frame and buffer beam.
    loco.box([1.1, 0.28, zFront + 0.25], [0, R + 0.12, zFront / 2 + 0.05], dark);
    loco.box([2.1, 0.34, 0.14], [0, R + 0.1, zFront + 0.22], paint(mood.cheer > 0.5 ? '#a8432f' : '#7c3f30'));
    for (const side of [-1, 1]) {
      loco.cylinder(0.07, 0.07, 0.3, [side * 0.72, R + 0.1, zFront + 0.42], darker, 10).rotation.x = Math.PI / 2;
      loco.cylinder(0.17, 0.17, 0.05, [side * 0.72, R + 0.1, zFront + 0.58], darker, 14).rotation.x = Math.PI / 2;
    }
    // Running boards.
    if (!hulk) for (const side of [-1, 1]) loco.box([0.34, 0.05, Lb + smoke], [side * 0.9, by - br * 0.72, cabLength + (Lb + smoke) / 2], dark);

    // Boiler barrel: sections of shell, with plates missing when stripped.
    const sections = 3;
    for (let i = 0; i < sections; i++) {
      const length = Lb / sections;
      const missing = stripped ? mix(1.2, 2.6, random()) : wear > 0.75 && random() < 0.5 ? 0.7 : 0;
      const start = missing ? mix(-0.6, 1.4, random()) : 0;
      const geometry = new THREE.CylinderGeometry(br, br, length - 0.02, 28, 1, true, start + missing, Math.PI * 2 - missing).rotateX(Math.PI / 2);
      loco.mesh(geometry, shell, [0, by, cabLength + length * (i + 0.5)]);
      loco.ring(br + 0.012, 0.028, [0, by, cabLength + length * i + 0.02], dark);
    }
    // Inner barrel and ribs show through any gaps.
    loco.cylinder(br * 0.86, br * 0.86, Lb, [0, by, cabLength + Lb / 2], darker, 20).rotation.x = Math.PI / 2;
    if (stripped) for (let i = 0; i < 7; i++) loco.ring(br - 0.02, 0.035, [0, by, cabLength + 0.25 + i * (Lb - 0.4) / 6], dark);
    // Side tanks on a tank engine.
    if (a.type === 'tank' && !hulk) for (const side of [-1, 1]) loco.box([0.42, br * 1.25, Lb * 0.8], [side * (br + 0.16), by - br * 0.1, cabLength + Lb * 0.4], body);

    // Smokebox: open at the front, tube plate deep inside.
    const sr = br + 0.05;
    loco.mesh(new THREE.CylinderGeometry(sr, sr, smoke, 28, 1, true).rotateX(Math.PI / 2), paint(new THREE.Color(skin).multiplyScalar(0.7).getStyle(), 1, { side: THREE.DoubleSide }), [0, by, cabLength + Lb + smoke / 2]);
    loco.ring(sr - 0.02, 0.05, [0, by, zFront], dark);
    const plate = loco.mesh(new THREE.CircleGeometry(sr - 0.03, 28), new THREE.MeshStandardMaterial({ map: tubePlateTexture(), roughness: 1 }), [0, by, cabLength + Lb + 0.12]);
    plate.castShadow = false;
    loco.box([1.0, by - br - R - 0.2, smoke * 0.8], [0, (by - br + R + 0.26) / 2, cabLength + Lb + smoke / 2], dark);
    // The door: gone, or hanging open on one hinge.
    if (a.state === 'weathered' && wear < 0.7) {
      const door = new THREE.Mesh(new THREE.SphereGeometry(sr - 0.04, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.22, 1).rotateX(Math.PI / 2), paint(new THREE.Color(skin).multiplyScalar(0.6).getStyle(), 1, { side: THREE.DoubleSide }));
      door.geometry.translate(sr - 0.04, 0, 0);
      door.position.set(-(sr - 0.04), by, zFront + 0.03);
      door.rotation.y = -mix(1.3, 2.2, random());
      door.castShadow = true;
      loco.root.add(door);
    }

    // Chimney, domes, headlamp.
    {
      const cz = cabLength + Lb + smoke * 0.45, top = by + sr;
      if (a.chimney === 'stovepipe' && !hulk) loco.lathe([[0.27, 0], [0.2, 0.1], [0.19, 0.95], [0.25, 1.02], [0.25, 1.1], [0.17, 1.1]], darker, [0, top - 0.04, cz]);
      else if (a.chimney === 'balloon' && !hulk) loco.lathe([[0.25, 0], [0.19, 0.12], [0.2, 0.4], [0.52, 1.0], [0.54, 1.12], [0.36, 1.2], [0.28, 1.2]], darker, [0, top - 0.04, cz]);
      else loco.lathe([[0.27, 0], [0.2, 0.1], [0.2, 0.3], [0.15, 0.36]], darker, [0, top - 0.04, cz]);
    }
    if (!hulk) {
      const top = by + sr;
      loco.box([0.26, 0.3, 0.22], [0, top + 0.12, zFront - 0.08], darker);
      loco.cylinder(0.11, 0.11, 0.04, [0, top + 0.13, zFront + 0.04], black, 12).rotation.x = Math.PI / 2;
    }
    const domes = a.type === 'freight' ? [0.3, 0.62] : [0.45];
    domes.forEach((t, i) => {
      
      const r = br * (i ? 0.36 : 0.44);
      loco.lathe([[r * 1.25, 0], [r, 0.08], [r, 0.28], [r * 0.85, 0.42], [r * 0.45, 0.52], [0.001, 0.55]], body, [0, by + br - 0.06, cabLength + Lb * t]);
    });

    // Cab: side sheets with window openings, a front plate, a curved roof.
    if (hulk) {
      const floor = by - br * 0.72;
      loco.box([2.0, 0.06, cabLength], [0, floor, cabLength / 2], dark);
      for (const side of [-1, 1]) loco.box([0.05, mix(0.5, 0.9, random()), cabLength], [side * 0.98, floor + 0.3, cabLength / 2], body).rotation.z = side * (random() - 0.3) * 0.2;
      loco.box([1.4, 0.9, 0.5], [0, floor + 0.45, cabLength - 0.3], darker);
    } else {
      const cabW = 2.0, floor = by - br * 0.72, cabH = by + br + 0.25 - floor;
      const sideShape = new THREE.Shape();
      sideShape.moveTo(0, 0); sideShape.lineTo(cabLength, 0); sideShape.lineTo(cabLength, cabH); sideShape.lineTo(0, cabH); sideShape.closePath();
      const hole = new THREE.Path();
      hole.moveTo(0.3, cabH * 0.5); hole.lineTo(cabLength - 0.3, cabH * 0.5); hole.lineTo(cabLength - 0.3, cabH * 0.88); hole.lineTo(0.3, cabH * 0.88); hole.closePath();
      sideShape.holes.push(hole);
      for (const side of [-1, 1]) {
        if (stripped && side === 1 && random() < 0.6) {
          // The sheet is gone on one side: only the corner posts stand.
          for (const z of [0.03, cabLength - 0.03]) loco.box([0.06, cabH, 0.06], [side * cabW / 2, floor + cabH / 2, z], dark);
          continue;
        }
        const sheet = loco.mesh(new THREE.ExtrudeGeometry(sideShape, { depth: 0.04, bevelEnabled: false }).rotateY(-Math.PI / 2), body, [side * cabW / 2 + 0.02, floor, 0]);
        sheet.material = paint(skin, 1, { side: THREE.DoubleSide });
      }
      const frontShape = new THREE.Shape();
      frontShape.moveTo(-cabW / 2, 0); frontShape.lineTo(cabW / 2, 0); frontShape.lineTo(cabW / 2, cabH); frontShape.lineTo(-cabW / 2, cabH); frontShape.closePath();
      const barrel = new THREE.Path();
      barrel.absarc(0, by - floor, br * 0.9, 0, Math.PI * 2, true);
      frontShape.holes.push(barrel);
      for (const side of [-1, 1]) {
        const eye = new THREE.Path();
        eye.absarc(side * (cabW / 2 - 0.26), cabH * 0.72, 0.15, 0, Math.PI * 2, true);
        frontShape.holes.push(eye);
      }
      loco.mesh(new THREE.ExtrudeGeometry(frontShape, { depth: 0.04, bevelEnabled: false }), paint(skin, 1, { side: THREE.DoubleSide }), [0, floor, cabLength - 0.04]);
      loco.box([cabW, 0.06, cabLength], [0, floor, cabLength / 2], dark);
      loco.box([cabW * 0.7, 0.9, 0.5], [0, floor + 0.45, cabLength - 0.3], darker);
      if (!(wear > 0.8 && random() < 0.5)) {
        const roof = loco.mesh(new THREE.CylinderGeometry(1.5, 1.5, cabLength + 0.5, 20, 1, true, Math.PI - 0.76, 1.52).rotateX(Math.PI / 2), paint(new THREE.Color(skin).multiplyScalar(0.65).getStyle(), 1, { side: THREE.DoubleSide }), [0, floor + cabH - 1.5 + 0.38, cabLength / 2 - 0.1]);
        if (stripped || wear > 0.6) roof.rotation.z = (random() - 0.5) * 0.14;
      }
    }

    // Wheels, instanced: tyres, hubs and spokes.
    const wheels: { x: number; y: number; z: number; r: number; lean?: number }[] = [];
    const pitch = 2 * R + 0.14;
    const driversCentre = cabLength + Lb * 0.42;
    const driverZ = Array.from({ length: spec.drivers }, (_unused, i) => driversCentre + (i - (spec.drivers - 1) / 2) * pitch);
    const lostWheel = toppled ? Math.floor(random() * spec.drivers) : -1;
    for (const side of [-1, 1]) {
      driverZ.forEach((z, i) => { if (!(side === 1 && i === lostWheel)) wheels.push({ x: side * 0.78, y: R, z, r: R }); });
      for (let p = 0; p < spec.pilot; p++) wheels.push({ x: side * 0.78, y: 0.36, z: zFront - 0.15 - p * 0.85, r: 0.36 });
    }

    // Cylinders and rods.
    const cylinderZ = Math.min(zFront - 0.35, driverZ[driverZ.length - 1] + R + 0.75);
    for (const side of [-1, 1]) {
      loco.cylinder(0.26, 0.26, 0.85, [side * 1.0, R + 0.02, cylinderZ], body, 16).rotation.x = Math.PI / 2;
      loco.box([0.3, 0.5, 0.6], [side * 0.82, R + 0.3, cylinderZ], dark);
      const hasRods = !stripped && !(wear > 0.55 && side === 1 && random() < 0.7) && !(toppled && side === 1);
      if (hasRods && spec.drivers > 1) {
        const drop = side * 0.9 > 0 ? -R * 0.35 : R * 0.3;
        loco.box([0.05, 0.11, driverZ[driverZ.length - 1] - driverZ[0]], [side * 0.95, R + drop, (driverZ[0] + driverZ[driverZ.length - 1]) / 2], darker);
        const main = driverZ[Math.min(driverZ.length - 1, Math.floor(spec.drivers / 2))];
        loco.rod([side * 1.0, R + 0.02, cylinderZ - 0.4], [side * 1.0, R + drop, main], 0.04, darker);
      }
    }

    // Tender or wagon.
    let zRear = 0;
    if (a.tender !== 'none') {
      const len = a.tender === 'tender' ? 3.3 : a.tender === 'tank' ? 3.9 : 3.6;
      const z0 = -0.45 - len, wr = 0.4;
      zRear = z0;
      const t = new Sculpture(context);
      t.box([1.5, 0.22, len], [0, wr + 0.3, z0 + len / 2], dark);
      t.rod([0, wr + 0.3, -0.5], [0, R + 0.12, 0.1], 0.06, darker);
      const axles = a.tender === 'tender' ? 3 : 2;
      for (const side of [-1, 1])
        for (let i = 0; i < axles; i++) wheels.push({ x: side * 0.78, y: wr, z: z0 + len * (axles === 3 ? [0.18, 0.5, 0.82][i] : [0.2, 0.8][i]), r: wr });
      const tag = a.graffiti as Tag;
      const panelBase = `#${new THREE.Color(skin).lerp(new THREE.Color('#7b4a30'), 0.45).getHexString()}`;
      const sign = (width: number, height: number, y: number, x: number) => {
        for (const side of [-1, 1]) {
          const kind: Tag = side === 1 ? tag : tag === 'number' ? 'number' : random() < 0.5 ? 'tags' : tag;
          const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: graffitiTexture(random, kind, panelBase, mood.cheer, side < 0), roughness: 0.9 }));
          panel.position.set(side * x, y, z0 + len / 2);
          panel.rotation.y = side * Math.PI / 2;
          panel.receiveShadow = true;
          t.root.add(panel);
        }
      };
      const deck = wr + 0.41;
      if (a.tender === 'tender') {
        t.box([1.9, 1.25, len - 0.1], [0, deck + 0.625, z0 + len / 2], body);
        t.box([2.0, 0.07, len], [0, deck + 1.27, z0 + len / 2], dark);
        t.box([1.6, 0.4, len * 0.45], [0, deck + 1.4, z0 + len * 0.7], darker);
        sign(len - 0.2, 1.15, deck + 0.63, 0.955);
      } else if (a.tender === 'tank') {
        t.cylinder(0.85, 0.85, len - 0.2, [0, deck + 0.9, z0 + len / 2], body, 26).rotation.x = Math.PI / 2;
        for (const z of [0.15, 0.5, 0.85]) t.ring(0.87, 0.03, [0, deck + 0.9, z0 + len * z], dark);
        t.cylinder(0.24, 0.27, 0.3, [0, deck + 1.85, z0 + len / 2], dark, 14);
        for (const z of [0.25, 0.75]) t.box([1.5, 0.3, 0.25], [0, deck + 0.12, z0 + len * z], dark);
        sign(len * 0.62, 0.8, deck + 0.9, 0.86);
      } else {
        t.box([1.9, 0.08, len - 0.1], [0, deck + 0.04, z0 + len / 2], dark);
        for (const z of [z0 + 0.09, z0 + len - 0.09]) t.box([1.9, 0.75, 0.07], [0, deck + 0.4, z], body);
        t.box([0.07, 0.75, len - 0.1], [-0.93, deck + 0.4, z0 + len / 2], body);
        const flap = t.box([0.07, 0.75, len - 0.1], [0.93, deck + 0.4, z0 + len / 2], body);
        flap.geometry.translate(0, -0.375, 0);
        flap.position.y = deck + 0.02;
        flap.rotation.z = Math.PI + 0.25;
        t.ball([0.7, 0.3, len * 0.36], [0, deck + 0.12, z0 + len / 2], salt, 12);
        sign(len - 0.3, 0.68, deck + 0.4, -0.972);
      }
      if (toppled) t.root.rotation.y = 0.06;
      loco.root.add(t.root);
    }

    const dummy = new THREE.Object3D();
    const iron = paint(new THREE.Color(skin).multiplyScalar(0.5).getStyle(), 1);
    const tyres = new THREE.InstancedMesh(new THREE.TorusGeometry(0.9, 0.1, 6, 26).rotateY(Math.PI / 2), iron, wheels.length);
    const hubs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.2, 0.22, 10).rotateZ(Math.PI / 2), iron, wheels.length);
    const spokeCount = 10;
    const spokes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.82, 0.07).translate(0, 0.45, 0), iron, wheels.length * spokeCount);
    wheels.forEach((wheel, i) => {
      const turn = random() * 6.3;
      dummy.position.set(wheel.x, wheel.y, wheel.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(wheel.r > 0.5 ? 1 : 0.7, wheel.r, wheel.r);
      dummy.updateMatrix();
      tyres.setMatrixAt(i, dummy.matrix);
      hubs.setMatrixAt(i, dummy.matrix);
      for (let k = 0; k < spokeCount; k++) {
        dummy.rotation.set(turn + k * Math.PI * 2 / spokeCount, 0, 0);
        dummy.updateMatrix();
        spokes.setMatrixAt(i * spokeCount + k, dummy.matrix);
      }
    });
    for (const mesh of [tyres, hubs, spokes]) { mesh.castShadow = mesh.receiveShadow = true; loco.root.add(mesh); }

    // Visitors, attached to the engine so they lean with it.
    let swing: THREE.Group | null = null;
    const rope = new THREE.MeshStandardMaterial({ color: '#c9b58a', roughness: 1 });
    const timber = new THREE.MeshStandardMaterial({ color: '#8a6a45', roughness: 0.9 });
    if (a.visitors === 'child') {
      const jumper = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#e0483a' : '#3f5f8a', roughness: 0.9 });
      const skinTone = new THREE.MeshStandardMaterial({ color: '#b98562', roughness: 0.8 });
      const cz = cabLength + Lb * 0.72, top = by + br;
      loco.ball([0.15, 0.2, 0.12], [0.1, top + 0.2, cz], jumper, 12);
      loco.ball([0.105, 0.115, 0.105], [0.1, top + 0.5, cz], skinTone, 12);
      loco.ball([0.115, 0.08, 0.115], [0.1, top + 0.56, cz - 0.01], new THREE.MeshStandardMaterial({ color: '#1d1512', roughness: 1 }), 10);
      for (const dz of [-0.07, 0.07]) {
        loco.rod([0.12, top + 0.06, cz + dz], [0.42, top - 0.06, cz + dz], 0.05, new THREE.MeshStandardMaterial({ color: '#2f3d55', roughness: 0.9 }));
        loco.rod([0.42, top - 0.06, cz + dz], [0.55, top - 0.36, cz + dz], 0.045, new THREE.MeshStandardMaterial({ color: '#2f3d55', roughness: 0.9 }));
        loco.rod([0.1, top + 0.3, cz + dz * 2], [-0.08, top + 0.03, cz + dz * 3], 0.035, jumper);
      }
    } else if (a.visitors === 'swing') {
      const beamY = by + br * 0.6, bz = hulk ? cabLength + Lb * 0.3 : cabLength * 0.5;
      loco.rod([0, beamY, bz], [-2.3, beamY + 0.1, bz], 0.05, darker);
      swing = new THREE.Group();
      const drop = beamY - 0.55;
      for (const dz of [-0.22, 0.22]) {
        const line = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, drop, 5), rope);
        line.position.set(0, -drop / 2, dz);
        swing.add(line);
      }
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.035, 0.58), timber);
      seat.position.y = -drop;
      swing.add(seat);
      swing.traverse((node) => { node.castShadow = true; });
      swing.position.set(-1.9, beamY + 0.08, bz);
      loco.root.add(swing);
    } else if (a.visitors === 'ladder') {
      const lz = cabLength + Lb * 0.55, foot: [number, number, number] = [-2.0, 0, lz], head: [number, number, number] = [-br * 0.75, by + br * 0.75, lz];
      for (const dz of [-0.22, 0.22]) loco.rod([foot[0], 0, lz + dz], [head[0], head[1], lz + dz], 0.03, timber);
      for (let i = 1; i < 8; i++) {
        const t = i / 8;
        loco.rod([mix(foot[0], head[0], t), mix(0, head[1], t), lz - 0.24], [mix(foot[0], head[0], t), mix(0, head[1], t), lz + 0.24], 0.022, timber);
      }
    }

    // Sink and lean the engine, then bed it in.
    const sink = mix(0.02, R * 0.62, a.sunk) + (toppled ? R * 0.2 : 0);
    const lean = toppled ? mix(0.2, 0.33, random()) * (random() < 0.5 ? 1 : -1) : (random() - 0.5) * (0.02 + wear * 0.07);
    loco.root.rotation.z = lean;
    loco.root.rotation.x = (random() - 0.5) * (0.01 + a.sunk * 0.05);
    loco.root.position.y = -sink;
    s.root.add(loco.root);

    const zMid = (zRear + zFront) / 2, half = (zFront - zRear) / 2;
    // Drifts of salt and grit against the wheels.
    const drift = new THREE.MeshStandardMaterial({ color: a.skin === 'salt' ? '#f1eee6' : '#e4dfd2', roughness: 1 });
    const drifts = Math.round(mix(3, 9, a.sunk) + mood.density * 3);
    for (let i = 0; i < drifts; i++) {
      const side = i % 2 ? 1 : -1;
      const mound = s.ball([mix(0.5, 1.1, random()), mix(0.08, 0.3, a.sunk) * mix(0.6, 1.2, random()), mix(0.7, 1.6, random())], [side * mix(0.8, 1.15, random()), 0, zMid + (random() - 0.5) * 2 * half], drift, 10);
      mound.castShadow = false;
    }
    // Scrap lying about.
    const scrap = Math.round(mood.density * 4 + (stripped ? 2 : 0) + random() * 1.5);
    for (let i = 0; i < scrap; i++) {
      const x = (random() < 0.5 ? -1 : 1) * mix(1.9, 3.0, random()), z = zMid + (random() - 0.5) * 2 * half;
      const pick = random();
      if (pick < 0.4) {
        const sheet = s.mesh(new THREE.CylinderGeometry(br, br, mix(0.8, 1.4, random()), 10, 1, true, 0, mix(0.6, 1.2, random())), shell, [x, -br + 0.12, z]);
        sheet.rotation.set(Math.PI / 2, 0, -0.35 + random() * 0.2);
        sheet.rotation.y = random() * 0.5;
      } else if (pick < 0.7) s.rod([x, 0.06, z], [x + (random() - 0.5) * 1.8, 0.06, z + (random() - 0.5) * 1.8], 0.05, darker);
      else s.box([mix(0.3, 0.7, random()), 0.12, mix(0.3, 0.6, random())], [x, 0.05, z], dark).rotation.y = random() * 3;
    }
    // A loose wheel: lost in the topple, or the pivot of a seesaw.
    const looseWheel = (x: number, z: number, flat: boolean) => {
      const group = new THREE.Group();
      const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.9 * R, 0.1 * R, 6, 24), iron);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * R, 0.2 * R, 0.22, 10).rotateX(Math.PI / 2), iron);
      group.add(tyre, hub);
      for (let k = 0; k < 5; k++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.8 * R, 0.06), iron);
        spoke.rotation.z = k * Math.PI / 5;
        group.add(spoke);
      }
      group.traverse((node) => { node.castShadow = true; });
      if (flat) { group.rotation.x = Math.PI / 2 - 0.12; group.position.set(x, 0.1, z); }
      else { group.rotation.y = Math.PI / 2 + 0.2; group.position.set(x, R * 0.82, z); }
      s.root.add(group);
    };
    if (toppled) looseWheel((lean > 0 ? -1 : 1) * (2.3 + random() * 0.5), driversCentre + (random() - 0.5), true);
    if (a.visitors === 'seesaw') {
      const x = -2.6, z = zFront - 1.2;
      looseWheel(x, z, false);
      const plank = s.box([0.3, 0.05, 3.4], [x, R * 1.72 + 0.03, z], timber);
      plank.rotation.x = 0.22;
    }

    // Centre on the footprint without lifting what is buried.
    const bounds = visibleBounds(s.root);
    const centre = bounds.getCenter(new THREE.Vector3());
    s.root.position.set(-centre.x, 0, -centre.z);
    // Stand three-quarter on: a locomotive is read from its side, wheels and all.
    const stand = new THREE.Group();
    stand.add(s.root);
    stand.rotation.y = -0.62;
    const speed = mix(0.4, 1.6, mood.energy), reach = mix(0.03, 0.4, mood.energy);
    const phase = random() * 6;
    return {
      object: stand,
      update: swing ? (_dt, time) => { swing!.rotation.z = Math.sin(time * speed + phase) * reach; } : undefined,
      dispose: () => { rustMap.dispose(); disposeTree(stand); },
    };
  },
});
