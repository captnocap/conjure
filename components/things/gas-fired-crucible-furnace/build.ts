import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

/** Many copies of one geometry with their own position, turn and scale, as one draw call. */
function instanced(s: Sculpture, geometry: THREE.BufferGeometry, material: THREE.Material, items: readonly { at: P3; yaw?: number; tilt?: number; size?: number | P3 }[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  items.forEach((item, i) => {
    e.set(item.tilt ?? 0, item.yaw ?? 0, 0);
    q.setFromEuler(e);
    const size = item.size ?? 1;
    if (typeof size === 'number') sc.setScalar(size); else sc.set(...size);
    matrix.compose(p.set(...item.at), q, sc);
    mesh.setMatrixAt(i, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.castShadow = mesh.receiveShadow = true;
  s.root.add(mesh);
  return mesh;
}

/** A soft canvas of rising wavy streaks for heat haze and flame. */
function hazeTexture(random: () => number, colour: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 256;
  const c = canvas.getContext('2d')!;
  c.clearRect(0, 0, 128, 256);
  for (let i = 0; i < 26; i++) {
    const x = random() * 128, w = 6 + random() * 18;
    const g = c.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, colour);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x, 0);
    for (let y = 0; y <= 256; y += 16) c.lineTo(x + Math.sin(y / 23 + i) * 9, y);
    for (let y = 256; y >= 0; y -= 16) c.lineTo(x + w + Math.sin(y / 23 + i) * 9, y);
    c.closePath();
    c.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    lid: choice('What is the lid doing?', {
      open: 'Swung right out to the side on its pivot arm: the mouth wide open, the crucible in full view.',
      ajar: 'Swung a third of the way off: a crescent of glow escaping the mouth.',
      closed: 'Shut tight, only the flue hole in the lid showing anything.',
    }),
    heat: score('How hot is the melt?', ['Stone cold, black and dead', 'A dull red glow deep inside', 'Bright orange, the crucible walls glowing', 'Yellow-white, the metal ready to pour']),
    burner: noul('Is the burner lit and roaring, blower running, a flame tongue licking out?'),
    shell: choice('What is the furnace shell made of?', {
      riveted: 'A riveted dark steel drum, grey-black and heavy.',
      painted: 'A blue painted steel drum with a maker\'s plate, workshop-fresh once.',
      drum: 'An old red oil drum, converted, rust-streaked.',
      brick: 'A ring of yellow firebricks held by two steel bands.',
    }),
    rack: choice('What stands on the tool rack beside it?', {
      full: 'Three long lifting tongs and a skimmer, hung ready.',
      shank: 'A single pouring shank leaning against the rack, nothing else.',
      empty: 'An empty rack, tools gone to the pour.',
      none: 'No rack at all.',
    }),
    floor: choice('What is on the floor around its base?', {
      slag: 'Heaps of black clinker and a slag pot crusted with spill.',
      ingots: 'A stack of bronze ingots waiting to be charged.',
      bucket: 'A flux bucket, a shovel and a scattering of sand.',
      swept: 'Swept bare concrete, a dark scorch ring and nothing else.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const heat = a.heat;
    const fire = heat > 0.1 || a.burner;
    const glowColour = (t: number) => {
      const stops = [new THREE.Color('#200a05'), new THREE.Color('#9a1c06'), new THREE.Color('#ff6412'), new THREE.Color('#fff2b8')];
      const u = Math.min(2.999, Math.max(0, t * 3));
      return stops[Math.floor(u)].clone().lerp(stops[Math.floor(u) + 1], u - Math.floor(u));
    };
    const glow = glowColour(heat);
    const emissiveFor = (strength: number, tone = glow) => new THREE.MeshStandardMaterial({ color: tone.clone().multiplyScalar(0.5).lerp(new THREE.Color('#2a1b14'), 1 - heat), emissive: tone, emissiveIntensity: strength, roughness: 0.6 });

    const R = 0.52, BOT = 0.22, TOP = 1.08; // the shell
    const steel = s.material('#595c60', { metalness: 0.7, roughness: 0.5 });
    const dark = s.material('#2a2b2d', { metalness: 0.5, roughness: 0.65 });
    const black = s.material('#17161a', { roughness: 0.9 });
    const refractory = s.material(fire ? '#8a6d58' : '#a8968a', { roughness: 0.95 });
    const soot = s.material('#1a1816', { roughness: 1 });

    // ---- Base frame: four angle-iron legs and a ring the shell sits in.
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      s.box([0.07, BOT, 0.07], [dx * (R - 0.08), BOT / 2, dz * (R - 0.08)], dark);
      s.box([0.14, 0.02, 0.14], [dx * (R - 0.08), 0.01, dz * (R - 0.08)], dark);
    }
    s.cylinder(R + 0.03, R + 0.03, 0.05, [0, BOT - 0.02, 0], dark, 28);
    s.cylinder(R - 0.08, R - 0.08, 0.04, [0, BOT + 0.01, 0], black, 28);

    // ---- The shell.
    const H = TOP - BOT, mid = (TOP + BOT) / 2;
    if (a.shell === 'brick') {
      const brick = s.material(mood.wear > 0.5 ? '#b89866' : '#d1b07a', { roughness: 0.95 });
      const rows = 7, per = 16;
      const items: { at: P3; yaw: number }[] = [];
      for (let row = 0; row < rows; row++) {
        const y = BOT + 0.06 + row * (H / rows);
        for (let i = 0; i < per; i++) {
          const angle = (i + (row % 2) * 0.5) / per * Math.PI * 2;
          items.push({ at: [Math.cos(angle) * (R - 0.06), y, Math.sin(angle) * (R - 0.06)], yaw: -angle });
        }
      }
      instanced(s, new THREE.BoxGeometry(0.115, H / rows - 0.012, 0.2), brick, items);
      s.mesh(new THREE.CylinderGeometry(R - 0.1, R - 0.1, H - 0.01, 28, 1, true), soot, [0, mid, 0]);
      for (const y of [BOT + 0.2, TOP - 0.2]) s.cylinder(R + 0.01, R + 0.01, 0.05, [0, y, 0], steel, 28);
    } else {
      const shellHex = { riveted: '#3f4246', painted: mood.cheer > 0.5 ? '#2f6aa8' : '#2b4f78', drum: '#8d3b2a', brick: '#000' }[a.shell];
      const shell = s.material(shellHex, { metalness: a.shell === 'drum' ? 0.35 : 0.6, roughness: a.shell === 'drum' ? 0.75 : 0.45 });
      s.mesh(new THREE.CylinderGeometry(R, R, H, 32, 1, true), shell, [0, mid, 0]);
      if (a.shell === 'riveted') {
        const items: { at: P3 }[] = [];
        for (const y of [BOT + 0.1, mid, TOP - 0.1]) for (let i = 0; i < 28; i++) {
          const angle = i / 28 * Math.PI * 2;
          items.push({ at: [Math.cos(angle) * R, y, Math.sin(angle) * R] });
        }
        instanced(s, new THREE.SphereGeometry(0.016, 6, 5), steel, items);
        for (const angle of [0.3, 2.4, 4.5]) s.box([0.03, H - 0.04, 0.08], [Math.cos(angle) * R, mid, Math.sin(angle) * R], shell).rotation.y = -angle;
      }
      if (a.shell === 'drum') for (const y of [BOT + 0.28, TOP - 0.28]) s.cylinder(R + 0.02, R + 0.02, 0.04, [0, y, 0], shell, 32);
      if (a.shell === 'painted') s.label('No 6', 0.26, 0.12, [0, mid + 0.05, R + 0.002], '#f2efe6', '#1c2a40');
    }
    // Rim: a steel band, the refractory lining showing as a thick ring, and the dark mouth.
    s.mesh(new THREE.CylinderGeometry(R + 0.03, R + 0.03, 0.06, 32, 1, true), steel, [0, TOP - 0.02, 0]);
    const ringGeometry = new THREE.RingGeometry(0.32, R + 0.02, 32);
    const rim = s.mesh(ringGeometry, refractory, [0, TOP + 0.005, 0]);
    rim.rotation.x = -Math.PI / 2;
    // The inside: lining walls and floor, lit by the melt.
    const lining = emissiveFor(mix(0, 1.6, heat) * (a.lid === 'closed' ? 0.4 : 1));
    const innerWall = lining.clone();
    innerWall.side = THREE.BackSide;
    s.mesh(new THREE.CylinderGeometry(0.33, 0.33, H - 0.04, 28, 1, true), innerWall, [0, mid, 0]);
    s.cylinder(0.33, 0.33, 0.02, [0, BOT + 0.06, 0], lining, 28);
    // The crucible, standing on a plinth block inside, its rim just below the mouth.
    const crucible = s.material(heat > 0.5 ? glow.clone().multiplyScalar(0.55).getHex() : '#2b2724', { roughness: 0.85, emissive: glow, emissiveIntensity: mix(0, 1.4, heat) });
    s.lathe([[0.1, 0], [0.19, 0.02], [0.25, 0.28], [0.24, 0.62], [0.2, 0.62], [0.21, 0.3], [0.1, 0.06]], crucible, [0, TOP - 0.7, 0]);
    s.cylinder(0.215, 0.215, 0.012, [0, TOP - 0.12, 0], emissiveFor(mix(0.2, 4, heat)), 22);

    // ---- The lid: a thick refractory-lined disc with a flue hole, on a swing arm from a pivot post.
    const PX = R + 0.17;
    s.cylinder(0.05, 0.06, TOP + 0.45, [PX, (TOP + 0.45) / 2, 0], steel, 12);
    s.cylinder(0.09, 0.09, 0.08, [PX, 0.04, 0], steel, 14);
    const lidGroup = new THREE.Group();
    lidGroup.position.set(PX, TOP + 0.12, 0);
    s.root.add(lidGroup);
    const lidAngle = { open: 2.5, ajar: 0.75, closed: 0 }[a.lid];
    lidGroup.rotation.y = lidAngle * (random() < 0.5 ? 1 : -1);
    const inLid = (mesh: THREE.Mesh) => { s.root.remove(mesh); mesh.position.x -= PX; mesh.position.y -= TOP + 0.12; lidGroup.add(mesh); return mesh; };
    inLid(s.box([PX + 0.1, 0.08, 0.14], [PX / 2 - 0.0, TOP + 0.32, 0], steel));
    inLid(s.cylinder(0.08, 0.08, 0.3, [PX, TOP + 0.2, 0], steel, 12));
    inLid(s.box([0.1, 0.2, 0.1], [0, TOP + 0.22, 0], steel));
    const lidShell = s.material(a.shell === 'drum' ? '#6b3a2c' : '#4a4d52', { metalness: 0.5, roughness: 0.6 });
    inLid(s.cylinder(R + 0.03, R + 0.03, 0.03, [0, TOP + 0.185, 0], lidShell, 32));
    inLid(s.cylinder(R + 0.01, R - 0.02, 0.14, [0, TOP + 0.1, 0], refractory, 32));
    inLid(s.cylinder(R - 0.02, R - 0.02, 0.03, [0, TOP + 0.03, 0], refractory, 32));
    inLid(s.cylinder(0.12, 0.12, 0.18, [0, TOP + 0.11, 0], a.lid === 'closed' ? emissiveFor(mix(0.1, 2.5, heat)) : soot, 16));
    inLid(s.ring(0.13, 0.03, [0, TOP + 0.21, 0], steel)).rotation.x = Math.PI / 2;
    // A lid rest when swung open: the arm lands on a stub post.
    if (a.lid === 'open') s.box([0.06, 0.1, 0.06], [PX, TOP + 0.27, 0], steel);

    // ---- The burner: a pipe into the base of the shell, a blower on a stand, a gas valve.
    const bx = -R - 0.55, bz = 0.38;
    s.cylinder(0.055, 0.055, 0.5, [-R - 0.1, BOT + 0.22, bz], steel, 14).rotation.z = Math.PI / 2;
    s.cylinder(0.08, 0.08, 0.06, [-R - 0.33, BOT + 0.22, bz], dark, 14).rotation.z = Math.PI / 2;
    s.cylinder(0.055, 0.055, 0.34, [bx + 0.05, BOT + 0.22, bz], steel, 14).rotation.z = Math.PI / 2;
    s.cylinder(0.17, 0.17, 0.16, [bx - 0.1, BOT + 0.22, bz], a.burner ? s.material('#8a8d90', { metalness: 0.7, roughness: 0.45 }) : steel, 20).rotation.z = Math.PI / 2;
    s.cylinder(0.11, 0.11, 0.03, [bx - 0.2, BOT + 0.22, bz], dark, 20).rotation.z = Math.PI / 2;
    for (let i = 0; i < 6; i++) s.box([0.012, 0.16, 0.025], [bx - 0.22, BOT + 0.22, bz], dark).rotation.x = i * Math.PI / 6;
    s.box([0.06, BOT + 0.05, 0.06], [bx - 0.1, (BOT + 0.05) / 2, bz], dark);
    s.box([0.24, 0.02, 0.2], [bx - 0.1, 0.01, bz], dark);
    // gas line up from the floor with a valve wheel and a gauge
    const brass = s.material('#b58b3a', { metalness: 0.8, roughness: 0.35 });
    s.cylinder(0.018, 0.018, 0.4, [bx + 0.12, BOT + 0.42, bz + 0.08], brass, 8);
    s.cylinder(0.018, 0.018, 0.18, [bx + 0.12, BOT + 0.22, bz + 0.0], brass, 8).rotation.x = Math.PI / 2;
    s.cylinder(0.06, 0.06, 0.02, [bx + 0.12, BOT + 0.63, bz + 0.08], s.material('#b8302b', { metalness: 0.4 }), 12);
    s.cylinder(0.045, 0.045, 0.02, [bx + 0.12, BOT + 0.5, bz + 0.13], s.material('#f1ede4', { roughness: 0.5 }), 14).rotation.x = Math.PI / 2;
    s.tube([[bx + 0.12, BOT + 0.02, bz + 0.08], [bx + 0.3, 0.03, bz + 0.5], [bx + 0.6, 0.03, bz + 0.9], [bx + 1.1, 0.03, bz + 0.95]], 0.016, s.material('#d8d2c2', { roughness: 0.8 }));

    // ---- Slag crust and spill on the rim and shell, more with wear and heat.
    const crust = Math.round(mix(4, 26, mood.wear) * (fire ? 1.3 : 1));
    const lumps: { at: P3; size: number; yaw: number }[] = [];
    for (let i = 0; i < crust; i++) {
      const angle = random() * Math.PI * 2, r = 0.34 + random() * (R - 0.3);
      lumps.push({ at: [Math.cos(angle) * r, TOP + 0.01, Math.sin(angle) * r], size: 0.02 + random() * 0.045, yaw: random() * 6 });
    }
    for (let i = 0; i < crust / 2; i++) {
      const angle = random() * Math.PI * 2;
      lumps.push({ at: [Math.cos(angle) * (R + 0.01), TOP - 0.1 - random() * 0.5, Math.sin(angle) * (R + 0.01)], size: 0.02 + random() * 0.03, yaw: random() * 6 });
    }
    if (lumps.length) instanced(s, new THREE.IcosahedronGeometry(1, 0), s.material('#2a2320', { roughness: 0.95 }), lumps);

    // ---- The tool rack.
    if (a.rack !== 'none') {
      const rx = R + 0.95, rz = -0.35;
      for (const dz of [-0.3, 0.3]) {
        s.box([0.05, 1.7, 0.05], [rx, 0.85, rz + dz], dark);
        s.box([0.24, 0.03, 0.08], [rx, 0.015, rz + dz], dark);
      }
      s.box([0.05, 0.05, 0.7], [rx, 1.6, rz], dark);
      s.box([0.05, 0.05, 0.7], [rx, 0.9, rz], dark);
      const tong = (z: number, length: number, kind: 'tong' | 'skimmer' | 'shank') => {
        const top = 1.6, lean = 0.22;
        const foot: P3 = [rx + lean, 0.02, z + 0.04];
        const head: P3 = [rx + 0.04, top + length - 1.6, z];
        if (kind === 'tong') {
          s.rod(foot, head, 0.013, steel);
          s.rod([foot[0] + 0.05, foot[1], foot[2] + 0.03], [head[0] - 0.02, head[1], head[2] - 0.02], 0.013, steel);
          s.ring(0.1, 0.014, [foot[0] + 0.02, 0.13, foot[2] + 0.02], steel, Math.PI).rotation.set(0, 0, Math.PI);
          s.ring(0.1, 0.014, [foot[0] + 0.02, 0.13, foot[2] + 0.02], steel, Math.PI).rotation.set(0, Math.PI / 2, Math.PI);
          s.cylinder(0.02, 0.02, 0.03, [mix(foot[0], head[0], 0.75), mix(foot[1], head[1], 0.75), mix(foot[2], head[2], 0.75)], dark, 8);
        } else if (kind === 'skimmer') {
          s.rod(foot, head, 0.011, steel);
          s.cylinder(0.08, 0.08, 0.015, [foot[0], 0.05, foot[2]], dark, 14).rotation.x = 0.4;
        } else {
          s.rod(foot, head, 0.014, steel);
          s.ring(0.19, 0.016, [foot[0], 0.2, foot[2]], steel).rotation.x = Math.PI / 2 - 0.3;
        }
      };
      if (a.rack === 'full') {
        tong(rz - 0.22, 1.75, 'tong');
        tong(rz - 0.02, 1.9, 'tong');
        tong(rz + 0.16, 1.7, 'tong');
        tong(rz + 0.3, 1.95, 'skimmer');
      } else if (a.rack === 'shank') tong(rz + 0.05, 1.85, 'shank');
    }

    // ---- The floor around the base.
    const scorch = s.mesh(new THREE.RingGeometry(R - 0.2, R + 0.55, 32), new THREE.MeshStandardMaterial({ color: '#2a2622', transparent: true, opacity: mix(0.15, 0.55, mood.wear), depthWrite: false, roughness: 1 }), [0, 0.004, 0]);
    scorch.rotation.x = -Math.PI / 2;
    scorch.receiveShadow = false;
    if (a.floor === 'slag') {
      const heap: { at: P3; size: number; yaw: number }[] = [];
      for (let i = 0; i < 40; i++) {
        const angle = 0.6 + random() * 1.6, r = R + 0.25 + random() * 0.55;
        heap.push({ at: [Math.cos(angle) * r, 0.03 + random() * 0.06, Math.sin(angle) * r], size: 0.035 + random() * 0.07, yaw: random() * 6 });
      }
      instanced(s, new THREE.IcosahedronGeometry(1, 0), s.material('#201c19', { roughness: 0.95 }), heap);
      s.lathe([[0.12, 0], [0.22, 0.02], [0.26, 0.3], [0.3, 0.42], [0.22, 0.42], [0.2, 0.3], [0.1, 0.05]], s.material('#3a3632', { roughness: 0.9 }), [R + 0.75, 0, 0.75]);
      s.cylinder(0.2, 0.2, 0.02, [R + 0.75, 0.4, 0.75], s.material('#4a4036', { roughness: 0.9 }), 16);
    } else if (a.floor === 'ingots') {
      const bronze = s.material(mood.warmth > 0.5 ? '#c08a3e' : '#a8803c', { metalness: 0.85, roughness: 0.35 });
      const stack: { at: P3; yaw: number }[] = [];
      const sx = R + 0.65, sz = 0.65;
      for (let layer = 0; layer < 4; layer++) for (let i = 0; i < 3; i++) {
        const across = layer % 2 === 0;
        stack.push({ at: [sx + (across ? (i - 1) * 0.13 : 0), 0.04 + layer * 0.075, sz + (across ? 0 : (i - 1) * 0.13)], yaw: across ? 0 : Math.PI / 2 });
      }
      instanced(s, new THREE.BoxGeometry(0.1, 0.07, 0.36), bronze, stack);
      s.box([0.1, 0.07, 0.36], [sx + 0.3, 0.035, sz - 0.4], bronze).rotation.y = 0.5;
    } else if (a.floor === 'bucket') {
      s.cylinder(0.15, 0.13, 0.3, [R + 0.6, 0.15, 0.6], steel, 18);
      s.cylinder(0.13, 0.13, 0.02, [R + 0.6, 0.29, 0.6], s.material('#e7dcbf', { roughness: 1 }), 18);
      s.ring(0.15, 0.01, [R + 0.6, 0.3, 0.6], steel, Math.PI).rotation.z = 0;
      const shovel = s.rod([R + 0.2, 0.03, 0.9], [R + 1.1, 0.6, 0.5], 0.015, s.material('#8a6a42'));
      void shovel;
      s.box([0.2, 0.01, 0.26], [R + 0.17, 0.02, 0.92], steel).rotation.y = 0.4;
      const grains: { at: P3; size: number; yaw: number }[] = [];
      for (let i = 0; i < 30; i++) grains.push({ at: [R + random() * 0.9, 0.004, 0.5 + random() * 0.6], size: 0.02 + random() * 0.04, yaw: random() * 6 });
      instanced(s, new THREE.IcosahedronGeometry(1, 0), s.material('#c9b58c', { roughness: 1 }), grains).scale.y = 0.3;
    }

    // ---- Heat shimmer and burner flame: see-through wisps, measured as nothing.
    const risers: { mesh: THREE.Mesh; speed: number; sway: number }[] = [];
    if (fire) {
      const haze = hazeTexture(random, 'rgba(255,214,170,0.9)');
      const hazeMat = new THREE.MeshBasicMaterial({ map: haze, transparent: true, opacity: mix(0.18, 0.4, heat), depthWrite: false, side: THREE.DoubleSide });
      const mouthOpen = a.lid !== 'closed';
      const count = mouthOpen ? 7 : 3, hh = mouthOpen ? 1.3 : 1.0;
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2, r = random() * (mouthOpen ? 0.3 : 0.08);
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.08 + random() * 0.08, hh * (0.7 + random() * 0.5)), hazeMat);
        plane.position.set(Math.cos(angle) * r, TOP + 0.25 + hh / 2, Math.sin(angle) * r);
        plane.rotation.y = random() * Math.PI;
        plane.castShadow = plane.receiveShadow = false;
        s.root.add(plane);
        risers.push({ mesh: plane, speed: 0.25 + random() * 0.2, sway: random() * 6 });
      }
      if (a.lid === 'closed' && a.burner) {
        const flameMat = new THREE.MeshBasicMaterial({ color: glowColour(Math.max(0.6, heat)), transparent: true, opacity: 0.75, depthWrite: false });
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.45, 10), flameMat);
        flame.position.set(0, TOP + 0.42, 0);
        flame.castShadow = flame.receiveShadow = false;
        s.root.add(flame);
        risers.push({ mesh: flame, speed: 1, sway: 0 });
      }
    }
    if (a.burner) {
      const tongue = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 10), new THREE.MeshBasicMaterial({ color: '#4f9cff', transparent: true, opacity: 0.7, depthWrite: false }));
      tongue.position.set(-R - 0.08, BOT + 0.22, bz);
      tongue.rotation.z = Math.PI / 2;
      tongue.castShadow = tongue.receiveShadow = false;
      s.root.add(tongue);
      risers.push({ mesh: tongue, speed: 2, sway: 0 });
    }

    const energy = mix(0.3, 1.6, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const { mesh, speed, sway } of risers) {
          const material = mesh.material as THREE.MeshBasicMaterial;
          if (material.map) {
            material.map.offset.y = -time * speed * energy * 0.4;
            mesh.rotation.z = Math.sin(time * 1.3 * energy + sway) * 0.08;
          } else mesh.scale.setScalar(1 + Math.sin(time * 9 * speed) * 0.12 * energy);
        }
      },
    });
  },
});
