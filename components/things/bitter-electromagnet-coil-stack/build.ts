import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

function instanced(geometry: THREE.BufferGeometry, material: THREE.Material, matrices: readonly THREE.Matrix4[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, matrices.length));
  mesh.count = matrices.length;
  matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Yellow and black hazard chevrons, tiled so they wrap round a band. */
function hazard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#f2c21b';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#1d1d1f';
  const step = h;
  for (let x = -h; x < w + h; x += step * 2) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + step, 0);
    ctx.lineTo(x + step * 2, h);
    ctx.lineTo(x + step, h);
    ctx.closePath();
    ctx.fill();
  }
}

export default defineThing({
  questions: {
    height: score('How tall is the stack?', ['A squat single coil at chest height', 'Head high', 'Two modules, well over head height', 'A two-storey tower']),
    finish: choice('What is the coil made of, to look at?', {
      copper: 'Bright new copper plates, ribbed and gleaming.',
      dull: 'Old brown copper, dulled and faintly green at the seams.',
      grey: 'A smooth grey painted steel housing with seam rings, the plates hidden.',
      green: 'A painted safety-green housing with a riveted band.',
    }),
    stand: choice('What does it stand on?', {
      frame: 'A welded steel frame of box beams.',
      plinth: 'A round concrete plinth.',
      rails: 'A wheeled cradle on a pair of floor rails, so it can be rolled out.',
    }),
    bore: choice('What is in the bore on top?', {
      open: 'An open dark hole, nothing inside.',
      tube: 'A glass sample tube standing up out of it with a cable.',
      probe: 'A steel probe head lowered in, with a thick cable arcing away.',
      capped: 'A bolted steel cap plate.',
      cryostat: 'A small steel cryostat can lowered into it, with two thin hoses.',
    }),
    hoses: choice('What about the cooling hoses?', {
      connected: 'Black hoses connected from the coil to a floor manifold.',
      disconnected: 'Hoses pulled off and lying loose, the ports capped red, a puddle on the floor.',
      none: 'No hoses: just the capped ports.',
    }),
    state: choice('What is the magnet doing right now?', {
      idle: 'Idle, beacon dark, sign reads MAGNET OFF.',
      ramping: 'Ramping up: amber beacon turning, sign lit MAGNET ON.',
      alarm: 'In alarm: red beacon spinning, sign flashing FAULT.',
    }),
    stripes: noul('Are there yellow and black hazard stripes round the base?'),
    tag: choice('What does the name plate say?', {
      bitter: 'BITTER 1', tesla: '32 T', cell: 'CELL 3', gauss: '5 GAUSS LINE', frog: 'FROG MAGNET',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const steel = s.material('#8a9096', { metalness: 0.6, roughness: 0.45 });
    const darkSteel = s.material('#3c4248', { metalness: 0.5, roughness: 0.55 });
    const copperColour = { copper: '#c0773c', dull: '#8a5a3c', grey: '#8d9499', green: '#3f7a5a' }[a.finish];
    const copper = s.material(copperColour, a.finish === 'copper' ? { metalness: 0.85, roughness: 0.28 } : a.finish === 'dull' ? { metalness: 0.5, roughness: 0.6 } : { metalness: 0.3, roughness: 0.5 });
    const busCopper = s.material(a.finish === 'dull' ? '#8a5a3c' : '#b8703a', { metalness: 0.8, roughness: 0.32 });
    const rubber = s.material('#1f2124', { roughness: 0.85 });
    const brass = s.material('#c9a44a', { metalness: 0.7, roughness: 0.35 });
    const ceramic = s.material('#e8e4d8', { roughness: 0.6 });
    const red = s.material('#c8302c', { roughness: 0.5 });

    // Stand.
    const R = 0.62;
    let baseTop: number;
    if (a.stand === 'plinth') {
      baseTop = 0.36;
      s.cylinder(0.95, 1.0, 0.36, [0, 0.18, 0], s.material('#9b9b94', { roughness: 0.95 }), 32);
    } else if (a.stand === 'rails') {
      baseTop = 0.42;
      for (const z of [-0.65, 0.65]) s.box([4.2, 0.08, 0.1], [0, 0.04, z], darkSteel);
      for (const x of [-0.7, 0.7]) for (const z of [-0.65, 0.65]) s.cylinder(0.14, 0.14, 0.08, [x, 0.14, z], steel, 18).rotation.x = Math.PI / 2;
      s.box([1.9, 0.12, 1.7], [0, 0.36, 0], steel);
      for (const x of [-0.85, 0.85]) s.box([0.14, 0.26, 1.7], [x, 0.17, 0], darkSteel);
    } else {
      baseTop = 0.34;
      for (const x of [-0.85, 0.85]) for (const z of [-0.85, 0.85]) s.box([0.14, 0.3, 0.14], [x, 0.15, z], darkSteel);
      for (const x of [-0.85, 0.85]) s.box([0.12, 0.14, 1.84], [x, 0.23, 0], darkSteel);
      for (const z of [-0.85, 0.85]) s.box([1.84, 0.14, 0.12], [0, 0.23, z], darkSteel);
      s.box([1.6, 0.08, 1.6], [0, 0.3, 0], steel);
    }
    if (a.stripes) {
      const stripes = paint(512, 64, (ctx) => hazard(ctx, 512, 64));
      stripes.repeat.set(4, 1);
      s.mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.12, 48, 1, true), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.6, side: THREE.DoubleSide }), [0, baseTop + 0.06, 0]);
      if (a.stand !== 'plinth') for (const z of [-0.93, 0.93]) s.mesh(new THREE.BoxGeometry(1.9, 0.1, 0.02), new THREE.MeshStandardMaterial({ map: paint(512, 32, (ctx) => hazard(ctx, 512, 32)), roughness: 0.6 }), [0, 0.1, z]);
    }

    // The clamped stack: flanges, copper plates (or a painted shell), tie rods.
    const stackH = mix(1.1, 3.2, a.height);
    const flangeT = 0.1;
    const bottom = baseTop + flangeT;
    const top = bottom + stackH;
    const flangeR = 0.78;
    s.cylinder(flangeR, flangeR, flangeT, [0, baseTop + flangeT / 2, 0], steel, 40);
    s.cylinder(flangeR, flangeR, flangeT, [0, top + flangeT / 2, 0], steel, 40);
    const modules = stackH > 2 ? 2 : 1;
    const midFlanges: number[] = [];
    if (modules === 2) {
      const y = bottom + stackH * (0.46 + random() * 0.08);
      midFlanges.push(y);
      s.cylinder(flangeR - 0.04, flangeR - 0.04, 0.08, [0, y, 0], steel, 40);
    }
    const painted = a.finish === 'grey' || a.finish === 'green';
    if (painted) {
      s.cylinder(R + 0.04, R + 0.04, stackH, [0, bottom + stackH / 2, 0], copper, 48);
      const seams = Math.max(2, Math.round(stackH / 0.6));
      for (let i = 1; i < seams; i++) s.cylinder(R + 0.06, R + 0.06, 0.05, [0, bottom + (stackH * i) / seams, 0], darkSteel, 48);
      if (a.finish === 'green') for (let i = 0; i < 14; i++) s.ball([0.03, 0.03, 0.03], [Math.sin(i * 0.449) * (R + 0.06), bottom + stackH * 0.5, Math.cos(i * 0.449) * (R + 0.06)], steel, 8);
      for (const side of [-1, 1]) s.box([0.12, 0.2, 0.05], [side * 0.3, top - 0.12, R + 0.04], steel);
    } else {
      s.cylinder(R - 0.03, R - 0.03, stackH, [0, bottom + stackH / 2, 0], s.material('#4a3326', { roughness: 0.8 }), 40);
      const plateGeometry = new THREE.CylinderGeometry(R, R, 0.028, 48);
      const plates: THREE.Matrix4[] = [];
      for (let y = bottom + 0.035; y < top - 0.02; y += 0.046) {
        if (midFlanges.some((f) => Math.abs(f - y) < 0.06)) continue;
        plates.push(new THREE.Matrix4().setPosition(0, y, 0));
      }
      s.root.add(instanced(plateGeometry, copper, plates));
    }
    // Tie rods and nuts.
    const rodGeometry = new THREE.CylinderGeometry(0.028, 0.028, stackH + flangeT * 2 + 0.1, 10);
    const nutGeometry = new THREE.CylinderGeometry(0.055, 0.055, 0.05, 6);
    const rods: THREE.Matrix4[] = [], nuts: THREE.Matrix4[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const x = Math.sin(angle) * 0.7, z = Math.cos(angle) * 0.7;
      rods.push(new THREE.Matrix4().setPosition(x, baseTop + (stackH + flangeT * 2) / 2, z));
      nuts.push(new THREE.Matrix4().setPosition(x, top + flangeT + 0.03, z), new THREE.Matrix4().setPosition(x, baseTop - 0.03 + 0.001, z));
    }
    s.root.add(instanced(rodGeometry, darkSteel, rods), instanced(nutGeometry, darkSteel, nuts));

    // Bore on top.
    const topY = top + flangeT;
    s.cylinder(0.2, 0.2, 0.04, [0, topY + 0.02, 0], darkSteel, 32);
    s.cylinder(0.15, 0.15, 0.06, [0, topY + 0.01, 0], s.material('#07080a', { roughness: 1 }), 24);
    if (a.bore === 'tube') {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#dfeeff', transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false });
      s.cylinder(0.07, 0.07, 0.8, [0, topY + 0.4, 0], glass, 20);
      s.cylinder(0.09, 0.09, 0.06, [0, topY + 0.8, 0], brass, 20);
      s.cylinder(0.1, 0.1, 0.05, [0, topY + 0.04, 0], brass, 20);
      s.tube([[0, topY + 0.84, 0], [0.05, topY + 1.0, 0.1], [0.45, topY + 0.6, 0.35], [0.8, topY - 0.4, 0.5]], 0.012, rubber);
    } else if (a.bore === 'probe') {
      s.cylinder(0.14, 0.12, 0.3, [0, topY + 0.15, 0], steel, 24);
      s.cylinder(0.08, 0.08, 0.1, [0, topY + 0.35, 0], darkSteel, 16);
      s.tube([[0, topY + 0.4, 0], [0.1, topY + 0.9, 0.05], [0.9, topY + 0.7, 0.3], [1.3, baseTop + 0.3, 0.6]], 0.035, rubber);
    } else if (a.bore === 'capped') {
      s.cylinder(0.24, 0.24, 0.05, [0, topY + 0.045, 0], steel, 32);
      for (let i = 0; i < 8; i++) s.cylinder(0.02, 0.02, 0.025, [Math.sin(i * 0.785) * 0.2, topY + 0.08, Math.cos(i * 0.785) * 0.2], darkSteel, 6);
      s.label('BORE 50 mm', 0.2, 0.05, [0, topY + 0.071, 0.05], '#2a2a2c', '#dcdcd6').rotation.x = -Math.PI / 2;
    } else if (a.bore === 'cryostat') {
      s.cylinder(0.2, 0.2, 0.55, [0, topY + 0.25, 0], steel, 28);
      s.cylinder(0.24, 0.24, 0.04, [0, topY + 0.53, 0], steel, 28);
      s.cylinder(0.05, 0.05, 0.2, [0.08, topY + 0.65, 0], brass, 12);
      s.cylinder(0.04, 0.04, 0.16, [-0.1, topY + 0.62, 0.05], steel, 12);
      s.tube([[0.08, topY + 0.75, 0], [0.3, topY + 1.0, 0.1], [0.8, topY + 0.6, 0.4], [1.2, baseTop + 0.3, 0.7]], 0.02, rubber);
      s.tube([[-0.1, topY + 0.7, 0.05], [-0.2, topY + 0.95, 0.25], [0.5, topY + 0.7, 0.6], [1.0, baseTop + 0.25, 0.9]], 0.015, rubber);
    }

    // Bus bars: two copper bars out of the -x side, down to the floor and away to a bus duct.
    const barW = 0.3, barH = 0.15;
    for (const [index, zOff] of [-0.22, 0.22].entries()) {
      const y = index === 0 ? bottom + 0.3 : top - 0.3;
      const knee = -1.2 - index * 0.04;
      s.box([knee * -1 - 0.4, barH, barW], [(-0.4 + knee) / 2, y, zOff], busCopper);
      s.box([barH, y - 0.25, barW], [knee, (y + 0.25) / 2, zOff], busCopper);
      s.box([1.1, barH, barW], [knee - 0.5, 0.3, zOff], busCopper);
      for (let i = 0; i < 2; i++) s.box([0.16, 0.22, 0.2], [knee - 0.3 - i * 0.45, 0.11, zOff], ceramic);
    }
    s.box([0.4, 0.65, 0.75], [-2.4, 0.325, 0], darkSteel);
    s.label('DC  40 kA', 0.5, 0.1, [-2.4, 0.5, 0.38], '#ffffff', '#2a2f36');

    // Cooling: brass ports round the +x side, hoses to a floor manifold.
    const ports: { at: P3; dir: THREE.Vector3 }[] = [];
    const portAngles = [-0.55, -0.2, 0.2, 0.55];
    const portHeights = modules === 2 ? [bottom + stackH * 0.25, bottom + stackH * 0.72] : [bottom + stackH * 0.3, bottom + stackH * 0.7];
    for (const y of portHeights) for (const angle of portAngles) {
      const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const at: P3 = [dir.x * (R + 0.08), y, dir.z * (R + 0.08)];
      const port = s.cylinder(0.05, 0.05, 0.18, at, brass, 12);
      port.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      ports.push({ at: [dir.x * (R + 0.17), y, dir.z * (R + 0.17)], dir });
    }
    if (a.hoses !== 'none') {
      const manifoldX = 1.95;
      s.cylinder(0.09, 0.09, 2.4, [manifoldX, 0.25, 0], steel, 16).rotation.x = Math.PI / 2;
      for (const z of [-1.2, 1.2]) s.cylinder(0.14, 0.14, 0.06, [manifoldX, 0.25, z], darkSteel, 16).rotation.x = Math.PI / 2;
      for (const z of [-0.9, 0.9]) s.box([0.12, 0.25, 0.12], [manifoldX, 0.1, z], darkSteel);
      ports.forEach((port, i) => {
        const z = -1.0 + (i / (ports.length - 1)) * 2.0;
        if (a.hoses === 'connected') {
          s.tube([port.at, [port.at[0] + 0.3, port.at[1] - 0.05, port.at[2] + port.dir.z * 0.1], [manifoldX - 0.2, mix(port.at[1], 0.35, 0.6) - 0.1, z], [manifoldX, 0.34, z]], 0.045, rubber);
          s.cylinder(0.06, 0.06, 0.1, [manifoldX, 0.36, z], brass, 10);
        } else {
          const cap = s.cylinder(0.06, 0.06, 0.04, [port.at[0], port.at[1], port.at[2]], red, 12);
          cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), port.dir);
          const loop = 0.5 + random() * 0.5;
          s.tube([[manifoldX, 0.34, z], [manifoldX - 0.2 - loop * 0.4, 0.6 + loop * 0.4, z + (random() - 0.5) * 0.4], [manifoldX - 0.6 - loop, 0.05, z + (random() - 0.5) * 0.8], [manifoldX - 0.9 - loop, 0.05, z + (random() - 0.5) * 0.9]], 0.045, rubber);
          s.cylinder(0.06, 0.06, 0.1, [manifoldX, 0.36, z], brass, 10);
        }
      });
      if (a.hoses === 'disconnected') {
        const puddle = s.mesh(new THREE.CircleGeometry(0.6, 24), new THREE.MeshStandardMaterial({ color: '#8fb0c0', transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.2, depthWrite: false }), [1.1, 0.012, 0.2]);
        puddle.rotation.x = -Math.PI / 2;
        puddle.scale.set(1.3, 1, 0.8);
      }
    } else {
      for (const port of ports) {
        const cap = s.cylinder(0.06, 0.06, 0.04, port.at, red, 12);
        cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), port.dir);
      }
    }

    // Beacon, sign and name plate.
    const lit = a.state !== 'idle';
    const beaconColour = a.state === 'alarm' ? '#ff2e1f' : '#ffa21a';
    const postX = -0.55, postZ = 0.5;
    s.cylinder(0.025, 0.025, 0.3, [postX, topY + 0.15, postZ], darkSteel, 8);
    s.cylinder(0.09, 0.09, 0.04, [postX, topY + 0.32, postZ], darkSteel, 16);
    const dome = s.cylinder(0.075, 0.085, 0.16, [postX, topY + 0.42, postZ], lit ? new THREE.MeshStandardMaterial({ color: beaconColour, emissive: beaconColour, emissiveIntensity: 0.9, transparent: true, opacity: 0.85, depthWrite: false }) : s.material('#8c8c86', { roughness: 0.4 }), 16);
    const cage = new THREE.Group();
    cage.position.set(postX, topY + 0.42, postZ);
    for (let i = 0; i < 3; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.16, 0.012), darkSteel);
      bar.position.set(Math.sin((i / 3) * Math.PI * 2) * 0.09, 0, Math.cos((i / 3) * Math.PI * 2) * 0.09);
      bar.castShadow = true;
      cage.add(bar);
    }
    s.root.add(cage);
    const signText = { idle: 'MAGNET OFF', ramping: 'MAGNET ON', alarm: 'FAULT' }[a.state];
    const signInk = lit ? '#ffffff' : '#5a5f66';
    const signPaper = a.state === 'alarm' ? '#b3261e' : a.state === 'ramping' ? '#1f6f3a' : '#2b2f35';
    const sign = s.label(signText, 0.8, 0.22, [0.2, topY + 0.45, -0.35], signInk, signPaper);
    sign.rotation.y = Math.PI * 0.08;
    if (lit) (sign.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(signPaper);
    if (lit) (sign.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
    s.box([0.84, 0.26, 0.03], [0.2, topY + 0.45, -0.37], darkSteel).rotation.y = Math.PI * 0.08;
    s.rod([0.2, topY, -0.37], [0.2, topY + 0.32, -0.37], 0.015, darkSteel);
    const tag = { bitter: 'BITTER 1', tesla: '32 T', cell: 'CELL 3', gauss: '5 GAUSS LINE', frog: 'FROG MAGNET' }[a.tag];
    s.label(tag, 0.7, 0.16, [0, baseTop + 0.2 + (a.stripes ? 0.08 : 0), 0.9], '#2a2a2c', '#e2ddd0');
    // A warning plate for the field itself.
    s.label('STRONG MAGNETIC FIELD', 0.9, 0.12, [0.35, bottom + 0.45, 0.72], '#1d1d1f', '#f2c21b').rotation.y = 0.2;

    const spin = a.state === 'alarm' ? 6 : a.state === 'ramping' ? 2.5 : 0;
    const energy = 0.5 + mood.energy;
    return s.finish({
      footprint: 1.6,
      update: (dt, time) => {
        cage.rotation.y += dt * spin * energy;
        if (lit) (dome.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.7 + Math.sin(time * (a.state === 'alarm' ? 9 : 3)) * 0.3;
      },
    });
  },
});
