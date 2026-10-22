import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const TAILS = {
  gold: 'A cream-gold dust tail, like a plume of lit smoke.',
  white: 'A pale silver-white tail, cold and ghostly.',
  sodium: 'A sodium-yellow tail burning orange near the head.',
  twin: 'A curved gold dust tail with a straight electric-blue ion tail beside it.',
} as const;
type Rgb = [number, number, number];
const PALETTES: Record<keyof typeof TAILS, { head: string; mid: string; end: string; speck: string; coma: string }> = {
  gold: { head: '#fff3c4', mid: '#ffbb44', end: '#d8701c', speck: '#ffd27a', coma: '#ffd98a' },
  white: { head: '#ffffff', mid: '#aec4e8', end: '#5f7fb8', speck: '#dce8ff', coma: '#c8daf6' },
  sodium: { head: '#ffe9a0', mid: '#ff9418', end: '#c4400a', speck: '#ffc040', coma: '#ffc070' },
  twin: { head: '#fff3c4', mid: '#ffbb44', end: '#d8701c', speck: '#ffd27a', coma: '#ffe0a0' },
};

const rgb = (color: THREE.Color): Rgb => {
  const value = color.getHex();
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};
const smooth = (from: number, to: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

/** A soft glow that is brightest where it faces the viewer and fades to nothing at its edge. */
function glowPaint(color: THREE.ColorRepresentation, opacity: number, power = 2) {
  return new THREE.ShaderMaterial({
    uniforms: { tint: { value: new THREE.Color(color) }, opacity: { value: opacity }, power: { value: power } },
    vertexShader: 'varying vec3 vN; void main() { vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'uniform vec3 tint; uniform float opacity; uniform float power; varying vec3 vN;',
      'void main() {',
      '  float facing = clamp(abs(normalize(vN).z), 0.0, 1.0);',
      '  gl_FragColor = vec4(tint, opacity * pow(facing, power));',
      '  #include <tonemapping_fragment>',
      '  #include <colorspace_fragment>',
      '}',
    ].join('\n'),
    transparent: true,
    depthWrite: false,
  });
}

export default defineThing({
  questions: {
    moment: choice('What moment of its fall is this?', {
      diving: 'Diving in toward the star, the tail streaming almost straight behind.',
      grazing: 'Whipping round the star at closest approach, the tail swung into a long bending curve.',
      emerging: 'Coming back out the other side, the tail fanned wide like a peacock.',
    }),
    tail: choice('What kind of tail does it carry?', TAILS),
    shedding: choice('What is it shedding?', {
      chunks: 'A line of tumbling broken chunks strung out along its path.',
      dust: 'Only fine glittering dust, thick in the tail.',
      pair: 'It has split in two: a second head with its own tail following the first.',
      shower: 'A spray of fragments bursting outward, like fireworks.',
    }),
    head: choice('What does the nucleus look like?', {
      icy: 'A dirty snowball, dark crust with bright patches of ice.',
      dark: 'A black crusted lump, charcoal dark.',
      glowing: 'A rock glowing red-hot on its sunward face.',
    }),
    length: score('How long is the tail?', ['A stub', 'Long', 'Sweeping across the whole sky']),
    striae: noul('Is the tail combed into dark and bright bands, like streaks of hair?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const jitter = (amount: number) => (random() - 0.5) * amount;
    const palette = PALETTES[a.tail];
    const left = 1 - mood.wear;
    const headless = mood.wear > 0.86;
    const r0 = mix(0.05, 0.22, left ** 1.2);
    const L = mix(3.2, 6.6, a.length);
    const sun = new THREE.Vector3(-0.8, -0.55, 0.2).normalize();
    const anti = sun.clone().negate();
    const bend = { diving: new THREE.Vector3(0.12, -0.08, 0), grazing: new THREE.Vector3(0.62, -0.42, 0.05), emerging: new THREE.Vector3(0.36, -0.22, 0.12) }[a.moment];
    const behind = { diving: new THREE.Vector3(0.9, 0.42, -0.05), grazing: new THREE.Vector3(0.95, -0.08, 0.12), emerging: new THREE.Vector3(0.7, -0.45, 0.2) }[a.moment].normalize();
    const spread = { diving: 0.9, grazing: 1.3, emerging: 2.0 }[a.moment] * L / 5;
    const head = new THREE.Vector3(0, 0, 0);
    const dull = new THREE.Color('#8d8070');
    const warmTint = new THREE.Color(mood.warmth > 0.5 ? '#ff8a30' : '#cfe0ff');
    const tone = (hex: string, k = 1) => new THREE.Color(hex).lerp(warmTint, Math.abs(mood.warmth - 0.5) * 0.3 * k).lerp(dull, mood.wear * 0.15);
    const headRgb = rgb(tone(palette.head, 0.3)), midRgb = rgb(tone(palette.mid)), endRgb = rgb(tone(palette.end));
    const fadeOut = mix(1, 0.62, mood.wear);
    const glow = mix(0.85, 1.05, mood.cheer);

    // ---- Painted tails. ----
    const paintTail = (striped: boolean, ion: boolean) => {
      const W = 128, H = 512;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const g = canvas.getContext('2d')!;
      const image = g.createImageData(W, H);
      const data = image.data;
      // Longitudinal filaments: a smooth random brightness profile across the tail.
      const knots = Array.from({ length: 20 }, () => random());
      const filament = (u: number) => {
        const x = u * 19, i = Math.floor(x), f = x - i;
        return mix(knots[i], knots[Math.min(19, i + 1)], f * f * (3 - 2 * f));
      };
      const rays = Array.from({ length: 6 }, () => ({ u: mix(0.3, 0.7, random()), wave: random() * 6, width: mix(0.015, 0.04, random()) }));
      const slant = jitter(2.4), stripes = mix(9, 15, random());
      for (let y = 0; y < H; y++) {
        const t = 1 - y / (H - 1);
        const fade = smooth(0, 0.035, t) * (1 - t) ** (ion ? 0.8 : 1.25);
        for (let x = 0; x < W; x++) {
          const u = x / (W - 1), across = (u - 0.5) * 2;
          let alpha: number;
          if (ion) {
            alpha = 0;
            for (const ray of rays) {
              const centre = ray.u + Math.sin(t * 9 + ray.wave) * 0.04 * t;
              alpha += Math.exp(-(((u - centre) / (ray.width * (1 + t * 2))) ** 2));
            }
            alpha = Math.min(1, alpha * 0.7) * fade;
          } else {
            const reach = mix(0.18, 0.8, t ** 0.5);
            const core = Math.exp(-((across / reach) ** 2) * 2.2);
            const lead = 0.4 * Math.exp(-(((across - reach * 0.55) / 0.14) ** 2)) * smooth(0.05, 0.3, t);
            alpha = (core + lead) * (0.62 + 0.38 * filament(u)) * fade;
            if (striped && t > 0.12) alpha *= 0.45 + 0.55 * Math.sin((t * stripes + across * slant * t + filament(t) * 0.8) * Math.PI) ** 2;
          }
          const k = t < 0.3 ? 0 : 1;
          const c = k === 0 ? [mix(headRgb[0], midRgb[0], t / 0.3), mix(headRgb[1], midRgb[1], t / 0.3), mix(headRgb[2], midRgb[2], t / 0.3)] : [mix(midRgb[0], endRgb[0], (t - 0.3) / 0.7), mix(midRgb[1], endRgb[1], (t - 0.3) / 0.7), mix(midRgb[2], endRgb[2], (t - 0.3) / 0.7)];
          const index = (y * W + x) * 4;
          if (ion) {
            data[index] = mix(220, 60, t); data[index + 1] = mix(240, 140, t); data[index + 2] = 255;
          } else {
            data[index] = c[0]; data[index + 1] = c[1]; data[index + 2] = c[2];
          }
          data[index + 3] = Math.round(Math.min(1, alpha * 1.25 * fadeOut * glow) * 255);
        }
      }
      g.putImageData(image, 0, 0);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    /** A curved fan surface along the tail: v runs from the head (0) to the tip (1). */
    const fan = (origin: THREE.Vector3, direction: THREE.Vector3, curve: THREE.Vector3, length: number, w0: number, w1: number, roll: number) => {
      const geometry = new THREE.PlaneGeometry(1, 1, 8, 60);
      const position = geometry.attributes.position;
      const out = new THREE.Vector3(0, 0, 1);
      for (let i = 0; i < position.count; i++) {
        const u = position.getX(i) + 0.5, t = position.getY(i) + 0.5;
        const centre = origin.clone().addScaledVector(direction, length * t).addScaledVector(curve, length * t * t);
        const tangent = direction.clone().addScaledVector(curve, 2 * t).normalize();
        const side = tangent.clone().cross(out).normalize().applyAxisAngle(tangent, roll);
        const width = mix(w0, w1, t ** 0.75);
        position.setXYZ(i, ...centre.addScaledVector(side, (u - 0.5) * width).toArray());
      }
      geometry.computeVertexNormals();
      return geometry;
    };
    const dustMap = paintTail(a.striae, false);
    const tailSheets = (origin: THREE.Vector3, length: number, width: number, solid: boolean) => {
      for (const [roll, opacity] of [[0, 1], [0.95, 0.55], [-0.95, 0.55]] as const) {
        // The tail is light, not a surface: it casts no shadow and the glitter in it gives its extent.
        const mesh = new THREE.Mesh(fan(origin, anti, bend, length, width * 0.14, width, roll), new THREE.MeshBasicMaterial({
          map: dustMap, transparent: true, opacity: opacity * (solid ? 1 : 0.85), side: THREE.DoubleSide, depthWrite: false,
        }));
        mesh.castShadow = false;
        s.root.add(mesh);
      }
    };
    tailSheets(head, L, spread * 2, true);
    if (a.tail === 'twin') {
      const ionMap = paintTail(false, true);
      const ionDirection = anti.clone().add(new THREE.Vector3(-0.12, 0.2, 0)).normalize();
      for (const roll of [0, Math.PI / 2]) {
        s.root.add(new THREE.Mesh(fan(head, ionDirection, new THREE.Vector3(0, 0, 0), L * 1.2, 0.12, spread * 0.5, roll), new THREE.MeshBasicMaterial({ map: ionMap, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 0.9 })));
      }
    }

    // ---- The nucleus: a lumpy dirty iceberg, or nothing left but rubble. ----
    const lump = (radius: number, at: THREE.Vector3, detail = 3) => {
      const geometry = new THREE.IcosahedronGeometry(1, detail);
      const position = geometry.attributes.position;
      const colours = new Float32Array(position.count * 3);
      const p = new THREE.Vector3();
      const phase = random() * 10;
      const baseColour = new THREE.Color(a.head === 'dark' ? '#2b2724' : '#4d4238');
      const ice = new THREE.Color('#e8eef2'), hot = new THREE.Color('#ffb24a'), white = new THREE.Color('#fff2c8'), ember = new THREE.Color('#5a1e0c');
      const colour = new THREE.Color();
      for (let i = 0; i < position.count; i++) {
        p.fromBufferAttribute(position, i);
        const bump = 1 + 0.28 * Math.sin(p.x * 3.1 + phase) * Math.cos(p.y * 2.7 - phase) + 0.12 * Math.sin(p.z * 6 + p.x * 4 + phase);
        const n = p.clone().normalize();
        position.setXYZ(i, p.x * bump * 1.3, p.y * bump * 0.9, p.z * bump);
        if (a.head === 'glowing') {
          const lit = Math.max(0, n.dot(sun));
          colour.copy(ember).lerp(hot, smooth(0, 0.5, lit)).lerp(white, smooth(0.55, 0.95, lit));
        } else {
          colour.copy(baseColour).offsetHSL(0, 0, jitter(0.06));
          if (a.head === 'icy' && Math.sin(p.x * 5 + phase) * Math.cos(p.z * 4 + p.y * 3) > 0.45) colour.lerp(ice, 0.85);
        }
        colours.set([colour.r, colour.g, colour.b], i * 3);
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      geometry.computeVertexNormals();
      const material = a.head === 'glowing' ? new THREE.MeshBasicMaterial({ vertexColors: true }) : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.setScalar(radius);
      mesh.position.copy(at);
      mesh.rotation.set(random() * 6, random() * 6, random() * 6);
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
      return mesh;
    };
    const tumblers: { mesh: THREE.Mesh; spin: THREE.Vector3 }[] = [];
    if (headless) {
      for (let i = 0; i < 6; i++) {
        const mesh = lump(mix(0.03, 0.07, random()), head.clone().add(new THREE.Vector3(jitter(0.4), jitter(0.3), jitter(0.3))), 1);
        tumblers.push({ mesh, spin: new THREE.Vector3(jitter(1), jitter(1), jitter(1)) });
      }
    } else tumblers.push({ mesh: lump(r0, head), spin: new THREE.Vector3(0.1, 0.3, 0.05) });
    // The coma: a soft bright cloud, and a hot inner core.
    const comaRadius = Math.max(r0 * 3, L * 0.1) * mix(0.9, 1.2, mood.energy);
    const coma = new THREE.Mesh(new THREE.SphereGeometry(comaRadius, 32, 20), glowPaint(tone(palette.coma, 0.5), 0.7 * fadeOut, 1.4));
    coma.position.copy(head);
    coma.scale.set(1.15, 1, 1);
    s.root.add(coma);
    const core = new THREE.Mesh(new THREE.SphereGeometry(comaRadius * 0.45, 24, 16), glowPaint('#ffffff', 0.55 * fadeOut, 3));
    core.position.copy(head);
    s.root.add(core);

    // ---- What it is shedding. ----
    const rubble: { mesh: THREE.Mesh; spin: THREE.Vector3 }[] = [];
    const smallTail = (origin: THREE.Vector3, size: number) => {
      const mesh = new THREE.Mesh(fan(origin, anti, bend, L * size, spread * 0.06 * size * 4, spread * 0.5 * size * 2, 0), new THREE.MeshBasicMaterial({ map: dustMap, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }));
      s.root.add(mesh);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.12, size * 0.8), 16, 12), glowPaint(palette.coma, 0.7, 1.8));
      halo.position.copy(origin);
      s.root.add(halo);
    };
    if (a.shedding === 'chunks') {
      const count = 4 + Math.round(mood.wear * 6);
      let distance = comaRadius * 0.9;
      for (let i = 0; i < count; i++) {
        distance += mix(0.3, 0.6, random());
        const size = mix(0.6, 0.18, i / count) * Math.max(r0, 0.16) * mix(0.7, 1.2, random());
        const at = head.clone().addScaledVector(behind, distance).add(new THREE.Vector3(jitter(0.15), jitter(0.15), jitter(0.2)));
        rubble.push({ mesh: lump(size, at, 1), spin: new THREE.Vector3(jitter(2), jitter(2), jitter(2)) });
        if (i % 2 === 0) smallTail(at, mix(0.28, 0.14, i / count));
      }
    } else if (a.shedding === 'pair') {
      const at = head.clone().addScaledVector(behind, comaRadius * 2.2 + 0.4).add(new THREE.Vector3(0, -0.35, 0.3));
      rubble.push({ mesh: lump(Math.max(r0 * 0.7, 0.1), at, 2), spin: new THREE.Vector3(jitter(1), jitter(1), jitter(1)) });
      tailSheets(at, L * 0.75, spread * 1.3, false);
      const second = new THREE.Mesh(new THREE.SphereGeometry(comaRadius * 0.7, 24, 16), glowPaint(palette.coma, 0.75 * fadeOut, 1.6));
      second.position.copy(at);
      s.root.add(second);
    } else if (a.shedding === 'shower') {
      const count = 22 + Math.round(mood.density * 16);
      const shards = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: a.head === 'glowing' ? '#ffb24a' : '#6a5c50', roughness: 0.9, flatShading: true, emissive: a.head === 'glowing' ? '#ff6a10' : '#000000', emissiveIntensity: 0.6 }), count);
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < count; i++) {
        const direction = behind.clone().add(new THREE.Vector3(jitter(1.6), jitter(1.6), jitter(1.2))).normalize();
        const size = mix(0.025, 0.08, random() ** 2) * Math.max(1, r0 * 3);
        matrix.makeRotationFromEuler(new THREE.Euler(random() * 6, random() * 6, 0)).scale(new THREE.Vector3(size, size * mix(0.6, 1.4, random()), size)).setPosition(head.clone().addScaledVector(direction, comaRadius * mix(0.6, 2.4, random())));
        shards.setMatrixAt(i, matrix);
      }
      shards.castShadow = true;
      s.root.add(shards);
    }

    // ---- Glittering dust along the tail, drifting outward. ----
    const speckCount = Math.round(mix(160, 380, mood.density) * (a.shedding === 'dust' ? 1.7 : 1));
    const specks = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), speckCount);
    const speckData = Array.from({ length: speckCount }, () => ({ t: random() ** 0.8, across: (random() + random() + random() - 1.5) * 0.66, lift: jitter(0.5), size: mix(0.012, 0.035, random() ** 3), rate: mix(0.4, 1.2, random()) }));
    const tint = new THREE.Color();
    speckData.forEach((speck, i) => specks.setColorAt(i, tint.set(palette.speck).lerp(new THREE.Color('#ffffff'), random() * 0.5)));
    const matrix = new THREE.Matrix4();
    const out = new THREE.Vector3(0, 0, 1);
    const placeSpecks = () => {
      speckData.forEach((speck, i) => {
        const t = speck.t;
        const centre = head.clone().addScaledVector(anti, L * t).addScaledVector(bend, L * t * t);
        const tangent = anti.clone().addScaledVector(bend, 2 * t).normalize();
        const side = tangent.clone().cross(out).normalize();
        const width = mix(spread * 0.28, spread * 2, t ** 0.75);
        centre.addScaledVector(side, speck.across * width * 0.5).addScaledVector(out, speck.lift * width * 0.35);
        const size = speck.size * (1 - t * 0.5);
        specks.setMatrixAt(i, matrix.makeScale(size, size, size).setPosition(centre));
      });
      specks.instanceMatrix.needsUpdate = true;
    };
    placeSpecks();
    if (specks.instanceColor) specks.instanceColor.needsUpdate = true;
    s.root.add(specks);

    const pace = mix(0.004, 0.05, mood.energy);
    return s.finish({
      footprint: Math.max(0.6, comaRadius),
      update: (dt, time) => {
        for (const speck of speckData) {
          speck.t += dt * pace * speck.rate;
          if (speck.t > 1) speck.t -= 1;
        }
        placeSpecks();
        for (const { mesh, spin } of [...tumblers, ...rubble]) {
          mesh.rotation.x += dt * spin.x * pace * 4;
          mesh.rotation.y += dt * spin.y * pace * 4;
        }
        coma.scale.set(1.15 * (1 + Math.sin(time * 0.8) * 0.03), 1 + Math.sin(time * 0.8) * 0.03, 1);
      },
    });
  },
});
