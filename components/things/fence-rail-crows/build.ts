import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { animateCrows, crow, type Crow, type CrowPose } from './crow';

/** A split rail: a rough wedge-sectioned log along x from x0 to x1, centred at (y, z). */
function railGeometry(length: number, thick: number, random: () => number) {
  const shape = new THREE.Shape();
  // Irregular triangle-ish section, as a log split in quarters.
  const pts: [number, number][] = [[-thick * 0.55, -thick * 0.4], [thick * 0.6, -thick * 0.45], [thick * 0.35 + random() * thick * 0.1, thick * 0.2], [-thick * 0.05, thick * 0.55], [-thick * 0.5, thick * 0.15]];
  shape.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) shape.lineTo(x * (0.9 + random() * 0.2), y * (0.9 + random() * 0.2));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, steps: 6 });
  geometry.translate(0, 0, -length / 2);
  // Gentle bow and twist along the length.
  const pos = geometry.getAttribute('position');
  const bow = (random() - 0.5) * thick * 0.6, twist = (random() - 0.5) * 0.3;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i), f = z / length;
    const x = pos.getX(i), y = pos.getY(i);
    const a = twist * f;
    pos.setXYZ(i, x * Math.cos(a) - y * Math.sin(a) + bow * (1 - 4 * f * f), x * Math.sin(a) + y * Math.cos(a), z);
  }
  geometry.computeVertexNormals();
  // Lay it along x.
  geometry.rotateY(Math.PI / 2);
  return geometry;
}

function woodTexture(random: () => number, base: string, moss: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const tone = new THREE.Color(base);
  ctx.fillStyle = `#${tone.getHexString()}`;
  ctx.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 90; i++) {
    const c = tone.clone().offsetHSL(0, -0.05, (random() - 0.55) * 0.25);
    ctx.strokeStyle = `#${c.getHexString()}`;
    ctx.lineWidth = 1 + random() * 2.5;
    const y = random() * 64;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(80, y + (random() - 0.5) * 8, 170, y + (random() - 0.5) * 8, 256, y + (random() - 0.5) * 6); ctx.stroke();
  }
  if (moss) for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(${70 + random() * 30},${100 + random() * 30},${40 + random() * 20},0.75)`;
    ctx.beginPath(); ctx.ellipse(random() * 256, random() * 64, 6 + random() * 18, 3 + random() * 6, 0, 0, Math.PI * 2); ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    count: choice('How many crows are on the fence?', {
      one: 'A single crow, alone and watchful.',
      three: 'Three crows spaced along the rail.',
      murder: 'A crowded murder of crows jostling shoulder to shoulder, more arriving.',
    }),
    doing: choice('What are the crows doing?', {
      cawing: 'Cawing: heads thrown up, beaks open, loud and harsh.',
      preening: 'Preening: heads tucked back into their feathers, at ease.',
      takeoff: 'Restless: one is taking off with wings spread wide, the rest shifting.',
      staring: 'All turned to stare straight at the viewer, glinting eyes, unnervingly still.',
      hunched: 'Hunched and fluffed against the cold, feathers puffed up, waiting.',
    }),
    holding: choice('Does one of them hold something in its beak?', {
      nothing: 'Nothing.',
      corn: 'A stolen cob of yellow corn.',
      wrapper: 'A shiny crumpled candy wrapper in loud colours, Halloween loot.',
      ring: 'A small glinting gold ring, something lost.',
    }),
    style: choice('What kind of fence is it?', {
      post: 'Post-and-rail: split rails slotted through squared posts.',
      zigzag: 'A zigzag worm fence of stacked rails crossing at the corners, no posts.',
      broken: 'An old post-and-rail with one rail broken and sagging to the ground.',
    }),
    wood: choice('What is the rail wood like?', {
      silver: 'Silver-grey, weathered by decades of weather.',
      fresh: 'Freshly split chestnut-brown, raw and splintery.',
      mossy: 'Dark and damp, patched with green moss and lichen.',
      whitewashed: 'Old whitewash peeling off grey wood.',
    }),
    ground: choice('What grows along the foot of the fence?', {
      grass: 'Tall dry autumn grass in tufts.',
      stubble: 'Cut corn stubble and dropped husks.',
      bare: 'Bare trampled dirt, a few black feathers.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const base = { silver: '#9a9a92', fresh: '#8a5a34', mossy: '#5a4e3c', whitewashed: '#d8d4c8' }[a.wood];
    const map = woodTexture(random, new THREE.Color(base).lerp(new THREE.Color('#8b8275'), mood.wear * 0.2).getStyle(), a.wood === 'mossy');
    const wood = s.material('#ffffff', { map, roughness: 0.95 });
    const L = 2.6;
    // Where crows can perch: [x, y, z, rail yaw].
    const perches: [number, number, number, number][] = [];
    const thick = 0.12;

    if (a.style === 'zigzag') {
      // Rails laid in a zigzag, each panel resting on the ends of the one below.
      const panels = 3, panelL = 1.25, angle = 0.42, layers = 5;
      const dx = panelL * Math.cos(angle);
      for (let p = 0; p < panels; p++) {
        const cx = -((panels - 1) / 2) * dx + p * dx;
        const yaw = (p % 2 ? 1 : -1) * angle;
        for (let l = 0; l < layers; l++) {
          const y = 0.1 + l * 0.2 + (p % 2) * 0.1;
          const rail = s.mesh(railGeometry(panelL + 0.28, thick * (0.9 + random() * 0.2), random), wood, [cx, y, 0]);
          rail.rotation.y = yaw;
          if (l === layers - 1) perches.push([cx, y + thick * 0.4, 0, yaw]);
        }
      }
    } else {
      const posts = [-L / 2, 0, L / 2];
      for (const x of posts) {
        s.box([0.14, 1.25, 0.14], [x, 0.6, 0], wood).rotation.y = (random() - 0.5) * 0.15;
        s.box([0.16, 0.03, 0.16], [x, 1.235, 0], wood);
      }
      const rails = [0.42, 0.78, 1.1];
      for (let section = 0; section < 2; section++) {
        const cx = -L / 4 + section * L / 2;
        rails.forEach((y, r) => {
          const broken = a.style === 'broken' && section === 1 && r === 1;
          if (broken) {
            // One end slipped from its mortise: the rail slants to the ground.
            const rail = s.mesh(railGeometry(L / 2 + 0.05, thick, random), wood, [cx + 0.1, y / 2 + 0.02, 0.18]);
            rail.rotation.z = Math.atan2(y - 0.05, L / 2) * 0.95;
            rail.rotation.y = 0.12;
            return;
          }
          const rail = s.mesh(railGeometry(L / 2 + 0.2, thick * (0.9 + random() * 0.2), random), wood, [cx, y, (r % 2 ? 0.02 : -0.02)]);
          rail.rotation.z = (random() - 0.5) * 0.03;
          if (r === rails.length - 1) perches.push([cx, y + thick * 0.45, 0, 0]);
        });
      }
    }

    // Ground along the fence foot.
    if (a.ground === 'grass') {
      const grass = s.material('#b59a5a', { roughness: 1, side: THREE.DoubleSide });
      const blades = new THREE.InstancedMesh(new THREE.ConeGeometry(0.012, 1, 3).translate(0, 0.5, 0), grass, 260);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < 260; i++) {
        const tuft = Math.floor(random() * 14);
        const tx = -L / 2 + (tuft / 13) * L + (random() - 0.5) * 0.15, tz = (tuft % 2 ? 0.2 : -0.2) + (random() - 0.5) * 0.15;
        e.set((random() - 0.5) * 0.7, random() * 6, (random() - 0.5) * 0.7);
        m.compose(new THREE.Vector3(tx, 0, tz), q.setFromEuler(e), new THREE.Vector3(1, 0.25 + random() * 0.35, 1));
        blades.setMatrixAt(i, m);
        blades.setColorAt(i, new THREE.Color('#b59a5a').offsetHSL((random() - 0.5) * 0.05, 0, (random() - 0.5) * 0.2));
      }
      blades.castShadow = blades.receiveShadow = true;
      s.root.add(blades);
    } else if (a.ground === 'stubble') {
      const stub = s.material('#c9b27a', { roughness: 1 });
      const pts = Array.from({ length: 40 }, () => ({ at: [-L / 2 + random() * L, 0.06, (random() - 0.5) * 0.9] as [number, number, number], size: 1 }));
      const stubs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.015, 0.14, 5), stub, pts.length);
      const m = new THREE.Matrix4();
      pts.forEach((p, i) => { m.makeRotationZ((random() - 0.5) * 0.3).setPosition(...p.at); stubs.setMatrixAt(i, m); });
      stubs.castShadow = true;
      s.root.add(stubs);
      for (let i = 0; i < 8; i++) {
        const husk = s.box([0.05, 0.004, 0.22], [-L / 2 + random() * L, 0.006, (random() - 0.5) * 0.8], s.material('#d8c890', { side: THREE.DoubleSide }));
        husk.rotation.y = random() * 3;
      }
    } else {
      s.box([L + 0.4, 0.02, 0.9], [0, 0.01, 0], s.material('#6a5440', { roughness: 1 }));
    }
    // A few dropped feathers.
    const feather = s.material('#1a1b20', { side: THREE.DoubleSide, roughness: 0.5 });
    for (let i = 0; i < (a.ground === 'bare' ? 6 : 3); i++) {
      const f = s.mesh(new THREE.PlaneGeometry(0.03, 0.14), feather, [-L / 2 + random() * L, 0.03, 0.2 + random() * 0.35]);
      f.rotation.set(-Math.PI / 2 + 0.1, 0, random() * 6);
    }

    // The crows.
    const n = { one: 1, three: 3, murder: 8 + Math.floor(random() * 3) }[a.count];
    const crows: Crow[] = [];
    const span = perches.length;
    for (let i = 0; i < n; i++) {
      // Spread along the top rails in order, one alone sits near the middle.
      const t = n === 1 ? 0.5 + (random() - 0.5) * 0.15 : (i + 0.5 + (random() - 0.5) * 0.35) / n;
      const railIndex = Math.min(span - 1, Math.floor(t * span));
      const [px, py, pz, yaw] = perches[railIndex];
      const railLen = a.style === 'zigzag' ? 1.1 : L / 2;
      const local = (t * span - railIndex - 0.5) * railLen * 0.85;
      let pose: CrowPose = a.doing === 'takeoff' ? (i === Math.floor(n / 2) ? 'takeoff' : random() < 0.4 ? 'cawing' : 'perched') : a.doing as CrowPose;
      if (a.doing === 'cawing' && n > 1 && random() < 0.35) pose = 'perched';
      if (a.doing === 'preening' && n > 1 && random() < 0.3) pose = 'perched';
      // Mostly in profile along the rail, some facing out.
      const facing = random() < 0.45 ? (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) + (random() - 0.5) * 0.4 : (random() < 0.8 ? 0 : Math.PI) + (random() - 0.5) * 0.9;
      const look = a.doing === 'staring' ? THREE.MathUtils.clamp(-facing, -1.7, 1.7) : undefined;
      const c = crow(s, pose, random, { size: 1.2 + random() * 0.25, look, glint: a.doing === 'staring' });
      const x = px + Math.cos(yaw) * local, z = pz - Math.sin(yaw) * local;
      c.root.position.set(x, py + (pose === 'takeoff' ? 0.22 : 0) + (a.style === 'broken' ? 0 : 0), z);
      c.root.rotation.y = facing;
      s.root.add(c.root);
      crows.push(c);
    }
    // A crowd spills onto the ground, pecking at dropped grain.
    if (a.count === 'murder') {
      for (let i = 0; i < 3; i++) {
        const c = crow(s, random() < 0.6 ? 'pecking' : 'perched', random, { size: 1.2 + random() * 0.2 });
        c.root.position.set((random() - 0.5) * L * 0.8, 0.02, 0.45 + random() * 0.3);
        c.root.rotation.y = random() * Math.PI * 2;
        s.root.add(c.root);
        crows.push(c);
      }
    }
    // Something held in the first crow's beak.
    if (a.holding !== 'nothing' && crows.length) {
      const holder = crows.find((c) => c.pose === 'perched' || c.pose === 'staring' || c.pose === 'hunched') ?? crows[0];
      if (a.holding === 'corn') {
        const cob = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.1, 4, 10), s.material('#f0c330', { roughness: 0.5 }));
        cob.rotation.z = Math.PI / 2;
        cob.position.z = 0.01;
        holder.beak.add(cob);
      } else if (a.holding === 'wrapper') {
        const wrap = s.material(['#e6158a', '#7b2fa8', '#f08a12', '#20b0c8'][Math.floor(random() * 4)], { metalness: 0.6, roughness: 0.25, side: THREE.DoubleSide });
        const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 0), wrap);
        body.scale.set(1.6, 0.6, 0.8);
        holder.beak.add(body);
        for (const side of [-1, 1]) {
          const end = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.04, 5), wrap);
          end.rotation.z = side * Math.PI / 2;
          end.position.x = side * 0.065;
          holder.beak.add(end);
        }
      } else {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 6, 16), s.material('#e0b040', { metalness: 1, roughness: 0.2, emissive: '#5a4010', emissiveIntensity: 0.4 }));
        ring.position.z = 0.005;
        holder.beak.add(ring);
      }
      holder.beak.traverse((o) => { o.castShadow = true; });
    }

    const animate = animateCrows(crows, mood.energy);
    void mix;
    return s.finish({ update: (_dt, time) => animate(time) });
  },
});
