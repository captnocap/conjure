import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Pattern = 'gores' | 'coded' | 'bullseye' | 'plain' | 'checker';

function canopyTexture(random: () => number, pattern: Pattern, fade: number, sandHex: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const orange = '#e4571e', white = '#f3efe4', red = '#c9302a';
  const wedges = 24, rings = pattern === 'coded' ? 4 : pattern === 'checker' ? 5 : pattern === 'bullseye' ? 5 : 1;
  for (let ring = rings - 1; ring >= 0; ring--) {
    const outer = 250 * (ring + 1) / rings;
    for (let w = 0; w < wedges; w++) {
      let colour = white;
      if (pattern === 'gores') colour = w % 2 ? orange : white;
      if (pattern === 'coded') colour = random() < 0.48 ? orange : white;
      if (pattern === 'bullseye') colour = ring % 2 ? white : red;
      if (pattern === 'checker') colour = (w + ring) % 2 ? red : white;
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.moveTo(256, 256);
      ctx.arc(256, 256, outer, (w / wedges) * Math.PI * 2, ((w + 1) / wedges) * Math.PI * 2 + 0.01);
      ctx.fill();
    }
  }
  // Seams, the gap band and the vent.
  ctx.strokeStyle = 'rgba(60,50,40,0.35)';
  ctx.lineWidth = 1.5;
  for (let w = 0; w < wedges; w++) {
    ctx.beginPath();
    ctx.moveTo(256, 256);
    ctx.lineTo(256 + Math.cos((w / wedges) * Math.PI * 2) * 250, 256 + Math.sin((w / wedges) * Math.PI * 2) * 250);
    ctx.stroke();
  }
  ctx.strokeStyle = sandHex;
  ctx.lineWidth = 12;
  ctx.beginPath(); ctx.arc(256, 256, 196, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = sandHex;
  ctx.beginPath(); ctx.arc(256, 256, 20, 0, Math.PI * 2); ctx.fill();
  // Sun bleaching and dust.
  ctx.globalAlpha = fade * 0.6;
  ctx.fillStyle = '#e3c9a4';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 60 * fade; i++) {
    ctx.globalAlpha = 0.2 + random() * 0.3;
    ctx.fillStyle = sandHex;
    ctx.beginPath();
    ctx.ellipse(random() * 512, random() * 512, 10 + random() * 40, 6 + random() * 16, random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function scorchTexture(random: () => number, wear: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, '#f1ede2');
  gradient.addColorStop(0.45, '#e2d6c2');
  gradient.addColorStop(0.8, '#8a6a52');
  gradient.addColorStop(1, '#2e2520');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 40 + wear * 60; i++) {
    ctx.globalAlpha = 0.15 + random() * 0.3;
    ctx.fillStyle = random() < 0.7 ? '#3a2c24' : '#b0683f';
    const x = random() * 256, length = 20 + random() * 90;
    ctx.fillRect(x, 128 - length, 2 + random() * 5, length);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#c9302a';
  ctx.fillRect(0, 34, 256, 5);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    pattern: choice('What is the canopy pattern?', {
      gores: 'Alternating orange and white wedges, the classic.',
      coded: 'Orange and white panels in an irregular arrangement that might be a hidden message.',
      bullseye: 'Concentric red and white rings like a target.',
      plain: 'Plain white, seams and nothing else.',
      checker: 'A red and white chequerboard, loud as a racing flag.',
    }),
    drape: choice('How does the parachute lie?', {
      spread: 'Spread wide and nearly flat, a great flower on the sand.',
      streamer: 'Pulled out in one long twisted streamer.',
      bundled: 'Heaped in a crumpled pile against the shell.',
      snagged: 'Caught over the shell itself, draped on it like a dust sheet.',
    }),
    shell: choice('What state is the backshell in?', {
      intact: 'Scorched but whole, tipped over like a dropped bell.',
      cracked: 'Split open with a wedge broken out of its side.',
      shattered: 'Broken into curved petals splayed around the point of impact.',
      crushed: 'Flattened and crumpled on one side.',
    }),
    buried: score('How buried is it all?', ['Lying fresh on the surface', 'Sand drifting over the edges', 'Half swallowed by drifts', 'Only a rim of shell and a rag of fabric showing']),
    scar: choice('What mark did the impact leave?', {
      none: 'None: it settled gently.',
      ring: 'A dark blast ring of thrown soil with rays of ejecta.',
      gouge: 'A long skid gouge leading up to where it stopped.',
    }),
    visited: noul('Has someone walked out to it since, leaving bootprints and a small marker flag?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dust = new THREE.Color('#b96a3f').lerp(new THREE.Color('#d6a064'), mood.warmth * 0.5);
    const dustHex = `#${dust.getHexString()}`;
    const sand = s.material(dust, { roughness: 1 });
    const scorched = s.material(dust.clone().multiplyScalar(0.42), { roughness: 1 });
    const dark = s.material('#2a2523', { roughness: 0.8 });
    const metal = s.material('#aeb2b4', { metalness: 0.6, roughness: 0.4 });

    // The backshell: a blunt cone, open underneath.
    const shellAt = new THREE.Vector3(1.7, 0, 0);
    const shellSkin = new THREE.MeshStandardMaterial({ map: scorchTexture(random, mood.wear), roughness: 0.7, side: THREE.DoubleSide });
    const profile = [[0.0, 1.22], [0.42, 1.2], [0.5, 1.08], [1.05, 0.35], [1.32, 0.06], [1.3, 0]].map(([x, y]) => new THREE.Vector2(x, y));
    const shell = new THREE.Group();
    const piece = (from: number, sweep: number) => {
      const mesh = new THREE.Mesh(new THREE.LatheGeometry(profile, Math.max(6, Math.round(sweep * 5)), from, sweep), shellSkin);
      mesh.castShadow = mesh.receiveShadow = true;
      return mesh;
    };
    const sink = -0.08 - a.buried * 0.45;
    if (a.shell === 'shattered') {
      const petals = 4 + Math.floor(random() * 2);
      for (let i = 0; i < petals; i++) {
        const sweep = (Math.PI * 2) / petals;
        const petal = new THREE.Group();
        const part = piece(i * sweep + 0.08, sweep - 0.16);
        const out = i * sweep + sweep / 2;
        // Lathe angle phi puts the surface at (sin phi, y, cos phi).
        const fall = 0.5 + random() * 0.9;
        petal.add(part);
        petal.position.set(Math.sin(out) * (0.25 + fall * 0.5), -fall * 0.15, Math.cos(out) * (0.25 + fall * 0.5));
        petal.rotateOnAxis(new THREE.Vector3(Math.cos(out), 0, -Math.sin(out)), fall);
        petal.rotateY((random() - 0.5) * 0.4);
        shell.add(petal);
      }
      shell.position.copy(shellAt).setY(sink + 0.35);
      shell.scale.setScalar(1.5);
    } else {
      const gap = a.shell === 'cracked' ? 0.9 + random() * 0.4 : 0;
      const body = piece(0.6, Math.PI * 2 - gap);
      shell.add(body);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.22, 14), metal);
      lid.position.y = 1.28;
      lid.castShadow = true;
      shell.add(lid);
      const inside = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 1.2, 0.9, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#3b3632', roughness: 1, side: THREE.BackSide }));
      inside.position.y = 0.5;
      shell.add(inside);
      shell.scale.setScalar(1.5);
      if (a.shell === 'crushed') shell.scale.set(1.5, 0.8, 1.65);
      shell.rotation.set(0.25 + random() * 0.2, random() * 6, a.shell === 'intact' ? -0.75 - random() * 0.25 : a.shell === 'crushed' ? -0.25 : -0.5);
      shell.position.copy(shellAt).setY(sink + (a.shell === 'intact' ? 0.85 : 0.4));
      if (a.shell === 'cracked') {
        const wedge = piece(0, gap - 0.15);
        wedge.scale.setScalar(1.5);
        wedge.position.set(shellAt.x + 1.6 + random() * 0.4, sink - 0.05, 1.5 + random() * 0.4);
        wedge.rotation.set(1.9 + random() * 0.3, random() * 3, 0.4);
        s.root.add(wedge);
      }
    }
    s.root.add(shell);

    // Impact scar.
    if (a.scar === 'ring') {
      s.cylinder(2.3, 2.5, 0.02, [shellAt.x, 0.01, 0], scorched, 28).castShadow = false;
      s.ring(2.35, 0.14, [shellAt.x, 0, 0], sand).rotation.x = Math.PI / 2;
      for (let i = 0; i < 14; i++) {
        const angle = (i / 14) * Math.PI * 2 + random() * 0.3, length = 0.35 + random() * 0.8;
        const ray = s.box([length, 0.012, 0.1 + random() * 0.12], [shellAt.x + Math.cos(angle) * (2.4 + length / 2), 0.008, Math.sin(angle) * (2.4 + length / 2)], scorched);
        ray.rotation.y = -angle;
        ray.castShadow = false;
      }
    } else if (a.scar === 'gouge') {
      const heading = -0.5 + random() * 0.3, length = 4.2;
      const trench = new THREE.Group();
      trench.position.set(shellAt.x, 0, 0);
      trench.rotation.y = heading;
      s.root.add(trench);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(length, 0.02, 1.3), scorched);
      bed.position.set(length / 2, 0.01, 0);
      bed.receiveShadow = true;
      trench.add(bed);
      for (const side of [-1, 1]) {
        const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, length, 8).rotateZ(Math.PI / 2), sand);
        lip.scale.set(1, 0.7, 1.2);
        lip.position.set(length / 2, 0, side * 0.75);
        lip.castShadow = lip.receiveShadow = true;
        trench.add(lip);
      }
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.24, 8, 16, Math.PI), sand);
      bow.rotation.set(Math.PI / 2, 0, Math.PI / 2);
      bow.scale.z = 0.8;
      trench.add(bow);
    }

    // The canopy: a polar sheet whose height is re-rippled every frame.
    const radius = { spread: 2.8, streamer: 2.2, bundled: 1.6, snagged: 3.0 }[a.drape];
    const canopyAt = { spread: [-2.0, 0.5], streamer: [-2.6, 0.4], bundled: [-0.5, 0.9], snagged: [shellAt.x, 0] }[a.drape];
    const stretch = a.drape === 'streamer' ? [1.75, 0.34] : [1, 1];
    const rings = 14, spokes = 48;
    const flat: number[] = [], uv: number[] = [], index: number[] = [];
    for (let ring = 0; ring <= rings; ring++)
      for (let spoke = 0; spoke <= spokes; spoke++) {
        const r = ring / rings, theta = (spoke / spokes) * Math.PI * 2;
        // Crumpled fabric: the hem wanders in and out.
        const hem = 1 + (ring === rings ? 0 : 0) + r * 0.08 * Math.sin(theta * 7 + 1.3);
        flat.push(Math.cos(theta) * r * hem, Math.sin(theta) * r * hem);
        uv.push(0.5 + Math.cos(theta) * r * 0.488, 0.5 + Math.sin(theta) * r * 0.488);
      }
    for (let ring = 0; ring < rings; ring++)
      for (let spoke = 0; spoke < spokes; spoke++) {
        const i = ring * (spokes + 1) + spoke;
        index.push(i, i + spokes + 1, i + 1, i + 1, i + spokes + 1, i + spokes + 2);
      }
    const pleats = a.drape === 'spread' ? 9 : a.drape === 'streamer' ? 5 : 7;
    const amp = { spread: 0.16, streamer: 0.3, bundled: 0.45, snagged: 0.22 }[a.drape];
    const phase = random() * 6, billowAt = [(random() - 0.5) * 0.9, (random() - 0.5) * 0.9];
    const wind = mix(0.25, 2.6, mood.energy);
    const heightAt = (x: number, z: number, time: number) => {
      const r = Math.hypot(x, z), theta = Math.atan2(z, x);
      const pleat = Math.sin(theta * pleats + r * 5 + phase) * 0.5 + 0.5;
      let h = 0.04 + amp * pleat * (0.2 + r * 0.8);
      const billow = Math.exp(-((x - billowAt[0]) ** 2 + (z - billowAt[1]) ** 2) / 0.16);
      h += billow * (a.drape === 'bundled' ? 0.5 : 0.42) * (1 + 0.45 * Math.sin(time * wind * 1.3 + phase));
      h += 0.05 * Math.sin(x * 7 + time * wind * 2.1) * Math.sin(z * 6 - time * wind * 1.4) * mix(0.5, 1.6, mood.energy);
      if (a.drape === 'snagged') h += (a.shell === 'shattered' ? 0.7 : a.shell === 'crushed' ? 1.0 : 1.6) * Math.max(0, 1 - (x * x + z * z) * radius * radius / 4.4);
      return h;
    };
    const canopyGeometry = new THREE.BufferGeometry();
    const position = new THREE.Float32BufferAttribute(new Float32Array((flat.length / 2) * 3), 3);
    const ripple = (time: number) => {
      for (let i = 0; i < flat.length / 2; i++) {
        const x = flat[i * 2], z = flat[i * 2 + 1];
        position.setXYZ(i, x * radius * stretch[0], heightAt(x, z, time) / 1, z * radius * stretch[1]);
      }
      position.needsUpdate = true;
      canopyGeometry.computeVertexNormals();
    };
    canopyGeometry.setAttribute('position', position);
    canopyGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    canopyGeometry.setIndex(index);
    ripple(0);
    const canopy = s.mesh(canopyGeometry, new THREE.MeshStandardMaterial({ map: canopyTexture(random, a.pattern, Math.min(1, mood.wear * 0.8 + a.buried * 0.3), dustHex), roughness: 0.75, side: THREE.DoubleSide }), [canopyAt[0], 0, canopyAt[1]]);
    canopy.rotation.y = a.drape === 'streamer' ? 0.12 + (random() - 0.5) * 0.3 : random() * 6;
    canopy.frustumCulled = false;

    // Suspension lines gathered to a riser at the shell.
    const riser: [number, number, number] = [shellAt.x - 1.5, 0.12, 0.3];
    if (a.drape !== 'snagged') {
      const cord = s.material('#e9e4d6', { roughness: 0.9 });
      canopy.updateMatrixWorld(true);
      for (let i = 0; i < 12; i++) {
        const theta = (i / 12) * Math.PI * 2;
        const edge = new THREE.Vector3(Math.cos(theta) * radius * stretch[0], 0.05, Math.sin(theta) * radius * stretch[1]).applyMatrix4(canopy.matrix);
        if (edge.distanceTo(new THREE.Vector3(...riser)) > 0.3) s.rod([edge.x, 0.05, edge.z], riser, 0.012, cord);
      }
      s.rod(riser, [shellAt.x - 0.4, 0.3, 0.1], 0.03, cord);
    }

    // Drifts creep over everything as it is buried.
    const drifts = Math.round(a.buried * 7);
    for (let i = 0; i < drifts; i++) {
      const overShell = i % 3 === 0;
      const angle = random() * Math.PI * 2;
      const cx = overShell ? shellAt.x + Math.cos(angle) * 1.7 : canopyAt[0] + Math.cos(angle) * radius * stretch[0] * mix(0.3, 0.95, random());
      const cz = overShell ? Math.sin(angle) * 1.7 : canopyAt[1] + Math.sin(angle) * radius * mix(0.3, 0.95, random());
      const drift = s.ball([mix(0.7, 1.5, random()) * mix(0.7, 1.1, a.buried), mix(0.1, 0.3, a.buried) * (overShell ? 1.6 : 1), mix(0.5, 1.0, random()) * mix(0.7, 1.1, a.buried)], [cx, 0, cz], sand, 14);
      drift.rotation.y = random() * 3;
    }

    // Shards and thrown rocks.
    const shardPaint = s.material('#e8e2d4', { roughness: 0.7 });
    const bits = Math.round(mix(3, 14, mood.density)) + (a.shell === 'shattered' ? 8 : a.shell === 'intact' ? -3 : 2);
    for (let i = 0; i < bits; i++) {
      const angle = random() * Math.PI * 2, reach = 2.1 + random() * 1.6;
      const rock = random() < 0.4;
      const shard = s.mesh(rock ? new THREE.DodecahedronGeometry(0.1 + random() * 0.12, 0) : new THREE.BoxGeometry(0.15 + random() * 0.3, 0.03, 0.1 + random() * 0.2), rock ? s.material('#5b4037', { roughness: 1, flatShading: true }) : shardPaint, [shellAt.x + Math.cos(angle) * reach, rock ? 0.05 : 0.03, Math.sin(angle) * reach]);
      shard.rotation.set(random() * 0.5, random() * 6, random() * 0.5);
    }

    if (a.visited) {
      const print = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 0.012, 10), scorched, 16);
      const dummy = new THREE.Object3D();
      const startAngle = 0.9 + random() * 0.5;
      for (let i = 0; i < 16; i++) {
        const t = i / 15, d = mix(4.4, 2.5, t);
        const wobble = Math.sin(t * 5) * 0.15;
        dummy.position.set(shellAt.x + Math.cos(startAngle + wobble) * d + (i % 2 ? 0.14 : -0.14), 0.007, Math.sin(startAngle + wobble) * d);
        dummy.rotation.y = -startAngle + Math.PI / 2;
        dummy.scale.set(0.09, 1, 0.17);
        dummy.updateMatrix();
        print.setMatrixAt(i, dummy.matrix);
      }
      print.receiveShadow = true;
      s.root.add(print);
      const fx = shellAt.x + Math.cos(startAngle) * 2.3, fz = Math.sin(startAngle) * 2.3;
      s.rod([fx, 0, fz], [fx, 1.1, fz], 0.015, metal);
      const pennant = new THREE.Shape();
      pennant.moveTo(0, 0); pennant.lineTo(0.42, -0.11); pennant.lineTo(0, -0.24);
      s.mesh(new THREE.ShapeGeometry(pennant), new THREE.MeshStandardMaterial({ color: '#f2d21f', side: THREE.DoubleSide, roughness: 0.7 }), [fx, 1.1, fz]).rotation.y = 0.5;
      s.box([0.16, 0.1, 0.12], [fx + 0.2, 0.05, fz + 0.1], dark);
    }

    return s.finish({ update: (_dt, time) => ripple(time) });
  },
});
