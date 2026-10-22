import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { concrete, lampGlow } from './util';

function ringOf(s: Sculpture, geometry: THREE.BufferGeometry, material: THREE.Material, count: number, radius: number, y: number, phase = 0) {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < count; i++) {
    const angle = phase + (i / count) * Math.PI * 2;
    turn.setFromAxisAngle(up, angle);
    matrix.compose(new THREE.Vector3(Math.sin(angle) * radius, y, Math.cos(angle) * radius), turn, one);
    mesh.setMatrixAt(i, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  s.root.add(mesh);
  return mesh;
}

function banded(random: () => number, kind: 'stain' | 'stone', tone: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  if (kind === 'stain') {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#e9e4d2'); g.addColorStop(0.45, '#cfc6a8'); g.addColorStop(0.8, '#8f8a66'); g.addColorStop(1, '#4f5a44');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = random() > 0.5 ? 'rgba(60,52,36,0.35)' : 'rgba(255,252,240,0.5)';
      ctx.fillRect(0, random() * 256, 256, 1 + random() * 5);
    }
  } else {
    ctx.fillStyle = tone; ctx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const shade = 0.08 * (random() - 0.5);
      ctx.fillStyle = shade > 0 ? `rgba(255,255,255,${shade * 3})` : `rgba(0,0,0,${-shade * 3})`;
      ctx.fillRect(col * 32 + (row % 2) * 16, row * 32, 32, 32);
      ctx.strokeStyle = 'rgba(50,44,34,0.5)'; ctx.lineWidth = 2;
      ctx.strokeRect(col * 32 + (row % 2) * 16, row * 32, 32, 32);
      if (row % 2) ctx.strokeRect(col * 32 + 16 - 256, row * 32, 32, 32);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    style: choice('What style was the tower built in?', {
      deco: 'Art deco: cream concrete with vertical fins, stepped shoulders and a green copper dome.',
      brutalist: 'Brutalist: a raw grey drum under a flaring mushroom cap with a slot of dark glass.',
      castle: 'Castle revival: coursed stone, battlements on corbels and a conical slate roof.',
      rotunda: 'Classical waterworks: a white colonnaded rotunda under a pale dome.',
    }),
    drawdown: score('How much of the shaft has the falling water exposed?', ['None, the reservoir is brim full', 'A pale band a metre or two tall', 'Half the shaft, striped with old shorelines', 'Drought: a tall bleached column with the intake grilles showing']),
    bridge: choice('What is left of the footbridge?', {
      truss: 'A short steel truss stub ending on one pier in the water.',
      arch: 'A concrete deck on a slender pier with a solid parapet.',
      broken: 'Snapped: a few metres of deck hang from the tower and a lone pier stands apart.',
      none: 'No bridge at all, only a door that opens on to the air; the keeper comes by boat.',
    }),
    lantern: noul('Is the lantern on top lit?'),
    birds: choice('What birds are on it?', {
      none: 'None.',
      cormorants: 'Black cormorants along the gallery rail, wings hung out to dry.',
      gulls: 'White gulls wheeling round the cap.',
      stork: 'A stork standing on a big stick nest on the roof.',
    }),
    surface: choice('What is the water around it like?', {
      mirror: 'Dark and perfectly still.',
      ripples: 'Rings of ripples spreading from the shaft.',
      ice: 'Frozen over, white, cracked, with a dark ring of open water at the tower.',
      bloom: 'Thick green with algae.',
    }),
    boat: noul('Is a small boat tied up at the foot of the tower?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const E = a.drawdown * 11;          // exposed shaft below the old full level
    const deck = E + 4.5, eaves = E + 9.5;
    const tone = { deco: '#d8cfb8', brutalist: '#a8a69c', castle: '#b3a78d', rotunda: '#e1dccf' }[a.style];
    const body = a.style === 'castle'
      ? new THREE.MeshStandardMaterial({ map: banded(random, 'stone', tone), roughness: 0.95 })
      : concrete(random, mood.wear, tone, 1);
    if (body.map) body.map.repeat.set(a.style === 'castle' ? 5 : 3, a.style === 'castle' ? 4 : 1);
    const plain = s.material(tone, { roughness: 0.9 });
    const dark = s.material('#2a2f33', { metalness: 0.4, roughness: 0.5 });
    const glow = lampGlow(mood.daylight);
    const pane = s.material('#1f2a30', { roughness: 0.25, emissive: '#ffcf7a', emissiveIntensity: glow * 0.35 * (1 - mood.wear * 0.8) });

    // The low disc of water the tower stands in.
    const waterColour = { mirror: new THREE.Color().setHSL(mix(0.58, 0.5, mood.warmth), 0.4, 0.27), ripples: new THREE.Color().setHSL(mix(0.57, 0.5, mood.warmth), 0.42, 0.36), ice: new THREE.Color('#e8eff2'), bloom: new THREE.Color('#4f7a52') }[a.surface];
    const water = new THREE.MeshStandardMaterial({ color: waterColour, roughness: a.surface === 'mirror' ? 0.08 : 0.4, metalness: 0.1 });
    s.cylinder(8, 8, 0.5, [0, -0.25, 0], water, 48);
    const rings: THREE.Mesh[] = [];
    if (a.surface === 'ripples') {
      const light = new THREE.MeshStandardMaterial({ color: waterColour.clone().offsetHSL(0, 0, 0.2), roughness: 0.3 });
      for (let i = 0; i < 4; i++) { const ring = s.ring(3.8 + i * 1.1, 0.06, [0, 0.01, 0], light); ring.rotation.x = Math.PI / 2; rings.push(ring); }
    } else if (a.surface === 'ice') {
      s.cylinder(4.3, 4.3, 0.04, [0, 0.0, 0], new THREE.MeshStandardMaterial({ color: '#31485a', roughness: 0.1 }), 32);
      const crack = new THREE.MeshStandardMaterial({ color: '#7f97a6', roughness: 0.6 });
      for (let i = 0; i < 7; i++) {
        const angle = random() * Math.PI * 2, r0 = 4.4, r1 = 5.5 + random() * 2.3;
        s.rod([Math.sin(angle) * r0, 0.01, Math.cos(angle) * r0], [Math.sin(angle + 0.3 * (random() - 0.5)) * r1, 0.01, Math.cos(angle) * r1], 0.05, crack);
      }
    } else if (a.surface === 'bloom') {
      const scum = new THREE.MeshStandardMaterial({ color: '#8fae4a', roughness: 0.9 });
      for (let i = 0; i < 9; i++) { const angle = random() * 6.28, r = 3.8 + random() * 3.4; s.cylinder(0.6 + random(), 0.6 + random(), 0.03, [Math.sin(angle) * r, 0.005, Math.cos(angle) * r], scum, 12).scale.z = 0.5; }
    }

    // Shaft, with the bathtub rings of old shorelines where the level has fallen.
    const rBase = a.style === 'castle' ? 3.4 : 3;
    s.cylinder(3, rBase, deck + 0.3, [0, (deck + 0.3) / 2 - 0.3, 0], body, 40);
    if (E > 0.3) {
      const stain = new THREE.MeshStandardMaterial({ map: banded(random, 'stain', tone), roughness: 1 });
      s.cylinder(3.03 + (rBase - 3) * (1 - E / (deck + 0.3)), rBase + 0.03, E, [0, E / 2, 0], stain, 40);
      s.cylinder(3.7, 3.9, 0.5, [0, 0.2, 0], stain, 40);
      if (E > 6) ringOf(s, new THREE.BoxGeometry(1.3, 2.2, 0.2), dark, 6, rBase + 0.02, 2.2, 0.3);
    }

    // Gallery at bridge level.
    s.cylinder(4, 3.6, 0.35, [0, deck, 0], plain, 40);
    ringOf(s, new THREE.BoxGeometry(0.06, 1, 0.06), dark, 20, 3.85, deck + 0.65);
    for (const y of [deck + 1.15, deck + 0.7]) s.ring(3.85, 0.035, [0, y, 0], dark).rotation.x = Math.PI / 2;
    s.box([0.15, 2.1, 1.1], [a.style === 'rotunda' ? 1.65 : 2.72, deck + 1.2, 0], dark);

    // The upper house and its cap, by style.
    let top = eaves;
    if (a.style === 'deco') {
      s.cylinder(2.7, 2.7, 5, [0, deck + 2.5, 0], body, 40);
      ringOf(s, new THREE.BoxGeometry(0.35, 5.4, 0.4), plain, 12, 2.72, deck + 2.7, Math.PI / 12);
      ringOf(s, new THREE.BoxGeometry(0.28, 3, 0.1), pane, 12, 2.68, deck + 3);
      s.cylinder(3.05, 3.05, 0.45, [0, eaves + 0.2, 0], plain, 40);
      s.cylinder(2.55, 2.55, 0.5, [0, eaves + 0.65, 0], plain, 40);
      const copper = s.material(new THREE.Color('#9a5a34').lerp(new THREE.Color('#5fa593'), 0.55 + mood.wear * 0.45), { metalness: 0.3, roughness: 0.6 });
      s.mesh(new THREE.SphereGeometry(2.3, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), copper, [0, eaves + 0.9, 0]);
      ringOf(s, new THREE.BoxGeometry(0.08, 0.08, 2.3), copper, 12, 1.1, eaves + 2.75).visible = false;
      top = eaves + 3.2;
    } else if (a.style === 'brutalist') {
      s.cylinder(2.4, 2.4, 5, [0, deck + 2.5, 0], body, 40);
      s.cylinder(2.43, 2.43, 0.6, [0, deck + 3.6, 0], pane, 40);
      s.cylinder(4.4, 2.4, 1.6, [0, eaves - 0.8, 0], body, 40);
      s.cylinder(4.4, 4.4, 0.7, [0, eaves + 0.35, 0], plain, 40);
      s.box([1.6, 0.7, 1.2], [-1.6, eaves + 1.05, -0.8], plain);
      s.rod([-2, eaves + 1.4, -1], [-2, eaves + 4.2, -1], 0.04, dark);
      top = eaves + 0.7;
    } else if (a.style === 'castle') {
      s.cylinder(2.8, 2.8, 5, [0, deck + 2.5, 0], body, 40);
      ringOf(s, new THREE.BoxGeometry(0.22, 1.6, 0.1), pane, 8, 2.78, deck + 3);
      ringOf(s, new THREE.BoxGeometry(0.35, 0.6, 0.6), plain, 20, 2.95, eaves - 0.3);
      s.cylinder(3.3, 3.3, 0.4, [0, eaves + 0.2, 0], plain, 40);
      ringOf(s, new THREE.BoxGeometry(0.75, 0.9, 0.4), plain, 12, 3.1, eaves + 0.85);
      const slate = s.material('#4a5560', { roughness: 0.7 });
      s.cylinder(1.9, 2.6, 0.5, [0, eaves + 0.65, 0], body, 32);
      s.cylinder(0.5, 2.3, 3.2, [0, eaves + 2.5, 0], slate, 32);
      top = eaves + 4.1;
    } else {
      s.cylinder(1.7, 1.7, 5, [0, deck + 2.5, 0], body, 32);
      ringOf(s, new THREE.CylinderGeometry(0.24, 0.28, 4.6, 12), plain, 10, 2.65, deck + 2.5);
      ringOf(s, new THREE.BoxGeometry(0.4, 2.2, 0.1), pane, 5, 1.68, deck + 2.6, 0.3);
      s.cylinder(3.15, 3, 0.6, [0, eaves - 0.1, 0], plain, 40);
      s.cylinder(2.5, 2.5, 0.6, [0, eaves + 0.5, 0], plain, 40);
      s.mesh(new THREE.SphereGeometry(2.4, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), s.material(mood.wear > 0.5 ? '#9fb0a8' : '#d9d6cc', { roughness: 0.5 }), [0, eaves + 0.8, 0]);
      top = eaves + 3.15;
    }

    // Lantern, or the stork that has taken its place.
    const lamp = s.material(a.lantern ? '#fff0b8' : '#49545a', { emissive: a.lantern ? '#ffc861' : '#000000', emissiveIntensity: a.lantern ? 1.2 + glow : 0, roughness: 0.3 });
    if (a.birds === 'stork') {
      const sticks = s.material('#6a5338');
      s.cylinder(1.3, 0.9, 0.5, [0, top + 0.2, 0], sticks, 10);
      for (let i = 0; i < 8; i++) { const angle = random() * 6.28; s.rod([Math.sin(angle) * 1.5, top + 0.3 + random() * 0.2, Math.cos(angle) * 1.5], [-Math.sin(angle + 1) * 1.3, top + 0.35, -Math.cos(angle + 1) * 1.3], 0.04, sticks); }
      const white = s.material('#f1f1ea'), red = s.material('#d2452c');
      for (const x of [-0.08, 0.08]) s.rod([x, top + 0.45, 0], [x, top + 1.35, 0], 0.025, red);
      s.ball([0.22, 0.2, 0.42], [0, top + 1.5, 0], white, 10);
      s.ball([0.12, 0.1, 0.2], [0, top + 1.45, -0.38], dark, 8);
      s.rod([0, top + 1.55, 0.3], [0, top + 2.1, 0.42], 0.05, white);
      s.ball([0.09, 0.09, 0.11], [0, top + 2.15, 0.45], white, 8);
      s.rod([0, top + 2.13, 0.52], [0, top + 2.02, 0.95], 0.03, red, 0.005);
      s.box([0.5, 0.6, 0.5], [2.2, deck + 0.6, 2.2], lamp);
    } else {
      s.cylinder(0.5, 0.6, 0.3, [0, top + 0.15, 0], plain, 12);
      s.cylinder(0.42, 0.42, 0.9, [0, top + 0.75, 0], lamp, 12);
      ringOf(s, new THREE.BoxGeometry(0.05, 0.9, 0.05), dark, 6, 0.44, top + 0.75);
      s.cylinder(0.05, 0.6, 0.5, [0, top + 1.45, 0], dark, 12);
      s.rod([0, top + 1.6, 0], [0, top + 2.5, 0], 0.03, dark);
    }

    // Footbridge stub toward +x.
    if (a.bridge !== 'none') {
      const steel = s.material(new THREE.Color('#566a63').lerp(new THREE.Color('#7a4a2c'), mood.wear * 0.6), { metalness: 0.3 });
      const far = a.bridge === 'broken' ? 5.3 : 7.7, pierAt = a.bridge === 'broken' ? 7 : 6.8;
      const length = far - 3.7;
      const deckMesh = s.box([length, 0.25, 1.5], [3.7 + length / 2, deck + 0.05, 0], a.bridge === 'truss' ? steel : plain);
      if (a.bridge === 'broken') {
        const hanging = s.box([2, 0.25, 1.5], [far + 0.75, deck - 0.75, 0], plain);
        hanging.rotation.z = -1.0;
        s.rod([far, deck, 0.5], [far + 0.9, deck - 1.6, 0.6], 0.03, dark);
        deckMesh.rotation.z = -0.03;
      }
      s.cylinder(0.5, 0.65, deck + 0.1, [pierAt, (deck - 0.1) / 2 - 0.1, 0], plain, 14);
      s.box([1.4, 0.3, 1.9], [pierAt, deck - 0.2 - (a.bridge === 'broken' ? 0.1 : 0), 0], plain);
      for (const z of [-0.7, 0.7]) {
        if (a.bridge === 'truss') {
          s.box([length, 0.08, 0.08], [3.7 + length / 2, deck + 1.3, z], steel);
          const n = 5;
          for (let i = 0; i < n; i++) {
            const x0 = 3.7 + (i * length) / n, x1 = 3.7 + ((i + 1) * length) / n;
            s.rod([x0, deck + 0.15, z], [(x0 + x1) / 2, deck + 1.3, z], 0.035, steel);
            s.rod([(x0 + x1) / 2, deck + 1.3, z], [x1, deck + 0.15, z], 0.035, steel);
          }
        } else if (a.bridge === 'arch') {
          s.box([length, 1, 0.14], [3.7 + length / 2, deck + 0.65, z], plain);
        } else {
          s.box([length, 0.06, 0.06], [3.7 + length / 2, deck + 1.1, z], dark);
          for (let i = 0; i < 3; i++) s.box([0.06, 1, 0.06], [3.9 + i * 0.8, deck + 0.6, z], dark);
        }
      }
    }

    if (a.boat) {
      const hull = s.material(mood.cheer > 0.5 ? '#c9502f' : '#5b6b6d');
      const angle = -0.9 + random() * 0.6, r = rBase + 1.6;
      const boat = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), hull);
      shell.scale.set(0.75, 0.5, 1.9); shell.position.y = 0.42; shell.castShadow = true;
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.3), s.material('#c8b48a')); bench.position.y = 0.4;
      boat.add(shell, bench);
      boat.position.set(Math.sin(angle) * r, a.surface === 'ice' ? 0.05 : -0.05, Math.cos(angle) * r);
      boat.rotation.y = angle + Math.PI / 2 + (random() - 0.5) * 0.5;
      s.root.add(boat);
      s.rod([Math.sin(angle) * rBase, 0.9, Math.cos(angle) * rBase], [boat.position.x, 0.4, boat.position.z], 0.02, dark);
    }

    const flock = new THREE.Group();
    s.root.add(flock);
    if (a.birds === 'cormorants') {
      const black = s.material('#1d2224');
      const count = 3 + Math.floor(random() * 4);
      for (let i = 0; i < count; i++) {
        const angle = 0.5 + random() * 4.5;
        const bird = new THREE.Group();
        const part = (geometry: THREE.BufferGeometry, x: number, y: number, z: number, rz = 0) => { const m = new THREE.Mesh(geometry, black); m.position.set(x, y, z); m.rotation.z = rz; m.castShadow = true; bird.add(m); };
        part(new THREE.SphereGeometry(0.2, 8, 6).scale(1, 1.7, 0.9), 0, 0.35, 0);
        part(new THREE.CylinderGeometry(0.05, 0.07, 0.4, 6), 0, 0.82, 0.05);
        part(new THREE.SphereGeometry(0.08, 6, 5).scale(1, 1, 1.8), 0, 1.04, 0.1);
        if (random() > 0.35) { part(new THREE.BoxGeometry(0.6, 0.34, 0.04), -0.42, 0.5, 0, -0.5); part(new THREE.BoxGeometry(0.6, 0.34, 0.04), 0.42, 0.5, 0, 0.5); }
        bird.position.set(Math.sin(angle) * 3.85, deck + 1.18, Math.cos(angle) * 3.85);
        bird.rotation.y = angle;
        bird.scale.setScalar(1.25);
        s.root.add(bird);
      }
    } else if (a.birds === 'gulls') {
      const white = s.material('#f4f4ef');
      const count = 5 + Math.floor(random() * 5);
      for (let i = 0; i < count; i++) {
        const angle = random() * 6.28, r = 3.8 + random() * 3;
        const bird = new THREE.Group();
        for (const side of [-1, 1]) { const wing = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.04, 0.26), white); wing.position.x = side * 0.34; wing.rotation.z = side * 0.35; wing.castShadow = true; bird.add(wing); }
        const bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5).scale(1, 1, 2.6), white); bird.add(bodyMesh);
        bird.position.set(Math.sin(angle) * r, eaves - 2 + random() * 6, Math.cos(angle) * r);
        bird.rotation.y = angle + Math.PI / 2;
        bird.scale.setScalar(1.5);
        flock.add(bird);
      }
    }

    const speed = mix(0.05, 0.6, mood.energy);
    return s.finish({
      footprint: 8,
      update: (dt, time) => {
        flock.rotation.y += dt * speed;
        rings.forEach((ring, index) => ring.scale.setScalar(1 + 0.04 * Math.sin(time * (0.6 + speed * 3) - index)));
        if (a.lantern) lamp.emissiveIntensity = 1.2 + glow + Math.sin(time * 2.3) * 0.15 * mood.energy;
      },
    });
  },
});
