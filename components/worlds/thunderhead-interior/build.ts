import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Placeable, choice, defineWorld, disposeTree, mix, score } from '@conjure/kit';

const up = new THREE.Vector3(0, 1, 0);

export default defineWorld({
  questions: {
    opening: choice('How does the light get in overhead?', {
      oculus: 'One round opening, like the eye of a dome, dropping a single clean shaft.',
      tear: 'A long ragged tear, letting down a thin blade of light.',
      several: 'Several small holes, their shafts crossing like searchlights.',
      closing: 'The gap is nearly sealed: only a dim bruise of light and a pencil-thin ray.',
    }),
    walls: choice('What are the cloud walls like?', {
      billows: 'Rounded cauliflower billows stacked into towers.',
      columns: 'Tall fluted columns, like the piers and organ pipes of a cathedral.',
      shredded: 'Shredded: torn rags and streamers with gaps into the murk beyond.',
      spiral: 'Corkscrewing bands, the whole chamber visibly rotating.',
    }),
    carried: choice('What else is hanging in the updraught?', {
      nothing: 'Nothing: clean empty air.',
      hail: 'Hailstones of every size, held aloft and growing.',
      rain: 'Rain being driven upward in slanting streaks.',
      debris: 'Debris from the ground: planks, shingles, leaves and paper.',
      birds: 'A flock of birds caught up and circling.',
      ice: 'A glitter of ice crystals catching the light.',
    }),
    lightning: choice('Is there lightning inside the chamber?', {
      none: 'None: the storm is holding its breath.',
      glow: 'Patches of the walls glow from within, lit by flashes buried in the cloud.',
      bolt: 'One bolt leaps from wall to wall behind everything.',
      web: 'A web of crawling discharges laces the whole chamber.',
    }),
    floor: choice('What is the floor far below?', {
      sea: 'A smooth dark sea of vapour.',
      boiling: 'A boiling floor of turrets pushing upward.',
      gap: 'A hole in the vapour showing patchwork fields a long way down.',
    }),
    view: choice('Where are we looking from?', {
      across: 'Level across the chamber, the walls rising and falling out of frame.',
      up: 'From low down, looking up the shaft toward the opening.',
      down: 'From high up, looking down into the pit.',
    }),
    vast: score('How vast is the chamber?', ['A tight chimney', 'A cathedral nave', 'A measureless gulf']),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();

    // ----- palette: swings from bruised green violence through slate to a golden cathedral
    const gold = THREE.MathUtils.clamp(mood.cheer * 0.6 + mood.warmth * 0.4, 0, 1);
    const stops = [
      { lit: '#c9d98a', mid: '#5c7c60', dark: '#1f302c', haze: '#557060', sky: '#eef6b8' },
      { lit: '#e4e9f4', mid: '#7f8db4', dark: '#2c3454', haze: '#7684ac', sky: '#ffffff' },
      { lit: '#fff0b4', mid: '#e3ad62', dark: '#86553a', haze: '#cf9d66', sky: '#fffbe4' },
    ];
    const tone = (key: 'lit' | 'mid' | 'dark' | 'haze' | 'sky') => {
      const t = gold * 2;
      const from = stops[Math.min(1, Math.floor(t))], to = stops[Math.min(2, Math.floor(t) + 1)];
      return new THREE.Color(from[key]).lerp(new THREE.Color(to[key]), Math.min(1, t - Math.floor(Math.min(t, 1))));
    };
    const lit = tone('lit'), mid = tone('mid'), dark = tone('dark'), haze = tone('haze'), sky = tone('sky');
    dark.multiplyScalar(1 - mood.energy * 0.22);
    const background = haze.clone().lerp(dark, 0.18);

    // ----- light: everything is lit down the shaft
    root.add(new THREE.HemisphereLight(lit, dark, 1.5));
    const key = new THREE.DirectionalLight(lit.clone().lerp(new THREE.Color('#ffffff'), 0.3), 2.9);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.04;
    const sunLean = (mood.daylight - 0.5) * 9;
    key.position.set(sunLean, 26, 5);
    key.target.position.set(0, 0, 0);
    Object.assign(key.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 60 });
    key.shadow.camera.updateProjectionMatrix();
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight(mid, 0.7);
    fill.position.set(-6, 2, 14);
    root.add(fill);

    // ----- cloud: lumps with their shading baked in, tinted per instance by height and distance
    const lump = new THREE.IcosahedronGeometry(1, 2);
    {
      const n = lump.attributes.normal as THREE.BufferAttribute;
      const p = lump.attributes.position as THREE.BufferAttribute;
      const colours = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        // Smooth normals for a soft cloud: the position on a unit sphere is the normal.
        n.setXYZ(i, p.getX(i), p.getY(i), p.getZ(i));
        const g = mix(0.5, 1, THREE.MathUtils.smoothstep(p.getY(i) * 0.75 + p.getZ(i) * 0.3, -0.7, 0.85));
        colours.set([g, g, g], i * 3);
      }
      lump.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    }
    const S = mix(0.95, 1.4, a.vast);
    const RX = 13.5 * S, RZ = 16 * S, TOP = 12.5 * S, BOTTOM = -12.5 * S;
    const matrices: THREE.Matrix4[] = [], tints: THREE.Color[] = [];
    const glowing = a.lightning === 'glow' ? 0.16 : a.lightning === 'web' ? 0.06 : 0;
    const flash = new THREE.Color('#d9c8ff');
    const puff = (x: number, y: number, z: number, sx: number, sy: number, sz: number, turn = 0, shade = 1) => {
      matrices.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(up, turn), new THREE.Vector3(sx, sy, sz)));
      // Brighter toward the opening, hazier with distance, near-silhouette in the foreground.
      const height = THREE.MathUtils.clamp((y - BOTTOM) / (TOP - BOTTOM), 0, 1);
      const c = dark.clone().lerp(mid, Math.pow(height, 0.9)).lerp(lit, Math.pow(height, 2.4) * 0.85);
      c.lerp(haze, THREE.MathUtils.clamp((-z + 4) / (RZ * 2.2), 0, 0.55));
      if (z > 6) c.lerp(dark, 0.45);
      c.multiplyScalar(shade);
      if (glowing && z < 4 && random() < glowing) c.lerp(flash, 0.2).multiplyScalar(1.12);
      tints.push(c);
    };

    const towers = Math.round(mix(13, 19, mood.density) * (a.walls === 'columns' ? 1.5 : 1));
    for (let i = 0; i < towers; i++) {
      // The wall is an ellipse open toward the viewer, with the nearest towers framing the view.
      const angle = mix(0.62, Math.PI * 2 - 0.62, (i + random() * 0.5) / towers);
      const out = 1 + (random() - 0.5) * 0.16;
      const cx = Math.sin(angle) * RX * out, cz = Math.cos(angle) * RZ * out;
      const facing = Math.atan2(cx, cz);
      if (a.walls === 'billows') {
        for (let y = BOTTOM - 2; y < TOP + 3; y += mix(2.1, 3.1, random())) {
          const r = mix(3.1, 4.9, random()) * (0.85 + 0.2 * Math.sin(y * 0.35 + i));
          puff(cx + (random() - 0.5) * 2.2, y, cz + (random() - 0.5) * 2.2, r, r * mix(0.75, 0.95, random()), r);
          if (random() < 0.6) { const q = r * 0.5; puff(cx * 0.82 + (random() - 0.5) * 2, y + 1, cz * 0.82 + (random() - 0.5) * 2, q, q, q); }
        }
      } else if (a.walls === 'columns') {
        const r = mix(1.7, 2.7, random());
        for (let y = BOTTOM - 2; y < TOP + 3; y += 5.2) puff(cx, y + random() * 2, cz, r * mix(0.85, 1.1, random()), 5.2, r * mix(0.85, 1.1, random()));
        // Capitals and bases swell where the column meets floor and vault.
        puff(cx * 0.94, TOP - 1.5, cz * 0.94, r * 1.9, 2.2, r * 1.9);
        puff(cx * 0.95, BOTTOM + 2, cz * 0.95, r * 1.7, 1.8, r * 1.7);
      } else if (a.walls === 'shredded') {
        for (let y = BOTTOM - 2; y < TOP + 3; y += mix(1.6, 2.8, random())) {
          if (random() < 0.22 + mood.wear * 0.2) continue;
          const r = mix(1.6, 3.4, random());
          if (random() < 0.5) puff(cx + (random() - 0.5) * 3, y, cz + (random() - 0.5) * 3, r, r * 0.8, r);
          else puff(cx * mix(0.8, 1.05, random()), y, cz * mix(0.8, 1.05, random()), r * mix(1.7, 2.6, random()), r * 0.32, r * 0.7, facing + Math.PI / 2 + (random() - 0.5) * 0.6);
        }
      } else {
        for (let y = BOTTOM - 2; y < TOP + 3; y += 2.4) {
          // Each tower leans round the chamber as it climbs: stacked, the bands read as rotation.
          const twist = angle + (y - BOTTOM) * 0.045;
          const tx = Math.sin(twist) * RX * out, tz = Math.cos(twist) * RZ * out;
          if (Math.abs(Math.atan2(tx, tz)) < 0.5) continue;
          const r = mix(2.2, 3.3, random());
          puff(tx, y, tz, r * 2.1, r * 0.62, r * 1.1, Math.atan2(tx, tz) + Math.PI / 2 + 0.25);
        }
      }
    }
    // The vault: a ceiling of cloud with the opening left in it.
    const hole = { oculus: 4.2, tear: 2.4, several: 2.2, closing: 1.2 }[a.opening] * S;
    const holes: [number, number, number][] = a.opening === 'several'
      ? [[0, -1, hole], [-6.5 * S, -5 * S, hole * 0.8], [6 * S, -6.5 * S, hole * 0.7]]
      : [[0, -1, hole]];
    for (let i = 0; i < 70; i++) {
      const angle = random() * Math.PI * 2, reach = Math.sqrt(random());
      const x = Math.sin(angle) * RX * reach, z = Math.cos(angle) * RZ * reach;
      const r = mix(2.4, 4.2, random());
      const blocked = holes.some(([hx, hz, hr]) => Math.hypot((x - hx) * (a.opening === 'tear' ? 0.3 : 1), z - hz) < hr + r * 0.8);
      if (blocked) continue;
      puff(x, TOP + 1.2 + random() * 1.6, z, r, r * 0.7, r, 0, 0.92);
    }
    // The floor of vapour.
    const floorY = BOTTOM - 0.5;
    const pit = a.floor === 'gap' ? 6.5 * S : 0;
    for (let i = 0; i < (a.floor === 'boiling' ? 70 : 46); i++) {
      const angle = random() * Math.PI * 2, reach = Math.sqrt(random());
      const x = Math.sin(angle) * RX * 1.05 * reach, z = Math.cos(angle) * RZ * 1.05 * reach + (a.floor === 'gap' ? 0 : 0);
      if (pit && Math.hypot(x, z + 1) < pit) continue;
      const r = mix(2.6, 4.6, random());
      if (a.floor === 'boiling') { const h = mix(1.2, 4.2, random()); puff(x, floorY + h * 0.5, z, r * 0.62, h, r * 0.62, 0, 0.8); }
      else puff(x, floorY, z, r * 1.3, r * 0.32, r * 1.3, 0, 0.8);
    }
    const cloud = new THREE.InstancedMesh(lump, new THREE.MeshBasicMaterial({ vertexColors: true }), matrices.length);
    matrices.forEach((matrix, index) => { cloud.setMatrixAt(index, matrix); cloud.setColorAt(index, tints[index]); });
    cloud.instanceMatrix.needsUpdate = true;
    if (cloud.instanceColor) cloud.instanceColor.needsUpdate = true;
    cloud.frustumCulled = false;
    root.add(cloud);

    // The floor itself, and whatever lies under it.
    const floorTone = dark.clone().lerp(haze, 0.25);
    let ground: THREE.Mesh;
    if (a.floor === 'gap') {
      const ring = new THREE.Mesh(new THREE.RingGeometry(pit * 0.95, 70, 48), new THREE.MeshBasicMaterial({ color: floorTone, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, floorY - 0.6, -1);
      root.add(ring);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const fields = ['#8fa25a', '#b9a565', '#6f8a4e', '#c9b77a', '#7d9460', '#a38f58'];
      for (let x = 0; x < 256; x += 32) for (let y = 0; y < 256; y += 32) {
        ctx.fillStyle = fields[Math.floor(random() * fields.length)];
        ctx.fillRect(x, y, 32, 32);
        if (random() < 0.3) { ctx.fillStyle = fields[Math.floor(random() * fields.length)]; ctx.fillRect(x, y, 32, 16); }
      }
      ctx.strokeStyle = '#5f7f96'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(0, 60 + random() * 100); ctx.bezierCurveTo(90, 20, 150, 240, 256, 130 + random() * 80); ctx.stroke();
      ctx.strokeStyle = '#d9d2bd'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(100, 0); ctx.lineTo(120, 256); ctx.moveTo(0, 180); ctx.lineTo(256, 160); ctx.stroke();
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      ground = new THREE.Mesh(new THREE.CircleGeometry(60, 40), new THREE.MeshBasicMaterial({ map, color: haze.clone().lerp(new THREE.Color('#ffffff'), 0.55) }));
      ground.position.set(0, floorY - 22, -1);
    } else {
      ground = new THREE.Mesh(new THREE.CircleGeometry(70, 48), new THREE.MeshBasicMaterial({ color: floorTone }));
      ground.position.set(0, floorY - 0.6, 0);
    }
    ground.rotation.x = -Math.PI / 2;
    root.add(ground);

    // ----- the opening and its shafts
    const beams: THREE.MeshBasicMaterial[] = [];
    const dim = a.opening === 'closing' ? 0.55 : 1;
    const shaft = (hx: number, hz: number, radius: number, to: THREE.Vector3, strength: number, squash = 1) => {
      const from = new THREE.Vector3(hx + sunLean * 0.25, TOP + 3, hz);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(radius * 1.9, 28), new THREE.MeshBasicMaterial({ color: sky.clone().lerp(haze, 1 - dim) }));
      disc.rotation.x = Math.PI / 2;
      disc.scale.x = squash < 1 ? 3.2 : 1;
      disc.position.set(hx, TOP + 3.4, hz);
      root.add(disc);
      const length = from.distanceTo(to);
      for (const [k, opacity] of [[1, 0.13], [0.62, 0.15], [0.3, 0.16]] as const) {
        const material = new THREE.MeshBasicMaterial({ color: sky.clone().lerp(lit, 0.45), transparent: true, opacity: opacity * strength * dim, depthWrite: false, side: THREE.DoubleSide });
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(radius * k, radius * k * 1.55 + 0.4 * k, length, 32, 1, true), material);
        cone.position.copy(from).lerp(to, 0.5);
        cone.quaternion.setFromUnitVectors(up, from.clone().sub(to).normalize());
        cone.scale.x = squash < 1 ? 2.6 : 1;
        cone.scale.z = squash;
        cone.renderOrder = 5;
        root.add(cone);
        beams.push(material);
      }
    };
    shaft(holes[0][0], holes[0][1], hole * 0.82, new THREE.Vector3(0, floorY - 1, 0.5), 1, a.opening === 'tear' ? 0.3 : 1);
    if (a.opening === 'several') {
      shaft(holes[1][0], holes[1][1], holes[1][2] * 0.7, new THREE.Vector3(5 * S, floorY, 2), 0.75);
      shaft(holes[2][0], holes[2][1], holes[2][2] * 0.7, new THREE.Vector3(-7 * S, floorY, -3), 0.75);
    }

    // ----- lightning
    let boltMaterial: THREE.MeshStandardMaterial | null = null;
    if (a.lightning === 'bolt' || a.lightning === 'web') {
      const core: THREE.BufferGeometry[] = [], halo: THREE.BufferGeometry[] = [];
      const jag = (from: THREE.Vector3, to: THREE.Vector3, depth: number): THREE.Vector3[] => {
        if (!depth) return [from, to];
        const middle = from.clone().add(to).multiplyScalar(0.5);
        middle.add(new THREE.Vector3(random() - 0.5, random() - 0.5, (random() - 0.5) * 0.4).multiplyScalar(from.distanceTo(to) * 0.3));
        return [...jag(from, middle, depth - 1), ...jag(middle, to, depth - 1).slice(1)];
      };
      const stroke = (from: THREE.Vector3, to: THREE.Vector3, radius: number, forks: number) => {
        const path = jag(from, to, 4);
        for (let i = 0; i < path.length - 1; i++) {
          const d = path[i + 1].clone().sub(path[i]);
          const q = new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize());
          const middle = path[i].clone().add(path[i + 1]).multiplyScalar(0.5);
          for (const [list, k] of [[core, 1], [halo, 2.6]] as const) {
            const g = new THREE.CylinderGeometry(radius * k, radius * k, d.length() * 1.08, 5, 1);
            g.applyQuaternion(q);
            g.translate(middle.x, middle.y, middle.z);
            list.push(g);
          }
        }
        for (let i = 0; i < forks; i++) {
          const start = path[2 + Math.floor(random() * (path.length - 4))];
          stroke(start, start.clone().add(new THREE.Vector3((random() - 0.5) * 7, -2 - random() * 5, (random() - 0.5) * 2)), radius * 0.45, 0);
        }
      };
      const wall = (sign: number, y: number, z: number) => new THREE.Vector3(sign * RX * 0.8, y, z);
      if (a.lightning === 'bolt') stroke(wall(-1, mix(2, 8, random()), -RZ * 0.55), wall(1, mix(-6, 3, random()), -RZ * 0.5), 0.2, 3);
      else for (let i = 0; i < 6; i++) {
        const sign = i % 2 ? 1 : -1;
        stroke(wall(sign, mix(-9, 10, random()), mix(-RZ * 0.75, -2, random())), wall(sign * mix(-0.6, 0.7, random()), mix(-9, 10, random()), -RZ * mix(0.55, 0.8, random())), 0.11, 2);
      }
      boltMaterial = new THREE.MeshStandardMaterial({ color: '#cfc4ff', emissive: '#f6f0ff', emissiveIntensity: 0.9, roughness: 0.5 });
      root.add(new THREE.Mesh(mergeGeometries(core)!, boltMaterial));
      root.add(new THREE.Mesh(mergeGeometries(halo)!, new THREE.MeshBasicMaterial({ color: '#7a55ff', transparent: true, opacity: 0.5, depthWrite: false, side: THREE.BackSide })));
      [...core, ...halo].forEach((g) => g.dispose());
    }

    // ----- what the updraught carries
    const swirl = new THREE.Group();
    root.add(swirl);
    const adrift = (count: number, geometry: THREE.BufferGeometry, material: THREE.Material, size: [number, number], stretch: [number, number, number] = [1, 1, 1], tumble = true) => {
      const mesh = new THREE.InstancedMesh(geometry, material, count);
      const palette = (material as THREE.MeshStandardMaterial).userData.palette as string[] | undefined;
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2, reach = mix(3.5, RX * 0.72, Math.sqrt(random()));
        const at = new THREE.Vector3(Math.sin(angle) * reach, mix(BOTTOM + 2, TOP - 1, random()), Math.cos(angle) * reach * 0.8 - 1);
        const q = tumble ? new THREE.Quaternion().setFromEuler(new THREE.Euler(random() * 6, random() * 6, random() * 6)) : new THREE.Quaternion().setFromEuler(new THREE.Euler(0, random() * 6, (random() - 0.5) * 0.5));
        const k = mix(size[0], size[1], Math.pow(random(), 2));
        mesh.setMatrixAt(i, new THREE.Matrix4().compose(at, q, new THREE.Vector3(k * stretch[0], k * stretch[1], k * stretch[2])));
        if (palette) mesh.setColorAt(i, new THREE.Color(palette[i % palette.length]));
      }
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      swirl.add(mesh);
      return mesh;
    };
    const plenty = mix(0.5, 1.5, mood.density);
    if (a.carried === 'hail') {
      adrift(Math.round(90 * plenty), new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#e9f1f6', roughness: 0.25 }), [0.07, 0.42]);
    } else if (a.carried === 'rain') {
      const rain = adrift(Math.round(170 * plenty), new THREE.CylinderGeometry(0.018, 0.018, 1, 4), new THREE.MeshBasicMaterial({ color: lit.clone().lerp(new THREE.Color('#dfeaf2'), 0.5) }), [0.5, 1.5], [1, 1, 1], false);
      rain.rotation.z = 0.22;
    } else if (a.carried === 'debris') {
      const wood = new THREE.MeshStandardMaterial({ roughness: 0.9 });
      wood.userData.palette = ['#8a6a44', '#5f4a36', '#a8875a', '#6b6f73', '#7c3b2c'];
      adrift(Math.round(34 * plenty), new THREE.BoxGeometry(1, 0.08, 0.22), wood, [0.5, 1.5]);
      const leaf = new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide });
      leaf.userData.palette = ['#6f8f3a', '#b9a23a', '#f1ecd8', '#f1ecd8', '#9a5a2a'];
      adrift(Math.round(80 * plenty), new THREE.PlaneGeometry(1, 0.7), leaf, [0.12, 0.42]);
    } else if (a.carried === 'birds') {
      // A bird is two swept wings: enough at this distance.
      const wing = new THREE.BufferGeometry();
      wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.18, -1, 0.32, -0.2, -0.25, 0.05, -0.12, 0, 0, 0.18, 0.25, 0.05, -0.12, 1, 0.32, -0.2, 0, 0, 0.18, -0.25, 0.05, -0.12, 0.25, 0.05, -0.12], 3));
      wing.computeVertexNormals();
      adrift(Math.round(42 * plenty), wing, new THREE.MeshStandardMaterial({ color: dark.clone().multiplyScalar(0.55), side: THREE.DoubleSide, roughness: 1 }), [0.3, 0.62], [1, 1, 1], false);
    } else if (a.carried === 'ice') {
      adrift(Math.round(240 * plenty), new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: sky }), [0.03, 0.11]);
    }

    // ----- camera
    const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 400);
    const eye = { across: [0, 0.8, 27], up: [0, -8.5, 25], down: [0, 11, 24.5] }[a.view];
    const aim = { across: [0, 0.3, 0], up: [0, 2.2, 0], down: [0, -1.6, 0] }[a.view];
    camera.position.set(eye[0], eye[1], eye[2]);
    camera.lookAt(aim[0], aim[1], aim[2]);

    // ----- where things hang: the hero in the shaft, the rest above and below it
    const slots: { at: [number, number, number]; height: number; radius: number }[] = [
      { at: [0, 0.2, 1], height: 6.6, radius: 3.5 },
      { at: [-6.8, 4.6, -3.5], height: 3.6, radius: 2.3 },
      { at: [6.8, -3.4, -2.5], height: 3.6, radius: 2.3 },
      { at: [-6.2, -5.2, 2.5], height: 3.0, radius: 1.9 },
      { at: [6.2, 5.6, -6], height: 3.2, radius: 2.1 },
    ];
    const hung: { holder: THREE.Group; y: number; phase: number }[] = [];
    const place = (items: readonly Placeable[]) => {
      hung.length = 0;
      items.forEach((item, index) => {
        const slot = slots[index % slots.length];
        const scale = Math.min(slot.height / Math.max(item.height, 0.01), slot.radius / Math.max(item.radius, 0.01));
        item.holder.scale.setScalar(scale);
        const y = slot.at[1] - (item.height * scale) / 2;
        item.holder.position.set(slot.at[0], y, slot.at[2]);
        item.holder.rotation.y = (item.hero ? 0.35 : (random() - 0.5) * 1.6) + (random() - 0.5) * 0.3;
        item.holder.updateMatrixWorld(true);
        hung.push({ holder: item.holder, y, phase: index * 1.7 });
      });
      camera.updateMatrixWorld(true);
    };

    const pace = mix(0.25, 1.6, mood.energy);
    const sway = mix(0.05, 0.3, mood.energy);
    const beamBase = beams.map((beam) => beam.opacity);
    return {
      object: root,
      camera,
      background,
      capacity: slots.length,
      ground,
      keyLight: key,
      place,
      update(dt, time) {
        swirl.rotation.y += dt * pace * 0.08;
        for (const item of hung) item.holder.position.y = item.y + Math.sin(time * pace * 0.9 + item.phase) * sway;
        if (boltMaterial) boltMaterial.emissiveIntensity = 0.5 + 0.6 * Math.abs(Math.sin(time * pace * 9) * Math.sin(time * pace * 2.7));
        beams.forEach((beam, index) => { beam.opacity = beamBase[index] * (0.9 + 0.1 * Math.sin(time * pace * 0.7 + index)); });
      },
      dispose() {
        key.shadow.map?.dispose();
        disposeTree(root);
      },
    };
  },
});
