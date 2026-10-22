import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P = [number, number, number];

export default defineThing({
  questions: {
    dish: choice('What condition is the big dish in?', {
      pristine: 'Clean and whole, as white as the day it launched.',
      pitted: 'Dented and peppered with tiny impact pits, but whole.',
      bitten: 'A wedge torn clean out of the rim, edges curling.',
      hanging: 'Knocked off its mount and hanging askew by its struts.',
    }),
    signal: choice('Is it still transmitting?', {
      silent: 'No: it went quiet long ago.',
      pulse: 'A faint pulse: thin rings of signal leave the dish one at a time.',
      beam: 'A steady thread of a beam, still aimed carefully at home.',
    }),
    disc: choice('What is etched on the gold disc?', {
      map: 'A starburst of lines: a map to where it came from, among spiral grooves.',
      figures: 'Two simple human figures, one with a hand raised.',
      drawing: 'A child\'s drawing: a house, a sun, a stick family.',
      music: 'A stave of music notes.',
      hello: 'The single word HELLO.',
      blank: 'Nothing now: worn to a smooth gold mirror.',
    }),
    tumble: choice('How is it tumbling?', {
      steady: 'Hardly at all: still holding its pointing, dish up.',
      flat: 'A slow flat spin, booms sweeping round like clock hands.',
      endover: 'End over end, dish and belly taking turns.',
      wobble: 'A tired wobble, like a top about to fall.',
    }),
    power: noul('Is its nuclear battery still warm, with a little life in it?'),
    wake: choice('What travels along with it?', {
      nothing: 'Nothing at all.',
      foil: 'A slow glitter of its own flaked-off gold foil.',
      frost: 'A furring of frost on its booms and shadowed side.',
      parts: 'A few of its own bolts and a lost instrument cover, keeping station.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const model = context.scale === 'tabletop' || context.scale === 'room' || context.scale === 'macro';
    const pose = new THREE.Group();
    const craft = new THREE.Group();
    pose.add(craft);
    const frame = new THREE.Group();
    frame.add(pose);
    s.root.add(frame);
    const glow = mix(0.8, 1.5, mood.cheer);
    const grime = mood.wear;

    const white = new THREE.MeshStandardMaterial({ color: new THREE.Color('#eef0ee').lerp(new THREE.Color('#b9b3a4'), grime * 0.6), roughness: 0.55, side: THREE.DoubleSide });
    const dishBack = new THREE.MeshStandardMaterial({ color: '#8d949a', roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide });
    const gold = new THREE.MeshStandardMaterial({ color: '#d2a032', metalness: 0.85, roughness: mix(0.28, 0.5, grime), flatShading: true });
    const black = new THREE.MeshStandardMaterial({ color: '#1d1f24', roughness: 0.7, metalness: 0.2, flatShading: true });
    const steel = new THREE.MeshStandardMaterial({ color: '#aeb5ba', metalness: 0.7, roughness: 0.4 });
    const rtgPaint = new THREE.MeshStandardMaterial({ color: '#3a3336', roughness: 0.7, metalness: 0.4, emissive: '#ff4a1e', emissiveIntensity: a.power ? 0.55 * glow : 0 });
    const signalTint = new THREE.Color().setHSL(mix(0.55, 0.12, mood.warmth), 0.85, 0.5);
    const signalPaint = new THREE.MeshStandardMaterial({ color: signalTint, emissive: signalTint, emissiveIntensity: 1.1 * glow, roughness: 0.5 });
    const solid = (geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], at: P = [0, 0, 0], parent: THREE.Object3D = craft) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const rods: { from: THREE.Vector3; to: THREE.Vector3; radius: number }[] = [];
    const rod = (from: P | THREE.Vector3, to: P | THREE.Vector3, radius: number) => rods.push({ from: Array.isArray(from) ? new THREE.Vector3(...from) : (from as THREE.Vector3).clone(), to: Array.isArray(to) ? new THREE.Vector3(...to) : (to as THREE.Vector3).clone(), radius });
    // A three-sided lattice boom between two points.
    const truss = (from: THREE.Vector3, to: THREE.Vector3, width: number, bays: number) => {
      const axis = to.clone().sub(from).normalize();
      const side = new THREE.Vector3(0, 1, 0).cross(axis).normalize();
      if (side.lengthSq() < 0.01) side.set(1, 0, 0);
      const up = axis.clone().cross(side).normalize();
      const corner = (k: number, t: number) => from.clone().lerp(to, t).addScaledVector(side, Math.cos((k / 3) * Math.PI * 2) * width).addScaledVector(up, Math.sin((k / 3) * Math.PI * 2) * width);
      for (let k = 0; k < 3; k++) {
        rod(corner(k, 0), corner(k, 1), width * 0.14);
        for (let i = 0; i < bays; i++) rod(corner(k, i / bays), corner((k + 1) % 3, (i + 1) / bays), width * 0.09);
      }
    };

    // Bus: a ten-sided ring of electronics bays, half of them under gold blanket.
    const bus = solid(new THREE.CylinderGeometry(0.9, 0.9, 0.5, 10), black, [0, -0.45, 0]);
    bus.rotation.y = Math.PI / 10;
    for (let k = 0; k < 10; k++) {
      const theta = (k / 10) * Math.PI * 2;
      if (k % 2 === 0 || random() < 0.4) {
        const panel = solid(new THREE.BoxGeometry(0.5, 0.42, 0.03), k % 3 ? gold : white, [Math.sin(theta) * 0.865, -0.45, Math.cos(theta) * 0.865]);
        panel.rotation.y = theta;
      }
    }
    solid(new THREE.SphereGeometry(0.36, 14, 10), gold, [0, -0.45, 0]).scale.y = 0.9; // the propellant tank in the middle
    solid(new THREE.CylinderGeometry(0.5, 0.75, 0.3, 10, 1, true), steel, [0, -0.1, 0]);

    // The dish, its feed and struts.
    const dish = new THREE.Group();
    craft.add(dish);
    const dishR = 1.85, depth = 0.55;
    const profile: THREE.Vector2[] = [];
    for (let i = 0; i <= 14; i++) profile.push(new THREE.Vector2((i / 14) * dishR, depth * (i / 14) ** 2));
    const bite = a.dish === 'bitten' ? mix(0.7, 1.2, random()) : 0;
    const bowl = new THREE.LatheGeometry(profile, 44, 0.6, Math.PI * 2 - bite);
    if (a.dish === 'pitted' || a.dish === 'hanging' || grime > 0.7) {
      const position = bowl.attributes.position as THREE.BufferAttribute;
      const dents = Array.from({ length: 6 }, () => ({ x: (random() - 0.5) * 3, z: (random() - 0.5) * 3, d: mix(0.05, 0.14, random()) }));
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), z = position.getZ(i);
        let y = position.getY(i);
        for (const dent of dents) y -= dent.d * Math.exp(-((x - dent.x) ** 2 + (z - dent.z) ** 2) / 0.12);
        position.setY(i, y);
      }
      bowl.computeVertexNormals();
    }
    solid(bowl, white, [0, 0, 0], dish);
    const back = solid(bowl.clone(), dishBack, [0, -0.012, 0], dish);
    back.scale.setScalar(0.995);
    const rim = solid(new THREE.TorusGeometry(dishR, 0.03, 6, 60, Math.PI * 2 - bite), steel, [0, depth, 0], dish);
    rim.rotation.x = Math.PI / 2;
    rim.rotation.z = -(0.6 + Math.PI * 2 - bite) + Math.PI / 2; // align the gap in the rim with the gap in the bowl
    for (let k = 0; k < 3; k++) {
      const theta = (k / 3) * Math.PI * 2 + 0.2;
      const strut = solid(new THREE.CylinderGeometry(0.015, 0.015, 1, 5), steel, [0, 0, 0], dish);
      const from = new THREE.Vector3(Math.sin(theta) * 1.1, depth * 0.36, Math.cos(theta) * 1.1), to = new THREE.Vector3(Math.sin(theta) * 0.12, 1.28, Math.cos(theta) * 0.12);
      strut.position.copy(from).add(to).multiplyScalar(0.5);
      strut.scale.y = from.distanceTo(to);
      strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    }
    solid(new THREE.ConeGeometry(0.22, 0.2, 14), steel, [0, 1.3, 0], dish).rotation.x = Math.PI;
    solid(new THREE.CylinderGeometry(0.1, 0.14, 0.3, 10), black, [0, 0.14, 0], dish);
    if (a.dish === 'pitted' || grime > 0.5) {
      const count = Math.round(mix(20, 70, grime));
      const pits = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 6), new THREE.MeshStandardMaterial({ color: '#3b3d42', roughness: 1 }), count);
      const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), scale = new THREE.Vector3(), at = new THREE.Vector3();
      for (let i = 0; i < count; i++) {
        const r = Math.sqrt(random()) * dishR * 0.95, theta = random() * 6.3, size = mix(0.012, 0.05, random() ** 2);
        pits.setMatrixAt(i, matrix.compose(at.set(Math.cos(theta) * r, depth * (r / dishR) ** 2 + 0.02, Math.sin(theta) * r), turn, scale.set(size, size, size)));
      }
      dish.add(pits);
    }
    if (a.dish === 'hanging') {
      dish.position.set(0.5, 0.25, -0.3);
      dish.rotation.set(-0.55, 0.3, 0.5);
      rod([0.3, -0.1, 0.2], [0.75, 0.3, 0.1], 0.015);
      rod([-0.3, -0.1, -0.2], [-0.1, 0.5, -0.5], 0.015);
    }

    // The golden record on its bracket.
    const record = new THREE.Group();
    {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const sheen = ctx.createLinearGradient(0, 0, 256, 256);
      sheen.addColorStop(0, '#f1cf62');
      sheen.addColorStop(0.5, '#d39a22');
      sheen.addColorStop(1, '#e9bf4a');
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, 256, 256);
      const etch = '#6b4708';
      ctx.strokeStyle = ctx.fillStyle = etch;
      ctx.lineCap = 'round';
      if (a.disc !== 'blank') {
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.45;
        for (let r = 96; r < 126; r += 3) { ctx.beginPath(); ctx.arc(128, 128, r, 0, 7); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
      ctx.lineWidth = 4;
      if (a.disc === 'map') {
        for (let i = 0; i < 14; i++) {
          const angle = random() * 6.3, far = mix(30, 88, random());
          ctx.beginPath(); ctx.moveTo(110, 138); ctx.lineTo(110 + Math.cos(angle) * far, 138 + Math.sin(angle) * far); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(190, 70, 16, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.arc(190, 70, 5, 0, 7); ctx.fill();
      } else if (a.disc === 'figures') {
        const person = (x: number, wave: boolean) => {
          ctx.beginPath(); ctx.arc(x, 62, 13, 0, 7); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x, 76); ctx.lineTo(x, 142); ctx.moveTo(x, 142); ctx.lineTo(x - 16, 196); ctx.moveTo(x, 142); ctx.lineTo(x + 16, 196);
          ctx.moveTo(x, 92); ctx.lineTo(x - 22, 128); ctx.moveTo(x, 92); ctx.lineTo(x + 24, wave ? 60 : 128); ctx.stroke();
        };
        person(92, false);
        person(162, true);
      } else if (a.disc === 'drawing') {
        ctx.strokeRect(60, 120, 70, 60);
        ctx.beginPath(); ctx.moveTo(52, 120); ctx.lineTo(95, 82); ctx.lineTo(138, 120); ctx.stroke();
        ctx.strokeRect(86, 148, 18, 32);
        ctx.beginPath(); ctx.arc(182, 66, 17, 0, 7); ctx.stroke();
        for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(182 + Math.cos(i * 0.785) * 23, 66 + Math.sin(i * 0.785) * 23); ctx.lineTo(182 + Math.cos(i * 0.785) * 33, 66 + Math.sin(i * 0.785) * 33); ctx.stroke(); }
        for (const x of [160, 184, 204]) { const h = x === 184 ? 22 : 30; ctx.beginPath(); ctx.arc(x, 180 - h - 7, 6, 0, 7); ctx.moveTo(x, 180 - h); ctx.lineTo(x, 172); ctx.moveTo(x - 8, 164); ctx.lineTo(x + 8, 164); ctx.moveTo(x, 172); ctx.lineTo(x - 6, 186); ctx.moveTo(x, 172); ctx.lineTo(x + 6, 186); ctx.stroke(); }
      } else if (a.disc === 'music') {
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(40, 100 + i * 14); ctx.lineTo(216, 100 + i * 14); ctx.stroke(); }
        for (let i = 0; i < 6; i++) {
          const x = 62 + i * 27, y = 100 + Math.floor(random() * 9) * 7;
          ctx.beginPath(); ctx.ellipse(x, y, 8, 6, -0.4, 0, 7); ctx.fill();
          ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 7, y); ctx.lineTo(x + 7, y - 36); ctx.stroke();
        }
      } else if (a.disc === 'hello') {
        ctx.font = 'bold 54px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('HELLO', 128, 130, 170);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.ellipse(96, 92, 50, 22, -0.7, 0, 7); ctx.fill();
      }
      ctx.fillStyle = etch;
      ctx.beginPath(); ctx.arc(128, 128, a.disc === 'blank' || a.disc === 'hello' ? 0 : 4, 0, 7); ctx.fill();
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const face = new THREE.MeshStandardMaterial({ map: texture, metalness: 0.25, roughness: 0.55, emissive: '#b07a10', emissiveIntensity: 0.1 });
      const disc = solid(new THREE.CylinderGeometry(0.6, 0.6, 0.035, 44), [gold, face, gold], [0, 0, 0], record);
      disc.rotation.x = Math.PI / 2;
      solid(new THREE.BoxGeometry(0.24, 0.24, 0.5), black, [0, 0, -0.27], record);
      for (const angle of [0.5, 2.6, 4.7]) solid(new THREE.CylinderGeometry(0.025, 0.025, 0.05, 6), steel, [Math.cos(angle) * 0.55, Math.sin(angle) * 0.55, 0.01], record).rotation.x = Math.PI / 2;
    }
    record.position.set(0.15, -0.6, 1.38);
    record.rotation.x = -0.5;
    craft.add(record);

    // Booms.
    const rtgEnd = new THREE.Vector3(-3.0, -1.0, 0.15), scienceEnd = new THREE.Vector3(2.5, -0.55, 0.3);
    truss(new THREE.Vector3(-0.8, -0.5, 0.05), new THREE.Vector3(-1.9, -0.75, 0.1), 0.09, 5);
    const rtgAxis = rtgEnd.clone().sub(new THREE.Vector3(-1.9, -0.75, 0.1)).normalize();
    for (let i = 0; i < 3; i++) {
      const can = solid(new THREE.CylinderGeometry(0.19, 0.19, 0.34, 12), rtgPaint, [0, 0, 0]);
      can.position.copy(new THREE.Vector3(-1.9, -0.75, 0.1)).addScaledVector(rtgAxis, 0.2 + i * 0.38);
      can.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rtgAxis);
      for (let f = 0; f < 6; f++) {
        const fin = solid(new THREE.BoxGeometry(0.1, 0.32, 0.012), black, [0, 0, 0], can);
        fin.position.set(Math.cos(f * 1.047) * 0.23, 0, Math.sin(f * 1.047) * 0.23);
        fin.rotation.y = -f * 1.047;
      }
    }
    truss(new THREE.Vector3(0.8, -0.5, 0.1), scienceEnd, 0.1, 7);
    // The scan platform: a cluster of boxes and two camera barrels that once looked back.
    solid(new THREE.BoxGeometry(0.42, 0.34, 0.36), white, [2.7, -0.55, 0.3]);
    solid(new THREE.BoxGeometry(0.26, 0.5, 0.26), gold, [2.72, -0.98, 0.26]);
    for (const [dx, r] of [[0.0, 0.11], [0.2, 0.07]] as const) solid(new THREE.CylinderGeometry(r, r * 0.85, 0.5, 12), black, [2.62 + dx, -1.0, 0.56]).rotation.x = Math.PI / 2;
    solid(new THREE.BoxGeometry(0.2, 0.2, 0.2), black, [1.7, -0.32, 0.22]);
    // The long magnetometer boom, kinked if the years have been hard.
    const magFrom = new THREE.Vector3(-0.45, -0.7, -0.65), magTo = new THREE.Vector3(-2.6, 0.2, -4.8);
    if (grime > 0.6) {
      const elbow = magFrom.clone().lerp(magTo, 0.55);
      truss(magFrom, elbow, 0.08, 9);
      truss(elbow, elbow.clone().add(new THREE.Vector3(-1.6, -0.9, -1.2)), 0.08, 6);
    } else truss(magFrom, magTo, 0.08, 16);
    // Two whip antennas in a wide V.
    rod([0.4, -0.7, 0.3], [2.6, -3.0, 1.6], 0.012);
    if (grime < 0.85) rod([-0.4, -0.7, 0.3], [-2.4, -3.1, 1.4], 0.012);
    else rod([-0.4, -0.7, 0.3], [-1.0, -1.5, 0.6], 0.012);
    // Thruster quads.
    for (const [x, z] of [[0.75, 0.55], [-0.75, 0.55], [0.75, -0.55], [-0.75, -0.55]]) solid(new THREE.ConeGeometry(0.06, 0.14, 8), steel, [x, -0.78, z]);

    const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 5), steel, rods.length);
    const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), scale = new THREE.Vector3(), at = new THREE.Vector3(), span = new THREE.Vector3(), upAxis = new THREE.Vector3(0, 1, 0);
    rods.forEach((item, index) => {
      span.subVectors(item.to, item.from);
      const length = span.length();
      turn.setFromUnitVectors(upAxis, span.normalize());
      mesh.setMatrixAt(index, matrix.compose(at.addVectors(item.from, item.to).multiplyScalar(0.5), turn, scale.set(item.radius, length, item.radius)));
    });
    mesh.castShadow = true;
    craft.add(mesh);

    // Signal.
    const rings: THREE.Mesh[] = [];
    if (a.signal === 'pulse') {
      for (let i = 0; i < 4; i++) {
        const ring = solid(new THREE.TorusGeometry(1, 0.022, 6, 48), signalPaint, [0, 2, 0], dish);
        ring.rotation.x = Math.PI / 2;
        rings.push(ring);
      }
    } else if (a.signal === 'beam') {
      solid(new THREE.CylinderGeometry(0.02, 0.035, 5, 8), signalPaint, [0, 3.9, 0], dish);
      const sheath = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.12, 5, 16, 1, true), new THREE.MeshBasicMaterial({ color: signalTint, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
      sheath.position.y = 3.9;
      dish.add(sheath);
    }
    const placeRings = (time: number) => rings.forEach((ring, index) => {
      const t = (time * 0.35 + index / rings.length) % 1;
      ring.position.y = 1.5 + t * 3.2;
      ring.scale.setScalar(0.25 + t * 0.75);
      ring.visible = t < 0.94;
    });
    placeRings(random());

    // What travels with it.
    const company = new THREE.Group();
    frame.add(company);
    if (a.wake !== 'nothing') {
      const count = a.wake === 'foil' ? Math.round(mix(40, 130, mood.density)) : a.wake === 'frost' ? Math.round(mix(50, 140, mood.density)) : 9;
      const geometry = a.wake === 'foil' ? new THREE.CircleGeometry(1, 4) : a.wake === 'frost' ? new THREE.IcosahedronGeometry(1, 0) : new THREE.CylinderGeometry(0.5, 0.5, 1.6, 6);
      const material = a.wake === 'foil' ? new THREE.MeshStandardMaterial({ color: '#d9a630', metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide }) : a.wake === 'frost' ? new THREE.MeshStandardMaterial({ color: '#cfe4f2', roughness: 0.4, flatShading: true }) : steel;
      const bits = new THREE.InstancedMesh(geometry, material, count);
      for (let i = 0; i < count; i++) {
        if (a.wake === 'frost') {
          // Frost clings along the booms and the underside.
          const along = random();
          const base = i % 3 === 0 ? new THREE.Vector3(-0.8, -0.5, 0.05).lerp(rtgEnd, along) : i % 3 === 1 ? new THREE.Vector3(0.8, -0.5, 0.1).lerp(scienceEnd, along) : magFrom.clone().lerp(magTo, along * (grime > 0.6 ? 0.55 : 1));
          at.copy(base).add(new THREE.Vector3((random() - 0.5) * 0.2, (random() - 0.5) * 0.2, (random() - 0.5) * 0.2));
          scale.setScalar(mix(0.03, 0.09, random()));
        } else {
          at.set((random() - 0.5) * 7, (random() - 0.5) * 4.5, (random() - 0.5) * 6);
          if (at.length() < 1.6) at.setLength(1.8);
          scale.setScalar(a.wake === 'foil' ? mix(0.03, 0.1, random()) : mix(0.04, 0.07, random()));
        }
        turn.setFromEuler(new THREE.Euler(random() * 6, random() * 6, random() * 6));
        bits.setMatrixAt(i, matrix.compose(at, turn, scale));
      }
      bits.castShadow = true;
      (a.wake === 'frost' ? craft : company).add(bits);
      if (a.wake === 'parts') solid(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 14), white, [2.2, 1.2, 1.5], company).rotation.set(0.8, 0.2, 0.5);
    }

    // Pose: dish up and a little toward the viewer, then whatever the tumble has done.
    pose.rotation.set(-0.08, mix(-0.3, 0.2, random()), { steady: 0.05, flat: 0.12, endover: 0.6, wobble: 0.3 }[a.tumble] * (random() < 0.5 ? -1 : 1));
    if (a.tumble === 'endover') pose.rotation.x = mix(0.9, 1.5, random());

    if (model) {
      // A museum model: one tenth scale on a turned wooden base with a brass pin.
      frame.scale.setScalar(0.1);
      frame.position.y = 0.42;
      const wood = new THREE.MeshStandardMaterial({ color: '#5a3b26', roughness: 0.5 });
      const brass = new THREE.MeshStandardMaterial({ color: '#b8923c', metalness: 0.85, roughness: 0.3 });
      s.lathe([[0, 0], [0.16, 0], [0.16, 0.012], [0.14, 0.03], [0.13, 0.04], [0, 0.04]], wood);
      s.cylinder(0.005, 0.006, 0.34, [0, 0.2, 0], brass, 8);
      s.box([0.11, 0.002, 0.03], [0, 0.041, 0.1], brass);
    }

    const pace = mix(0.3, 1.5, mood.energy);
    const tiltZ = pose.rotation.z;
    return s.finish({
      footprint: model ? 0.18 : 1.6,
      update(dt, time) {
        if (a.tumble === 'flat') pose.rotation.y += dt * 0.12 * pace;
        else if (a.tumble === 'endover') pose.rotation.x += dt * 0.1 * pace;
        else if (a.tumble === 'wobble') { pose.rotation.y += dt * 0.25 * pace; pose.rotation.z = tiltZ + Math.sin(time * 0.6 * pace) * 0.12; }
        else pose.rotation.y += Math.sin(time * 0.2) * dt * 0.01;
        company.rotation.y -= dt * 0.02 * pace;
        if (rings.length) placeRings(time * pace);
        if (a.power) rtgPaint.emissiveIntensity = 0.55 * glow * (0.85 + Math.sin(time * 1.3) * 0.15);
      },
    });
  },
});
