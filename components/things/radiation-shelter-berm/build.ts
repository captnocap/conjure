import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = [number, number, number];
const R = 1.5, CY = 0.45, Z0 = -3.2, Z1 = 2.2;

export default defineThing({
  questions: {
    state: choice('What is the state of the shelter?', {
      occupied: 'Occupied: lights on, vent steaming, a mast up, tracks to the door.',
      sealed: 'Sealed and abandoned: door barred and taped, snow drifted against it.',
      dug: 'Dug open: the cover torn away over the middle, blocks thrown aside, a shovel left standing.',
      breached: 'Breached: the door lies on the ice in front of a black opening.',
      building: 'Still being built: only the back half is covered, cut blocks waiting on a sled.',
    }),
    cover: score('How deeply is the tube buried under the heap?', ['Only a low wall along its sides', 'Banked halfway up', 'Covered but for the crown', 'Completely entombed']),
    blocks: choice('What is it buried under?', {
      bricks: 'Sawn ice bricks laid in neat courses, like an igloo.',
      rubble: 'Rough heaped ice boulders.',
      drift: 'Smooth rounded snow, as if drifted over for years.',
    }),
    door: choice('What kind of entrance does it have?', {
      hatch: 'A round pressure hatch with a locking wheel.',
      airlock: 'A boxy rectangular airlock with a hazard-striped frame.',
      tunnel: 'A ribbed inflatable entry tunnel.',
    }),
    light: choice('What light shows at the porthole and skylight?', {
      warm: 'Warm yellow lamplight.',
      white: 'Cold white work light.',
      red: 'Red emergency lighting.',
      green: 'The green flicker of screens.',
      dark: 'None. The glass is black.',
    }),
    sign: choice('What sign stands at the entrance?', {
      trefoil: 'A yellow radiation trefoil.',
      shelter: 'A plain stencilled SHELTER sign.',
      keepout: 'A red KEEP OUT sign.',
      tally: 'A dark board scratched with tally marks, counting days.',
      none: 'No sign.',
    }),
    outside: choice('What stands outside?', {
      nothing: 'Nothing.',
      sled: 'A sled loaded with supply crates.',
      dish: 'A guyed mast with a dish antenna.',
      bottles: 'A rack of oxygen bottles.',
      flag: 'A small flag on a pole.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const hull = s.material(mix(0, 1, mood.warmth) > 0.6 ? '#e3d9c6' : '#dfe4e6', { metalness: 0.35, roughness: 0.5 });
    const rib = s.material('#8b959a', { metalness: 0.6, roughness: 0.45 });
    const dark = s.material('#22272b', { roughness: 0.7 });
    const hazard = s.material('#f0b81e', { roughness: 0.6 });
    const ice = s.material('#d5eaf3', { roughness: a.blocks === 'drift' ? 0.95 : 0.35, flatShading: a.blocks !== 'drift' });
    const lightColour = { warm: '#ffc65a', white: '#eaf6ff', red: '#ff3a2a', green: '#5dff9a', dark: '#0a0d10' }[a.light];
    const power = a.light === 'dark' ? 0 : { occupied: 1, dug: 0.8, building: 0.55, sealed: 0.15, breached: 0.4 }[a.state];
    const glass = s.material(lightColour, power > 0 ? { emissive: lightColour, emissiveIntensity: mix(1.2, 2.6, mood.cheer) * power, roughness: 0.2 } : { roughness: 0.15, metalness: 0.4 });

    // The tube: only the part above the ice is built.
    const alpha = Math.asin(-CY / R);
    const section = new THREE.Shape();
    section.absarc(0, CY, R, alpha, Math.PI - alpha, false);
    section.closePath();
    const tube = new THREE.ExtrudeGeometry(section, { depth: Z1 - Z0, bevelEnabled: false, curveSegments: 28 });
    s.mesh(tube, hull, [0, 0, Z0]);
    for (let z = Z0 + 0.3; z < Z1 + 0.01; z += 0.9) s.ring(R + 0.02, 0.05, [0, CY, Math.min(z, Z1 - 0.04)], rib, Math.PI - 2 * alpha).rotation.z = alpha;
    const front = Z1 + 0.012;

    // Skylight cupola on the crown.
    s.cylinder(0.42, 0.5, 0.3, [0, CY + R + 0.1, -0.6], rib, 18);
    s.ball([0.38, 0.26, 0.38], [0, CY + R + 0.25, -0.6], glass, 16);

    // Entrance.
    const doorY = 0.95;
    const breached = a.state === 'breached';
    const voidMat = s.material('#030405', { roughness: 1 });
    let doorZ = front;
    if (a.door === 'hatch') {
      s.ring(0.72, 0.09, [0, doorY, front], rib);
      if (breached) s.cylinder(0.68, 0.68, 0.02, [0, doorY, front], voidMat, 24).rotation.x = Math.PI / 2;
      const lid = new THREE.Group();
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.1, 24), hull); plate.rotation.x = Math.PI / 2;
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 24), dark); wheel.position.z = 0.14;
      lid.add(plate, wheel);
      for (let k = 0; k < 3; k++) { const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.04), dark); spoke.rotation.z = k * Math.PI / 3; spoke.position.z = 0.14; lid.add(spoke); }
      lid.traverse((node) => { node.castShadow = true; });
      if (breached) { lid.position.set(0.9, 0.08, front + 2.0); lid.rotation.set(-Math.PI / 2 + 0.08, 0, 0.5); }
      else if (a.state === 'dug') { lid.position.set(-0.68, doorY, front + 0.55); lid.rotation.y = -1.25; }
      else lid.position.set(0, doorY, front + 0.05);
      s.root.add(lid);
    } else if (a.door === 'airlock') {
      doorZ = front + 0.9;
      s.box([1.5, 1.9, 0.9], [0, 0.95, front + 0.45], hull);
      // Hazard-striped frame.
      const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#f0b81e'; ctx.fillRect(0, 0, 128, 128); ctx.fillStyle = '#17191b';
      for (let i = -128; i < 256; i += 32) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 16, 0); ctx.lineTo(i + 16 + 128, 128); ctx.lineTo(i + 128, 128); ctx.fill(); }
      const stripes = new THREE.CanvasTexture(canvas); stripes.colorSpace = THREE.SRGBColorSpace;
      s.mesh(new THREE.BoxGeometry(1.56, 1.96, 0.08), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.6 }), [0, 0.98, doorZ]);
      s.box([1.1, 1.6, 0.06], [0, 0.82, doorZ + 0.03], breached ? voidMat : dark);
      const slab = s.box([1.0, 1.5, 0.07], [0, 0.8, doorZ + 0.07], rib);
      const win = s.box([0.4, 0.3, 0.02], [0, 1.2, doorZ + 0.115], glass);
      if (breached) { slab.position.set(0.5, 0.05, doorZ + 1.6); slab.rotation.set(-Math.PI / 2 + 0.06, 0, 0.4); win.position.set(0.42, 0.1, doorZ + 1.3); win.rotation.copy(slab.rotation); }
      else if (a.state === 'dug') { slab.position.set(-0.85, 0.8, doorZ + 0.45); slab.rotation.y = -1.2; win.position.set(-0.81, 1.2, doorZ + 0.47); win.rotation.y = -1.2; }
    } else {
      doorZ = front + 1.7;
      const fabric = s.material('#e9772a', { roughness: 0.85 });
      const pale = s.material('#f0ede4', { roughness: 0.85 });
      for (let k = 0; k < 7; k++) s.ring(0.95 - k * 0.012, 0.15, [0, 0.72, front + 0.14 + k * 0.25], k % 2 ? pale : fabric, Math.PI * 1.3).rotation.z = -Math.PI * 0.15;
      s.cylinder(0.9, 0.9, 0.04, [0, 0.72, doorZ + 0.02], breached ? voidMat : dark, 22).rotation.x = Math.PI / 2;
      if (!breached) { s.box([0.05, 1.3, 0.02], [0, 0.82, doorZ + 0.05], hazard); if (a.state === 'dug') s.box([0.5, 1.0, 0.02], [0.3, 0.7, doorZ + 0.2], fabric).rotation.set(0.3, -0.5, 0.2); }
      else s.box([1.3, 0.02, 0.9], [0.4, 0.02, doorZ + 1.3], fabric).rotation.y = 0.5;
    }
    if (a.state === 'sealed') {
      const tape = s.material('#f0b81e', { emissive: '#f0b81e', emissiveIntensity: 0.15 });
      for (const tilt of [0.6, -0.6]) s.box([2.0, 0.09, 0.03], [0, doorY, doorZ + 0.2], tape).rotation.z = tilt;
      s.box([1.9, 0.12, 0.08], [0, doorY - 0.05, doorZ + 0.17], rib);
    }
    // Porthole beside the door.
    s.ring(0.24, 0.05, [-0.95, 1.5, front], rib);
    s.cylinder(0.22, 0.22, 0.03, [-0.95, 1.5, front], glass, 16).rotation.x = Math.PI / 2;
    s.ring(0.2, 0.045, [0.98, 1.45, front], rib);
    s.cylinder(0.18, 0.18, 0.03, [0.98, 1.45, front], glass, 16).rotation.x = Math.PI / 2;

    // The heap. Blocks sit on the arch from the ground up to a height set by the cover.
    interface Block { at: P; turn: THREE.Euler; size: P; tone: number }
    const heap: Block[] = [];
    const maxAngle = mix(0.42, 1.08, a.cover) * (Math.PI / 2 - alpha) + alpha;
    const covered = (z: number, angle: number) => {
      if (a.state === 'building' && z > -0.9 + (random() - 0.5) * 0.5) return angle < alpha + 0.3;
      if (a.state === 'dug' && z > -1.9 && z < 0.9) return angle < alpha + 0.42;
      if (Math.abs(z - -0.6) < 0.75 && angle > 1.2) return false; // leave the skylight clear
      return angle < maxAngle + (random() - 0.5) * 0.18;
    };
    const step = a.blocks === 'bricks' ? 0.3 : 0.24;
    for (let z = Z0 - 0.1; z < Z1 - 0.25; z += a.blocks === 'bricks' ? 0.74 : 0.58) {
      for (const side of [-1, 1]) {
        let course = 0;
        for (let angle = alpha + 0.12; angle <= Math.PI / 2 + 0.01; angle += step, course++) {
          if (side === 1 && angle > Math.PI / 2 - step * 0.5) continue;
          if (!covered(z, angle)) continue;
          const thick = a.blocks === 'bricks' ? 0.42 : 0.5 + random() * 0.35;
          const out = R + thick * 0.45 + (a.blocks === 'bricks' ? 0 : random() * 0.15) + (angle < alpha + 0.5 ? 0.25 : 0);
          const zz = z + (a.blocks === 'bricks' ? (course % 2) * 0.37 : (random() - 0.5) * 0.3);
          const at: P = [side * Math.cos(angle) * out, CY + Math.sin(angle) * out, zz];
          const lean = side * (Math.PI / 2 - angle);
          heap.push({
            at, tone: random(),
            turn: a.blocks === 'bricks' ? new THREE.Euler(0, 0, -lean) : new THREE.Euler(random() * 3, random() * 3, random() * 3),
            size: a.blocks === 'bricks' ? [0.44, thick, 0.7] : a.blocks === 'rubble' ? [0.38 + random() * 0.25, 0.3 + random() * 0.2, 0.38 + random() * 0.25] : [0.6 + random() * 0.3, 0.42, 0.7 + random() * 0.3],
          });
        }
      }
    }
    // A skirt of loose blocks along both sides and round the back.
    const skirt = Math.round(mix(14, 40, mood.density));
    for (let i = 0; i < skirt; i++) {
      const back = random() < 0.25, side = random() < 0.5 ? -1 : 1, size = 0.25 + random() * 0.35;
      heap.push({ at: back ? [(random() - 0.5) * 3.4, size * 0.4, Z0 - 0.3 - random() * 0.6] : [side * (R + 0.55 + random() * 0.7), size * 0.4, Z0 + random() * (Z1 - Z0 - 0.4)], tone: random(), turn: new THREE.Euler(random() * 3, random() * 3, random() * 3), size: [size, size * 0.8, size] });
    }
    if (a.state === 'dug') for (let i = 0; i < 26; i++) {
      const size = 0.3 + random() * 0.3, r = random() * 1.1, angle = random() * 6.28;
      heap.push({ at: [R + 2.0 + Math.cos(angle) * r, size * 0.45 + Math.max(0, 0.9 - r) * 0.8, -0.5 + Math.sin(angle) * r], tone: random(), turn: new THREE.Euler(random() * 3, random() * 3, random() * 3), size: a.blocks === 'bricks' ? [0.44, 0.42, 0.7] : [size, size * 0.8, size] });
    }
    if (a.state === 'sealed') for (let i = 0; i < 9; i++) {
      const size = 0.5 + random() * 0.5;
      heap.push({ at: [(random() - 0.5) * 2.4, 0.05, doorZ + 0.3 + random() * 0.7], tone: 1, turn: new THREE.Euler(0, random() * 3, 0), size: [size, size * 0.5, size] });
    }
    const geometry = a.blocks === 'bricks' ? new THREE.BoxGeometry(1, 1, 1) : a.blocks === 'rubble' ? new THREE.DodecahedronGeometry(0.75, 0) : new THREE.SphereGeometry(0.8, 12, 8);
    const blocks = new THREE.InstancedMesh(geometry, ice, Math.max(1, heap.length));
    const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion();
    heap.forEach((block, index) => {
      matrix.compose(new THREE.Vector3(...block.at), quaternion.setFromEuler(block.turn), new THREE.Vector3(...block.size));
      blocks.setMatrixAt(index, matrix);
      blocks.setColorAt(index, new THREE.Color().setHSL(0.56, a.blocks === 'drift' ? 0.2 : 0.45, mix(a.blocks === 'drift' ? 0.9 : 0.72, 0.97, block.tone)));
    });
    blocks.castShadow = blocks.receiveShadow = true;
    s.root.add(blocks);

    // State dressing.
    const puffs: THREE.Mesh[] = [];
    if (a.state === 'occupied') {
      s.cylinder(0.07, 0.07, 0.7, [0.5, CY + R + 0.3, -2.2], rib, 10);
      s.cylinder(0.12, 0.07, 0.1, [0.5, CY + R + 0.68, -2.2], dark, 10);
      const steam = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, depthWrite: false });
      for (let i = 0; i < 6; i++) { const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), steam); puff.userData.phase = i / 6; s.root.add(puff); puffs.push(puff); }
      s.rod([-0.6, CY + R - 0.1, -2.6], [-0.6, CY + R + 1.9, -2.6], 0.02, rib);
      s.ball([0.05, 0.05, 0.05], [-0.6, CY + R + 1.95, -2.6], s.material('#ff4b2b', { emissive: '#ff3b1b', emissiveIntensity: 2 }), 8);
      const print = s.material('#9db9c9', { roughness: 1 });
      for (let i = 0; i < 8; i++) s.box([0.13, 0.012, 0.3], [0.3 + (i % 2 ? 0.16 : -0.16) + i * 0.12, 0.006, doorZ + 0.5 + i * 0.36], print).rotation.y = 0.3;
    } else if (a.state === 'dug') {
      s.rod([R + 1.1, 0, 0.6], [R + 1.2, 1.25, 0.55], 0.022, s.material('#8a6845'));
      s.box([0.24, 0.3, 0.02], [R + 1.09, 0.12, 0.6], rib);
    } else if (a.state === 'breached') {
      const soot = s.material('#15171a', { roughness: 1 });
      for (let i = 0; i < 10; i++) s.ball([0.3 + random() * 0.5, 0.012, 0.5 + random() * 0.8], [(random() - 0.5) * 1.6, 0.012, doorZ + 0.6 + random() * 1.8], soot, 10);
      for (let i = 0; i < 7; i++) s.box([0.1 + random() * 0.25, 0.04, 0.08 + random() * 0.2], [(random() - 0.5) * 2.6, 0.03, doorZ + 0.5 + random() * 2.2], i % 2 ? rib : hull).rotation.y = random() * 3;
    } else if (a.state === 'building') {
      const sledX = -R - 1.7, sledZ = 0.6;
      for (const dz of [-0.4, 0.4]) s.tube([[sledX - 1.0, 0.2, sledZ + dz], [sledX - 0.8, 0.04, sledZ + dz], [sledX + 0.9, 0.04, sledZ + dz]], 0.035, rib);
      s.box([1.7, 0.05, 0.95], [sledX, 0.1, sledZ], s.material('#8a6845'));
      for (let i = 0; i < 6; i++) s.box([0.44, 0.4, 0.7], [sledX - 0.45 + (i % 3) * 0.47, 0.33 + Math.floor(i / 3) * 0.41, sledZ + (Math.floor(i / 3) ? 0.05 : 0)], ice);
      s.box([0.9, 0.16, 0.012], [sledX + 0.2, 0.2, sledZ + 0.9], rib).rotation.set(-0.5, 0.3, 0);
    }

    // Sign on a post at the left of the door.
    const signX = -2.3, signZ = doorZ + 0.5;
    if (a.sign !== 'none') {
      s.rod([signX, 0, signZ], [signX, 1.9, signZ], 0.03, rib);
      if (a.sign === 'trefoil') {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
        const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#f4c81e'; ctx.fillRect(0, 0, 256, 256); ctx.strokeStyle = '#17191b'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, 246, 246);
        ctx.fillStyle = '#17191b'; ctx.beginPath(); ctx.arc(128, 128, 20, 0, Math.PI * 2); ctx.fill();
        for (let k = 0; k < 3; k++) { const mid = -Math.PI / 2 + k * Math.PI * 2 / 3; ctx.beginPath(); ctx.arc(128, 128, 100, mid - Math.PI / 6, mid + Math.PI / 6); ctx.arc(128, 128, 34, mid + Math.PI / 6, mid - Math.PI / 6, true); ctx.closePath(); ctx.fill(); }
        const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
        s.mesh(new THREE.BoxGeometry(1.1, 1.1, 0.04), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6 }), [signX, 1.55, signZ + 0.03]);
      } else if (a.sign === 'tally') {
        const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 192;
        const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#2a2f33'; ctx.fillRect(0, 0, 256, 192); ctx.strokeStyle = '#f1f1ea'; ctx.lineWidth = 4;
        const days = 12 + Math.floor(random() * 40);
        for (let d = 0; d < days; d++) {
          const group = Math.floor(d / 5), k = d % 5, gx = 16 + (group % 5) * 48, gy = 14 + Math.floor(group / 5) * 44;
          ctx.beginPath();
          if (k < 4) { ctx.moveTo(gx + k * 9, gy); ctx.lineTo(gx + k * 9 + 2, gy + 32); } else { ctx.moveTo(gx - 5, gy + 26); ctx.lineTo(gx + 33, gy + 6); }
          ctx.stroke();
        }
        const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
        s.mesh(new THREE.BoxGeometry(1.0, 0.75, 0.04), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 }), [signX, 1.5, signZ + 0.03]).rotation.z = 0.05;
      } else {
        const board = s.label(a.sign === 'shelter' ? `SHELTER ${1 + Math.floor(random() * 8)}` : 'KEEP OUT', 1.7, 0.6, [signX, 1.6, signZ + 0.035], a.sign === 'shelter' ? '#17191b' : '#ffffff', a.sign === 'shelter' ? '#f1f1ea' : '#c8261e');
        board.rotation.z = a.sign === 'keepout' ? -0.06 : 0;
        s.box([1.76, 0.66, 0.03], [signX, 1.6, signZ + 0.012], dark);
      }
    }

    // Outside.
    const ox = 2.5, oz = doorZ + 0.3;
    if (a.outside === 'sled') {
      for (const dz of [-0.35, 0.35]) s.tube([[ox - 1.0, 0.22, oz + dz], [ox - 0.8, 0.04, oz + dz], [ox + 0.8, 0.04, oz + dz]], 0.03, rib);
      s.box([1.6, 0.05, 0.85], [ox, 0.1, oz], s.material('#8a6845'));
      s.box([0.7, 0.5, 0.6], [ox - 0.35, 0.38, oz], s.material('#3d6f8e'));
      s.box([0.6, 0.4, 0.55], [ox + 0.4, 0.33, oz], s.material('#e9772a'));
      s.box([0.5, 0.3, 0.45], [ox - 0.3, 0.78, oz], s.material('#d8d2c2')).rotation.y = 0.3;
    } else if (a.outside === 'dish') {
      s.rod([ox, 0, oz], [ox, 3.4, oz], 0.035, rib);
      for (let g = 0; g < 3; g++) s.rod([ox, 2.6, oz], [ox + Math.cos(g * 2.09) * 1.2, 0, oz + Math.sin(g * 2.09) * 1.2], 0.008, dark);
      const dish = s.mesh(new THREE.SphereGeometry(0.6, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2.8), new THREE.MeshStandardMaterial({ color: '#e6e9ea', metalness: 0.4, roughness: 0.4, side: THREE.DoubleSide }), [ox, 3.3, oz + 0.1]);
      dish.rotation.set(-2.2, 0, 0.3);
      s.rod([ox, 3.3, oz + 0.1], [ox + 0.1, 3.75, oz + 0.5], 0.012, dark);
    } else if (a.outside === 'bottles') {
      s.box([1.5, 0.08, 0.45], [ox, 0.04, oz], rib);
      s.rod([ox - 0.7, 0, oz - 0.2], [ox - 0.7, 1.2, oz - 0.2], 0.025, rib); s.rod([ox + 0.7, 0, oz - 0.2], [ox + 0.7, 1.2, oz - 0.2], 0.025, rib); s.rod([ox - 0.7, 0.9, oz - 0.2], [ox + 0.7, 0.9, oz - 0.2], 0.02, rib);
      for (let i = 0; i < 5; i++) {
        if (mood.wear > 0.6 && i === 3) continue;
        const bottle = s.material(i % 2 ? '#3b74b8' : '#e8ebec', { metalness: 0.5, roughness: 0.35 });
        s.cylinder(0.12, 0.12, 1.0, [ox - 0.56 + i * 0.28, 0.58, oz], bottle, 12);
        s.ball([0.12, 0.1, 0.12], [ox - 0.56 + i * 0.28, 1.08, oz], bottle, 10);
        s.cylinder(0.035, 0.035, 0.1, [ox - 0.56 + i * 0.28, 1.2, oz], dark, 8);
      }
    } else if (a.outside === 'flag') {
      s.rod([ox, 0, oz], [ox + 0.05, 2.6, oz], 0.022, rib);
      const cloth = s.box([0.9, 0.55, 0.015], [ox + 0.5, 2.28, oz], s.material(mood.cheer > 0.5 ? '#e23b3b' : '#3b5f8f', { emissive: mood.cheer > 0.5 ? '#e23b3b' : '#3b5f8f', emissiveIntensity: 0.15 }));
      cloth.rotation.y = (random() - 0.5) * 0.5;
    }

    const flicker = a.state === 'breached' || a.light === 'green';
    const base = glass.emissiveIntensity;
    const setPuffs = (time: number) => puffs.forEach((puff) => {
      const t = (puff.userData.phase + time * mix(0.05, 0.2, mood.energy)) % 1;
      puff.position.set(0.5 + t * 0.5, CY + R + 0.75 + t * 1.6, -2.2);
      puff.scale.setScalar(0.1 + t * 0.35);
    });
    setPuffs(0);
    return s.finish({
      footprint: 3.4,
      update: (_dt, time) => {
        setPuffs(time);
        if (flicker && power > 0) glass.emissiveIntensity = base * (0.55 + 0.45 * Math.abs(Math.sin(time * mix(3, 11, mood.energy)) * Math.sin(time * 1.7)));
      },
    });
  },
});
