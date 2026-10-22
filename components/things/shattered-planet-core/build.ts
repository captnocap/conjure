import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const MATERIALS = {
  iron: 'Dark pitted iron and nickel, glowing forge-orange where it is still hot.',
  diamond: 'A faceted pale-blue crystal heart, compressed carbon catching the light.',
  slag: 'Glassy black-green slag, fused and bubbled like obsidian.',
  rust: 'Oxidised red-brown, an iron heart gone to rust in the open.',
} as const;
const LOOK: Record<keyof typeof MATERIALS, { body: string; hot: string; metal: number; rough: number; flat: boolean }> = {
  iron: { body: '#4b4d55', hot: '#ff7a1e', metal: 0.75, rough: 0.55, flat: false },
  diamond: { body: '#5b93c4', hot: '#3fc0ff', metal: 0.25, rough: 0.12, flat: true },
  slag: { body: '#1f2b27', hot: '#b6e23a', metal: 0.4, rough: 0.18, flat: false },
  rust: { body: '#7c3b24', hot: '#ff5a2a', metal: 0.35, rough: 0.85, flat: false },
};

type P = [number, number, number];

export default defineThing({
  questions: {
    broken: choice('How broken is it?', {
      cracked: 'Whole but fissured: deep glowing cracks and a few slabs lifting away.',
      halved: 'Split clean in two, the halves drifting apart and showing their layered insides.',
      peeled: 'The core intact, with a few last curved plates of crust and ground still hanging round it.',
      shards: 'Burst into a loose cluster of great angular shards round a small surviving nucleus.',
    }),
    material: choice('What is the core made of?', MATERIALS),
    glow: score('How much of it is still glowing?', ['One dull ember spot', 'A warm face on one side', 'Half of it still molten']),
    halo: choice('How does its rubble hang around it?', {
      ring: 'A flat tilted ring, already settling into order.',
      cloud: 'A loose spherical swarm in every direction.',
      stream: 'A long curved stream trailing off to one side, like a comet of gravel.',
    }),
    survivor: choice('Does anything artificial survive?', {
      none: 'Nothing: only rock and metal.',
      beacon: 'A single mast on one drifting shard, with a light still blinking.',
      city: 'A fragment of city on a slab of crust: a few towers, some windows lit.',
      ring: 'A broken arc of an orbital ring station, snapped at both ends.',
      tether: 'The stub of a space elevator, a thin bent cable still anchored to the core.',
    }),
    moon: noul('Does a small moon still circle it, as if nothing had happened?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const look = LOOK[a.material];
    const R = 1.5;
    const glow = mix(0.8, 1.5, mood.cheer);
    const hot = new THREE.Color(look.hot).lerp(new THREE.Color('#ff3a1a'), mood.warmth * 0.25).lerp(new THREE.Color('#8fd0ff'), (1 - mood.warmth) * 0.15);
    const hotHex = `#${hot.getHexString()}`;
    const core = new THREE.Group();
    core.rotation.set(mix(-0.2, 0.2, random()), -Math.PI / 2 + mix(-0.5, 0.5, random()), mix(-0.15, 0.3, random()));
    s.root.add(core);
    const spin = new THREE.Group();
    s.root.add(spin);

    // Lumpy noise: a few random sine lobes over direction.
    const lobes = Array.from({ length: 7 }, () => ({ k: new THREE.Vector3((random() - 0.5) * 9, (random() - 0.5) * 9, (random() - 0.5) * 9), p: random() * 6.3, w: mix(0.2, 1, random()) }));
    const bump = (d: THREE.Vector3) => lobes.reduce((sum, lobe) => sum + Math.sin(d.dot(lobe.k) + lobe.p) * lobe.w, 0) / 4;
    const roughen = (geometry: THREE.BufferGeometry, amount: number) => {
      const position = geometry.attributes.position as THREE.BufferAttribute;
      const v = new THREE.Vector3(), d = new THREE.Vector3();
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i);
        const length = v.length();
        if (length < 1e-4) continue;
        d.copy(v).divideScalar(length);
        v.addScaledVector(d, bump(d) * amount * length);
        position.setXYZ(i, v.x, v.y, v.z);
      }
      geometry.computeVertexNormals();
      return geometry;
    };

    // Surface: pits and seams for colour, and where it is still hot for the emissive map. The hot face is at u = 0.5.
    const W = 1024, H = 512;
    const paintCanvas = document.createElement('canvas'), lightCanvas = document.createElement('canvas');
    paintCanvas.width = lightCanvas.width = W; paintCanvas.height = lightCanvas.height = H;
    const c = paintCanvas.getContext('2d')!, e = lightCanvas.getContext('2d')!;
    const body = new THREE.Color(look.body);
    c.fillStyle = `#${body.getHexString()}`;
    c.fillRect(0, 0, W, H);
    e.fillStyle = '#000';
    e.fillRect(0, 0, W, H);
    for (let i = 0; i < 420; i++) {
      c.fillStyle = random() < 0.55 ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.09)';
      c.beginPath();
      c.ellipse(random() * W, random() * H, 3 + random() * 22, 2 + random() * 11, random() * 3, 0, 7);
      c.fill();
    }
    const spot = mix(90, 330, a.glow);
    const gradient = e.createRadialGradient(W / 2, H * 0.48, 0, W / 2, H * 0.48, spot);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.45, 'rgba(255,255,255,0.55)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    e.fillStyle = gradient;
    e.fillRect(0, 0, W, H);
    const scorch = c.createRadialGradient(W / 2, H * 0.48, 0, W / 2, H * 0.48, spot * 1.2);
    scorch.addColorStop(0, hotHex);
    scorch.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = 0.55;
    c.fillStyle = scorch;
    c.fillRect(0, 0, W, H);
    c.globalAlpha = 1;
    const seam = (x: number, y: number, heading: number, steps: number, width: number, bright: number, branch: number) => {
      const points: [number, number][] = [[x, y]];
      for (let i = 0; i < steps; i++) {
        heading += (random() - 0.5) * 0.9;
        x += Math.cos(heading) * 16;
        y += Math.sin(heading) * 10;
        points.push([x, y]);
        if (branch > 0 && random() < 0.18) seam(x, y, heading + (random() < 0.5 ? 1 : -1), Math.round(steps * 0.5), width * 0.6, bright * 0.8, branch - 1);
      }
      for (const shift of [-W, 0, W])
        for (const [ctx, colour, w] of [[c, 'rgba(6,5,8,0.9)', width * 2.2], [e, `rgba(255,255,255,${bright})`, width]] as const) {
          ctx.strokeStyle = colour;
          ctx.lineWidth = w;
          ctx.lineJoin = ctx.lineCap = 'round';
          ctx.beginPath();
          points.forEach(([px, py], index) => (index ? ctx.lineTo(px + shift, py) : ctx.moveTo(px + shift, py)));
          ctx.stroke();
        }
    };
    const fissures = Math.round((a.broken === 'cracked' ? 16 : 8) * mix(0.7, 1.4, mood.wear));
    for (let i = 0; i < fissures; i++) {
      const x = random() * W;
      const near = 1 - Math.min(1, Math.abs(x - W / 2) / (W / 2));
      seam(x, mix(0.12, 0.88, random()) * H, random() * 6.3, a.broken === 'cracked' ? 18 : 10, a.broken === 'cracked' ? 5 : 3, mix(0.25, 1, near * mix(0.5, 1, a.glow)), 2);
    }
    const map = new THREE.CanvasTexture(paintCanvas), emissiveMap = new THREE.CanvasTexture(lightCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const skin = new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: hot, emissiveIntensity: 1.25 * glow, metalness: look.metal, roughness: look.rough, flatShading: look.flat });
    const chunk = new THREE.MeshStandardMaterial({ color: body, metalness: look.metal, roughness: look.rough, flatShading: true });
    const ember = new THREE.MeshStandardMaterial({ color: hot, emissive: hot, emissiveIntensity: 1.1 * glow, roughness: 0.5 });
    const crustPaint = new THREE.MeshStandardMaterial({ color: new THREE.Color('#7d7460').lerp(new THREE.Color('#5e7a56'), mood.cheer * 0.6), roughness: 0.95, side: THREE.DoubleSide, flatShading: true });
    const solid = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = core) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const detail = look.flat ? [18, 12] : [64, 40];
    const lump = look.flat ? 0.05 : 0.09;

    // The inside of the planet, for cut faces: bright centre, banded layers.
    const section = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const rings = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      rings.addColorStop(0, '#fff6d8');
      rings.addColorStop(0.28, hotHex);
      rings.addColorStop(0.3, '#2a1a14');
      rings.addColorStop(0.34, hotHex);
      rings.addColorStop(0.62, `#${hot.clone().multiplyScalar(0.45).getHexString()}`);
      rings.addColorStop(0.64, '#1b1512');
      rings.addColorStop(0.7, `#${body.getHexString()}`);
      rings.addColorStop(1, `#${body.clone().multiplyScalar(0.6).getHexString()}`);
      ctx.fillStyle = rings;
      ctx.fillRect(0, 0, 256, 256);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture, emissive: '#ffffff', emissiveIntensity: mix(0.5, 1.1, a.glow) * glow, roughness: 0.6 });
    };

    const loose: { at: P; size: number; stretch?: P }[] = [];
    if (a.broken === 'halved') {
      const cut = section();
      for (const side of [-1, 1]) {
        const half = new THREE.Group();
        const dome = solid(roughen(new THREE.SphereGeometry(R, detail[0], detail[1], 0, Math.PI), lump), skin, half);
        void dome;
        const face = solid(new THREE.CircleGeometry(R * 0.985, 48), cut, half);
        face.rotation.y = Math.PI;
        // dome spans phi 0..pi: after the turn its flat side lies in the xy plane facing -z.
        const hinge = mix(0.35, 0.65, random());
        half.rotation.y = side > 0 ? hinge : Math.PI - hinge;
        half.position.z = side * R * mix(0.4, 0.6, random());
        half.rotation.x = side * mix(0.05, 0.2, random());
        half.rotation.z = mix(-0.2, 0.2, random());
        core.add(half);
      }
      core.rotation.y = Math.PI / 2 + mix(-0.25, 0.25, random());
      for (let i = 0; i < 16; i++) loose.push({ at: [(random() - 0.5) * R * 1.6, (random() - 0.5) * R * 1.6, (random() - 0.5) * 0.5], size: mix(0.04, 0.16, random() ** 2) });
    } else if (a.broken === 'shards') {
      solid(roughen(new THREE.SphereGeometry(R * 0.5, 40, 26), 0.12), skin);
      solid(new THREE.SphereGeometry(R * 0.36, 20, 14), ember).position.set(R * 0.2, 0, 0);
      const count = 9 + Math.floor(random() * 5);
      for (let i = 0; i < count; i++) {
        const d = new THREE.Vector3().setFromSphericalCoords(1, Math.acos(mix(-0.85, 0.85, (i + random()) / count)), i * 2.4 + random());
        const shard = solid(roughen(new THREE.DodecahedronGeometry(R * mix(0.28, 0.5, random()), 0), 0.25), random() < 0.3 + a.glow * 0.3 ? skin : chunk);
        shard.scale.set(mix(0.6, 1.2, random()), mix(0.9, 1.7, random()), mix(0.5, 1, random()));
        shard.position.copy(d).multiplyScalar(R * mix(0.85, 1.3, random()));
        shard.lookAt(0, 0, 0);
        shard.rotateZ(random() * 6);
      }
    } else {
      const scale = a.broken === 'peeled' ? 0.82 : 1;
      solid(roughen(new THREE.SphereGeometry(R * scale, detail[0], detail[1]), lump), skin);
      const plates = a.broken === 'peeled' ? 6 + Math.floor(random() * 3) : 3;
      for (let i = 0; i < plates; i++) {
        const lift = a.broken === 'peeled' ? mix(1.08, 1.4, random()) : mix(1.04, 1.16, random());
        const wide = a.broken === 'peeled' ? mix(0.5, 0.95, random()) : mix(0.3, 0.5, random());
        const plate = new THREE.Group();
        const shell = solid(roughen(new THREE.SphereGeometry(R * lift, 14, 8, 0, wide, Math.PI / 2 - wide / 2, wide), 0.03), a.broken === 'peeled' ? crustPaint : chunk, plate);
        const under = solid(new THREE.SphereGeometry(R * lift * 0.94, 14, 8, 0, wide, Math.PI / 2 - wide / 2, wide), new THREE.MeshStandardMaterial({ color: '#2a2420', roughness: 0.9, side: THREE.DoubleSide }), plate);
        shell.rotation.y = under.rotation.y = -wide / 2;
        plate.rotation.set((random() - 0.5) * 2.2, random() * 6.3, (random() - 0.5) * 0.6);
        core.add(plate);
      }
    }

    // The rubble halo.
    const haloGroup = new THREE.Group();
    haloGroup.rotation.set(mix(-0.25, 0.25, random()), 0, mix(0.15, 0.45, random()) * (random() < 0.5 ? -1 : 1));
    spin.add(haloGroup);
    const rubble = Math.round(mix(70, 260, mood.density));
    for (let i = 0; i < rubble; i++) {
      const size = R * mix(0.018, 0.11, random() ** 3);
      if (a.halo === 'cloud') {
        const p = new THREE.Vector3().setFromSphericalCoords(R * mix(1.35, 2.2, random()), Math.acos(random() * 2 - 1), random() * 6.3);
        loose.push({ at: [p.x, p.y, p.z], size });
      } else {
        const t = random();
        const angle = a.halo === 'stream' ? mix(-0.4, 3.6, t ** 1.6) : t * Math.PI * 2;
        const r = R * (a.halo === 'stream' ? mix(1.3, 2.6, t) + (random() - 0.5) * 0.25 : mix(1.55, 2.25, random()));
        loose.push({ at: [Math.cos(angle) * r, (random() - 0.5) * R * (a.halo === 'stream' ? 0.25 : 0.1), Math.sin(angle) * r], size: a.halo === 'stream' ? size * mix(1.3, 0.5, t) : size });
      }
    }
    const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), chunk, loose.length);
    const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), scale = new THREE.Vector3(), at = new THREE.Vector3();
    loose.forEach((rock, index) => {
      turn.setFromEuler(new THREE.Euler(random() * 6, random() * 6, random() * 6));
      scale.set(rock.size * mix(0.7, 1.4, random()), rock.size * mix(0.6, 1.2, random()), rock.size);
      rocks.setMatrixAt(index, matrix.compose(at.set(...rock.at), turn, scale));
    });
    rocks.castShadow = true;
    haloGroup.add(rocks);

    // Survivors.
    const steel = new THREE.MeshStandardMaterial({ color: '#c9ced4', metalness: 0.7, roughness: 0.4 });
    const dark = new THREE.MeshStandardMaterial({ color: '#30343c', roughness: 0.7 });
    const windowLight = new THREE.MeshStandardMaterial({ color: '#ffe08a', emissive: '#ffc640', emissiveIntensity: 1.6 * glow });
    const alarm = new THREE.MeshStandardMaterial({ color: '#ff3b30', emissive: '#ff2a20', emissiveIntensity: 2 });
    const slabAt = (): THREE.Group => {
      const slab = new THREE.Group();
      slab.position.set(R * 1.45, R * 0.75, R * 1.0);
      slab.scale.setScalar(1.8);
      slab.rotation.set(0.15, random() * 0.6, -0.25);
      solid(roughen(new THREE.CylinderGeometry(R * 0.3, R * 0.16, R * 0.16, 7), 0.12), a.broken === 'peeled' ? crustPaint : chunk, slab);
      spin.add(slab);
      return slab;
    };
    if (a.survivor === 'beacon') {
      const slab = slabAt();
      solid(new THREE.CylinderGeometry(R * 0.006, R * 0.012, R * 0.42, 6), steel, slab).position.y = R * 0.29;
      for (let i = 0; i < 3; i++) solid(new THREE.BoxGeometry(R * 0.07 - i * 0.02, R * 0.004, R * 0.004), steel, slab).position.y = R * (0.3 + i * 0.06);
      solid(new THREE.BoxGeometry(R * 0.07, R * 0.05, R * 0.06), dark, slab).position.set(R * 0.05, R * 0.105, 0);
      solid(new THREE.SphereGeometry(R * 0.028, 10, 8), alarm, slab).position.y = R * 0.52;
    } else if (a.survivor === 'city') {
      const slab = slabAt();
      for (let i = 0; i < 9; i++) {
        const h = R * mix(0.08, 0.3, random()), w = R * mix(0.035, 0.06, random());
        const x = (random() - 0.5) * R * 0.36, z = (random() - 0.5) * R * 0.36;
        const tower = solid(new THREE.BoxGeometry(w, h, w), i % 4 === 3 ? steel : dark, slab);
        tower.position.set(x, R * 0.08 + h / 2, z);
        tower.rotation.z = (random() - 0.5) * 0.25 * mood.wear;
        const lit = Math.floor(random() * 4 * mix(0.4, 1.3, mood.cheer));
        for (let k = 0; k < lit; k++) solid(new THREE.BoxGeometry(w * 1.04, h * 0.05, w * 0.4), windowLight, slab).position.set(x, R * 0.08 + h * mix(0.2, 0.9, random()), z + (random() - 0.5) * w * 0.5);
      }
    } else if (a.survivor === 'ring') {
      const station = new THREE.Group();
      station.rotation.set(Math.PI / 2 + 0.25, 0.2, random() * 6);
      const arc = Math.PI * mix(0.7, 1.1, random());
      solid(new THREE.TorusGeometry(R * 1.42, R * 0.03, 6, 60, arc), steel, station);
      solid(new THREE.TorusGeometry(R * 1.42, R * 0.012, 4, 60, arc * 0.96), windowLight, station).position.z = R * 0.03;
      for (let i = 0; i <= 5; i++) {
        const angle = (i / 5) * arc;
        const hub = solid(new THREE.BoxGeometry(R * 0.1, R * 0.07, R * 0.09), i % 2 ? dark : steel, station);
        hub.position.set(Math.cos(angle) * R * 1.42, Math.sin(angle) * R * 1.42, 0);
        hub.rotation.z = angle;
        if (i % 2 === 0) {
          const spoke = solid(new THREE.CylinderGeometry(R * 0.008, R * 0.008, R * 0.36, 5), steel, station);
          spoke.position.set(Math.cos(angle) * R * 1.24, Math.sin(angle) * R * 1.24, 0);
          spoke.rotation.z = angle + Math.PI / 2;
        }
      }
      spin.add(station);
    } else if (a.survivor === 'tether') {
      const points = [0.95, 1.3, 1.7, 2.1, 2.45].map((r, i) => new THREE.Vector3(R * r * 0.5, R * r * 0.82, R * (0.3 + (i > 2 ? (i - 2) * 0.22 : 0))));
      solid(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, R * 0.012, 6), steel, spin);
      const car = solid(new THREE.BoxGeometry(R * 0.09, R * 0.13, R * 0.09), dark, spin);
      car.position.copy(points[2]);
      const weight = solid(new THREE.OctahedronGeometry(R * 0.11, 0), steel, spin);
      weight.position.copy(points[4]);
      solid(new THREE.SphereGeometry(R * 0.022, 8, 6), alarm, spin).position.copy(points[4]).add(new THREE.Vector3(0, R * 0.14, 0));
    }

    let moonPivot: THREE.Group | null = null;
    if (a.moon) {
      moonPivot = new THREE.Group();
      moonPivot.rotation.set(0.2, random() * 6, -0.15);
      const moon = solid(roughen(new THREE.SphereGeometry(R * 0.17, 20, 14), 0.05), new THREE.MeshStandardMaterial({ color: '#b9b4a8', roughness: 0.95 }), moonPivot);
      moon.position.x = R * 2.75;
      s.root.add(moonPivot);
    }
    // A thin warm haze on the hot side.
    const haze = new THREE.Mesh(new THREE.SphereGeometry(R * mix(0.7, 1.05, a.glow), 24, 16), new THREE.MeshBasicMaterial({ color: hot, transparent: true, opacity: mix(0.1, 0.22, a.glow), depthWrite: false }));
    haze.position.x = R * 0.45;
    core.add(haze);

    const pace = mix(0.3, 1.6, mood.energy);
    return s.finish({
      footprint: R * 1.2,
      update(dt, time) {
        core.rotation.y += dt * 0.03 * pace;
        haloGroup.rotation.y += dt * 0.08 * pace;
        if (moonPivot) moonPivot.rotation.y += dt * 0.15 * pace;
        alarm.emissiveIntensity = (time * pace * 0.8) % 1 < 0.25 ? 3 : 0.15;
        skin.emissiveIntensity = glow * (1.25 + Math.sin(time * pace * 0.9) * 0.2);
      },
    });
  },
});
