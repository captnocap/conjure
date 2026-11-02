import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { Batch, canvasTexture, night as nightOf } from './parts';

type V3 = [number, number, number];

export default defineThing({
  questions: {
    state: choice('What state is the taxi in?', {
      proud: 'Proud and polished: glossy black paint, gleaming chrome, the yellow roof fresh.',
      dented: 'Dented and tired: a crumpled flank, a cracked windscreen, a bumper knocked askew.',
      sheeted: 'The last one, parked forever under a dusty sheet, only its wheels and bumpers showing.',
      loaded: 'Roof rack piled high with suitcases tied down in rope, ready for the station.',
    }),
    meter: choice('Is the fare-meter flag up or down?', {
      up: 'Flag up: for hire, waiting for a fare.',
      down: 'Flag down: hired, the meter ticking.',
    }),
    decor: choice('How is it decorated?', {
      marigold: 'A garland of orange marigolds across the dashboard and a little deity glued above it.',
      charm: 'A lemon-and-chilli charm hanging from the front bumper to ward off the evil eye.',
      plain: 'Plain: nothing but a faded sticker or two.',
    }),
    driver: noul('Is the driver dozing inside, head tipped back?'),
    rain: noul('Is it raining on it, the paint beaded and the street shining?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const night = nightOf(mood.daylight);
    const proud = a.state === 'proud';
    const tired = a.state === 'dented';
    const black = s.material('#141416', { roughness: proud ? 0.18 : a.rain ? 0.2 : 0.45 + mood.wear * 0.3, metalness: proud ? 0.35 : 0.2 });
    const yellow = s.material(tired ? '#e0b21c' : '#f4c418', { roughness: proud ? 0.2 : 0.45 });
    const chrome = s.material('#d8dce0', { roughness: tired ? 0.45 : 0.12, metalness: 0.95 });
    const rubber = s.material('#1a1a1a', { roughness: 0.85 });
    const crackMap = canvasTexture(128, 128, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 128);
      if (tired) { c.strokeStyle = '#ffffff'; c.globalCompositeOperation = 'source-over'; c.strokeStyle = 'rgba(40,40,40,1)'; c.lineWidth = 1.5; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(38, 54); let x = 38, y = 54; for (let k = 0; k < 4; k++) { x += (random() - 0.5) * 50; y += (random() - 0.5) * 50; c.lineTo(x, y); } c.stroke(); } }
    }, false);
    const glass = new THREE.MeshStandardMaterial({ color: '#8fa3ad', map: crackMap, transparent: true, opacity: 0.38, roughness: 0.05, metalness: 0.2, side: THREE.DoubleSide, depthWrite: false });
    const vinyl = s.material('#6a1c1c', { roughness: 0.6 });
    const lampOn = mix(0.05, 2.0, night);

    const b = new Batch();
    const W = 1.47, wheelR = 0.3;
    // Lower body: a rounded side profile with wheel arches, extruded across the width with soft edges.
    const prof = new THREE.Shape();
    prof.moveTo(-1.9, 0.3);
    prof.lineTo(-1.95, 0.5); prof.quadraticCurveTo(-1.97, 0.8, -1.82, 0.86); prof.lineTo(-1.02, 0.9);
    prof.lineTo(0.72, 0.9); prof.quadraticCurveTo(1.4, 0.88, 1.78, 0.82); prof.quadraticCurveTo(1.97, 0.76, 1.96, 0.55); prof.lineTo(1.9, 0.3);
    prof.lineTo(1.6, 0.3); prof.absarc(1.22, 0.3, 0.38, 0, Math.PI, false); prof.lineTo(-0.88, 0.3);
    prof.absarc(-1.26, 0.3, 0.38, 0, Math.PI, false); prof.lineTo(-1.9, 0.3);
    const bev = 0.07;
    const bodyGeo = new THREE.ExtrudeGeometry(prof, { depth: W - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 10 });
    bodyGeo.rotateY(-Math.PI / 2); bodyGeo.translate((W - bev * 2) / 2, 0, 0);
    if (tired) {
      // Dents: push the left flank in around two impacts.
      const pos = bodyGeo.attributes.position;
      const hits = [new THREE.Vector3(W / 2, 0.6, -0.9 + random() * 0.4), new THREE.Vector3(W / 2, 0.55, 1.5)];
      for (let i = 0; i < pos.count; i++) {
        const p = new THREE.Vector3().fromBufferAttribute(pos, i);
        for (const h of hits) { const d = p.distanceTo(h); if (d < 0.45 && p.x > 0.4) p.x -= (1 - d / 0.45) * 0.09; }
        pos.setXYZ(i, p.x, p.y, p.z);
      }
      bodyGeo.computeVertexNormals();
    }
    b.add(black, bodyGeo);
    // Cabin: yellow roof on slim pillars, glass between, seats and dash inside.
    const belt = 0.92, roofY = 1.42, ws0 = 0.72, ws1 = 0.3, rw0 = -1.0, rw1 = -0.72, cw = 1.3;
    const roofShape = new THREE.Shape();
    roofShape.moveTo(rw1, 0); roofShape.lineTo(ws1, 0); roofShape.quadraticCurveTo(ws1 + 0.06, 0.02, ws1 + 0.04, 0.05); roofShape.lineTo(rw1 - 0.04, 0.05); roofShape.closePath();
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: cw - 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 3 });
    roofGeo.rotateY(-Math.PI / 2); roofGeo.translate((cw - 0.1) / 2, roofY - 0.02, 0);
    b.add(yellow, roofGeo);
    for (const sx of [-1, 1]) {
      const x = sx * cw / 2;
      b.rod(yellow, [x, belt, ws0], [x * 0.96, roofY, ws1], 0.035, 6);
      b.rod(yellow, [x, belt, -0.18], [x * 0.96, roofY, -0.16], 0.04, 6);
      b.rod(yellow, [x, belt, rw0], [x * 0.96, roofY, rw1], 0.06, 6);
      b.box(chrome, [0.02, 0.02, 1.7], [x + sx * 0.01, belt + 0.01, -0.14]);
    }
    b.rod(yellow, [-cw / 2, belt, ws0], [cw / 2, belt, ws0], 0.03, 4);
    // Glass: windscreen, rear window, side panes.
    const pane = (corners: V3[]) => {
      const g = new THREE.BufferGeometry();
      const [p0, p1, p2, p3] = corners;
      g.setAttribute('position', new THREE.Float32BufferAttribute([...p0, ...p1, ...p2, ...p0, ...p2, ...p3], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2));
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, glass); m.castShadow = false; s.root.add(m);
    };
    pane([[cw / 2, belt, ws0], [-cw / 2, belt, ws0], [-cw / 2 * 0.96, roofY, ws1], [cw / 2 * 0.96, roofY, ws1]]);
    pane([[-cw / 2, belt, rw0], [cw / 2, belt, rw0], [cw / 2 * 0.96, roofY, rw1], [-cw / 2 * 0.96, roofY, rw1]]);
    for (const sx of [-1, 1]) {
      const x0 = sx * cw / 2, x1 = sx * cw / 2 * 0.96;
      pane([[x0, belt, ws0], [x0, belt, rw0], [x1, roofY, rw1], [x1, roofY, ws1]]);
    }
    b.box(s.material('#1c1c1e'), [cw - 0.06, 0.12, 0.25], [0, belt + 0.02, 0.58]);
    b.add(rubber, new THREE.TorusGeometry(0.17, 0.015, 6, 20), [-0.33, belt + 0.12, 0.42], [-0.9, 0, 0]);
    for (const z of [-0.05, -0.75]) { b.box(vinyl, [cw - 0.1, 0.2, 0.5], [0, 0.6, z]); b.box(vinyl, [cw - 0.1, 0.5, 0.12], [0, 0.88, z - 0.25]); }
    // Bumpers, grille, lamps.
    for (const [z, dir] of [[1.99, 1], [-1.99, -1]] as const) {
      const bump = new THREE.CapsuleGeometry(0.055, W - 0.05, 4, 8).rotateZ(Math.PI / 2);
      b.add(chrome, bump, [0, 0.38, z], [0, 0, tired && dir > 0 ? 0.06 : 0]);
      for (const sx of [-1, 1]) b.cyl(chrome, 0.03, 0.03, 0.14, [sx * 0.35, 0.47, z - dir * 0.02], 8);
    }
    for (let k = 0; k < 5; k++) b.box(chrome, [0.62, 0.018, 0.03], [0, 0.5 + k * 0.045, 1.965]);
    b.box(chrome, [0.66, 0.24, 0.02], [0, 0.59, 1.95]);
    const headMat = s.material('#f6f2e2', { emissive: '#ffe8b0', emissiveIntensity: lampOn, roughness: 0.2 });
    const brokenMat = s.material('#3a3a38', { roughness: 0.6 });
    for (const sx of [-1, 1]) {
      b.add(chrome, new THREE.TorusGeometry(0.1, 0.018, 6, 18), [sx * 0.52, 0.64, 1.93]);
      b.add(tired && sx < 0 ? brokenMat : headMat, new THREE.CylinderGeometry(0.09, 0.09, 0.04, 16), [sx * 0.52, 0.64, 1.93], [Math.PI / 2, 0, 0]);
      b.box(s.material('#e0a020', { emissive: '#ff9a20', emissiveIntensity: lampOn * 0.5 }), [0.1, 0.05, 0.03], [sx * 0.52, 0.47, 1.95]);
      b.box(s.material('#b01818', { emissive: '#ff2010', emissiveIntensity: lampOn }), [0.1, 0.14, 0.03], [sx * 0.6, 0.66, -1.96]);
    }
    // Wheels with chrome hubcaps.
    const wheels: THREE.BufferGeometry[] = [];
    for (const wz of [1.22, -1.26]) for (const sx of [-1, 1]) {
      b.add(rubber, new THREE.CylinderGeometry(wheelR, wheelR, 0.17, 18), [sx * 0.62, wheelR, wz], [0, 0, Math.PI / 2]);
      wheels.push(b.add(chrome, new THREE.CylinderGeometry(0.15, 0.17, 0.04, 16), [sx * 0.71, wheelR, wz], [0, 0, Math.PI / 2]));
    }
    void wheels;
    // Door handles and the rain gutter.
    for (const sx of [-1, 1]) for (const z of [0.3, -0.5]) b.box(chrome, [0.02, 0.025, 0.12], [sx * (W / 2 + 0.01), 0.82, z]);
    // Roof carrier rack.
    const rack = s.material('#26282a', { roughness: 0.5, metalness: 0.6 });
    for (const sx of [-1, 1]) b.box(rack, [0.03, 0.03, 1.1], [sx * 0.56, roofY + 0.14, -0.22]);
    for (let k = 0; k < 5; k++) b.box(rack, [1.14, 0.025, 0.025], [0, roofY + 0.14, -0.72 + k * 0.25]);
    for (const sx of [-1, 1]) for (const z of [-0.72, 0.28]) b.box(rack, [0.03, 0.12, 0.03], [sx * 0.56, roofY + 0.08, z]);
    // The fare meter on the near-side fender, flag up or down.
    const meterBody = s.material('#2a2c30', { roughness: 0.5, metalness: 0.3 });
    b.box(meterBody, [0.14, 0.18, 0.1], [0.62, 0.98, 0.95]);
    b.rod(chrome, [0.62, 0.84, 0.95], [0.62, 0.9, 0.95], 0.015);
    const flagMat = s.material('#c8202a', { roughness: 0.5 });
    if (a.meter === 'up') { b.rod(chrome, [0.69, 1.0, 0.95], [0.69, 1.34, 0.95], 0.008); b.box(flagMat, [0.012, 0.11, 0.16], [0.7, 1.28, 0.88]); }
    else { b.rod(chrome, [0.69, 1.0, 0.95], [0.69, 0.84, 0.98], 0.008); b.box(flagMat, [0.012, 0.11, 0.16], [0.7, 0.86, 1.04]); }
    // The hand-painted number plate, front and back.
    const num = `MH 01 ${['T', 'J', 'D', 'A'][Math.floor(random() * 4)]} ${1000 + Math.floor(random() * 8999)}`;
    const plateMap = canvasTexture(256, 64, (c) => {
      c.fillStyle = '#f2d21e'; c.fillRect(0, 0, 256, 64);
      c.strokeStyle = '#1a1a1a'; c.lineWidth = 4; c.strokeRect(3, 3, 250, 58);
      c.fillStyle = '#121212'; c.font = 'bold 38px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.save(); c.translate(128, 34); c.rotate((random() - 0.5) * 0.04); c.fillText(num, 0, 0, 236); c.restore();
    }, false);
    const plateMat = new THREE.MeshStandardMaterial({ map: plateMap, roughness: 0.6 });
    for (const [z, rot] of [[2.06, 0], [-2.06, Math.PI]] as const) { const pl = s.mesh(new THREE.PlaneGeometry(0.46, 0.115), plateMat, [0, 0.27, z]); pl.rotation.y = rot; pl.castShadow = false; }

    // Decoration.
    const beads: { at: V3; size: number; color: string }[] = [];
    if (a.decor === 'marigold') {
      for (let i = 0; i <= 26; i++) { const t = i / 26; beads.push({ at: [-0.55 + t * 1.1, belt + 0.18 - Math.sin(t * Math.PI) * 0.12, 0.62 - Math.sin(t * Math.PI) * 0.03], size: 0.03, color: i % 3 === 0 ? '#f6c21a' : '#f28a12' }); }
      b.cyl(s.material('#d4a537', { metalness: 0.7, roughness: 0.3 }), 0.025, 0.03, 0.07, [0.15, belt + 0.12, 0.58], 8);
      b.add(s.material('#d4a537', { metalness: 0.7, roughness: 0.3 }), new THREE.SphereGeometry(0.025, 8, 6), [0.15, belt + 0.18, 0.58]);
    } else if (a.decor === 'charm') {
      b.rod(s.material('#2a2420'), [0.3, 0.38, 2.04], [0.3, 0.22, 2.06], 0.003, 3);
      b.add(s.material('#cfdc3a', { roughness: 0.5 }), new THREE.SphereGeometry(0.03, 10, 8), [0.3, 0.2, 2.06], [0, 0, 0], [1, 1.2, 1]);
      for (let k = 0; k < 5; k++) b.add(s.material('#2f8a2a', { roughness: 0.5 }), new THREE.ConeGeometry(0.008, 0.07, 5), [0.3 + (k - 2) * 0.012, 0.14 - Math.abs(k - 2) * 0.006, 2.06], [Math.PI, 0, (k - 2) * 0.2]);
    } else {
      b.box(s.material('#d8e0e8'), [0.1, 0.06, 0.005], [0.45, belt + 0.06, -0.99]);
    }
    // Suitcases roped to the rack.
    if (a.state === 'loaded') {
      const cols = ['#6a3a22', '#2a4a6a', '#8a2a2a', '#3a5a3a', '#b8925a', '#4a4a4a'];
      let z = -0.68;
      while (z < 0.25) {
        const d = 0.22 + random() * 0.14, h = 0.5 + random() * 0.25;
        b.box(s.material(cols[Math.floor(random() * cols.length)], { roughness: 0.7 }), [h + 0.3, 0.2 + random() * 0.08, d], [(random() - 0.5) * 0.1, roofY + 0.27, z + d / 2]);
        if (random() < 0.6) b.box(s.material(cols[Math.floor(random() * cols.length)]), [0.5, 0.16, d * 0.9], [(random() - 0.5) * 0.3, roofY + 0.45, z + d / 2]);
        z += d + 0.02;
      }
      const rope = s.material('#d8c08a', { roughness: 0.9 });
      for (const rz of [-0.5, -0.1, 0.18]) b.add(rope, new THREE.TorusGeometry(0.62, 0.012, 4, 24, Math.PI), [0, roofY + 0.14, rz], [0, 0, 0], [1, 0.6, 1]);
      b.box(s.material('#2a6aa8', { roughness: 0.8 }), [0.9, 0.04, 1.0], [0, roofY + 0.56, -0.2]);
    }
    b.flush(s);
    if (beads.length) s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff', { roughness: 0.7 }), beads).castShadow = false;

    // The dust sheet over the last one.
    if (a.state === 'sheeted') {
      const sheet = s.material(new THREE.Color('#cfc6b2').lerp(new THREE.Color('#9a9080'), mood.wear * 0.6), { roughness: 0.95, side: THREE.DoubleSide });
      s.drape({ size: [3.2, 5.6], at: [0, 2.2, 0], over: [{ box: [W, 0.62, 3.9], at: [0, 0.6, 0] }, { box: [1.46, 0.76, 1.84], at: [0, 1.22, -0.2] }], floor: 0, stiffness: 0.5, rumple: 0.5, detail: 34 }, sheet);
      const dust = s.material('#b8ab8e', { roughness: 1 });
      for (let i = 0; i < 8; i++) s.ball([0.4 + random() * 0.6, 0.01, 0.2 + random() * 0.4], [(random() - 0.5) * 2.6, 0.005, (random() - 0.5) * 4.6], dust, 10).castShadow = false;
    }
    // The dozing driver.
    const people: ReturnType<typeof figure>[] = [];
    if (a.driver && a.state !== 'sheeted') {
      const p = figure(s, { height: 1.66, pose: 'sitting', style: 'doll', hair: 'short', top: '#e8e2d4', bottom: '#3a3a3a', skin: '#8a5a3c', sleeves: 'short' });
      s.root.add(p.root);
      p.joints.neck.rotation.set(-0.5, 0.3, 0.25);
      p.joints.spine.rotation.x = -0.15;
      p.measure();
      const pelvis = new THREE.Vector3();
      p.root.updateMatrixWorld(true);
      p.pelvis.getWorldPosition(pelvis);
      p.root.position.set(-0.33 - pelvis.x, 0.66 - p.hipHeight, -0.05 - pelvis.z);
      people.push(p);
    }
    // Rain beading and a wet patch.
    const drops: THREE.InstancedMesh | null = a.rain ? s.scatter(new THREE.BoxGeometry(0.008, 0.25, 0.008), new THREE.MeshBasicMaterial({ color: '#e0e8f0', transparent: true, opacity: 0.5, depthWrite: false }), Array.from({ length: 260 }, () => ({ at: [(random() - 0.5) * 3, random() * 2.6, (random() - 0.5) * 5.5] as V3, size: 1 }))) : null;
    if (drops) {
      drops.castShadow = false;
      const puddle = s.mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshStandardMaterial({ color: '#6a7078', transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.5, depthWrite: false }), [0, 0.004, 0]);
      puddle.rotation.x = -Math.PI / 2; puddle.scale.set(1.5, 2.6, 1); puddle.castShadow = false;
    }

    s.root.rotation.y = -0.52;
    return s.finish({
      update: (dt, time) => {
        for (const p of people) p.update(dt * 0.4, time * 0.4);
        if (drops) drops.position.y = -((time * mix(2, 6, mood.energy)) % 0.6);
      },
    });
  },
});
