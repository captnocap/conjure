import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

const VERTEX = /* glsl */ `
varying vec3 vN; varying vec3 vV; varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = isOrthographic ? vec3(0.0, 0.0, 1.0) : normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
// A shell that is nearly clear face-on and bright where it turns away: the limb-brightened edge of a hollow bubble.
const FRAGMENT = /* glsl */ `
uniform vec3 edge; uniform vec3 body; uniform vec2 band; uniform float fill; uniform float tear; uniform float drift; uniform sampler2D map;
varying vec3 vN; varying vec3 vV; varying vec2 vUv;
void main() {
  float away = 1.0 - abs(dot(normalize(vN), normalize(vV)));
  float rim = smoothstep(band.x, band.y, away) + pow(away, 2.2) * 0.3;
  vec4 grain = texture2D(map, vUv + vec2(0.0, -drift));
  if (tear > 0.0 && texture2D(map, vUv).g < tear * smoothstep(0.42, 0.9, vUv.y)) discard;
  float alpha = clamp(fill * (0.35 + grain.r * 1.5) + rim, 0.0, 1.0);
  vec3 colour = mix(body, edge, clamp(rim * 1.15 + grain.r * 0.4, 0.0, 1.0));
  gl_FragColor = vec4(colour, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const SHAPES = {
  balloon: 'A round party balloon: a narrow neck swelling to a full, even dome.',
  teardrop: 'An upside-down teardrop, like a hot-air balloon, widest near the top.',
  mushroom: 'A mushroom cloud: a thin stalk under a broad flattened cap.',
  chimney: 'A tall narrow column with a blunt top, like smoke from a still chimney.',
} as const;

export default defineThing({
  questions: {
    lobes: choice('Is it one lobe or a mirrored pair?', {
      single: 'A single lobe rising from the base.',
      pair: 'A matched pair, above and below, an hourglass or figure of eight.',
      lopsided: 'A big one above and a stunted, half-inflated one below.',
    }),
    shape: choice('What shape is the lobe?', SHAPES),
    edge: score('How sharp is its edge?', ['Soft, dissolving into nothing', 'Blurred', 'Defined', 'A crisp bright line, like the rim of a soap bubble']),
    colour: choice('What light is it seen in?', {
      gamma: 'Gamma-ray violet, eerie and electric.',
      xray: 'X-ray blue, cool and clinical.',
      radio: 'Radio orange, warm and smouldering.',
      rose: 'Hydrogen rose pink, flushed and tender.',
    }),
    interior: choice('What is inside it?', {
      empty: 'Nearly nothing: clear, like blown glass.',
      mottled: 'Faint drifting cloud, patchy as breath on a window.',
      filaments: 'Fine threads rising through it like steam.',
      cells: 'Smaller bubbles nested inside the big one, like froth.',
    }),
    age: choice('How is the old outburst wearing?', {
      taut: 'Still taut and smooth, freshly blown.',
      sagging: 'Slack and dimpled, leaning, a balloon the week after the party.',
      torn: 'Torn open at the top, with the last of it escaping in wisps.',
    }),
    base: choice('What does it rise from?', {
      nothing: 'Nothing visible: just the pinch where it began.',
      galaxy: 'A thin golden galaxy seen edge-on, with a dark dust lane, tiny beside what it blew.',
      spark: 'A small bright spark, still glowing.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const edge = new THREE.Color({ gamma: '#7a2df2', xray: '#1b74f5', radio: '#f56a14', rose: '#f2327e' }[a.colour]).offsetHSL(mix(-0.015, 0.015, mood.warmth), 0, mix(-0.04, 0.03, mood.cheer));
    const body = edge.clone().lerp(new THREE.Color('#ffffff'), 0.5);

    // The interior, painted once and wrapped round every shell. Red is cloud, green is where it tears.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgb(0,255,0)';
    ctx.fillRect(0, 0, 256, 256);
    ctx.globalCompositeOperation = 'lighter';
    const dab = (x: number, y: number, rx: number, ry: number, strength: number) => {
      for (const sx of [-256, 0, 256]) for (const sy of [-256, 0, 256]) {
        const glow = ctx.createRadialGradient(x + sx, y + sy, 0, x + sx, y + sy, Math.max(rx, ry));
        glow.addColorStop(0, `rgba(255,0,0,${strength})`); glow.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.save(); ctx.translate(x + sx, y + sy); ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry)); ctx.translate(-x - sx, -y - sy);
        ctx.fillStyle = glow; ctx.fillRect(x + sx - 80, y + sy - 300, 160, 600); ctx.restore();
      }
    };
    if (a.interior === 'mottled') for (let i = 0; i < 26; i++) dab(random() * 256, random() * 256, 14 + random() * 26, 10 + random() * 18, 0.25 + random() * 0.3);
    if (a.interior === 'filaments') for (let i = 0; i < 34; i++) dab(random() * 256, random() * 256, 1.6 + random() * 2.4, 50 + random() * 90, 0.45 + random() * 0.4);
    if (a.interior === 'cells') for (let i = 0; i < 10; i++) dab(random() * 256, random() * 256, 10 + random() * 10, 10 + random() * 10, 0.12);
    ctx.globalCompositeOperation = 'source-over';
    const pixels = ctx.getImageData(0, 0, 256, 256);
    for (let i = 0; i < 18; i++) {
      const x = random() * 256, y = random() * 256, r = 10 + random() * 30;
      for (let py = Math.max(0, Math.floor(y - r)); py < Math.min(256, y + r); py++)
        for (let px = Math.floor(x - r); px < x + r; px++) {
          const d = Math.hypot(px - x, py - y) / r, at = (py * 256 + ((px % 256) + 256) % 256) * 4 + 1;
          if (d < 1) pixels.data[at] = Math.min(pixels.data[at], Math.round(255 * d * d));
        }
    }
    ctx.putImageData(pixels, 0, 0);
    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;

    const drifting: THREE.ShaderMaterial[] = [];
    const film = (fill: number, tear: number, sharp = a.edge) => {
      const material = new THREE.ShaderMaterial({
        vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true,
        uniforms: {
          edge: { value: edge }, body: { value: body }, map: { value: map }, drift: { value: 0 },
          band: { value: new THREE.Vector2(mix(0.02, 0.62, sharp), mix(1.05, 0.74, sharp)) },
          fill: { value: fill }, tear: { value: tear },
        },
      });
      drifting.push(material);
      return material;
    };

    const profile = (t: number) => {
      if (a.shape === 'balloon') return 2.25 * t ** 0.5 * Math.sqrt(1 - t ** 3);
      if (a.shape === 'teardrop') return 2.3 * t ** 0.95 * Math.sqrt(1 - t ** 4.5);
      if (a.shape === 'chimney') return 1.35 * t ** 0.28 * Math.sqrt(1 - t ** 7);
      const cap = t > 0.44 ? 2.5 * Math.sqrt(Math.max(0, 1 - ((t - 0.72) / 0.28) ** 2)) ** 0.8 : 0;
      return Math.max(0.5 * t ** 0.3 * Math.sqrt(1 - t ** 8), cap);
    };
    const tall = { balloon: 4.8, teardrop: 5.4, mushroom: 5, chimney: 6.4 }[a.shape];

    const lobe = (scale: number) => {
      const group = new THREE.Group();
      const around = 72, up = 56;
      const slack = a.age === 'sagging' ? mix(0.09, 0.16, random()) : a.age === 'torn' ? 0.05 : 0.012;
      const waves = Array.from({ length: 7 }, () => ({ k: 1 + Math.floor(random() * 5), m: 1 + random() * 6, p: random() * 6, q: random() * 6 }));
      const lean = a.age === 'sagging' ? (random() - 0.5) * 1.6 : (random() - 0.5) * 0.3;
      const positions: number[] = [], uvs: number[] = [], index: number[] = [];
      for (let i = 0; i <= up; i++) {
        const t = i / up;
        for (let j = 0; j <= around; j++) {
          const turn = j / around, angle = turn * Math.PI * 2;
          let bump = 0;
          for (const wave of waves) bump += Math.sin(angle * wave.k + wave.p) * Math.sin(t * wave.m + wave.q);
          const r = profile(t) * (1 + (bump / 7) * slack * 4 * Math.sin(Math.PI * t));
          const y = tall * (t - (a.age === 'sagging' ? 0.13 * t ** 3 : 0));
          positions.push(Math.cos(angle) * r + lean * t * t, y, Math.sin(angle) * r);
          uvs.push(turn * 2, t * 1.5);
        }
      }
      for (let i = 0; i < up; i++)
        for (let j = 0; j < around; j++) {
          const p = i * (around + 1) + j, q = p + around + 1;
          index.push(p, q, p + 1, q, q + 1, p + 1);
        }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      const fill = { empty: 0.07, mottled: 0.16, filaments: 0.14, cells: 0.1 }[a.interior] * mix(0.8, 1.3, mood.density);
      const shell = new THREE.Mesh(geometry, film(fill, a.age === 'torn' ? 0.85 : 0));
      group.add(shell);
      if (a.edge < 0.4) {
        // A soft edge has a halo: the same shape again, bigger and fainter.
        const halo = new THREE.Mesh(geometry, film(fill * 0.4, a.age === 'torn' ? 0.85 : 0, 0));
        halo.scale.set(1.12, 1.04, 1.12);
        (halo.material as THREE.ShaderMaterial).depthWrite = false;
        group.add(halo);
      }
      const round = new THREE.SphereGeometry(1, 28, 18);
      if (a.interior === 'cells') {
        const cells = 6 + Math.floor(random() * 5 + mood.density * 5);
        for (let i = 0; i < cells; i++) {
          const t = mix(0.3, 0.86, random()), room = profile(t) * 0.62, size = Math.max(0.2, room * mix(0.3, 0.62, random()));
          const angle = random() * Math.PI * 2, out = (room - size * 0.6) * random();
          const cell = new THREE.Mesh(round, film(0.05, 0, Math.max(a.edge, 0.6)));
          cell.scale.setScalar(size);
          cell.position.set(Math.cos(angle) * out + lean * t * t, tall * t, Math.sin(angle) * out);
          cell.renderOrder = -1;
          (cell.material as THREE.ShaderMaterial).depthWrite = false;
          group.add(cell);
        }
      }
      if (a.age === 'torn') {
        const wisps = 5 + Math.floor(random() * 5);
        for (let i = 0; i < wisps; i++) {
          const wisp = new THREE.Mesh(round, film(0.12, 0, 0.3));
          const size = mix(0.5, 0.16, i / wisps) * mix(0.8, 1.3, random());
          wisp.scale.set(size, size * mix(1.2, 2, random()), size);
          wisp.position.set(lean + (random() - 0.5) * 1.8 + i * 0.12, tall * mix(0.98, 1.32, (i + random()) / wisps), (random() - 0.5) * 1.6);
          (wisp.material as THREE.ShaderMaterial).depthWrite = false;
          group.add(wisp);
        }
      }
      group.scale.setScalar(scale);
      return group;
    };

    s.root.add(lobe(1));
    if (a.lobes !== 'single') {
      const under = lobe(a.lobes === 'pair' ? mix(0.92, 1, random()) : mix(0.36, 0.5, random()));
      under.rotation.z = Math.PI;
      under.rotation.y = random() * 3;
      s.root.add(under);
    }

    if (a.base === 'galaxy') {
      const gold = new THREE.Color('#e3a11c');
      const disc = s.ball([1.75, 0.1, 1.75], [0, 0, 0], new THREE.MeshStandardMaterial({ color: gold, emissive: gold, emissiveIntensity: 0.55, roughness: 0.9 }), 40);
      disc.rotation.y = random() * 3;
      const lane = s.ring(1.5, 0.12, [0, 0, 0], new THREE.MeshStandardMaterial({ color: '#3b2415', roughness: 1 }));
      lane.rotation.x = Math.PI / 2;
      lane.scale.z = 0.7;
      s.ball([0.48, 0.34, 0.48], [0, 0, 0], new THREE.MeshStandardMaterial({ color: '#fff0c4', emissive: gold, emissiveIntensity: 0.7, roughness: 0.9 }));
    } else if (a.base === 'spark') {
      const white = new THREE.MeshBasicMaterial({ color: '#fff8e0' });
      s.ball([0.2, 0.2, 0.2], [0, 0, 0], white, 14);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2, length = i % 2 ? 0.45 : 0.85;
        const ray = s.mesh(new THREE.ConeGeometry(0.04, length, 5), white, [Math.cos(angle) * (length / 2 + 0.1), 0, Math.sin(angle) * (length / 2 + 0.1)]);
        ray.rotation.set(Math.PI / 2, 0, 0);
        ray.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), Math.PI / 2 - angle);
        ray.castShadow = false;
      }
    } else s.ball([0.13, 0.1, 0.13], [0, 0, 0], new THREE.MeshBasicMaterial({ color: edge }), 12);

    s.root.rotation.z = (random() - 0.5) * (a.lobes === 'single' ? 0.16 : 0.5);
    const wrap = new Sculpture(context);
    wrap.root.add(s.root);
    const rise = mix(0.004, 0.05, mood.energy);
    let clock = 0;
    return wrap.finish({
      update(dt) {
        clock += dt;
        for (const material of drifting) material.uniforms.drift.value = clock * rise;
        s.root.rotation.y = Math.sin(clock * 0.25) * 0.12;
      },
    });
  },
});
