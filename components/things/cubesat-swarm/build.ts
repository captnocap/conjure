import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const FORMATIONS = {
  pearls: 'A string of pearls: evenly spaced along one curving orbital track.',
  cloud: 'A loose shapeless cloud, drifting apart.',
  stray: 'A tight huddle, and one single stray far off on its own.',
  ring: 'A neat tilted ring, flying in formation.',
  deployer: 'Just released: a tight row sliding out of an open dispenser box.',
  lattice: 'A flat grid like a flying antenna array, drilled and exact.',
} as const;
const ALIVE = ['All dark and dead', 'Only a couple still blink', 'About half are working', 'Nearly all alive', 'Every one blinking'] as const;
const SIZES = {
  cube: 'Tiny one-unit cubes, fist sized.',
  shoebox: 'Three-unit shoeboxes, the classic.',
  slab: 'Fat six-unit slabs, twice as wide.',
  mixed: 'A mix of sizes from different builders.',
} as const;
const LIVERIES = {
  bare: 'Bare machined aluminium rails.',
  black: 'Black anodised frames, stealthy.',
  gold: 'Gold foil wrap.',
  school: 'Bright mismatched colours, like student projects.',
  white: 'White painted, clinical.',
} as const;
const ANTENNAS = {
  tape: 'Four spring-tape antennas splayed out like whiskers.',
  whip: 'A single long whip.',
  dish: 'A little unfolded umbrella dish on one end.',
  none: 'No visible antenna, only flat patches.',
} as const;
const SOLAR = {
  body: 'Solar cells on the body faces only.',
  wings: 'Two fold-out wings.',
  petals: 'Four petals opened from one end like a shuttlecock.',
} as const;
const FATES = {
  batteries: 'Flat batteries: simply dark, turning slowly.',
  collision: 'A collision: bent panels and a spray of glittering fragments.',
  frozen: 'Frozen: furred white with frost.',
  burning: 'Sinking into the atmosphere, edges starting to glow orange.',
} as const;

export default defineThing({
  questions: {
    formation: choice('What formation are they flying in?', FORMATIONS),
    alive: score('How many still blink?', ALIVE),
    size: choice('How big is each satellite?', SIZES),
    livery: choice('What are their frames like?', LIVERIES),
    antenna: choice('What antennas do they carry?', ANTENNAS),
    solar: choice('How are the solar panels arranged?', SOLAR),
    fate: choice('What happened to the dead ones?', FATES),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const jitter = (amount: number) => (random() - 0.5) * amount;
    const count = Math.round(mix(5, 15, mood.density) * { pearls: 0.9, cloud: 1, stray: 0.8, ring: 0.8, deployer: 0.5, lattice: 1.1 }[a.formation]);
    const BIG = 1.5;

    // Where each one is and which way it points.
    const sats: { position: THREE.Vector3; turn: THREE.Quaternion; scale: number; alive: boolean; axis: THREE.Vector3; rate: number }[] = [];
    // In drilled formations they stand on end like bottles; fresh from the dispenser they lie along the rail.
    const upright = new THREE.Quaternion().setFromEuler(a.formation === 'deployer' ? new THREE.Euler(0, Math.PI / 2, 0) : new THREE.Euler(-Math.PI / 2, 0, 0));
    const apart = (position: THREE.Vector3, pick: () => void) => { for (let tries = 0; tries < 40; tries++) { pick(); if (sats.every((other) => other.position.distanceTo(position) > 1.4)) return; } };
    const columns = Math.ceil(Math.sqrt(count * 1.5));
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0.5;
      const position = new THREE.Vector3();
      switch (a.formation) {
        case 'pearls': position.set((t - 0.5) * 5.2, Math.sin(t * Math.PI) * 1.2 + jitter(0.06), Math.cos(t * Math.PI) * 0.9 + jitter(0.06)); break;
        case 'cloud': apart(position, () => position.set(jitter(5.6), jitter(3), jitter(4))); break;
        case 'stray': i === 0 ? position.set(3.2, 1.4, 0.6) : apart(position, () => position.set(-1.4 + jitter(3), jitter(2.6), jitter(3))); break;
        case 'ring': position.set(Math.cos(t * Math.PI * 2 * (1 - 1 / count)) * 2.0, Math.sin(t * Math.PI * 2 * (1 - 1 / count)) * 1.0, Math.sin(t * Math.PI * 2 * (1 - 1 / count)) * 1.3); break;
        case 'deployer': position.set(-1.3 + i * 0.95 + i * i * 0.05, 0.5 + i * 0.07 + jitter(0.05) * i, jitter(0.07) * i); break;
        default: position.set((i % columns - (columns - 1) / 2) * 1.3, Math.floor(i / columns) * 0.3, Math.floor(i / columns) * -1.25);
      }
      const alive = random() < a.alive * 1.04 - 0.02;
      const messy = a.formation === 'cloud' || a.formation === 'stray' ? 1 : 0.12;
      const turn = alive
        ? upright.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(jitter(messy * 2), jitter(messy * 3), jitter(messy * 2))))
        : new THREE.Quaternion().setFromEuler(new THREE.Euler(random() * 6, random() * 6, random() * 6));
      sats.push({
        position, turn, alive,
        scale: BIG * (a.size === 'mixed' ? 0.6 + random() * 0.7 : 1),
        axis: new THREE.Vector3(jitter(1), jitter(1), jitter(1)).normalize(),
        rate: 0.3 + random() * 0.9,
      });
    }
    if (a.alive > 0.02 && a.alive < 0.98 && sats.length > 1) { sats[0].alive = a.formation === 'stray' ? false : sats[0].alive; if (!sats.some((sat) => sat.alive)) sats[sats.length - 1].alive = true; if (sats.every((sat) => sat.alive)) sats[1].alive = false; }

    const bw = a.size === 'slab' ? 0.27 : a.size === 'cube' ? 0.2 : 0.17;
    const bh = a.size === 'cube' ? 0.2 : 0.17;
    const bl = a.size === 'cube' ? 0.2 : 0.46;
    const frameTint = { bare: '#b9bec2', black: '#2a2c31', gold: '#c99a3a', school: '#ffffff', white: '#f0efe9' }[a.livery];
    const school = ['#e2452f', '#2f6fd0', '#f2b61c', '#2f9f5c', '#8a4ac8', '#f07a1c', '#1fb5b0'];
    const frame = s.material('#ffffff', { metalness: a.livery === 'white' || a.livery === 'school' ? 0.1 : 0.75, roughness: a.livery === 'gold' ? 0.35 : 0.5 });
    const cellMap = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 128;
      const c = canvas.getContext('2d')!;
      c.fillStyle = '#152554'; c.fillRect(0, 0, 64, 128);
      c.strokeStyle = '#8ea4d8'; c.lineWidth = 2;
      for (let y = 0; y <= 128; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(64, y); c.stroke(); }
      c.beginPath(); c.moveTo(32, 0); c.lineTo(32, 128); c.stroke();
      c.strokeStyle = '#c9a23a'; c.lineWidth = 3; c.strokeRect(1, 1, 62, 126);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    })();
    const cells = new THREE.MeshStandardMaterial({ map: cellMap, metalness: 0.3, roughness: 0.35, emissive: '#1a3aa0', emissiveIntensity: 0.3 });
    const dark = s.material('#1b1d21', { roughness: 0.5 });
    const steel = s.material('#d6d9dc', { metalness: 0.8, roughness: 0.35 });

    // Every part is one instanced mesh; each satellite owns a slot in each.
    type Slot = { mesh: THREE.InstancedMesh; index: number; local: THREE.Matrix4 };
    const slots: Slot[][] = sats.map(() => []);
    const cursors = new Map<THREE.InstancedMesh, number>();
    const pool = (geometry: THREE.BufferGeometry, material: THREE.Material, perSat: number) => {
      const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, sats.length * perSat));
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      s.root.add(mesh);
      cursors.set(mesh, 0);
      return mesh;
    };
    const part = (sat: number, mesh: THREE.InstancedMesh, at: [number, number, number], euler: [number, number, number] = [0, 0, 0], size: [number, number, number] = [1, 1, 1], colour?: THREE.ColorRepresentation) => {
      const index = cursors.get(mesh)!;
      cursors.set(mesh, index + 1);
      const local = new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...euler)), new THREE.Vector3(...size));
      slots[sat].push({ mesh, index, local });
      if (colour !== undefined) mesh.setColorAt(index, new THREE.Color(colour));
    };
    const unit = new THREE.BoxGeometry(1, 1, 1);
    const bodies = pool(unit, frame, 1);
    const plates = pool(unit, cells, 4);
    const wings = pool(unit, cells, a.solar === 'body' ? 0 : a.solar === 'wings' ? 2 : 4);
    const rods = pool(unit, steel, a.antenna === 'tape' ? 4 : a.antenna === 'whip' ? 1 : a.antenna === 'dish' ? 1 : 0);
    const dishes = pool(new THREE.ConeGeometry(0.16, 0.08, 10, 1, true), s.material('#e9e7df', { side: THREE.DoubleSide, roughness: 0.6 }), a.antenna === 'dish' ? 1 : 0);
    const lenses = pool(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12).rotateX(Math.PI / 2), dark, 1);
    const lamps = [0, 1, 2].map((group) => {
      const material = new THREE.MeshStandardMaterial({ color: '#d8ffe0', emissive: group === 2 ? '#ff5a30' : '#3cff78', emissiveIntensity: 2 });
      return { material, mesh: pool(new THREE.SphereGeometry(0.03, 8, 6), material, 1) };
    });
    const frostTint = new THREE.Color('#eef4f8'), deadTint = new THREE.Color('#5a5650'), burnTint = new THREE.Color('#7a3a1c');

    sats.forEach((sat, i) => {
      const base = new THREE.Color(a.livery === 'school' ? school[Math.floor(random() * school.length)] : frameTint);
      if (!sat.alive) base.lerp(a.fate === 'frozen' ? frostTint : a.fate === 'burning' ? burnTint : deadTint, a.fate === 'frozen' ? 0.85 : 0.6);
      part(i, bodies, [0, 0, 0], [0, 0, 0], [bw, bh, bl], base);
      const bent = !sat.alive && a.fate === 'collision';
      const plateTint = sat.alive ? '#ffffff' : a.fate === 'frozen' ? '#dfe8f2' : '#6a6a70';
      // Body-mounted cells on the four long faces.
      part(i, plates, [0, bh / 2 + 0.003, 0], [0, 0, 0], [bw * 0.84, 0.006, bl * 0.9], plateTint);
      part(i, plates, [0, -bh / 2 - 0.003, 0], [0, 0, 0], [bw * 0.84, 0.006, bl * 0.9], plateTint);
      part(i, plates, [bw / 2 + 0.003, 0, 0], [0, 0, 0], [0.006, bh * 0.84, bl * 0.9], plateTint);
      part(i, plates, [-bw / 2 - 0.003, 0, 0], [0, 0, 0], [0.006, bh * 0.84, bl * 0.9], plateTint);
      if (a.solar === 'wings') for (const side of [-1, 1]) {
        const droop = bent ? jitter(1.6) : sat.alive ? 0 : jitter(0.3);
        part(i, wings, [side * (bw / 2 + bl * 0.3 * Math.cos(droop)), bh / 2 + bl * 0.3 * Math.sin(-droop * side), 0], [0, 0, droop], [bl * 0.6, 0.008, bl * 0.86], plateTint);
      }
      if (a.solar === 'petals') for (let p = 0; p < 4; p++) {
        const angle = p * Math.PI / 2, open = bent ? 0.3 + random() * 1.4 : 1.4;
        const reach = bl * 0.3;
        part(i, wings, [Math.cos(angle) * (bw / 2 + Math.sin(open) * reach), Math.sin(angle) * (bh / 2 + Math.sin(open) * reach), -bl / 2 + Math.cos(open) * reach], [0, 0, 0], p % 2 ? [bw * 0.9, 0.008, bl * 0.6] : [0.008, bh * 0.9, bl * 0.6], plateTint);
        const slot = slots[i][slots[i].length - 1];
        // Tilt each petal about its hinge on the rear rim.
        slot.local.compose(
          new THREE.Vector3(Math.cos(angle) * (bw / 2 + Math.sin(open) * reach), Math.sin(angle) * (bh / 2 + Math.sin(open) * reach), -bl / 2 + Math.cos(open) * reach),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(-Math.sin(angle), Math.cos(angle), 0), -open),
          p % 2 ? new THREE.Vector3(bw * 0.9, 0.008, bl * 0.6) : new THREE.Vector3(0.008, bh * 0.9, bl * 0.6),
        );
      }
      if (a.antenna === 'tape') for (let k = 0; k < 4; k++) {
        const angle = k * Math.PI / 2 + Math.PI / 4, splay = 0.9 + jitter(0.3) + (bent ? jitter(1.5) : 0), length = 0.34;
        const direction = new THREE.Vector3(Math.cos(angle) * Math.sin(splay), Math.sin(angle) * Math.sin(splay), Math.cos(splay));
        const origin = new THREE.Vector3(Math.cos(angle) * bw * 0.6, Math.sin(angle) * bh * 0.6, bl / 2);
        part(i, rods, [0, 0, 0]);
        slots[i][slots[i].length - 1].local.compose(origin.addScaledVector(direction, length / 2), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction), new THREE.Vector3(0.016, 0.003, length));
      }
      if (a.antenna === 'whip') part(i, rods, [bw * 0.3, bh / 2 + 0.3, bl * 0.3], [0, 0, bent ? jitter(1.2) : jitter(0.2)], [0.008, 0.62, 0.008]);
      if (a.antenna === 'dish') {
        part(i, rods, [0, 0, bl / 2 + 0.06], [0, 0, 0], [0.012, 0.012, 0.12]);
        part(i, dishes, [0, 0, bl / 2 + 0.13], [-Math.PI / 2 + (bent ? jitter(1) : 0), 0, 0]);
      }
      part(i, lenses, [0, 0, -bl / 2 - 0.012]);
      if (sat.alive) part(i, lamps[i % 7 === 3 ? 2 : i % 2].mesh, [bw * 0.3, bh / 2 + 0.02, bl * 0.36]);
    });
    for (const [mesh, used] of cursors) { mesh.count = used; mesh.visible = used > 0; }

    const matrix = new THREE.Matrix4(), whole = new THREE.Matrix4(), size = new THREE.Vector3();
    const settle = (index: number) => {
      const sat = sats[index];
      whole.compose(sat.position, sat.turn, size.setScalar(sat.scale));
      for (const slot of slots[index]) { slot.mesh.setMatrixAt(slot.index, matrix.multiplyMatrices(whole, slot.local)); slot.mesh.instanceMatrix.needsUpdate = true; }
    };
    sats.forEach((_sat, index) => settle(index));
    for (const mesh of cursors.keys()) { if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.computeBoundingBox(); mesh.computeBoundingSphere(); }

    // The dispenser the new arrivals came out of.
    if (a.formation === 'deployer') {
      const pod = s.material('#d9d7cf', { roughness: 0.7 });
      const at = sats[0].position.clone().add(new THREE.Vector3(-1.25, -0.02, 0));
      s.box([1.5, 0.6, 1.0], [at.x, at.y, at.z], pod);
      s.box([0.02, 0.46, 0.84], [at.x + 0.76, at.y, at.z], dark);
      const door = s.box([0.6, 0.03, 1.0], [at.x + 0.98, at.y + 0.48, at.z], pod);
      door.rotation.z = 0.7;
      s.box([1.56, 0.07, 0.07], [at.x, at.y + 0.3, at.z + 0.5], s.material('#d3a534', { metalness: 0.7, roughness: 0.4 }));
      s.box([1.56, 0.07, 0.07], [at.x, at.y + 0.3, at.z - 0.5], s.material('#d3a534', { metalness: 0.7, roughness: 0.4 }));
      s.label('DEPLOYER 2', 1.0, 0.2, [at.x, at.y, at.z + 0.503], '#1d2024', '#f4f2ea').castShadow = false;
    }
    // Wreckage, frost or re-entry glow around the dead.
    const dead = sats.filter((sat) => !sat.alive);
    if (a.fate === 'collision' && dead.length) {
      const bits = dead.flatMap((sat) => Array.from({ length: 9 }, () => ({ at: [sat.position.x + jitter(1.5), sat.position.y + jitter(1.5), sat.position.z + jitter(1.5)] as [number, number, number], size: 0.02 + random() * 0.05, color: random() < 0.5 ? '#2a4aa0' : '#d8dadc' })));
      s.scatter(new THREE.TetrahedronGeometry(1, 0), s.material('#ffffff', { metalness: 0.6, roughness: 0.3 }), bits);
    }
    const trails: THREE.Mesh[] = [];
    if (a.fate === 'burning') for (const sat of dead) {
      const glow = s.mesh(new THREE.ConeGeometry(0.32, 1.7, 10, 1, true).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: '#ff8a30', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }), sat.position.toArray() as [number, number, number]);
      glow.rotation.z = -1.25;
      glow.castShadow = false;
      trails.push(glow);
      s.ball([0.24, 0.24, 0.24], sat.position.toArray() as [number, number, number], new THREE.MeshBasicMaterial({ color: '#ffd080', transparent: true, opacity: 0.5, depthWrite: false }), 10).castShadow = false;
    }

    const pace = mix(0.15, 1.4, mood.energy);
    const spin = new THREE.Quaternion();
    const tumbling = sats.map((sat, index) => (sat.alive ? -1 : index)).filter((index) => index >= 0);
    return s.finish({
      update: (dt, time) => {
        for (const index of tumbling) {
          const sat = sats[index];
          sat.turn.premultiply(spin.setFromAxisAngle(sat.axis, dt * sat.rate * pace));
          settle(index);
        }
        lamps.forEach((lamp, group) => { lamp.material.emissiveIntensity = Math.sin(time * (1.6 + group * 0.7) * mix(0.6, 1.6, mood.energy) + group * 2) > 0.2 ? 2.4 : 0.1; });
        for (const [index, trail] of trails.entries()) trail.scale.y = 0.8 + 0.3 * Math.sin(time * 9 * pace + index);
      },
    });
  },
});
