import * as THREE from 'three';
import { type Placeable, type World, choice, defineWorld, disposeTree, mix, score } from '@conjure/kit';

// Standing places: x, z, tallest and widest a monument may be there. The hero is first and nearest.
const SLOTS: readonly (readonly [number, number, number, number])[] = [[-1, 2, 11, 7.2], [-12, -20, 11, 7], [10, -42, 14, 9], [-8, -76, 18, 12]];
const SKIES = {
  golden: { top: '#7f9cc0', mid: '#ecc9a0', low: '#f8e2b4', orb: '#fff3c8', key: '#ffd9a0' },
  teal: { top: '#2f6f68', mid: '#8fbd9f', low: '#f3dc92', orb: '#fff0b0', key: '#ffe2a8' },
  violet: { top: '#6a67a6', mid: '#b29ac6', low: '#f0c4b6', orb: '#fff4e2', key: '#e6d2ff' },
  haze: { top: '#c3d0d6', mid: '#e6e4da', low: '#f4efe2', orb: '#ffffff', key: '#fff6e6' },
} as const;

export default defineWorld({
  questions: {
    ground: choice('What is the desert floor?', {
      sand: 'Fine sand combed into long wind ripples.',
      salt: 'A white salt pan cracked into plates.',
      checker: 'A checkerboard of pale and terracotta tiles running to the horizon, like a stage or a chessboard.',
      mirror: 'A film of still water over the flat, reflecting the sky like a mirror.',
    }),
    sky: choice('What is the sky like?', {
      golden: 'Late golden light: blue above, a band of apricot at the horizon.',
      teal: 'A deep green sky going yellow at the horizon, like a de Chirico piazza.',
      violet: 'A violet dusk with a pink horizon, the hour between dream and waking.',
      haze: 'A white heat haze with no colour in it at all.',
    }),
    orb: choice('What hangs in the sky?', {
      sun: 'A low swollen sun.',
      moon: 'A huge pale moon, already risen.',
      eclipse: 'A black disc ringed with light: an eclipse.',
      none: 'Nothing: an empty sky.',
    }),
    horizon: choice('What is on the horizon?', {
      dunes: 'Low distant dunes.',
      peaks: 'A row of sharp bare peaks.',
      arcade: 'A long arcade of arches down one side, and a far tower with a flag.',
      empty: 'Nothing: a ruled line where the ground stops.',
    }),
    relics: choice('What small things stand about, giving the scale?', {
      cypress: 'A few tiny dark cypress trees.',
      ladders: 'Ladders standing up into the air, leaning on nothing.',
      crutches: 'Forked wooden crutches propped in the sand.',
      columns: 'Stumps and fallen drums of classical columns.',
      none: 'Only a single stepladder.',
    }),
    figure: choice('Is anyone there?', {
      nobody: 'Nobody.',
      watcher: 'One small figure in a hat, standing still with a very long shadow.',
      hoop: 'A child running with a hoop.',
      pair: 'Two tiny figures talking, far from everything.',
    }),
    buried: score('How deeply has the sand buried the monuments?', ['They rest on the surface', 'Sunk to the ankles', 'Half swallowed, with drifts against them']),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const sky = SKIES[a.sky];
    const grey = new THREE.Color('#9c9a98');
    const tone = (hex: string, toward: THREE.ColorRepresentation = grey, amount = (1 - mood.cheer) * 0.22) => new THREE.Color(hex).lerp(new THREE.Color(toward), amount);
    const horizonColour = tone(sky.low);
    const hex = (colour: THREE.Color) => '#' + colour.getHexString();
    const side = mood.daylight < 0.5 ? 1 : -1;
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: readonly [number, number, number] = [0, 0, 0], shadow = true) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = shadow;
      mesh.receiveShadow = true;
      root.add(mesh);
      return mesh;
    };

    // Sky: a painted backdrop with the orb and a few long clouds.
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const wash = ctx.createLinearGradient(0, 512, 0, 0);
    wash.addColorStop(0, hex(horizonColour)); wash.addColorStop(0.055, hex(horizonColour)); wash.addColorStop(0.17, hex(tone(sky.mid))); wash.addColorStop(0.42, hex(tone(sky.top))); wash.addColorStop(1, hex(tone(sky.top)));
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, 1024, 512);
    const orbX = 455 + side * -mix(95, 135, random()), orbY = 512 - mix(62, 92, random());
    if (a.orb !== 'none') {
      const radius = a.orb === 'moon' ? 34 : 24;
      const halo = ctx.createRadialGradient(orbX, orbY, radius * 0.8, orbX, orbY, radius * 4);
      halo.addColorStop(0, 'rgba(255,246,214,0.55)'); halo.addColorStop(1, 'rgba(255,246,214,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(orbX - radius * 4, orbY - radius * 4, radius * 8, radius * 8);
      if (a.orb === 'eclipse') { ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(orbX, orbY, radius * 1.14, 0, 7); ctx.fill(); }
      ctx.fillStyle = a.orb === 'eclipse' ? '#1f1c2a' : a.orb === 'sun' ? hex(tone(mood.warmth > 0.6 ? '#ff9c6a' : sky.orb, '#ffffff', 0.1)) : '#f6f1e2';
      ctx.beginPath(); ctx.arc(orbX, orbY, radius, 0, 7); ctx.fill();
      if (a.orb === 'moon') for (let i = 0; i < 9; i++) { ctx.fillStyle = 'rgba(150,150,175,0.3)'; ctx.beginPath(); ctx.arc(orbX + (random() - 0.5) * radius * 1.3, orbY + (random() - 0.5) * radius * 1.3, radius * (0.07 + random() * 0.17), 0, 7); ctx.fill(); }
    }
    for (let i = 0; i < 2 + Math.round(mood.density * 6); i++) {
      ctx.fillStyle = `rgba(${a.sky === 'haze' ? '190,196,200' : '255,244,226'},${0.25 + random() * 0.3})`;
      ctx.beginPath(); ctx.ellipse(250 + random() * 420, 512 - (40 + random() * 150), 40 + random() * 90, 2.5 + random() * 4, 0, 0, 7); ctx.fill();
    }
    const skyMap = new THREE.CanvasTexture(canvas);
    skyMap.colorSpace = THREE.SRGBColorSpace;
    const backdrop = add(new THREE.PlaneGeometry(900, 450), new THREE.MeshBasicMaterial({ map: skyMap, fog: false }), [0, 205, -380], false);
    backdrop.receiveShadow = false;
    backdrop.renderOrder = -1;

    // Ground: one endless plane with a repeating painted surface.
    const sandColour = tone('#dcc59a', mood.warmth > 0.5 ? '#e6b98a' : '#c9c8c0', Math.abs(mood.warmth - 0.5) * 0.7);
    const tile = document.createElement('canvas');
    tile.width = tile.height = 512;
    const paint = tile.getContext('2d')!;
    let period = 16, groundColour = sandColour;
    if (a.ground === 'sand') {
      paint.fillStyle = hex(sandColour); paint.fillRect(0, 0, 512, 512);
      for (let row = 0; row < 16; row++) for (const [offset, colour, alpha] of [[0, '#8a6f48', 0.34], [7, '#fff4d8', 0.4]] as const) {
        paint.strokeStyle = colour; paint.globalAlpha = alpha; paint.lineWidth = 5; paint.beginPath();
        for (let x = 0; x <= 512; x += 8) { const y = row * 32 + offset + 7 * Math.sin(x / 512 * Math.PI * 2 * 3 + row * 1.7) + 3 * Math.sin(x / 512 * Math.PI * 2 * 7 + row); if (x) paint.lineTo(x, y); else paint.moveTo(x, y); }
        paint.stroke();
      }
    } else if (a.ground === 'salt') {
      groundColour = tone('#efeadf', sandColour, 0.15 + mood.wear * 0.25);
      paint.fillStyle = hex(groundColour); paint.fillRect(0, 0, 512, 512);
      paint.strokeStyle = hex(tone('#8f8778')); paint.lineJoin = 'round';
      for (let i = 0; i < 16 + mood.wear * 16; i++) {
        const points: [number, number][] = [[random() * 512, random() * 512]];
        let heading = random() * Math.PI * 2;
        for (let k = 0; k < 9; k++) { heading += (random() - 0.5) * 1.6; const [x, y] = points[k]; points.push([x + Math.cos(heading) * (30 + random() * 40), y + Math.sin(heading) * (30 + random() * 40)]); }
        paint.lineWidth = 2 + random() * 3; paint.globalAlpha = 0.5 + random() * 0.4;
        for (const dx of [-512, 0, 512]) for (const dy of [-512, 0, 512]) { paint.beginPath(); points.forEach(([x, y], k) => (k ? paint.lineTo(x + dx, y + dy) : paint.moveTo(x + dx, y + dy))); paint.stroke(); }
      }
      period = 22;
    } else if (a.ground === 'checker') {
      const pale = tone('#eadfc6'), dark = tone(mood.cheer > 0.5 ? '#bb6f52' : '#6d5a55');
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { paint.fillStyle = hex((i + j) % 2 ? dark : pale); paint.fillRect(i * 256, j * 256, 256, 256); }
      for (let i = 0; i < 30 + mood.wear * 120; i++) { paint.globalAlpha = 0.1 + random() * 0.2; paint.fillStyle = hex(sandColour); paint.beginPath(); paint.ellipse(random() * 512, random() * 512, 4 + random() * 22, 3 + random() * 12, 0, 0, 7); paint.fill(); }
      groundColour = pale.clone().lerp(dark, 0.5);
      period = 9;
    } else {
      groundColour = tone(sky.mid, '#6f8a96', 0.45);
      paint.fillStyle = hex(groundColour); paint.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 40; i++) { paint.globalAlpha = 0.12 + random() * 0.2; paint.fillStyle = random() < 0.5 ? hex(horizonColour) : hex(tone(sky.top)); const y = random() * 512; paint.fillRect(0, y, 512, 2 + random() * 5); }
    }
    const groundMap = new THREE.CanvasTexture(tile);
    groundMap.colorSpace = THREE.SRGBColorSpace;
    groundMap.wrapS = groundMap.wrapT = THREE.RepeatWrapping;
    groundMap.repeat.set(900 / period, 900 / period);
    groundMap.anisotropy = 8;
    const groundGeometry = new THREE.PlaneGeometry(900, 900);
    groundGeometry.rotateX(-Math.PI / 2);
    const ground = add(groundGeometry, // Lambert, so the room environment the stage adds does not wash the long shadows out.
      a.ground === 'mirror' ? new THREE.MeshPhongMaterial({ map: groundMap, shininess: 50, specular: '#2c2c2c' }) : new THREE.MeshLambertMaterial({ map: groundMap }), [0, 0, -260], false);

    // Light: a low sun behind and to one side, so every shadow is long and reaches toward us.
    root.add(new THREE.HemisphereLight(tone(sky.top, '#ffffff', 0.5), groundColour, 0.42));
    const key = new THREE.DirectionalLight(tone(sky.key, mood.warmth > 0.5 ? '#ffb070' : '#cfe0ff', Math.abs(mood.warmth - 0.5) * 0.6), 5.2);
    const height = mix(0.3, 0.5, 1 - Math.abs(mood.daylight * 2 - 1));
    const sunward = new THREE.Vector3(-side * 0.5, height, -0.85).normalize();
    key.position.copy(new THREE.Vector3(0, 0, -20)).addScaledVector(sunward, 200);
    key.target.position.set(0, 0, -20);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.02;
    key.shadow.bias = -0.00005;
    const fill = new THREE.DirectionalLight('#ffffff', 0.9);
    fill.position.set(10, 3, 40);
    root.add(key, key.target, fill);

    // Horizon.
    const far = (colour: THREE.Color, amount = 0.55) => new THREE.MeshStandardMaterial({ color: colour.clone().lerp(horizonColour, amount), roughness: 1, flatShading: a.horizon === 'peaks' });
    if (a.horizon === 'dunes') for (let i = 0; i < 11; i++) {
      const z = -150 - random() * 110, wide = 45 + random() * 70;
      add(new THREE.SphereGeometry(1, 24, 10), far(sandColour, 0.35 + (-z - 150) / 300), [-280 + i * 48 + random() * 30, -1, z], false).scale.set(wide, 5 + random() * 12, wide * 0.5);
    }
    if (a.horizon === 'peaks') for (let i = 0; i < 16; i++) {
      const z = -210 - random() * 80, tall = 14 + random() * random() * 46;
      add(new THREE.ConeGeometry(tall * (0.6 + random() * 0.5), tall, 5 + Math.floor(random() * 3)), far(tone('#8a7f8c'), 0.3 + random() * 0.3), [-300 + i * 36 + random() * 24, tall / 2 - 1, z], false).rotation.y = random() * 3;
    }
    if (a.horizon === 'arcade') {
      const plaster = new THREE.MeshStandardMaterial({ color: tone(mood.warmth > 0.5 ? '#e0b56c' : '#d9d2c2'), roughness: 0.95 });
      const bay = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(6, 0), new THREE.Vector2(6, 9.5), new THREE.Vector2(0, 9.5)]);
      const arch = new THREE.Path();
      arch.moveTo(1, 0); arch.lineTo(1, 4.6); arch.absarc(3, 4.6, 2, Math.PI, 0, true); arch.lineTo(5, 0); arch.closePath();
      bay.holes.push(arch);
      const wall = new THREE.ExtrudeGeometry(bay, { depth: 1.4, bevelEnabled: false, curveSegments: 10 });
      const run = new THREE.InstancedMesh(wall, plaster, 20), matrix = new THREE.Matrix4(), turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), side * Math.PI / 2);
      for (let i = 0; i < 20; i++) { matrix.compose(new THREE.Vector3(side * -27, 0, side > 0 ? 14 - i * 6 : 8 - i * 6), turn, new THREE.Vector3(1, 1, 1)); run.setMatrixAt(i, matrix); }
      run.castShadow = run.receiveShadow = true;
      root.add(run);
      add(new THREE.BoxGeometry(7, 9.5, 122), new THREE.MeshStandardMaterial({ color: '#3d342f', roughness: 1 }), [side * -32.5, 4.75, -46]);
      add(new THREE.BoxGeometry(9.5, 0.7, 124), plaster, [side * -31, 9.85, -46]);
      const tower = new THREE.MeshStandardMaterial({ color: tone('#c98f6a').lerp(horizonColour, 0.3), roughness: 1 });
      add(new THREE.CylinderGeometry(7, 8, 40, 16), tower, [side * 60, 20, -230], false);
      add(new THREE.CylinderGeometry(5, 5.4, 12, 16), tower, [side * 60, 46, -230], false);
      add(new THREE.ConeGeometry(6.4, 7, 16), new THREE.MeshStandardMaterial({ color: tone('#8a3f34').lerp(horizonColour, 0.3), roughness: 1 }), [side * 60, 55.5, -230], false);
      add(new THREE.CylinderGeometry(0.25, 0.25, 12, 6), tower, [side * 60, 65, -230], false);
      add(new THREE.BoxGeometry(9, 2.6, 0.2), new THREE.MeshStandardMaterial({ color: tone('#c0392f'), roughness: 1 }), [side * 60 + 4.6, 69, -230], false);
    }

    // Small things for scale, kept clear of the standing places and the line of sight to the hero.
    const cameraAt = new THREE.Vector3(6, 4.2, 31);
    const taken: [number, number, number][] = SLOTS.map(([x, z, , wide]) => [x, z, wide + 1.5]);
    const spot = (near: boolean): [number, number] => {
      for (let tries = 0; tries < 40; tries++) {
        const z = near ? mix(16, -22, random()) : mix(0, -110, random() ** 1.5), x = (random() - 0.5) * (near ? 34 : 60 + -z * 0.5) + cameraAt.x * (z + 80) / 110;
        const blocked = z > 2 && Math.abs(x - mix(-1, cameraAt.x, (z - 2) / 28)) < 5.5;
        if (!blocked && taken.every(([tx, tz, r]) => Math.hypot(x - tx, z - tz) > r)) { taken.push([x, z, 2]); return [x, z]; }
      }
      return [40, -60];
    };
    const timber = new THREE.MeshStandardMaterial({ color: tone('#6f5238'), roughness: 0.9 });
    const bars: THREE.Matrix4[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    const bar = (from: THREE.Vector3, to: THREE.Vector3, thick: number) => {
      const direction = to.clone().sub(from), long = direction.length();
      bars.push(new THREE.Matrix4().compose(from.clone().add(to).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(up, direction.normalize()), new THREE.Vector3(thick, long, thick)));
    };
    const ladder = (x: number, z: number, tall: number, lean: number, turn: number) => {
      const across = new THREE.Vector3(Math.cos(turn), 0, -Math.sin(turn)).multiplyScalar(0.28), away = new THREE.Vector3(Math.sin(turn), 0, Math.cos(turn));
      const foot = new THREE.Vector3(x, 0, z), head = foot.clone().addScaledVector(away, -lean * tall).add(new THREE.Vector3(0, tall, 0));
      for (const k of [-1, 1]) bar(foot.clone().addScaledVector(across, k), head.clone().addScaledVector(across, k), 0.07);
      for (let i = 1; i < tall / 0.34; i++) { const p = foot.clone().lerp(head, i * 0.34 / tall); bar(p.clone().sub(across), p.clone().add(across), 0.05); }
      return head;
    };
    const count = a.relics === 'none' ? 0 : 3 + Math.round(mood.density * 6);
    {
      const [x, z] = [SLOTS[0][0] + side * -8.2, 5.5 + random() * 3];
      taken.push([x, z, 2]);
      const head = ladder(x, z, 2.5, 0.22, 0.4 * side);
      bar(head, new THREE.Vector3(head.x + Math.sin(0.4 * side) * -1.1, 0, head.z - 1.1), 0.07);
    }
    const green = new THREE.MeshStandardMaterial({ color: tone('#2f4a34', '#6a6a3a', mood.wear * 0.5), roughness: 1 });
    const marble = new THREE.MeshStandardMaterial({ color: tone('#e9e2d2', sandColour, 0.2 + mood.wear * 0.3), roughness: 0.8 });
    for (let i = 0; i < count; i++) {
      const [x, z] = spot(i < 3), size = mix(0.8, 1.35, random());
      if (a.relics === 'cypress') {
        add(new THREE.LatheGeometry([[0, 0.25], [0.34, 0.5], [0.42, 1.1], [0.3, 2.1], [0.12, 2.9], [0, 3.3]].map(([r, y]) => new THREE.Vector2(r * size, y * size)), 10), green, [x, 0, z]);
        add(new THREE.CylinderGeometry(0.06 * size, 0.08 * size, 0.5 * size, 6), timber, [x, 0.25 * size, z]);
      }
      if (a.relics === 'ladders') ladder(x, z, mix(3, 8, random()), (random() - 0.5) * 0.2, random() * 3);
      if (a.relics === 'crutches') {
        const tall = mix(2.2, 5, random()), lean = (random() - 0.5) * 0.5, top = new THREE.Vector3(x + lean * tall, tall, z);
        bar(new THREE.Vector3(x, 0, z), top, 0.09);
        for (const k of [-1, 1]) bar(top.clone().add(new THREE.Vector3(0, -0.1, 0)), top.clone().add(new THREE.Vector3(k * 0.45, 0.5, 0)), 0.07);
        bar(top.clone().add(new THREE.Vector3(-0.5, 0.52, 0)), top.clone().add(new THREE.Vector3(0.5, 0.52, 0)), 0.09);
      }
      if (a.relics === 'columns') {
        const tall = mix(0.8, 5.5, random() ** 1.6) * size;
        add(new THREE.BoxGeometry(1.5 * size, 0.3, 1.5 * size), marble, [x, 0.15, z]);
        add(new THREE.CylinderGeometry(0.5 * size, 0.56 * size, tall, 14), marble, [x, 0.3 + tall / 2, z]).rotation.y = random();
        if (random() < 0.6) { const drum = add(new THREE.CylinderGeometry(0.5 * size, 0.5 * size, 1.1 * size, 14), marble, [x + (1.4 + random()) * size, 0.42 * size, z + (random() - 0.5) * 2]); drum.rotation.set(Math.PI / 2, 0, random() * 3); }
      }
    }
    const timbers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), timber, bars.length);
    bars.forEach((matrix, i) => timbers.setMatrixAt(i, matrix));
    timbers.castShadow = timbers.receiveShadow = true;
    root.add(timbers);

    // Whoever is out here.
    const coat = new THREE.MeshStandardMaterial({ color: '#23222a', roughness: 0.9 });
    const person = (x: number, z: number, tall: number, dress?: string) => {
      const cloth = dress ? new THREE.MeshStandardMaterial({ color: dress, roughness: 0.9 }) : coat;
      add(new THREE.CylinderGeometry(tall * 0.08, tall * (dress ? 0.24 : 0.13), tall * 0.74, 8), cloth, [x, tall * 0.37, z]);
      add(new THREE.SphereGeometry(tall * 0.09, 10, 8), new THREE.MeshStandardMaterial({ color: '#c99a7a', roughness: 0.8 }), [x, tall * 0.84, z]);
      if (!dress) { add(new THREE.CylinderGeometry(tall * 0.16, tall * 0.16, tall * 0.02, 12), coat, [x, tall * 0.91, z]); add(new THREE.CylinderGeometry(tall * 0.09, tall * 0.09, tall * 0.1, 10), coat, [x, tall * 0.96, z]); }
    };
    let hoop: THREE.Mesh | null = null;
    const walkX = 5 + side * 5, walkZ = 13 + random() * 3;
    if (a.figure === 'watcher') person(walkX, walkZ, 0.62);
    if (a.figure === 'pair') { const [x, z] = spot(false); person(x, z, 0.62); person(x + 0.45, z + 0.15, 0.58, hex(tone('#a8433a'))); }
    if (a.figure === 'hoop') {
      person(walkX, walkZ, 0.5, hex(tone('#c8463a')));
      hoop = add(new THREE.TorusGeometry(0.2, 0.02, 6, 24), coat, [walkX - side * 0.42, 0.22, walkZ]);
      hoop.rotation.y = 0.2;
    }

    // Sand on the wind.
    const grains = mood.energy > 0.25 ? Math.round(mood.energy * 70) : 0;
    const streaks = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: tone('#fff2d2'), transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }), Math.max(grains, 1));
    streaks.visible = grains > 0;
    const lanes = Array.from({ length: grains }, () => ({ x: random() * 120, z: mix(20, -90, random()), y: 0.05 + random() * 0.5, long: 2 + random() * 6, speed: 0.5 + random() }));
    const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), drift = new THREE.Matrix4();
    const blow = (time: number) => lanes.forEach((lane, i) => {
      drift.compose(new THREE.Vector3(((lane.x + time * lane.speed * 9 * mood.energy) % 120 - 60) * side, lane.y, lane.z), flat, new THREE.Vector3(lane.long, 0.07, 1));
      streaks.setMatrixAt(i, drift);
    });
    blow(0);
    root.add(streaks);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 900);
    camera.position.copy(cameraAt);
    const drifted = new THREE.MeshLambertMaterial({ color: a.ground === 'salt' ? groundColour : sandColour });
    const world: World = {
      object: root, camera, background: horizonColour, capacity: SLOTS.length, ground, keyLight: key,
      place(items: readonly Placeable[]) {
        items.forEach((item, index) => {
          const [x, z, tall, wide] = SLOTS[index % SLOTS.length];
          const scale = Math.min(tall / Math.max(item.height, 0.01), wide / Math.max(item.radius, 0.01));
          const high = item.height * scale, sunk = a.buried * 0.22 * high;
          item.holder.scale.setScalar(scale);
          item.holder.position.set(x, -sunk, z);
          item.holder.rotation.y = Math.atan2(cameraAt.x - x, cameraAt.z - z) * 0.7 + (context.random() - 0.5) * 0.5;
          if (a.buried > 0.3) for (let i = 0; i < 3; i++) {
            const angle = Math.PI * (0.9 + context.random() * 1.2), reach = Math.min(item.radius * scale, wide) * 0.85, size = reach * mix(0.25, 0.45, context.random()) * a.buried;
            const heap = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10), drifted);
            heap.scale.set(size * 1.6, size * 0.3, size);
            heap.position.set(x + Math.cos(angle) * reach, -size * 0.08, z + Math.sin(angle) * reach);
            heap.castShadow = heap.receiveShadow = true;
            root.add(heap);
          }
        });
        camera.lookAt(-0.5, 4.4, -10);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        const shadow = key.shadow.camera;
        shadow.left = -70; shadow.right = 70; shadow.bottom = -70; shadow.top = 70;
        shadow.near = 20; shadow.far = 420;
        shadow.updateProjectionMatrix();
      },
      update(_dt, time) {
        if (grains) { blow(time); streaks.instanceMatrix.needsUpdate = true; }
        if (hoop) hoop.rotation.z = time * mix(1, 6, mood.energy);
      },
      dispose() { key.shadow.map?.dispose(); skyMap.dispose(); groundMap.dispose(); disposeTree(root); },
    };
    return world;
  },
});
