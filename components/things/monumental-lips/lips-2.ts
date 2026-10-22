import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix } from '@conjure/kit';

const WIDTHS: Record<string, number> = { cosmic: 30, planetary: 30, landscape: 18, street: 9, room: 2.3, tabletop: 0.36, macro: 0.06 };

/** A tube with an elliptical section that changes along its path. */
function sweep(curve: THREE.Curve<THREE.Vector3>, steps: number, around: number, section: (t: number) => readonly [number, number]) {
  const positions: number[] = [], uvs: number[] = [], index: number[] = [];
  const up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(), normal = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, p = curve.getPoint(t), tangent = curve.getTangent(t);
    side.crossVectors(up, tangent);
    if (side.lengthSq() < 1e-5) side.set(1, 0, 0);
    side.normalize();
    normal.crossVectors(tangent, side).normalize();
    const [rx, ry] = section(t);
    for (let j = 0; j <= around; j++) {
      const angle = j / around * Math.PI * 2;
      positions.push(p.x + side.x * rx * Math.cos(angle) + normal.x * ry * Math.sin(angle), p.y + side.y * rx * Math.cos(angle) + normal.y * ry * Math.sin(angle), p.z + side.z * rx * Math.cos(angle) + normal.z * ry * Math.sin(angle));
      uvs.push(t, j / around);
      if (i < steps && j < around) { const a = i * (around + 1) + j; index.push(a, a + around + 1, a + 1, a + 1, a + around + 1, a + around + 2); }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    colour: choice('What colour are the lips?', {
      red: 'Lipstick red, the classic screen-siren mouth.',
      flesh: 'Bare flesh pink, unpainted.',
      black: 'Black, gothic and lacquered.',
      gold: 'Gold leaf, a gilded idol of a mouth.',
      violet: 'Bruised violet, cold and a little dead.',
    }),
    state: choice('What is the mouth doing?', {
      pout: 'Closed in a full pout.',
      parted: 'Parted, with a row of teeth showing.',
      open: 'Wide open like a tunnel you could walk into.',
      kiss: 'Puckered into a kiss.',
    }),
    surface: choice('What is the surface like?', {
      gloss: 'Wet gloss with hard white highlights.',
      cracked: 'Dry and cracked like a lake bed.',
      velvet: 'Upholstered velvet with buttons and little sofa legs.',
      stone: 'Carved stone, matte and chipped.',
    }),
    emits: choice('What comes out of the mouth?', {
      nothing: 'Nothing.',
      ribbon: 'A long paper ribbon of words unspooling onto the ground.',
      smoke: 'A slow column of smoke.',
      tongue: 'A tongue, lolling out over the lower lip to the ground.',
      door: 'A small door between the lips, with a ladder up to it.',
    }),
    feeling: choice('What is the feeling of it?', {
      seductive: 'Seductive: a knowing half smile.',
      hungry: 'Hungry: stretched wide, sharp teeth, a thread of drool.',
      silenced: 'Silenced: sewn shut with thick black stitches.',
    }),
    sits: choice('How does it meet the ground?', {
      sofa: 'Resting on the ground like a sofa.',
      hover: 'Hovering just above its own shadow.',
      sunk: 'Tipped and partly sunk, one corner swallowed.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const mouth = new THREE.Group();
    root.add(mouth);
    const kiss = a.state === 'kiss', sewn = a.feeling === 'silenced', hungry = a.feeling === 'hungry';
    const full = (WIDTHS[context.scale] ?? 9) * mix(0.85, 1.15, random());
    const W = full / 2 * (kiss ? 0.58 : hungry ? 1.06 : 1);
    const U = full / 2; // a unit that does not shrink with the pucker
    const plump = kiss ? 1.3 : 1;
    const HU = 0.27 * U * plump, HL = 0.37 * U * plump;
    let G = { pout: 0, parted: 0.2, open: 0.62, kiss: 0.1 }[a.state] * U;
    if (hungry) G = Math.max(G, 0.24 * U);
    if (a.emits === 'door') G = Math.max(G, 0.3 * U);
    if (a.emits !== 'nothing' && a.emits !== 'door') G = Math.max(G, 0.1 * U);
    if (sewn) G = Math.min(G, 0.07 * U);
    const smile = a.feeling === 'seductive' ? 0.1 : hungry ? 0.02 : -0.05;
    const skew = a.feeling === 'seductive' ? 0.05 : 0;

    const taper = (u: number) => Math.max(0, 1 - Math.abs(u) ** 2.3) ** 0.62;
    const line = (u: number) => (smile * u * u + skew * u) * U;
    const gap = (u: number) => G * Math.max(0, 1 - u * u) ** (kiss ? 2 : 0.9);
    const bow = (u: number) => 1 - 0.3 * Math.exp(-((u / 0.14) ** 2)) + 0.12 * Math.exp(-(((Math.abs(u) - 0.3) / 0.2) ** 2));
    const upper = (u: number) => { const h = HU * taper(u) * bow(u); return { y: line(u) + gap(u) * 0.45 + h / 2, ry: h / 2, rz: 0.6 * HU * Math.sqrt(taper(u)) * (kiss ? 1.6 : 1) }; };
    const lower = (u: number) => { const h = HL * Math.max(0, 1 - u * u) ** 0.7; return { y: line(u) - gap(u) * 0.55 - h / 2, ry: h / 2, rz: 0.66 * HL * Math.max(0, 1 - u * u) ** 0.4 * (kiss ? 1.5 : 1) }; };
    const recede = (u: number) => -0.24 * U * u * u;

    // Skin: colour, fine vertical creases, and whatever the surface asks for.
    const base = new THREE.Color({ red: '#c9122f', flesh: '#d98c7c', black: '#1c1517', gold: '#d6a739', violet: '#5d2c72' }[a.colour]);
    if (a.surface === 'stone') base.lerp(new THREE.Color('#a9a498'), 0.55);
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = `#${base.getHexString()}`;
    ctx.fillRect(0, 0, 512, 128);
    const ink = base.clone().multiplyScalar(a.colour === 'black' ? 2.2 : 0.55);
    ctx.strokeStyle = `#${ink.getHexString()}`;
    for (let i = 0; i < 150; i++) { ctx.globalAlpha = 0.08 + random() * 0.16; ctx.lineWidth = 0.5 + random() * 1.2; const x = random() * 512; ctx.beginPath(); ctx.moveTo(x, 20 + random() * 30); ctx.lineTo(x + (random() - 0.5) * 6, 80 + random() * 40); ctx.stroke(); }
    if (a.surface === 'cracked') {
      ctx.strokeStyle = '#2a1a16';
      for (let i = 0; i < 46 + mood.wear * 50; i++) {
        ctx.globalAlpha = 0.6; ctx.lineWidth = 0.8 + random() * 1.6; ctx.beginPath();
        let x = random() * 512, y = random() * 128; ctx.moveTo(x, y);
        for (let k = 0; k < 5; k++) { x += (random() - 0.5) * 34; y += (random() - 0.5) * 40; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      ctx.fillStyle = '#f2e3d4';
      for (let i = 0; i < 60; i++) { ctx.globalAlpha = 0.25; ctx.fillRect(random() * 512, random() * 128, 3 + random() * 8, 2 + random() * 5); }
    }
    if (a.surface === 'stone' || mood.wear > 0.5) {
      for (let i = 0; i < 900 * (a.surface === 'stone' ? 1 : mood.wear); i++) { ctx.globalAlpha = 0.12; ctx.fillStyle = random() < 0.5 ? '#3d3833' : '#f3efe6'; ctx.fillRect(random() * 512, random() * 128, 1 + random() * 3, 1 + random() * 3); }
    }
    ctx.globalAlpha = 1;
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    const skin = new THREE.MeshPhysicalMaterial({
      map,
      roughness: { gloss: 0.14, cracked: 0.9, velvet: 1, stone: 0.85 }[a.surface],
      metalness: a.colour === 'gold' && a.surface !== 'velvet' ? 0.75 : 0,
      clearcoat: a.surface === 'gloss' ? 1 : 0, clearcoatRoughness: 0.08,
      sheen: a.surface === 'velvet' ? 1 : 0, sheenColor: base.clone().lerp(new THREE.Color('#ffffff'), 0.5), sheenRoughness: 0.4,
      emissive: base, emissiveIntensity: a.colour === 'black' ? 0 : 0.12,
    });
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: readonly [number, number, number] = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const lip = (shape: (u: number) => { y: number; ry: number; rz: number }, forward: number) => {
      const NU = 72, NV = 22, positions: number[] = [], uvs: number[] = [], index: number[] = [];
      for (let i = 0; i <= NU; i++) {
        const u = i / NU * 2 - 1, s = shape(u);
        for (let j = 0; j <= NV; j++) {
          const angle = j / NV * Math.PI * 2;
          positions.push(u * W, s.y + s.ry * Math.cos(angle), recede(u) + forward + s.rz * Math.sin(angle));
          uvs.push(i / NU * 3, j / NV);
          if (i < NU && j < NV) { const p = i * (NV + 1) + j; index.push(p, p + NV + 1, p + 1, p + 1, p + NV + 1, p + NV + 2); }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      return add(mouth, geometry, skin);
    };
    const flesh = [lip(upper, 0), lip(lower, 0.04 * U)];
    const front = (shape: typeof upper, u: number, angle: number, forward = 0) => { const s = shape(u); return new THREE.Vector3(u * W, s.y + s.ry * Math.cos(angle), recede(u) + forward + s.rz * Math.sin(angle)); };

    // Inside: darkness and teeth.
    const ball = new THREE.SphereGeometry(1, 24, 16);
    if (G > 0.05 * U) {
      const inside = add(mouth, ball, new THREE.MeshStandardMaterial({ color: a.state === 'open' ? '#1a0508' : '#2a070c', roughness: 1 }), [0, line(0) - G * 0.05, -0.1 * U]);
      inside.scale.set(W * (kiss ? 0.4 : 0.82), G * 0.62 + 0.02 * U, 0.12 * U);
    }
    if (G > 0.15 * U && !kiss) {
      const enamel = new THREE.MeshStandardMaterial({ color: new THREE.Color('#f6f1e3').lerp(new THREE.Color('#c9b98a'), mood.wear * 0.7), roughness: 0.25 });
      const count = 5;
      for (const row of [1, -1]) {
        for (let i = -count; i <= count; i++) {
          if (mood.wear > 0.75 && random() < 0.18) continue;
          const u = i / (count + 1.6) * 0.8, width = 0.8 * W / (count + 1.6);
          const tall = (row > 0 ? 0.36 : 0.26) * Math.min(G, 0.36 * U) * (1 - Math.abs(u) * 0.5);
          const edge = row > 0 ? upper(u).y - upper(u).ry : lower(u).y + lower(u).ry;
          const sharp = hungry && (Math.abs(i) === 2 || random() < 0.35);
          const tooth = sharp
            ? add(mouth, new THREE.ConeGeometry(width * 0.5, tall * 1.7, 8), enamel, [u * W, edge - row * tall * 0.75, recede(u) + 0.02 * U])
            : add(mouth, new THREE.BoxGeometry(width * 0.92, tall, 0.05 * U), enamel, [u * W, edge - row * tall * 0.4, recede(u) + 0.02 * U]);
          if (sharp && row > 0) tooth.rotation.x = Math.PI;
          tooth.rotation.y = -u * 0.5;
        }
      }
    }

    // Surface dressing.
    if (a.surface === 'gloss') {
      const shine = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.2 });
      for (const [shape, u, angle, length] of [[lower, -0.32, 1.0, 0.2], [lower, 0.12, 1.05, 0.07], [upper, -0.3, 1.2, 0.12]] as const) {
        const p = front(shape, u, angle, shape === lower ? 0.04 * U : 0);
        const mark = add(mouth, ball, shine, [p.x, p.y, p.z]);
        mark.scale.set(length * W, 0.022 * U, 0.012 * U);
        mark.rotation.set(-(Math.PI / 2 - angle), -u * 0.5, 0.06);
      }
    }
    if (a.surface === 'velvet') {
      const button = new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.45), roughness: 0.6 });
      const dots: { at: [number, number, number]; size: number }[] = [];
      for (let i = -5; i <= 5; i++) for (const [angle, offset] of [[1.25, 0], [1.9, 0.5]] as const) { const p = front(lower, (i + offset) / 7, angle, 0.04 * U); dots.push({ at: [p.x, p.y, p.z], size: 0.022 * U }); }
      for (let i = -4; i <= 4; i++) { const p = front(upper, (i + 0.5) / 6.5, 1.5); dots.push({ at: [p.x, p.y, p.z], size: 0.018 * U }); }
      const studs = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), button, dots.length);
      dots.forEach((dot, i) => studs.setMatrixAt(i, new THREE.Matrix4().makeScale(dot.size, dot.size, dot.size).setPosition(...dot.at)));
      studs.castShadow = true;
      mouth.add(studs);
    }

    // Feelings that leave marks.
    const thread = new THREE.MeshStandardMaterial({ color: '#14110f', roughness: 0.9 });
    if (sewn) {
      const stitches = kiss ? 4 : 8;
      for (let i = 0; i < stitches; i++) {
        const u = ((i + 0.5) / stitches * 2 - 1) * 0.72, lean = (i % 2 ? 1 : -1) * 0.035;
        const top = front(upper, u + lean, 1.0), bottom = front(lower, u - lean, 1.35, 0.04 * U);
        const mid = top.clone().lerp(bottom, 0.5); mid.z = Math.max(top.z, bottom.z) + 0.06 * U;
        add(mouth, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([top, mid, bottom]), 10, 0.016 * U, 6), thread);
        add(mouth, ball, thread, [top.x, top.y, top.z]).scale.setScalar(0.028 * U);
        add(mouth, ball, thread, [bottom.x, bottom.y, bottom.z]).scale.setScalar(0.028 * U);
      }
    }
    const drips: THREE.Mesh[] = [];
    if (hungry) {
      const spit = new THREE.MeshStandardMaterial({ color: '#e9f4f6', roughness: 0.05, transparent: true, opacity: 0.8 });
      for (let i = 0; i < 2 + Math.round(random() * 2); i++) {
        const u = (random() - 0.5) * 1.1, p = front(lower, u, 1.9, 0.04 * U), length = lower(u).ry * (0.5 + random() * 0.5);
        const drip = add(mouth, ball, spit, [p.x, p.y - length * 0.8, p.z]);
        drip.scale.set(0.016 * U, length, 0.016 * U);
        drip.userData.length = length;
        drips.push(drip);
      }
    }

    // Seat it.
    mouth.rotation.x = -0.12;
    if (a.sits === 'sunk') mouth.rotation.z = (random() < 0.5 ? -1 : 1) * (0.2 + random() * 0.12);
    mouth.updateMatrixWorld(true);
    const box = new THREE.Box3();
    for (const part of flesh) box.expandByObject(part);
    const lift = { sofa: 0, hover: 0.16 * U, sunk: -(box.max.y - box.min.y) * 0.22 }[a.sits] + (a.surface === 'velvet' && a.sits !== 'sunk' ? 0.07 * U : 0);
    mouth.position.set(0, -box.min.y + lift, -(box.min.z + box.max.z) / 2);
    mouth.updateMatrixWorld(true);
    const world = (p: THREE.Vector3) => p.applyMatrix4(mouth.matrixWorld);
    if (a.sits === 'hover') {
      const shadow = add(root, new THREE.CircleGeometry(1, 40), new THREE.MeshStandardMaterial({ color: '#3d3a40', roughness: 1 }), [0, 0.004 * U, 0]);
      shadow.rotation.x = -Math.PI / 2;
      shadow.scale.set(W * 0.92, 0.38 * U, 1);
      shadow.castShadow = false;
    }
    if (a.surface === 'velvet' && a.sits !== 'sunk') {
      const wood = new THREE.MeshStandardMaterial({ color: '#3b2415', roughness: 0.5 });
      for (const x of [-0.6, 0.6]) for (const z of [-0.12, 0.2]) add(root, new THREE.CylinderGeometry(0.035 * U, 0.022 * U, lift + 0.06 * U, 10), wood, [x * W, (lift + 0.06 * U) / 2, z * U]);
    }

    // What comes out.
    const lipTop = world(front(lower, 0, 0.5, 0.04 * U)), throat = world(new THREE.Vector3(0, line(0), 0)), brink = world(front(lower, 0, 1.5, 0.04 * U));
    const puffs: THREE.Mesh[] = [];
    let ribbonMap: THREE.CanvasTexture | null = null;
    if (a.emits === 'ribbon') {
      const text = (context.idea.trim().split(/\s+/).slice(0, 4).join(' ') || 'yes yes yes').toUpperCase().slice(0, 28);
      const paper = document.createElement('canvas');
      paper.width = 1024; paper.height = 64;
      const pen = paper.getContext('2d')!;
      pen.fillStyle = '#f4ecd6'; pen.fillRect(0, 0, 1024, 64);
      pen.fillStyle = '#1f1a17'; pen.font = 'bold 40px serif'; pen.textBaseline = 'middle';
      const run = `${text}  ·  `;
      let x = 8; while (x < 1024) { pen.fillText(run, x, 34); x += pen.measureText(run).width; }
      ribbonMap = new THREE.CanvasTexture(paper);
      ribbonMap.colorSpace = THREE.SRGBColorSpace;
      ribbonMap.wrapS = THREE.RepeatWrapping;
      const turn = random() < 0.5 ? -1 : 1;
      const path = new THREE.CatmullRomCurve3([throat, lipTop.clone().add(new THREE.Vector3(0, 0.03 * U, 0.02 * U)), brink.clone().add(new THREE.Vector3(turn * 0.05 * U, -0.02 * U, 0.12 * U)), new THREE.Vector3(turn * 0.2 * U, 0.03 * U, brink.z + 0.5 * U), new THREE.Vector3(turn * 0.7 * U, 0.02 * U, brink.z + 0.75 * U), new THREE.Vector3(turn * 1.2 * U, 0.1 * U, brink.z + 0.5 * U), new THREE.Vector3(turn * 1.25 * U, 0.02 * U, brink.z + 0.05 * U), new THREE.Vector3(turn * 0.95 * U, 0.03 * U, brink.z - 0.1 * U)]);
      const positions: number[] = [], uvs: number[] = [], index: number[] = [];
      const steps = 120, half = 0.07 * U;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, p = path.getPoint(t), tangent = path.getTangent(t);
        const side = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0));
        if (side.lengthSq() < 0.01) side.set(1, 0, 0);
        side.normalize().multiplyScalar(half);
        positions.push(p.x - side.x, p.y - side.y, p.z - side.z, p.x + side.x, p.y + side.y, p.z + side.z);
        uvs.push(t * 2.4, 0, t * 2.4, 1);
        if (i < steps) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      add(root, geometry, new THREE.MeshStandardMaterial({ map: ribbonMap, roughness: 0.8, side: THREE.DoubleSide }));
    }
    if (a.emits === 'smoke') {
      const haze = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#f1eef0' : '#8f8c93', roughness: 1, transparent: true, opacity: 0.62, depthWrite: false });
      for (let i = 0; i < 12; i++) {
        const puff = add(root, ball, haze);
        puff.castShadow = false;
        puff.userData = { phase: i / 12, sway: random() * 6.28 };
        puffs.push(puff);
      }
    }
    if (a.emits === 'tongue') {
      const pink = new THREE.MeshStandardMaterial({ color: '#e0607a', roughness: 0.35, emissive: '#7a1f33', emissiveIntensity: 0.2 });
      const path = new THREE.CatmullRomCurve3([throat.clone().add(new THREE.Vector3(0, 0, -0.1 * U)), lipTop.clone().add(new THREE.Vector3(0, 0.07 * U, 0)), brink.clone().add(new THREE.Vector3(0, 0.02 * U, 0.1 * U)), new THREE.Vector3((random() - 0.5) * 0.2 * U, 0.06 * U, brink.z + 0.42 * U), new THREE.Vector3((random() - 0.5) * 0.4 * U, 0.05 * U, brink.z + 0.85 * U)]);
      add(root, sweep(path, 40, 16, (t) => [0.2 * U * (kiss ? 0.6 : 1) * Math.sqrt(Math.max(0.02, 1 - t ** 4)), 0.05 * U * Math.sqrt(Math.max(0.05, 1 - t ** 5))]), pink);
    }
    if (a.emits === 'door') {
      const tall = Math.min(G * 0.85, 0.3 * U), wide = tall * 0.5;
      const door = add(root, new THREE.BoxGeometry(wide, tall, 0.03 * U), new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#2f6f8f' : '#40593f', roughness: 0.6 }), [lipTop.x, lipTop.y + tall * 0.42, lipTop.z - 0.06 * U]);
      add(root, new THREE.BoxGeometry(wide * 1.2, tall * 1.08, 0.02 * U), new THREE.MeshStandardMaterial({ color: '#efe6d2', roughness: 0.7 }), [door.position.x, door.position.y, door.position.z - 0.012 * U]);
      add(root, new THREE.SphereGeometry(wide * 0.07, 8, 6), new THREE.MeshStandardMaterial({ color: '#f0cf6a', metalness: 0.8, roughness: 0.3 }), [door.position.x + wide * 0.32, door.position.y, door.position.z + 0.02 * U]);
      const wood = new THREE.MeshStandardMaterial({ color: '#8a6a45', roughness: 0.9 });
      const foot = new THREE.Vector3(brink.x, 0, brink.z + lipTop.y * 0.35), top = new THREE.Vector3(lipTop.x, lipTop.y + 0.03 * U, lipTop.z + 0.02 * U);
      const rod = (from: THREE.Vector3, to: THREE.Vector3, radius: number) => {
        const mesh = add(root, new THREE.CylinderGeometry(radius, radius, from.distanceTo(to), 6), wood);
        mesh.position.copy(from).add(to).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
      };
      const half = new THREE.Vector3(wide * 0.3, 0, 0);
      rod(foot.clone().sub(half), top.clone().sub(half), 0.008 * U);
      rod(foot.clone().add(half), top.clone().add(half), 0.008 * U);
      for (let i = 1; i < 9; i++) { const p = foot.clone().lerp(top, i / 9); rod(p.clone().sub(half), p.clone().add(half), 0.006 * U); }
    }

    const energy = mix(0.15, 1.3, mood.energy);
    const rest = mouth.position.y;
    const animate = (_dt: number, time: number) => {
      if (a.sits === 'hover') mouth.position.y = rest + Math.sin(time * 1.1 * energy) * 0.025 * U;
      puffs.forEach((puff) => {
        const { phase, sway } = puff.userData as { phase: number; sway: number };
        const t = (phase + time * 0.06 * energy) % 1;
        puff.position.set(throat.x + Math.sin(sway + t * 5) * 0.12 * U * t, throat.y + t * 1.5 * U, throat.z + 0.12 * U + t * 0.3 * U);
        puff.scale.setScalar((0.05 + t * 0.2) * U);
      });
      drips.forEach((drip, i) => { drip.scale.y = drip.userData.length * (0.75 + Math.abs(Math.sin(time * 0.5 * energy + i)) * 0.25); });
    };
    animate(0, 0);
    return { object: root, update: animate, dispose: () => { map.dispose(); ribbonMap?.dispose(); disposeTree(root); } };
  },
});
