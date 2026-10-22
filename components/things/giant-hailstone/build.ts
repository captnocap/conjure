import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

export default defineThing({
  questions: {
    size: score('How big is the largest stone?', ['A pea', 'A marble', 'A golf ball', 'A hen egg', 'A grapefruit']),
    shape: choice('What shape is it?', {
      smooth: 'A smooth, slightly flattened ball, like a river pebble of ice.',
      knobbly: 'Knobbly all over with rounded lobes, like a frozen blackberry.',
      spiked: 'Bristling with icicle spikes in every direction, a medieval mace head.',
      cluster: 'Several stones fused together in mid-air into one ugly clump.',
      saucer: 'A flattened disc with a rippled rim, like a tiny flying saucer.',
    }),
    ice: choice('What is the ice like?', {
      clear: 'Glass clear and blue, with a cloudy white seed at the heart.',
      milky: 'Opaque milky white, full of trapped air.',
      ringed: 'Banded: alternating clear and milky layers showing on the surface.',
      dirty: 'Greyish and gritty, with dust and a leaf fragment frozen in.',
    }),
    count: choice('How many are there?', {
      one: 'One single specimen.',
      pair: 'Two, a big one and a smaller one.',
      handful: 'A handful scattered where they bounced.',
      drift: 'A heaped drift of them, the aftermath.',
    }),
    story: choice('What has happened to it?', {
      fresh: 'It has just landed, dry and sharp-edged.',
      melting: 'It is melting in a spreading puddle, edges going soft.',
      sliced: 'It has been cut in half to show the onion rings inside.',
      impact: 'It sits in the dent it made in a sheet of painted car metal.',
      glass: 'It lies on a pane of glass it has starred with cracks.',
    }),
    scale: choice('What is beside it for scale?', {
      none: 'Nothing, just the ice.',
      coin: 'A coin laid flat.',
      golf: 'A golf ball.',
      ruler: 'A wooden ruler.',
      egg: 'A brown hen egg.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = mix(0.004, 0.058, Math.pow(a.size, 1.3));
    const melt = a.story === 'melting' ? 1 : 0;

    // Banded surface: a strip of irregular milky and clear layers wrapped round the stone.
    const bands = (rings: boolean) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      if (rings) {
        ctx.fillStyle = '#e9f1f5';
        ctx.fillRect(0, 0, 256, 256);
        let radius = 126;
        let milky = true;
        while (radius > 6) {
          ctx.beginPath();
          ctx.arc(128, 128, radius, 0, Math.PI * 2);
          ctx.fillStyle = milky ? `rgb(${236 + random() * 14},${242 + random() * 10},250)` : `rgb(${120 + random() * 40},${170 + random() * 30},${205 + random() * 20})`;
          ctx.fill();
          radius -= milky ? 8 + random() * 16 : 5 + random() * 9;
          milky = !milky;
        }
        ctx.beginPath();
        ctx.arc(128, 128, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = 'rgba(70,110,140,0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(128, 128, 126, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        let y = 0;
        let milky = true;
        while (y < 256) {
          const h = 10 + random() * 26;
          ctx.fillStyle = milky ? '#e6eef3' : a.ice === 'ringed' ? `rgb(${95 + random() * 30},${150 + random() * 20},196)` : `rgb(${176 + random() * 16},${202 + random() * 12},222)`;
          ctx.fillRect(0, y, 256, h + 1);
          y += h;
          milky = !milky;
        }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    const tone = { clear: '#7fb2d0', milky: '#ffffff', ringed: '#ffffff', dirty: '#c9c6b8' }[a.ice];
    const ice = new THREE.MeshPhysicalMaterial({
      color: tone, roughness: a.ice === 'clear' ? 0.06 : mix(0.38, 0.12, melt), clearcoat: 1, clearcoatRoughness: 0.12,
      map: a.ice === 'clear' ? null : bands(false),
      transparent: a.ice === 'clear', opacity: a.ice === 'clear' ? 0.62 : 1,
      flatShading: false,
    });
    const seed = new THREE.MeshStandardMaterial({ color: '#f4f8fa', roughness: 0.6 });
    const cut = new THREE.MeshPhysicalMaterial({ map: bands(true), roughness: 0.2, clearcoat: 0.8 });

    /** One stone of unit radius. Lobes push the surface out; spikes are fused on. */
    const stone = (half: boolean) => {
      const body = new THREE.SphereGeometry(1, 44, half ? 16 : 30, 0, Math.PI * 2, 0, half ? Math.PI / 2 : Math.PI);
      const lobeCount = { smooth: 5, knobbly: 26, spiked: 12, cluster: 8, saucer: 14 }[a.shape];
      const lobes = Array.from({ length: lobeCount }, () => ({
        d: new THREE.Vector3(random() - 0.5, (random() - 0.5) * (a.shape === 'saucer' ? 0.15 : 1), random() - 0.5).normalize(),
        amp: { smooth: 0.08, knobbly: 0.3, spiked: 0.16, cluster: 0.2, saucer: 0.2 }[a.shape] * mix(0.5, 1.2, random()) * mix(0.75, 1.15, a.size),
        sharp: { smooth: 2, knobbly: 10, spiked: 8, cluster: 4, saucer: 14 }[a.shape],
      }));
      const p = body.attributes.position as THREE.BufferAttribute;
      const v = new THREE.Vector3();
      const squash = a.shape === 'saucer' ? 0.42 : a.shape === 'smooth' ? 0.82 : mix(0.86, 1, random());
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).normalize();
        let push = 0;
        for (const lobe of lobes) push += lobe.amp * Math.pow(Math.max(0, v.dot(lobe.d)), lobe.sharp);
        push *= 1 - melt * 0.6;
        const fade = half ? Math.min(1, v.y * 5) : 1;
        v.multiplyScalar(1 + push * fade);
        if (!half) v.y *= squash;
        p.setXYZ(i, v.x, v.y, v.z);
      }
      body.computeVertexNormals();
      const parts: THREE.BufferGeometry[] = [body];
      if (a.shape === 'spiked' && !half) {
        const spikes = Math.round(mix(14, 24, random()) * (1 - melt * 0.4));
        for (let i = 0; i < spikes; i++) {
          const d = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
          const length = mix(0.6, 1.5, random()) * (1 - melt * 0.55);
          const cone = new THREE.ConeGeometry(mix(0.1, 0.2, random()), length, 7, 1);
          cone.translate(0, length / 2 + 0.78, 0);
          cone.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d));
          parts.push(cone);
        }
      }
      if (a.shape === 'cluster' && !half) {
        const extra = 3 + Math.floor(random() * 3);
        for (let i = 0; i < extra; i++) {
          const d = new THREE.Vector3(random() - 0.5, (random() - 0.5) * 0.7, random() - 0.5).normalize();
          const r = mix(0.5, 0.82, random());
          const lump = new THREE.SphereGeometry(r, 24, 16);
          lump.translate(d.x * (0.72 + r * 0.35), d.y * (0.72 + r * 0.35), d.z * (0.72 + r * 0.35));
          parts.push(lump);
        }
      }
      if (parts.length === 1) return body;
      const merged = mergeGeometries(parts)!;
      parts.forEach((g) => g.dispose());
      return merged;
    };
    const lowest = (geometry: THREE.BufferGeometry, turn: THREE.Euler) => {
      const m = new THREE.Matrix4().makeRotationFromEuler(turn);
      const p = geometry.attributes.position as THREE.BufferAttribute;
      const v = new THREE.Vector3();
      let min = Infinity;
      for (let i = 0; i < p.count; i += 3) min = Math.min(min, v.fromBufferAttribute(p, i).applyMatrix4(m).y);
      return min;
    };

    const whole = [stone(false), stone(false)];
    const stones: THREE.Mesh[] = [];
    const lay = (geometry: THREE.BufferGeometry, radius: number, x: number, z: number, lift = 0) => {
      const turn = new THREE.Euler(random() * 6.3, random() * 6.3, random() * 6.3);
      const sink = melt ? 0.22 : 0;
      const mesh = s.mesh(geometry, ice, [x, lift - (lowest(geometry, turn) + sink) * radius, z]);
      mesh.rotation.copy(turn);
      mesh.scale.setScalar(radius);
      if (a.ice === 'clear') {
        const heart = s.ball([radius * 0.36, radius * 0.36, radius * 0.36], [x, mesh.position.y, z], seed, 12);
        heart.renderOrder = -1;
      }
      stones.push(mesh);
      return mesh;
    };

    let baseLift = 0;
    // What it landed on.
    if (a.story === 'impact') {
      const paint = s.material(new THREE.Color().setHSL(mix(0.6, 0.02, mood.warmth), 0.55, 0.36), { metalness: 0.55, roughness: mix(0.18, 0.6, mood.wear) });
      const size = R * 5 + 0.03;
      const panel = new THREE.PlaneGeometry(size, size * 0.8, 40, 32);
      const dents = Array.from({ length: 4 + Math.floor(random() * 4) }, (_unused, i) => ({ x: i === 0 ? 0 : (random() - 0.5) * size * 0.8, y: i === 0 ? 0 : (random() - 0.5) * size * 0.6, r: R * (i === 0 ? 1.3 : mix(0.4, 0.8, random())) }));
      const p = panel.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        let z = 0;
        for (const dent of dents) {
          const d = Math.hypot(p.getX(i) - dent.x, p.getY(i) - dent.y) / dent.r;
          z -= Math.exp(-d * d) * dent.r * 0.4;
        }
        p.setZ(i, z);
      }
      panel.computeVertexNormals();
      baseLift = R * 0.7 + 0.004;
      const sheet = s.mesh(panel, paint, [0, baseLift, 0]);
      sheet.rotation.x = -Math.PI / 2;
      (paint as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      // A skirt round the edge, so the sheet reads as a cut section of bonnet and not a floating cloth.
      for (const side of [-1, 1]) {
        s.box([size, baseLift, size * 0.012], [0, baseLift / 2, side * size * 0.4], paint);
        s.box([size * 0.012, baseLift, size * 0.8], [side * size * 0.5, baseLift / 2, 0], paint);
      }
      baseLift -= R * 0.52;
    } else if (a.story === 'glass') {
      const size = R * 5 + 0.03;
      const glass = new THREE.MeshPhysicalMaterial({ color: '#9fc0bf', roughness: 0.08, transparent: true, opacity: 0.55, metalness: 0.1 });
      s.box([size, 0.004 + R * 0.06, size * 0.8], [0, 0.002 + R * 0.03, 0], glass);
      baseLift = 0.004 + R * 0.06;
      const crack = s.material('#f4f8f8', { roughness: 0.4 });
      const rays = 9 + Math.floor(random() * 6);
      for (let i = 0; i < rays; i++) {
        const angle = (i / rays) * Math.PI * 2 + random() * 0.4;
        let from: [number, number, number] = [0, baseLift, 0];
        const steps = 2 + Math.floor(random() * 2);
        for (let k = 1; k <= steps; k++) {
          const reach = (k / steps) * size * mix(0.2, 0.42, random());
          const bend = angle + (random() - 0.5) * 0.35;
          const to: [number, number, number] = [Math.max(-size / 2, Math.min(size / 2, Math.cos(bend) * reach)), baseLift, Math.max(-size * 0.4, Math.min(size * 0.4, Math.sin(bend) * reach))];
          s.rod(from, to, size * 0.004, crack).castShadow = false;
          from = to;
        }
      }
      for (const ring of [0.6, 1.1]) s.ring(R * ring + 0.004, size * 0.003, [0, baseLift, 0], crack).rotation.x = Math.PI / 2;
    } else if (a.story === 'melting') {
      const water = new THREE.MeshPhysicalMaterial({ color: '#8fb3c4', roughness: 0.03, metalness: 0.2, transparent: true, opacity: 0.7 });
      const pool = new THREE.Shape();
      for (let i = 0; i <= 28; i++) {
        const angle = (i / 28) * Math.PI * 2, r = R * mix(2.2, 3.4, 0.5 + 0.5 * Math.sin(angle * 3 + random() * 0.6) * Math.cos(angle * 2));
        if (i === 0) pool.moveTo(Math.cos(angle) * r, Math.sin(angle) * r); else pool.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      const puddle = s.mesh(new THREE.ExtrudeGeometry(pool, { depth: R * 0.06, bevelEnabled: false, curveSegments: 4 }), water);
      puddle.rotation.x = -Math.PI / 2;
      puddle.castShadow = false;
    }

    if (a.story === 'sliced') {
      const half = stone(true);
      for (const side of [-1, 1]) {
        const group = new THREE.Group();
        const dome = new THREE.Mesh(half, ice);
        const face = new THREE.Mesh(new THREE.CircleGeometry(1, 44), cut);
        face.rotation.x = Math.PI / 2;
        dome.castShadow = face.castShadow = true;
        group.add(dome, face);
        group.scale.setScalar(R * (side < 0 ? 1 : 0.94));
        // Each half rocks back on its dome so the cut face tilts up toward the viewer.
        group.rotation.set(Math.PI + 0.95, side * 0.5 + (random() - 0.5) * 0.3, 0);
        group.position.set(side * R * 1.15, R * 0.86, 0);
        s.root.add(group);
      }
      const blade = s.material('#c9ced2', { metalness: 0.9, roughness: 0.2 });
      const knife = s.box([R * 0.5, R * 0.03 + 0.0006, R * 3.2], [0, R * 0.02, -R * 2.3], blade);
      knife.rotation.y = 0.5;
      s.box([R * 0.42, R * 0.22, R * 1.5], [-R * 1.12, R * 0.11, -R * 4.3], s.material('#3d2b20')).rotation.y = 0.5;
    } else {
      lay(whole[0], R, 0, 0, baseLift);
      if (a.count !== 'one') lay(whole[1], R * mix(0.5, 0.7, random()), R * 2.1, R * 0.9, baseLift);
      const extra = a.count === 'handful' ? 4 + Math.floor(random() * 3) : a.count === 'drift' ? 12 + Math.floor(mood.density * 10) : 0;
      for (let i = 0; i < extra; i++) {
        const angle = random() * Math.PI * 2;
        const drift = a.count === 'drift';
        const reach = R * (drift ? mix(1.5, 3.2, Math.sqrt(random())) : mix(1.9, 3.6, random()));
        const r = R * mix(0.2, drift ? 0.48 : 0.42, random());
        // A drift banks up behind the big stone.
        const pile = drift ? Math.max(0, R * 1.5 - reach * 0.42) * random() : 0;
        lay(whole[i % 2], r, Math.cos(angle) * reach, Math.sin(angle) * reach * (drift ? 0.7 : 1) - (drift ? R * 1.5 : 0), baseLift * (reach < R * 3 ? 1 : 0) + pile);
      }
    }

    if (a.ice === 'dirty') {
      const grit = s.material('#4a4338', { roughness: 1 });
      const specks = Array.from({ length: 30 }, () => {
        const d = new THREE.Vector3(random() - 0.5, random() * 0.9, random() - 0.5).normalize().multiplyScalar(R * 0.99);
        return { at: [d.x, d.y + R * (a.story === 'sliced' ? -9 : 0.95) + baseLift, d.z] as [number, number, number], size: R * mix(0.02, 0.06, random()) };
      });
      s.scatter(new THREE.IcosahedronGeometry(1, 0), grit, specks);
    }

    // A familiar object of fixed true size, so the stone's size reads.
    const sx = -(R * 1.6 + 0.03), sz = R * 1.2 + 0.012;
    if (a.scale === 'coin') {
      const metal = s.material('#b8863b', { metalness: 0.85, roughness: 0.3 });
      s.cylinder(0.0122, 0.0122, 0.0018, [sx, 0.0009, sz], metal, 32);
      s.ring(0.0108, 0.0005, [sx, 0.0019, sz], metal).rotation.x = Math.PI / 2;
    } else if (a.scale === 'golf') {
      s.ball([0.02135, 0.02135, 0.02135], [sx - 0.01, 0.02135, sz], new THREE.MeshStandardMaterial({ color: '#f7f6f0', roughness: 0.35, flatShading: true }), 14);
    } else if (a.scale === 'egg') {
      const egg = s.lathe(Array.from({ length: 16 }, (_unused, i) => {
        const t = (i / 15) * Math.PI;
        return [Math.sin(t) * 0.0215 * (1 - 0.14 * Math.cos(t)), -Math.cos(t) * 0.028] as const;
      }), s.material('#b98360', { roughness: 0.55 }), [sx - 0.012, 0.0215, sz]);
      egg.rotation.z = Math.PI / 2 - 0.1;
      egg.rotation.y = 0.6;
    } else if (a.scale === 'ruler') {
      const length = 0.15;
      const ruler = s.box([length, 0.003, 0.026], [0, 0.0015, R * 1.5 + 0.03], s.material('#d6b06a'));
      const canvas = document.createElement('canvas');
      canvas.width = 600; canvas.height = 104;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#dfbb74'; ctx.fillRect(0, 0, 600, 104);
      ctx.fillStyle = '#2a2018';
      for (let mm = 0; mm <= 150; mm += 5) ctx.fillRect(mm * 4 - 1, 0, mm % 10 === 0 ? 3 : 2, mm % 50 === 0 ? 56 : mm % 10 === 0 ? 40 : 22);
      ctx.font = 'bold 34px monospace'; ctx.textAlign = 'center';
      for (let cm = 1; cm < 15; cm += 2) ctx.fillText(String(cm), cm * 40, 92);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const face = s.mesh(new THREE.PlaneGeometry(length, 0.026), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7 }), [0, 0.0032, R * 1.5 + 0.03]);
      face.rotation.x = -Math.PI / 2;
      ruler.rotation.y = face.rotation.z = 0.12;
    }

    const wobble = mix(0, 0.5, mood.energy);
    const rest = stones.map((stoneMesh) => stoneMesh.rotation.z);
    return s.finish({
      update(_dt, time) {
        if (!stones[0] || melt) return;
        // The big one is still rocking where it came to rest.
        stones[0].rotation.z = rest[0] + Math.sin(time * 5) * 0.05 * wobble * Math.max(0, 1 - (time % 6) / 3);
      },
    });
  },
});
