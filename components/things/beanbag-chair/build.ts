import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';

const paint = (size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void, repeat: [number, number] = [1, 1]) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d')!, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...repeat);
  return texture;
};

const COLOURS = {
  red: 'Tomato red, the one from the catalogue.',
  orange: 'Burnt seventies orange.',
  mustard: 'Mustard yellow.',
  lime: 'Loud lime green.',
  teal: 'Deep teal.',
  purple: 'Grape purple.',
  pink: 'Hot pink.',
  black: 'Black, a gamer\'s or a goth\'s.',
  cream: 'Oatmeal cream that shows every stain.',
} as const;
const HEX: Record<keyof typeof COLOURS, string> = {
  red: '#d8372c', orange: '#d9702a', mustard: '#d6a92e', lime: '#8fce30', teal: '#1f8a8c', purple: '#7a3fb0', pink: '#f04a98', black: '#2a2b30', cream: '#e3d8be',
};

export default defineThing({
  questions: {
    colour: choice('What colour is the beanbag?', COLOURS),
    fabric: choice('What is it covered in?', {
      vinyl: 'Shiny wipe-clean vinyl that sticks to bare legs.',
      corduroy: 'Soft wide-wale corduroy with ridges running up it.',
      denim: 'Faded denim with pale seams.',
      fur: 'Shaggy fake fur, matted where people sit.',
      patchwork: 'Patchwork panels in clashing colours, home-sewn.',
    }),
    shape: choice('What shape is it?', {
      round: 'A fat round pumpkin of a bag.',
      teardrop: 'A teardrop with a tall peaked back to lean against.',
      lounger: 'A long low slab you lie full-length on.',
    }),
    deflated: score('How deflated is it?', ['Overstuffed and firm', 'Comfortably slumped', 'Half the beans gone, a sad puddle']),
    dent: choice('What mark did the last sitter leave?', {
      one: 'One deep hollow in the middle, somebody was there for hours.',
      two: 'Two hollows side by side, it was shared.',
      plumped: 'None: somebody shook it back into shape.',
    }),
    sunk: choice('What is sunk into it?', {
      nothing: 'Nothing.',
      controller: 'A game controller dropped mid-level, its cable trailing to the floor.',
      magazine: 'A magazine left open face-down to keep the page.',
      hoodie: 'A hoodie pulled off and thrown down, one sleeve hanging.',
      headphones: 'A big pair of headphones, still plugged into something.',
      cat: 'A cat curled asleep in the warm hollow.',
      snacks: 'A torn-open crisp bag and its crumbs.',
    }),
    split: noul('Has a seam split and leaked polystyrene beads across the floor?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const deflate = a.deflated;
    const base = new THREE.Color(HEX[a.colour]);
    const phases = Array.from({ length: 6 }, () => random() * 6.28);
    const dents: [number, number][] = a.dent === 'one' ? [[(random() - 0.5) * 0.08, 0.14]] : a.dent === 'two' ? [[-0.23, 0.1], [0.23, 0.13]] : [];
    const depth = mix(0.24, 0.3, deflate) * (a.dent === 'two' ? 0.8 : 1);
    const fluff = a.fabric === 'fur' ? 0.012 : 0;

    const shape = (dx: number, dy: number, dz: number, out: THREE.Vector3) => {
      const theta = Math.atan2(dz, dx);
      const lumpy = mix(0.025, 0.085, deflate);
      let r = 1 + lumpy * (Math.sin(3 * theta + phases[0]) * Math.sin(dy * 4 + phases[1]) * 0.6 + Math.sin(5 * theta + phases[2]) * Math.cos(dy * 6 + phases[3]) * 0.4);
      r *= 1 - 0.035 * Math.abs(Math.cos(3 * theta + phases[4])) ** 14;
      r += fluff * Math.sin(theta * 41 + dy * 37) * Math.sin(dy * 53 + theta * 17) * 2;
      let x = dx * r, y = dy * r, z = dz * r;
      const up = Math.max(0, y);
      if (a.shape === 'teardrop') { const taper = 1 - 0.5 * up ** 1.4; x *= taper; z *= taper; y *= 1.45; z -= up * 0.28; }
      else if (a.shape === 'lounger') { y *= 0.72; x *= 1.55; z *= 0.82; }
      else { const taper = 1 - 0.18 * up; x *= taper; z *= taper; }
      y = Math.max(y, -0.45) + 0.45;
      const sag = mix(1, 0.58, deflate);
      const low = clamp01(1 - y / 0.8);
      const spread = (1 + deflate * 0.2) * (1 + 0.16 * deflate * low);
      x *= spread * 0.5; z *= spread * 0.5; y *= sag * 0.44;
      const upper = THREE.MathUtils.smoothstep(y, 0.1, 0.3);
      for (const [cx, cz] of dents) {
        const d2 = (x - cx) ** 2 + (z - cz) ** 2;
        y -= depth * Math.exp(-d2 / (2 * (a.dent === 'two' ? 0.15 : 0.21) ** 2)) * upper;
      }
      if (dents.length && a.shape !== 'lounger') y += 0.13 * Math.exp(-((z + 0.27) ** 2 + x * x * 0.5) / 0.06) * upper;
      out.set(x, Math.max(y, 0), z);
    };

    const geometry = new THREE.SphereGeometry(1, 72, 44);
    const position = geometry.attributes.position as THREE.BufferAttribute;
    const p = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) {
      p.fromBufferAttribute(position, i).normalize();
      shape(p.x, p.y, p.z, p);
      position.setXYZ(i, p.x, p.y, p.z);
    }
    geometry.rotateY(Math.PI / 2); // put the sphere's own seam at the back
    geometry.computeVertexNormals();

    const dirt = mood.wear;
    let material: THREE.MeshStandardMaterial;
    if (a.fabric === 'vinyl') material = new THREE.MeshStandardMaterial({ color: base, roughness: mix(0.18, 0.45, dirt), metalness: 0.05 });
    else if (a.fabric === 'corduroy') {
      const wale = paint(64, (ctx, n) => { for (let i = 0; i < n; i++) { const v = 150 + Math.round(105 * Math.abs(Math.sin(i / n * Math.PI * 4))); ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(i, 0, 1, n); } }, [22, 1]);
      material = new THREE.MeshStandardMaterial({ color: base, map: wale, bumpMap: wale, bumpScale: 1.2, roughness: 0.95 });
    } else if (a.fabric === 'denim') {
      const weave = paint(128, (ctx, n) => { ctx.fillStyle = '#c8c8c8'; ctx.fillRect(0, 0, n, n); for (let i = 0; i < 2600; i++) { const v = 150 + Math.floor(random() * 105); ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(random() * n, random() * n, 1, 3); } }, [8, 5]);
      material = new THREE.MeshStandardMaterial({ color: base.clone().lerp(new THREE.Color('#4a6a9a'), 0.55), map: weave, roughness: 0.9 });
    } else if (a.fabric === 'fur') {
      const shag = paint(128, (ctx, n) => { ctx.fillStyle = '#b0b0b0'; ctx.fillRect(0, 0, n, n); for (let i = 0; i < 1800; i++) { const v = 120 + Math.floor(random() * 135); ctx.strokeStyle = `rgb(${v},${v},${v})`; ctx.beginPath(); const x = random() * n, y = random() * n; ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 5, y + 4 + random() * 6); ctx.stroke(); } }, [7, 4]);
      material = new THREE.MeshStandardMaterial({ color: base, map: shag, bumpMap: shag, bumpScale: 2.5, roughness: 1 });
    } else {
      const others = (Object.keys(HEX) as (keyof typeof HEX)[]).filter((key) => key !== a.colour);
      const patches = paint(256, (ctx, n) => {
        for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
          ctx.fillStyle = random() < 0.4 ? HEX[a.colour] : HEX[others[Math.floor(random() * others.length)]];
          ctx.fillRect(i * n / 6, j * n / 3, n / 6 + 1, n / 3 + 1);
        }
        ctx.strokeStyle = '#f4efe0'; ctx.setLineDash([5, 4]); ctx.lineWidth = 2;
        for (let i = 0; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(i * n / 6, 0); ctx.lineTo(i * n / 6, n); ctx.stroke(); }
        for (let j = 0; j <= 3; j++) { ctx.beginPath(); ctx.moveTo(0, j * n / 3); ctx.lineTo(n, j * n / 3); ctx.stroke(); }
      });
      material = new THREE.MeshStandardMaterial({ map: patches, roughness: 0.9 });
    }
    material.color.lerp(new THREE.Color('#7d7568'), dirt * 0.22);
    const bag = s.mesh(geometry, material);
    bag.updateMatrixWorld(true);

    // Height of the bag's skin under any point, for laying things on it.
    const caster = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);
    const surface = (x: number, z: number) => {
      caster.set(new THREE.Vector3(x, 3, z), down);
      const hit = caster.intersectObject(bag, false)[0];
      return hit ? hit.point.y : 0;
    };
    const [hx, hz] = dents[0] ?? [0, 0.12];
    const hy = surface(hx, hz);

    // The carry loop and the zip every beanbag has somewhere.
    const peak = a.shape === 'teardrop' ? -0.2 : -0.05;
    const loop = s.ring(0.035, 0.008, [0, surface(0, peak) + 0.02, peak], s.material(material.map ? HEX[a.colour] : base.clone().multiplyScalar(0.7)), Math.PI);
    loop.rotation.y = random() * 3;

    const drape = (cx: number, cz: number, w: number, d: number, turn: number, cloth: THREE.Material, lift: number, folds: number) => {
      const g = new THREE.PlaneGeometry(w, d, 20, 20);
      g.rotateX(-Math.PI / 2);
      g.rotateY(turn);
      const at = g.attributes.position as THREE.BufferAttribute;
      const f1 = random() * 6, f2 = random() * 6;
      for (let i = 0; i < at.count; i++) {
        const x = at.getX(i) + cx, z = at.getZ(i) + cz;
        const wrinkle = (Math.sin(x * 31 + f1) * Math.cos(z * 27 + f2) + Math.sin((x + z) * 19 + f2)) * folds;
        at.setXYZ(i, x, surface(x, z) + lift + Math.abs(wrinkle), z);
      }
      g.computeVertexNormals();
      return s.mesh(g, cloth);
    };

    if (a.sunk === 'controller') {
      const pad = new THREE.Group();
      const era = random();
      const shell = s.material(era < 0.4 ? '#c9c7c0' : era < 0.75 ? '#2a2b2f' : '#5a3fb8', { roughness: 0.45 });
      const part = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.castShadow = true; pad.add(mesh); return mesh; };
      const body = part(new THREE.SphereGeometry(1, 16, 10), shell, 0, 0, 0);
      body.scale.set(0.085, 0.02, 0.045);
      for (const side of [-1, 1]) {
        const grip = part(new THREE.SphereGeometry(1, 12, 8), shell, side * 0.065, -0.004, 0.035);
        grip.scale.set(0.03, 0.022, 0.05);
        grip.rotation.y = -side * 0.35;
        const stick = part(new THREE.CylinderGeometry(0.011, 0.009, 0.014, 12), s.material('#1a1a1c'), side * 0.03, 0.022, 0.012);
        stick.rotation.x = 0.1;
      }
      part(new THREE.BoxGeometry(0.03, 0.006, 0.01), s.material('#1a1a1c'), -0.055, 0.018, -0.012);
      part(new THREE.BoxGeometry(0.01, 0.006, 0.03), s.material('#1a1a1c'), -0.055, 0.018, -0.012);
      ['#e8c63a', '#3a8ae8', '#d8343a', '#3ab85a'].forEach((tint, i) => part(new THREE.CylinderGeometry(0.006, 0.006, 0.006, 10), s.material(tint, { emissive: tint, emissiveIntensity: 0.25 }), 0.055 + Math.cos(i * 1.571) * 0.014, 0.018, -0.012 + Math.sin(i * 1.571) * 0.014));
      pad.scale.setScalar(1.7);
      pad.position.set(hx + 0.03, hy + 0.03, hz + 0.02);
      pad.rotation.set(0.25, random() * 6.28, (random() - 0.5) * 0.5);
      s.root.add(pad);
      // Cable over the lip of the bag and away across the floor.
      const side = random() < 0.5 ? -1 : 1;
      const cable: [number, number, number][] = [[hx + 0.03, hy + 0.03, hz]];
      for (let i = 1; i <= 8; i++) {
        const x = hx + side * i * 0.11, z = hz + 0.05 + Math.sin(i * 1.3 + phases[5]) * 0.07 + i * 0.02;
        cable.push([x, surface(x, z) + 0.006, z]);
      }
      s.tube(cable, 0.004, s.material('#1c1c1e'));
    } else if (a.sunk === 'magazine') {
      const title = ['POP!', 'SMASH', 'TEEN BEAT', 'GAMER', 'THRASH', 'ZINE'][Math.floor(random() * 6)];
      const tint = ['#f04a98', '#ffe23a', '#3ac8ff', '#ff5a1c', '#8fce30'][Math.floor(random() * 5)];
      const cover = (back: boolean) => {
        const texture = paint(256, (ctx, n) => {
          ctx.fillStyle = back ? '#e8e2d0' : tint; ctx.fillRect(0, 0, n, n);
          if (back) { ctx.fillStyle = '#2a2a2a'; ctx.fillRect(n * 0.12, n * 0.15, n * 0.76, n * 0.5); ctx.fillStyle = '#c8202a'; ctx.fillRect(n * 0.12, n * 0.72, n * 0.5, n * 0.08); return; }
          ctx.fillStyle = '#f6e9d8'; ctx.beginPath(); ctx.arc(n * 0.5, n * 0.62, n * 0.24, 0, 7); ctx.fill();
          ctx.fillStyle = '#3a2a22'; ctx.beginPath(); ctx.arc(n * 0.5, n * 0.52, n * 0.26, 3.14, 6.28); ctx.fill();
          ctx.fillStyle = '#111'; ctx.font = `bold ${n * 0.24}px monospace`; ctx.textAlign = 'center'; ctx.fillText(title, n / 2, n * 0.24, n * 0.9);
          ctx.fillStyle = '#fff'; ctx.fillRect(n * 0.06, n * 0.86, n * 0.5, n * 0.05); ctx.fillRect(n * 0.06, n * 0.93, n * 0.34, n * 0.03);
        });
        return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.35, side: THREE.DoubleSide });
      };
      const mag = new THREE.Group();
      const tilt = mix(0.35, 0.6, random());
      for (const side of [-1, 1]) {
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.008, 0.28), [s.material('#f2eee2'), s.material('#f2eee2'), cover(side > 0), s.material('#f2eee2'), s.material('#f2eee2'), s.material('#f2eee2')]);
        leaf.position.set(side * 0.105 * Math.cos(tilt), -0.105 * Math.sin(tilt), 0);
        leaf.rotation.z = -side * tilt;
        leaf.castShadow = true;
        mag.add(leaf);
      }
      mag.position.set(hx, hy + 0.09, hz);
      mag.rotation.y = random() * 6.28;
      s.root.add(mag);
    } else if (a.sunk === 'hoodie') {
      const tint = ['#5a5f6a', '#1f2a44', '#8a1f2a', '#2a2a2c', '#6a7a4a', '#c8c2b2'][Math.floor(random() * 6)];
      const cloth = s.material(tint, { roughness: 1, side: THREE.DoubleSide });
      const turn = random() * 6.28;
      drape(hx, hz, 0.5, 0.56, turn, cloth, 0.012, 0.012);
      const ahead = new THREE.Vector3(Math.sin(turn), 0, Math.cos(turn)), across = new THREE.Vector3(Math.cos(turn), 0, -Math.sin(turn));
      const hoodAt = new THREE.Vector3(hx, 0, hz).addScaledVector(ahead, -0.3);
      const hood = s.ball([0.13, 0.06, 0.15], [hoodAt.x, surface(hoodAt.x, hoodAt.z) + 0.04, hoodAt.z], cloth, 16);
      hood.rotation.y = turn;
      for (const side of [-1, 1]) {
        const start = new THREE.Vector3(hx, 0, hz).addScaledVector(ahead, -0.18).addScaledVector(across, side * 0.2);
        const points: [number, number, number][] = [];
        for (let i = 0; i <= 6; i++) {
          const q = start.clone().addScaledVector(across, side * i * 0.075).addScaledVector(ahead, i * 0.035 * (side > 0 ? 1 : -0.4));
          points.push([q.x, surface(q.x, q.z) + 0.035, q.z]);
        }
        const sleeve = s.tube(points, 0.05, cloth);
        sleeve.scale.y = 1;
      }
      const pocketAt = new THREE.Vector3(hx, 0, hz).addScaledVector(ahead, 0.12);
      drape(pocketAt.x, pocketAt.z, 0.26, 0.13, turn, s.material(new THREE.Color(tint).multiplyScalar(0.8), { roughness: 1, side: THREE.DoubleSide }), 0.028, 0.004);
    } else if (a.sunk === 'headphones') {
      const cans = new THREE.Group();
      const shell = s.material(['#1c1c1e', '#e8e4da', '#c8343a', '#3a6ac0'][Math.floor(random() * 4)], { roughness: 0.4 });
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.009, 8, 28, Math.PI), shell);
      cans.add(band);
      for (const side of [-1, 1]) {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.035, 20), shell);
        cup.rotation.z = Math.PI / 2;
        cup.position.set(side * 0.09, -0.01, 0);
        const cushion = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.014, 8, 20), s.material('#2a2a2c', { roughness: 0.9 }));
        cushion.rotation.y = Math.PI / 2;
        cushion.position.set(side * 0.07, -0.01, 0);
        cans.add(cup, cushion);
      }
      cans.traverse((n) => { n.castShadow = true; });
      cans.scale.setScalar(1.35);
      cans.position.set(hx, hy + 0.06, hz);
      cans.rotation.set(-1.2, random() * 6.28, 0, 'YXZ');
      s.root.add(cans);
      const side = random() < 0.5 ? -1 : 1;
      const cable: [number, number, number][] = [[hx, hy + 0.04, hz]];
      for (let i = 1; i <= 8; i++) { const x = hx + side * i * 0.1, z = hz + Math.sin(i * 1.7 + phases[5]) * 0.08 + i * 0.03; cable.push([x, surface(x, z) + 0.005, z]); }
      s.tube(cable, 0.003, s.material('#1c1c1e'));
    } else if (a.sunk === 'cat') {
      const coat = ['#e08a3a', '#2a2a2c', '#8a8a8e', '#f0ece2', '#6a4a30'][Math.floor(random() * 5)];
      const fur = s.material(coat, { roughness: 1 });
      const cat = new THREE.Group();
      const part = (g: THREE.BufferGeometry, x: number, y: number, z: number, sx: number, sy: number, sz: number) => { const mesh = new THREE.Mesh(g, fur); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = true; cat.add(mesh); return mesh; };
      const ballGeometry = new THREE.SphereGeometry(1, 18, 12);
      const body = part(new THREE.TorusGeometry(0.085, 0.07, 12, 28, Math.PI * 1.7), 0, 0.05, 0, 1, 1, 0.9);
      body.rotation.x = Math.PI / 2;
      part(ballGeometry, 0.02, 0.05, 0.0, 0.09, 0.065, 0.09);
      part(ballGeometry, 0.1, 0.07, 0.07, 0.055, 0.05, 0.055);
      for (const side of [-1, 1]) part(new THREE.ConeGeometry(0.02, 0.035, 4), 0.1 + side * 0.03, 0.125, 0.07 + side * 0.012, 1, 1, 0.6);
      const tail = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 8, 24, Math.PI * 0.9), fur);
      tail.rotation.x = Math.PI / 2;
      tail.rotation.z = 2.2;
      tail.position.y = 0.025;
      tail.castShadow = true;
      cat.add(tail);
      cat.position.set(hx, hy - 0.01, hz);
      cat.rotation.y = random() * 6.28;
      s.root.add(cat);
    } else if (a.sunk === 'snacks') {
      const foil = s.material(['#d8202c', '#2c6fd0', '#e8a03a', '#3aa870'][Math.floor(random() * 4)], { roughness: 0.25, metalness: 0.5 });
      const pack = new THREE.Group();
      const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), foil);
      belly.scale.set(0.085, 0.032, 0.11);
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.07), s.material('#f6f0dc', { roughness: 0.5 }));
      band.scale.y = 0.9;
      pack.add(belly, band);
      for (const end of [-1, 1]) { const crimp = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.006, 0.035), foil); crimp.position.z = end * 0.115; if (end > 0) crimp.rotation.x = -0.9; pack.add(crimp); }
      pack.traverse((n) => { n.castShadow = true; });
      pack.scale.setScalar(1.3);
      pack.position.set(hx, hy + 0.045, hz);
      pack.rotation.set(0.3, random() * 6.28, 0.2);
      s.root.add(pack);
      const crumbs = [];
      for (let i = 0; i < 26; i++) { const x = hx + (random() - 0.5) * 0.3, z = hz + (random() - 0.5) * 0.3; crumbs.push({ at: [x, surface(x, z) + 0.004, z] as const, size: mix(0.006, 0.014, random()) }); }
      s.scatter(new THREE.CylinderGeometry(1, 1, 0.25, 7), s.material('#e8b84a', { roughness: 0.8 }), crumbs);
    }

    if (a.split) {
      const sideAngle = random() * Math.PI - Math.PI / 2 + Math.PI / 2;
      const beads = [];
      const count = Math.round(mix(120, 420, mood.wear * 0.5 + mood.density * 0.5));
      const edge = 0.5 * (1 + deflate * 0.3) * (a.shape === 'lounger' ? 1.2 : 1);
      for (let i = 0; i < count; i++) {
        const angle = sideAngle + (random() - 0.5) * 1.3, reach = edge * 0.8 + random() ** 2 * 0.55;
        beads.push({ at: [Math.cos(angle) * reach, 0.006 + (reach < edge ? random() * 0.02 : 0), Math.sin(angle) * reach] as const, size: mix(0.008, 0.014, random()) });
      }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#f6f4ee', { roughness: 0.7 }), beads);
    }

    const bounds = new THREE.Box3().setFromObject(bag);
    return s.finish({ footprint: Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z) / 2 });
  },
});
