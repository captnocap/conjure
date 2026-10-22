import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, noul } from '@conjure/kit';

const RADII: Record<string, number> = { cosmic: 9, planetary: 9, landscape: 5, street: 2.4, room: 0.55, tabletop: 0.12, macro: 0.03 };

export default defineThing({
  questions: {
    form: choice('What form does the eye take?', {
      lidded: 'An eye in its lids, with a fringe of great lashes.',
      bare: 'A bare lidless eyeball, wet and round.',
      triangle: 'An eye set in a triangle with rays behind it, the all-seeing eye of a banknote or a lodge.',
      balloon: 'An eyeball as a balloon, netted with ropes and carrying a small basket.',
    }),
    iris: choice('What is the iris like?', {
      sky: 'Blue, with small clouds reflected in it.',
      gold: 'Gold and amber, like an animal.',
      red: 'Blood red around a pinprick pupil.',
      clock: 'A clock face with hands, in place of an iris.',
      spiral: 'A black and white spiral that seems to turn.',
    }),
    lid: choice('If it has a lid, how open is it?', {
      wide: 'Wide open, startled or all-seeing.',
      heavy: 'Heavy, half lowered, tired or knowing.',
      shut: 'Shut. It sleeps, or refuses to look.',
    }),
    watches: choice('What is it watching?', {
      viewer: 'You. It looks straight out at the viewer.',
      horizon: 'The horizon, panning slowly from side to side.',
      sky: 'The sky above it.',
    }),
    trails: choice('What trails from it?', {
      nothing: 'Nothing.',
      tear: 'A tear, fallen into a pool the size of a pond beneath it.',
      nerve: 'An optic nerve hanging from the back and spreading on the ground like a root.',
    }),
    pole: noul('Is it mounted on a slim pole, rather than only hanging over its shadow?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const R = (RADII[context.scale] ?? 2.4) * mix(0.85, 1.15, random());
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: readonly [number, number, number] = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const rod = (from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material, parent: THREE.Object3D = root) => {
      const mesh = add(parent, new THREE.CylinderGeometry(radius, radius, from.distanceTo(to), 6), material);
      mesh.position.copy(from).add(to).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
      return mesh;
    };

    // The eyeball is painted flat: the iris sits at the middle of the map, which the sphere turns to face +z.
    const canvas = document.createElement('canvas');
    canvas.width = 2048; canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    const white = ctx.createLinearGradient(0, 0, 2048, 0);
    const back = mood.wear > 0.5 ? '#e7b9ad' : '#efd3cb';
    white.addColorStop(0, back); white.addColorStop(0.3, '#f6f2ea'); white.addColorStop(0.7, '#f6f2ea'); white.addColorStop(1, back);
    ctx.fillStyle = white;
    ctx.fillRect(0, 0, 2048, 1024);
    ctx.strokeStyle = '#c23a3a';
    for (let i = 0; i < 16 + mood.wear * 60; i++) {
      const fromLeft = random() < 0.5;
      let x = fromLeft ? random() * 300 : 2048 - random() * 300, y = 80 + random() * 860;
      ctx.globalAlpha = 0.25 + random() * 0.4 + mood.wear * 0.2; ctx.lineWidth = 1 + random() * 3.5; ctx.beginPath(); ctx.moveTo(x, y);
      const reach = 6 + Math.floor(random() * (8 + mood.wear * 10));
      for (let k = 0; k < reach; k++) { x += (fromLeft ? 1 : -1) * (25 + random() * 45); y += (random() - 0.5) * 70; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const cx = 1024, cy = 512, ir = 168;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, ir, 0, Math.PI * 2); ctx.clip();
    const tints = { sky: ['#bfe3ff', '#4b9be0', '#1d4f94'], gold: ['#ffe28a', '#d79a22', '#6b3d0c'], red: ['#ff6a4a', '#c0141c', '#4a0508'], clock: ['#fbf4de', '#f1e6c4', '#b7a67a'], spiral: ['#ffffff', '#ffffff', '#bbbbbb'] }[a.iris];
    const disc = ctx.createRadialGradient(cx, cy, ir * 0.15, cx, cy, ir);
    disc.addColorStop(0, tints[0]); disc.addColorStop(0.7, tints[1]); disc.addColorStop(1, tints[2]);
    ctx.fillStyle = disc;
    ctx.fillRect(cx - ir, cy - ir, ir * 2, ir * 2);
    let pupil = ir * mix(0.3, 0.5, Math.abs(mood.daylight - 0.5) * 2);
    if (a.iris === 'gold' || a.iris === 'red' || a.iris === 'sky') {
      for (let i = 0; i < 170; i++) {
        const angle = random() * Math.PI * 2;
        ctx.strokeStyle = random() < 0.5 ? tints[2] : tints[0]; ctx.globalAlpha = 0.2 + random() * 0.3; ctx.lineWidth = 1 + random() * 2.5;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(angle) * ir * 0.3, cy + Math.sin(angle) * ir * 0.3); ctx.lineTo(cx + Math.cos(angle + (random() - 0.5) * 0.08) * ir * (0.75 + random() * 0.25), cy + Math.sin(angle) * ir * (0.75 + random() * 0.25)); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (a.iris === 'sky') {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 6; i++) { const x = cx + (random() - 0.5) * ir * 1.5, y = cy + (random() - 0.5) * ir * 1.5; ctx.globalAlpha = 0.85; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(x + k * 14 - 20, y + (k % 2) * 6, 20, 11, 0, 0, Math.PI * 2); ctx.fill(); } }
      ctx.globalAlpha = 1;
    }
    if (a.iris === 'red') pupil = ir * 0.16;
    if (a.iris === 'spiral') {
      pupil = ir * 0.1;
      ctx.strokeStyle = '#0c0c0e'; ctx.lineWidth = ir * 0.12; ctx.beginPath();
      for (let t = 0; t < 1; t += 0.004) { const angle = t * Math.PI * 9, r = t * ir; if (t === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r); }
      ctx.stroke();
    }
    if (a.iris === 'clock') {
      pupil = ir * 0.09;
      ctx.fillStyle = ctx.strokeStyle = '#1b1714';
      for (let i = 0; i < 60; i++) { const angle = i / 60 * Math.PI * 2, big = i % 5 === 0; ctx.lineWidth = big ? 7 : 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(angle) * ir * (big ? 0.74 : 0.84), cy + Math.sin(angle) * ir * (big ? 0.74 : 0.84)); ctx.lineTo(cx + Math.cos(angle) * ir * 0.92, cy + Math.sin(angle) * ir * 0.92); ctx.stroke(); }
      const hour = random() * Math.PI * 2, minute = random() * Math.PI * 2;
      ctx.lineCap = 'round';
      ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(hour) * ir * 0.45, cy + Math.sin(hour) * ir * 0.45); ctx.stroke();
      ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(minute) * ir * 0.7, cy + Math.sin(minute) * ir * 0.7); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = a.iris === 'clock' ? '#6b5a30' : '#191316'; ctx.lineWidth = a.iris === 'clock' ? 12 : 9; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.arc(cx, cy, ir, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1; ctx.fillStyle = '#060507';
    ctx.beginPath(); ctx.arc(cx, cy, pupil, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.92;
    ctx.beginPath(); ctx.ellipse(cx - ir * 0.36, cy - ir * 0.4, ir * 0.17, ir * 0.11, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(cx + ir * 0.3, cy + ir * 0.34, ir * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;

    const balloon = a.form === 'balloon', triangle = a.form === 'triangle';
    const hasLids = a.form === 'lidded' || triangle;
    const centre = new THREE.Vector3(0, balloon ? 3.1 * R : 1.5 * R, 0);
    const socket = new THREE.Group();
    socket.position.copy(centre);
    root.add(socket);
    const ball = new THREE.Group();
    ball.rotation.order = 'YXZ';
    socket.add(ball);
    const globe = add(ball, new THREE.SphereGeometry(R, 56, 36), new THREE.MeshPhysicalMaterial({ map, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06 }));
    globe.rotation.y = -Math.PI / 2;

    // Lids and lashes.
    const skinTone = triangle ? new THREE.Color('#c9a24a') : new THREE.Color('#d9a68e').lerp(new THREE.Color('#8f8a84'), mood.wear * 0.4);
    const skin = new THREE.MeshStandardMaterial({ color: skinTone, roughness: triangle ? 0.4 : 0.7, metalness: triangle ? 0.7 : 0, side: THREE.DoubleSide });
    const lash = new THREE.MeshStandardMaterial({ color: '#17120f', roughness: 0.8 });
    let upperLid: THREE.Mesh | null = null;
    const open = { wide: 1.1, heavy: 0.48, shut: -0.6 }[a.lid];
    if (hasLids) {
      upperLid = add(socket, new THREE.SphereGeometry(R * 1.045, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), skin);
      upperLid.rotation.x = -open;
      const lower = add(socket, new THREE.SphereGeometry(R * 1.04, 48, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), skin);
      lower.rotation.x = 0.6;
      if (!triangle) {
        socket.rotation.x = -0.32;
        // A brow and a crease, so the dome reads as a lid and not as a bald head.
        const arc = (radius: number, tube: number, lift: number, material: THREE.Material) => {
          const points = Array.from({ length: 13 }, (_unused, i) => { const phi = (0.16 + 0.68 * i / 12) * Math.PI, theta = lift + Math.sin(phi) * 0.16; return new THREE.Vector3(Math.cos(phi) * Math.cos(theta), Math.sin(theta), Math.sin(phi) * Math.cos(theta)).multiplyScalar(radius); });
          return add(socket, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 36, tube, 8), material);
        };
        arc(R * 1.07, 0.085 * R, 1.02, lash).scale.set(1, 1, 1);
        arc(R * 1.05, 0.02 * R, 0.78, new THREE.MeshStandardMaterial({ color: skinTone.clone().multiplyScalar(0.7), roughness: 0.8 }));
      }
      const fringe = (lid: THREE.Mesh, count: number, length: number, upward: number) => {
        for (let i = 0; i < count; i++) {
          const phi = (0.14 + 0.72 * (i + 0.5) / count) * Math.PI;
          const p = new THREE.Vector3(Math.cos(phi), 0, Math.sin(phi)).multiplyScalar(R * 1.05);
          const direction = new THREE.Vector3(Math.cos(phi) * 0.9, upward, Math.sin(phi)).normalize();
          const long = length * R * (0.7 + 0.5 * Math.sin(phi)) * (0.85 + random() * 0.3);
          const hair = add(lid, new THREE.ConeGeometry(0.022 * R, long, 5), lash);
          hair.position.copy(p).addScaledVector(direction, long * 0.45);
          hair.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        }
      };
      if (!triangle) { fringe(upperLid, 19, 0.5, 0.55); fringe(lower, 11, 0.22, -0.5); }
    }

    // The forms that hold it.
    const shade = new THREE.MeshStandardMaterial({ color: '#3b3940', roughness: 1 });
    const shadow = add(root, new THREE.CircleGeometry(1, 40), shade, [0, 0.003 * R, 0]);
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(R * 0.95, R * 0.8, 1);
    shadow.castShadow = false;
    if (triangle) {
      const side = 6.1 * R, tall = side * Math.sqrt(3) / 2;
      const outline = new THREE.Shape([new THREE.Vector2(-side / 2, 0), new THREE.Vector2(side / 2, 0), new THREE.Vector2(0, tall)]);
      outline.holes.push(new THREE.Path().absarc(0, tall / 3, R * 1.1, 0, Math.PI * 2, true));
      const stone = new THREE.MeshStandardMaterial({ color: new THREE.Color(mood.cheer > 0.5 ? '#e0c98f' : '#a9a79a').lerp(new THREE.Color('#77705f'), mood.wear * 0.4), roughness: 0.85, flatShading: true });
      const frame = add(root, new THREE.ExtrudeGeometry(outline, { depth: R * 0.7, bevelEnabled: true, bevelThickness: R * 0.08, bevelSize: R * 0.08, bevelSegments: 1, curveSegments: 40 }), stone, [0, 0, -R * 0.35]);
      frame.position.y = 0;
      centre.set(0, tall / 3, 0);
      socket.position.copy(centre);
      for (let row = 1; row < 7; row++) add(root, new THREE.BoxGeometry(side * (1 - row / 7.4) * 0.985, R * 0.03, R * 0.9), new THREE.MeshStandardMaterial({ color: '#5d584c', roughness: 1 }), [0, tall * row / 7.4, 0]).visible = Math.abs(tall * row / 7.4 - tall / 3) > R * 1.25;
      const ray = new THREE.MeshStandardMaterial({ color: '#f2cf63', emissive: '#e3a92a', emissiveIntensity: mix(0.2, 0.9, mood.cheer), metalness: 0.6, roughness: 0.3 });
      for (let i = 0; i < 18; i++) {
        const angle = i / 18 * Math.PI * 2 + 0.17, reach = (i % 2 ? 3.3 : 4.3) * R;
        const from = new THREE.Vector3(Math.cos(angle) * R * 1.3, tall / 3 + Math.sin(angle) * R * 1.3, -R * 0.5), to = new THREE.Vector3(Math.cos(angle) * reach, tall / 3 + Math.sin(angle) * reach, -R * 0.5);
        if (to.y < 0.1 * R) continue;
        rod(from, to, 0.035 * R, ray);
      }
      shadow.visible = false;
    }
    if (balloon) {
      const rope = new THREE.MeshStandardMaterial({ color: '#5a4630', roughness: 1 });
      const wicker = new THREE.MeshStandardMaterial({ color: '#9a6c3a', roughness: 0.95 });
      const basketY = 0.55 * R;
      add(root, new THREE.CylinderGeometry(0.42 * R, 0.34 * R, 0.5 * R, 14, 1, true), wicker, [0, basketY, 0]).material.side = THREE.DoubleSide;
      add(root, new THREE.CylinderGeometry(0.34 * R, 0.34 * R, 0.04 * R, 14), wicker, [0, basketY - 0.25 * R, 0]);
      add(root, new THREE.TorusGeometry(0.42 * R, 0.035 * R, 6, 20), rope, [0, basketY + 0.25 * R, 0]).rotation.x = Math.PI / 2;
      add(root, new THREE.TorusGeometry(R * 1.005 * Math.cos(0.35), 0.022 * R, 6, 40), rope, [0, centre.y - R * Math.sin(0.35), 0]).rotation.x = Math.PI / 2;
      for (let i = 0; i < 8; i++) {
        const angle = i / 8 * Math.PI * 2 + 0.2;
        const hitch = new THREE.Vector3(Math.cos(angle) * R * Math.cos(0.35), centre.y - R * Math.sin(0.35), Math.sin(angle) * R * Math.cos(0.35));
        rod(hitch, new THREE.Vector3(Math.cos(angle) * 0.42 * R, basketY + 0.25 * R, Math.sin(angle) * 0.42 * R), 0.014 * R, rope);
        const over = add(root, new THREE.TorusGeometry(R * 1.008, 0.012 * R, 5, 30, Math.PI * 0.62), rope, [0, centre.y, 0]);
        over.rotation.set(0, -angle, 0.5 * Math.PI - 0.35 - Math.PI * 0.62 + Math.PI * 0.62);
      }
      for (let i = 0; i < 3; i++) add(root, new THREE.SphereGeometry(0.09 * R, 8, 6), new THREE.MeshStandardMaterial({ color: '#c9b68a', roughness: 1 }), [Math.cos(i * 2.1) * 0.46 * R, basketY, Math.sin(i * 2.1) * 0.46 * R]);
      shadow.scale.set(R * 0.6, R * 0.5, 1);
    }
    if (a.pole && !triangle && !balloon) {
      const steel = new THREE.MeshStandardMaterial({ color: '#2f3033', roughness: 0.5, metalness: 0.6 });
      add(root, new THREE.CylinderGeometry(0.035 * R, 0.045 * R, centre.y - R * 0.9, 10), steel, [0, (centre.y - R * 0.9) / 2, 0]);
      add(root, new THREE.CylinderGeometry(0.3 * R, 0.36 * R, 0.06 * R, 20), steel, [0, 0.03 * R, 0]);
      add(root, new THREE.CylinderGeometry(0.2 * R, 0.05 * R, 0.14 * R, 14), steel, [0, centre.y - R * 0.98, 0]);
    }

    // What trails from it.
    let tear: THREE.Mesh | null = null;
    if (a.trails === 'tear') {
      const water = new THREE.MeshPhysicalMaterial({ color: '#7cc4e8', roughness: 0.05, metalness: 0.1, clearcoat: 1, emissive: '#2a6f9a', emissiveIntensity: 0.25 });
      const pond = add(root, new THREE.CylinderGeometry(1, 1, 0.012 * R, 40), water, [R * 0.25, 0.008 * R, R * 0.75]);
      pond.scale.set(R * 1.15, 1, R * 0.8);
      pond.castShadow = false;
      tear = add(root, new THREE.LatheGeometry([[0, 0], [0.5, 0.12], [0.72, 0.42], [0.6, 0.8], [0.3, 1.2], [0.08, 1.7], [0, 1.9]].map(([r, y]) => new THREE.Vector2(r * 0.17 * R, y * 0.17 * R)), 16), water, [R * 0.3, centre.y - R * 1.25, R * 0.72]);
      add(root, new THREE.SphereGeometry(1, 16, 10), water, [R * 0.3, centre.y - R * 0.86, R * 0.6]).scale.set(0.06 * R, 0.22 * R, 0.05 * R);
    }
    if (a.trails === 'nerve') {
      const flesh = new THREE.MeshStandardMaterial({ color: '#c2545c', roughness: 0.5, emissive: '#5a161c', emissiveIntensity: 0.25 });
      const rear = centre.clone().add(new THREE.Vector3(0, -R * 0.15, -R * 0.96));
      const land = new THREE.Vector3((random() - 0.5) * R, 0.07 * R, -R * 2.1);
      add(root, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([rear, rear.clone().add(new THREE.Vector3(0, -R * 0.1, -R * 0.5)), new THREE.Vector3(land.x * 0.6, centre.y * 0.35, -R * 1.9), land]), 30, 0.11 * R, 8), flesh);
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI * (0.05 + 0.9 * i / 5) + Math.PI * 0.5, reach = R * (0.8 + random() * 1.3);
        const end = land.clone().add(new THREE.Vector3(Math.sin(angle) * reach, -0.09 * R, Math.cos(angle) * reach * 0.8 - reach * 0.2));
        const elbow = land.clone().lerp(end, 0.5).add(new THREE.Vector3((random() - 0.5) * R * 0.4, 0.02 * R, (random() - 0.5) * R * 0.4));
        const curve = new THREE.CatmullRomCurve3([land, elbow, end]);
        const twig = add(root, new THREE.TubeGeometry(curve, 16, 0.05 * R, 6), flesh);
        twig.scale.y = 1;
      }
    }

    // Gaze.
    const aim = { viewer: [0.45, -0.3], horizon: [0.2, 0.02], sky: [0.25, -1.0] }[a.watches];
    const energy = mix(0.12, 1.2, mood.energy);
    const range = a.watches === 'horizon' ? 0.75 : 0.16;
    const phase = random() * 6.28;
    const look = (_dt: number, time: number) => {
      ball.rotation.y = aim[0] + Math.sin(time * 0.35 * energy + phase) * range;
      ball.rotation.x = aim[1] + Math.sin(time * 0.23 * energy + phase * 2) * 0.07;
      if (!triangle) socket.position.y = centre.y + Math.sin(time * 0.8 * energy + phase) * 0.03 * R;
      if (upperLid && a.lid !== 'shut') {
        const cycle = (time * 0.22 * energy + phase) % 1;
        upperLid.rotation.x = -mix(open, -0.6, cycle > 0.96 ? Math.sin((cycle - 0.96) / 0.04 * Math.PI) : 0);
      }
      if (tear) tear.position.y = centre.y - R * 1.25 - ((time * 0.25 * energy + phase) % 1) ** 2 * R * 0.2;
    };
    look(0, 0);
    return { object: root, footprint: triangle ? R * 3 : R * 1.2, update: look, dispose: () => { map.dispose(); disposeTree(root); } };
  },
});
