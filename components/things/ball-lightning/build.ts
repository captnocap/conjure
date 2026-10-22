import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const COLOURS = {
  orange: 'Fiery orange-yellow, the colour most witnesses report.',
  blue: 'Cold electric blue with a white heart.',
  green: 'Marsh-light green, a will-o-the-wisp.',
  red: 'Dull ember red, like a coal with no fire under it.',
  violet: 'Violet with a pink core, ozone and unease.',
  white: 'Pale moon white, almost colourless.',
} as const;
const TINT: Record<keyof typeof COLOURS, [string, string, string]> = {
  orange: ['#f08a12', '#ffd76a', '#b84a00'],
  blue: ['#2f86f5', '#bfe4ff', '#1746b8'],
  green: ['#2fbf5a', '#c9f7a6', '#127a3a'],
  red: ['#d9381f', '#ff9a6a', '#8a1608'],
  violet: ['#8b47e8', '#f0b6ff', '#4b1fa3'],
  white: ['#a9b9c8', '#f4f8ff', '#6b7f96'],
};

export default defineThing({
  questions: {
    colour: choice('What colour does it glow?', COLOURS),
    size: score('How big is the sphere?', ['A marble', 'An orange', 'A football', 'A beach ball']),
    temper: choice('How is it behaving?', {
      steady: 'Steady and perfectly round, silent, a calm lamp with no wire.',
      sputtering: 'Sputtering and lumpy, spitting sparks and crackling arcs.',
      splitting: 'Splitting: a smaller ball is budding off its side.',
      dying: 'Guttering out, shrunken inside a ring of smoke.',
    }),
    tail: choice('Does it trail anything?', {
      none: 'Nothing, it simply hangs there.',
      comet: 'A short comet tail of fading globes behind it.',
      ribbon: 'A long wandering ribbon of light tracing where it has drifted.',
      drip: 'Molten sparks dripping from its underside to the floor.',
    }),
    visit: choice('Where is it, and what is it doing?', {
      scorch: 'Hovering over bare floorboards, leaving a scorched ring beneath it.',
      window: 'It has just come through a window pane, leaving a neat melted hole.',
      kettle: 'It is arcing to a copper kettle, as if curious about the metal.',
      candle: 'It hangs above a guttering candle in a brass holder, outshining it.',
      chimney: 'It has rolled out of a hearth, hovering above the ash and fire irons.',
    }),
    arcs: score('How much crackling corona surrounds it?', ['A clean bare sphere', 'A few hair-thin filaments', 'A crown of arcs', 'A furious thicket of lightning']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [tint, pale, deep] = TINT[a.colour];
    const dying = a.temper === 'dying';
    const R = mix(0.07, 0.36, a.size) * (dying ? 0.7 : 1);
    const hover = mix(0.75, 1.25, random()) + R;
    const centre = new THREE.Vector3(0, hover, 0);

    // Plasma skin: a mottled, swirling emissive map so the ball is not a plain bulb.
    const skin = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, 256, 128);
      for (let i = 0; i < 46; i++) {
        ctx.strokeStyle = i % 3 === 0 ? deep : pale;
        ctx.globalAlpha = mix(0.25, 0.8, random());
        ctx.lineWidth = mix(1.5, 7, random());
        ctx.beginPath();
        const y = random() * 128, x = random() * 256;
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + 30, y + (random() - 0.5) * 50, x + 60, y + (random() - 0.5) * 50, x + mix(60, 120, random()), y + (random() - 0.5) * 30);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      return texture;
    })();
    const plasma = new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#ffffff', emissiveMap: skin, emissiveIntensity: dying ? 0.55 : 0.95, roughness: 0.6 });
    const glowing = new THREE.MeshStandardMaterial({ color: new THREE.Color(tint).multiplyScalar(0.4), emissive: tint, emissiveIntensity: 0.75, roughness: 0.5 });
    const hot = new THREE.MeshStandardMaterial({ color: pale, emissive: pale, emissiveIntensity: 0.7 });
    const shell = (radius: number, opacity: number, at = centre) => {
      const mesh = s.ball([radius, radius, radius], [at.x, at.y, at.z], new THREE.MeshBasicMaterial({ color: pale, transparent: true, opacity, depthWrite: false, side: THREE.BackSide }), 24);
      mesh.castShadow = mesh.receiveShadow = false;
      return mesh;
    };

    const ball = new THREE.Group();
    ball.position.copy(centre);
    s.root.add(ball);
    const bodyGeometry = new THREE.SphereGeometry(1, 40, 28);
    if (a.temper === 'sputtering' || dying) {
      const lobes = Array.from({ length: 14 }, () => ({ d: new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(), amp: mix(-0.12, 0.26, random()) }));
      const p = bodyGeometry.attributes.position as THREE.BufferAttribute;
      const v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).normalize();
        let push = 0;
        for (const lobe of lobes) push += lobe.amp * Math.pow(Math.max(0, v.dot(lobe.d)), 5);
        v.multiplyScalar(1 + push);
        p.setXYZ(i, v.x, v.y, v.z);
      }
      bodyGeometry.computeVertexNormals();
    }
    const body = new THREE.Mesh(bodyGeometry, plasma);
    body.scale.setScalar(R);
    body.castShadow = true;
    ball.add(body);
    const halos = [shell(R * 1.35, 0.42), shell(R * 1.9 + 0.02, 0.22), shell(R * 2.7 + 0.05, dying ? 0.05 : 0.11)];

    if (a.temper === 'splitting') {
      const d = new THREE.Vector3(random() < 0.5 ? -1 : 1, mix(0.1, 0.6, random()), (random() - 0.5) * 0.6).normalize();
      const r2 = R * mix(0.42, 0.6, random());
      const bud = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), plasma);
      bud.scale.setScalar(r2);
      bud.position.copy(d).multiplyScalar(R + r2 * 0.75);
      bud.castShadow = true;
      ball.add(bud);
      const neck = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), plasma);
      neck.scale.setScalar(r2 * 0.62);
      neck.position.copy(d).multiplyScalar(R * 0.92);
      ball.add(neck);
      halos.push(shell(r2 * 1.5, 0.35, centre.clone().addScaledVector(d, R + r2 * 0.75)));
    }

    // Corona: jagged filaments that leave the surface and curl back, like a plasma globe turned inside out.
    const crown = new THREE.Group();
    crown.position.copy(centre);
    s.root.add(crown);
    const arcCount = Math.round(mix(0, 22, a.arcs) * (a.temper === 'steady' ? 0.6 : a.temper === 'sputtering' ? 1.4 : 1) + (a.temper === 'sputtering' ? 4 : 0));
    if (arcCount > 0) {
      const parts: THREE.BufferGeometry[] = [];
      const up = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < arcCount; i++) {
        const from = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
        const axis = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).cross(from).normalize();
        const sweep = mix(0.3, 1.3, random());
        const reach = mix(0.25, 0.95, random()) * mix(0.6, 1.3, a.arcs) * (R + 0.05);
        const steps = 7;
        let last = from.clone().multiplyScalar(R * 0.98);
        const closes = random() < 0.55;
        for (let k = 1; k <= steps; k++) {
          const t = k / steps;
          const lift = closes ? Math.sin(t * Math.PI) * reach : t * reach * 1.2;
          const next = from.clone().applyAxisAngle(axis, sweep * t).multiplyScalar(R * 0.98 + lift)
            .add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(k === steps ? 0 : reach * 0.3));
          const d = next.clone().sub(last);
          const thick = (0.006 + R * 0.028) * (closes ? 1 : 1 - t * 0.7);
          const g = new THREE.CylinderGeometry(thick, thick, d.length(), 5, 1);
          g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize()));
          const mid = last.clone().add(next).multiplyScalar(0.5);
          g.translate(mid.x, mid.y, mid.z);
          parts.push(g);
          last = next;
        }
      }
      const merged = mergeGeometries(parts)!;
      parts.forEach((g) => g.dispose());
      const arcs = new THREE.Mesh(merged, glowing);
      arcs.castShadow = true;
      crown.add(arcs);
    }

    // Loose sparks adrift around it.
    const sparkCount = Math.round(mix(4, 26, mood.density) * (a.temper === 'sputtering' ? 2 : dying ? 0.4 : 1));
    const sparks = s.scatter(new THREE.OctahedronGeometry(1, 0), hot, Array.from({ length: sparkCount }, () => {
      const d = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize().multiplyScalar(R * mix(1.2, 3.2, random()) + 0.05);
      return { at: [d.x, hover + d.y, d.z] as [number, number, number], size: mix(0.008, 0.022, random()) * (0.6 + R * 2.5) };
    }));
    sparks.castShadow = false;

    if (dying) {
      const smoke = s.material('#6f6b68', { roughness: 1, transparent: true, opacity: 0.75 });
      const ring = s.ring(R * 2.2, R * 0.28, [0, hover + R * 1.3, 0], smoke);
      ring.rotation.x = Math.PI / 2 + 0.2;
      const wisp = s.tube([[0, hover + R * 1.5, 0], [R, hover + R * 3.2, 0.05], [-R * 0.8, hover + R * 5, 0], [R * 0.5, hover + R * 7, -0.05]], R * 0.14, smoke);
      wisp.castShadow = false;
    }

    // Tail.
    const side = random() < 0.5 ? -1 : 1;
    if (a.tail === 'comet') {
      const globes = Array.from({ length: 9 }, (_unused, i) => {
        const t = (i + 1) / 9;
        return { at: [side * (R * 1.1 + t * (0.9 + R * 3)), hover + Math.sin(t * 3) * 0.12 + t * 0.15, -t * 0.25] as [number, number, number], size: R * mix(0.72, 0.1, t) };
      });
      s.scatter(new THREE.SphereGeometry(1, 14, 10), glowing, globes);
    } else if (a.tail === 'ribbon') {
      const points: [number, number, number][] = [[0, hover, -R * 0.9]];
      for (let i = 1; i <= 8; i++) points.push([side * Math.sin(i * 0.8) * (0.25 + i * 0.13), hover + Math.sin(i * 1.3) * 0.22 - i * 0.05, -R - 0.1 - (1 - Math.cos(i * 0.8)) * (0.25 + i * 0.07)]);
      const path = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
      const geometry = new THREE.TubeGeometry(path, 90, 1, 6);
      // Taper the ribbon to nothing along its length.
      const p = geometry.attributes.position as THREE.BufferAttribute;
      const frames = 91, ringSize = 7;
      const v = new THREE.Vector3();
      for (let f = 0; f < frames; f++) {
        const centrePoint = path.getPointAt(f / (frames - 1));
        const radius = (0.01 + R * 0.13) * (1 - f / frames);
        for (let k = 0; k < ringSize; k++) {
          const index = f * ringSize + k;
          v.fromBufferAttribute(p, index).sub(centrePoint).multiplyScalar(radius).add(centrePoint);
          p.setXYZ(index, v.x, v.y, v.z);
        }
      }
      geometry.computeVertexNormals();
      s.mesh(geometry, glowing);
    } else if (a.tail === 'drip') {
      const drops = Array.from({ length: 12 }, (_unused, i) => {
        const t = (i + random() * 0.6) / 12;
        return { at: [(random() - 0.5) * R * 0.9, hover - R - t * (hover - R - 0.03), (random() - 0.5) * R * 0.9] as [number, number, number], size: mix(0.03, 0.012, t) * (0.6 + R * 2) };
      });
      s.scatter(new THREE.SphereGeometry(1, 8, 6), hot, drops).scale.set(1, 1, 1);
      for (let i = 0; i < 4; i++) s.cylinder(0.03 + random() * 0.03, 0.04 + random() * 0.03, 0.008, [(random() - 0.5) * R * 1.4, 0.03, (random() - 0.5) * R * 1.4], hot, 10);
    }

    // The room it is visiting.
    const wood = s.material('#7a5a3c', { roughness: 0.9 });
    const char = s.material('#231f1c', { roughness: 1 });
    const brass = s.material('#c39a3e', { metalness: 0.85, roughness: 0.3 });
    const boards = (w: number, d: number) => {
      const planks = 5;
      for (let i = 0; i < planks; i++) s.box([w, 0.024, d / planks - 0.012], [0, 0.012, (i - (planks - 1) / 2) * (d / planks)], s.material(new THREE.Color('#7a5a3c').offsetHSL(0, 0, (random() - 0.5) * 0.07), { roughness: 0.9 }));
    };
    if (a.visit === 'scorch') {
      boards(1.5, 1.2);
      const ring = s.ring(R * 0.9 + 0.12, 0.035 + R * 0.12, [0, 0.026, 0], char);
      ring.rotation.x = Math.PI / 2;
      ring.scale.z = 0.12;
      s.cylinder(R * 0.5 + 0.05, R * 0.5 + 0.05, 0.004, [0, 0.027, 0], s.material('#4a3628'), 20);
    } else if (a.visit === 'window') {
      boards(1.3, 0.8);
      const frame = s.material(mood.wear > 0.5 ? '#b9b3a3' : '#e9e4d6', { roughness: 0.8 });
      const zw = -(R + 0.42), w = 1.1, h = hover + R + 0.55, base = 0.45;
      for (const x of [-w / 2, w / 2]) s.box([0.07, h - base, 0.08], [x, (h + base) / 2, zw], frame);
      for (const y of [base, (h + base) / 2, h]) s.box([w + 0.07, 0.07, 0.08], [0, y, zw], frame);
      s.box([0.04, h - base, 0.05], [0, (h + base) / 2, zw], frame);
      s.box([w + 0.3, 0.06, 0.2], [0, base - 0.05, zw + 0.04], frame);
      s.box([w + 0.2, base - 0.08, 0.06], [0, (base - 0.08) / 2, zw], s.material('#cfc6b2'));
      const glass = new THREE.MeshPhysicalMaterial({ color: '#9fc4cf', roughness: 0.05, transparent: true, opacity: 0.32, side: THREE.DoubleSide });
      const pane = new THREE.Shape();
      pane.moveTo(-w / 2, base); pane.lineTo(w / 2, base); pane.lineTo(w / 2, h); pane.lineTo(-w / 2, h); pane.closePath();
      const hole = new THREE.Path();
      const hx = w * 0.24, hy = Math.min(h - 0.2, hover + 0.02), hr = Math.min(R * 1.05 + 0.02, w * 0.2);
      hole.absarc(hx, hy, hr, 0, Math.PI * 2, true);
      pane.holes.push(hole);
      s.mesh(new THREE.ShapeGeometry(pane, 28), glass, [0, 0, zw]).castShadow = false;
      s.ring(hr, 0.012, [hx, hy, zw], hot);
    } else if (a.visit === 'kettle') {
      boards(1.5, 1.1);
      const copper = s.material('#b66a3a', { metalness: 0.8, roughness: mix(0.25, 0.6, mood.wear) });
      const kx = side * -(R + 0.52);
      s.lathe([[0.001, 0], [0.16, 0], [0.19, 0.05], [0.185, 0.16], [0.13, 0.24], [0.07, 0.26], [0.001, 0.27]], copper, [kx, 0.024, 0.1]);
      s.ball([0.025, 0.025, 0.025], [kx, 0.31, 0.1], brass, 10);
      s.tube([[kx + side * 0.17, 0.12, 0.1], [kx + side * 0.27, 0.17, 0.1], [kx + side * 0.31, 0.25, 0.1]], 0.022, copper);
      s.ring(0.13, 0.012, [kx, 0.3, 0.1], s.material('#2c2622'), Math.PI).rotation.y = Math.PI / 2;
      // The arc that has found the spout.
      const parts: [number, number, number][] = [];
      const from = new THREE.Vector3(kx + side * 0.31, 0.26, 0.1), to = centre.clone().add(new THREE.Vector3(-side * R * 0.7, -R * 0.7, 0));
      for (let i = 0; i <= 7; i++) {
        const point = from.clone().lerp(to, i / 7);
        if (i > 0 && i < 7) point.add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.16));
        parts.push(point.toArray() as [number, number, number]);
      }
      for (let i = 0; i < 7; i++) s.rod(parts[i], parts[i + 1], 0.012, glowing);
    } else if (a.visit === 'candle') {
      const table = s.material('#5d4029', { roughness: 0.7 });
      s.cylinder(0.42, 0.42, 0.04, [0, 0.5, 0], table, 28);
      s.cylinder(0.05, 0.07, 0.48, [0, 0.24, 0], table, 12);
      s.cylinder(0.24, 0.26, 0.03, [0, 0.015, 0], table, 20);
      const cx = side * 0.2;
      s.cylinder(0.075, 0.085, 0.012, [cx, 0.526, 0.06], brass, 20);
      s.cylinder(0.02, 0.028, 0.05, [cx, 0.555, 0.06], brass, 12);
      s.ring(0.022, 0.006, [cx + 0.09, 0.535, 0.06], brass).rotation.x = Math.PI / 2;
      const stub = mix(0.13, 0.04, mood.wear);
      s.cylinder(0.016, 0.018, stub, [cx, 0.58 + stub / 2, 0.06], s.material('#efe6cf'), 12);
      const flame = s.ball([0.012, 0.03, 0.012], [cx + 0.008, 0.61 + stub, 0.06], new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffae3a', emissiveIntensity: 0.9 }), 10);
      flame.rotation.z = -0.4;
      flame.castShadow = false;
    } else {
      const stone = s.material('#8a857c', { roughness: 0.95 });
      const zb = -(R + 0.85);
      s.box([1.5, 0.06, 0.9], [0, 0.03, zb + 0.35], stone);
      for (const x of [-0.6, 0.6]) s.box([0.28, 0.95, 0.3], [x, 0.53, zb], stone);
      s.box([1.6, 0.2, 0.36], [0, 1.1, zb], stone);
      s.box([1.75, 0.05, 0.44], [0, 1.22, zb], s.material('#5a4634'));
      s.box([0.92, 0.9, 0.08], [0, 0.5, zb - 0.14], char);
      const ash = Array.from({ length: 16 }, () => ({ at: [(random() - 0.5) * 0.7, 0.07, zb + 0.05 + random() * 0.4] as [number, number, number], size: mix(0.03, 0.08, random()) }));
      s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#77726c', { roughness: 1, flatShading: true }), ash);
      for (const x of [-0.25, 0.25]) { s.box([0.03, 0.14, 0.4], [x, 0.13, zb + 0.1], char); s.ball([0.03, 0.03, 0.03], [x, 0.24, zb + 0.3], brass, 8); }
      s.rod([0.82, 0.06, zb + 0.3], [0.86, 0.75, zb + 0.16], 0.012, char);
      s.rod([0.92, 0.06, zb + 0.34], [0.9, 0.7, zb + 0.16], 0.012, brass);
    }
    void wood;

    const pace = mix(0.35, 1.8, mood.energy);
    const lift = mix(0.02, 0.07, mood.energy);
    const pulse = a.temper === 'steady' ? 0.04 : a.temper === 'dying' ? 0.45 : 0.22;
    const baseGlow = plasma.emissiveIntensity;
    const haloMaterials = halos.map((halo) => halo.material as THREE.MeshBasicMaterial);
    const haloBase = haloMaterials.map((material) => material.opacity);
    return s.finish({
      footprint: 0.6,
      update(dt, time) {
        const t = time * pace;
        const bob = Math.sin(t * 1.3) * lift;
        ball.position.y = crown.position.y = hover + bob;
        for (const halo of halos) halo.position.y += 0;
        body.rotation.y += dt * pace * 0.6;
        crown.rotation.y -= dt * pace * 1.7;
        crown.rotation.x = Math.sin(t * 2.1) * 0.4;
        const level = 1 - pulse * (0.5 + 0.5 * Math.sin(t * 11) * Math.sin(t * 3.7));
        plasma.emissiveIntensity = baseGlow * level;
        haloMaterials.forEach((material, index) => { material.opacity = haloBase[index] * level; });
      },
    });
  },
});
