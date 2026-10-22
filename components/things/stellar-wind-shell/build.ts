import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const FILMS = {
  teal: 'Sea-glass teal with a turquoise rim, cool and clean.',
  rose: 'Rose pink with a magenta rim, tender and bodily.',
  amber: 'Honey amber with an orange rim, late and warm.',
  violet: 'Lavender with a deep violet rim, dreamlike.',
  pearl: 'Nearly colourless, with the full oil-slick rainbow of a real soap bubble.',
  ember: 'Smoky red with a bright coral rim, the last heat of something.',
} as const;
const TINTS: Record<keyof typeof FILMS, [string, string, number]> = {
  teal: ['#7fd0c8', '#0f8f96', 0.25],
  rose: ['#f3a6bd', '#c7306f', 0.25],
  amber: ['#f2c26a', '#d0661a', 0.2],
  violet: ['#b9a7ee', '#5b35b5', 0.3],
  pearl: ['#c9d6dc', '#6f8a9a', 0.95],
  ember: ['#d98a7a', '#c0341f', 0.15],
};

const vertexShader = /* glsl */ `
  varying vec3 vN; varying vec3 vView; varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    vN = normalMatrix * normal;
    gl_Position = projectionMatrix * mv;
  }`;
const fragmentShader = /* glsl */ `
  uniform vec3 uBase; uniform vec3 uRim; uniform vec3 uLead;
  uniform float uTime; uniform float uRipple; uniform float uIris; uniform float uLeadPower; uniform float uBody; uniform float uFreq;
  uniform vec4 uHoles[4];
  varying vec3 vN; varying vec3 vView; varying vec3 vDir;
  void main() {
    vec3 n = normalize(vN);
    vec3 v = isOrthographic ? vec3(0.0, 0.0, 1.0) : normalize(vView);
    float f = 1.0 - abs(dot(n, v));
    float rag = sin(vDir.x * 13.0 + 1.3) * sin(vDir.y * 17.0 + 0.7) * sin(vDir.z * 11.0 + 2.1);
    float edge = 0.0;
    for (int i = 0; i < 4; i++) {
      float c = dot(vDir, uHoles[i].xyz) - uHoles[i].w + rag * 0.09;
      if (c > 0.0) discard;
      edge = max(edge, smoothstep(-0.06, 0.0, c));
    }
    float along = dot(vDir, uLead);
    float lead = pow(max(0.0, along), 2.0) * uLeadPower;
    float bands = pow(0.5 + 0.5 * sin(along * uFreq + rag * 2.0 - uTime), 5.0);
    float rim = pow(f, 2.2);
    vec3 iris = 0.5 + 0.5 * cos(6.2832 * (f * 1.3 + along * 0.35 + uTime * 0.02 + vec3(0.0, 0.33, 0.67)));
    vec3 col = mix(uBase, uRim, clamp(rim + lead * 0.5 + edge, 0.0, 1.0));
    col = mix(col, iris, uIris * (0.3 + 0.45 * rim));
    col = mix(col, uRim, bands * uRipple * 0.7);
    float alpha = clamp(uBody + rim * 0.75 + lead * 0.4 + bands * uRipple * 0.4 + edge * 0.6, 0.0, 0.96);
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

export default defineThing({
  questions: {
    shells: choice('How many shells are nested inside one another?', {
      one: 'A single bubble.',
      two: 'One bubble inside another.',
      three: 'Three nested, like a set of glass floats or an onion.',
      four: 'Four, thin layer inside thin layer, each breath kept.',
    }),
    film: choice('What colour is the film of gas?', FILMS),
    state: choice('Is the bubble still whole?', {
      intact: 'Whole and perfect, sealed all the way round.',
      open: 'Blown open on one side: a round ragged mouth with the inside showing.',
      torn: 'Punctured in several places, holes spreading.',
      popped: 'It has just popped: only a ragged bowl of film is left, with droplets flying off the edge.',
    }),
    skin: choice('What is its surface like?', {
      smooth: 'Perfectly smooth, like blown glass.',
      rippled: 'Fine concentric ripples running across it, like rings on a pond.',
      scalloped: 'Scalloped into many soft bulges, like a cauliflower or a raspberry.',
      streaked: 'Combed into long streaks all running one way.',
    }),
    push: choice('Is it pushing against anything?', {
      still: 'No: it hangs still and evenly lit.',
      ploughing: 'Yes: it is ploughing into a headwind, with a bright thick bow on one side and the far side drawn out like an egg.',
      squeezed: 'Yes: something presses on it from above and it sits flattened, like a bubble on a wet table.',
    }),
    star: choice('What is at the centre, blowing it?', {
      dwarf: 'A tiny, fierce white point.',
      giant: 'A fat soft orange star filling a third of the bubble.',
      gusty: 'A small hot blue star with visible gusts streaming out to the film.',
      nothing: 'Nothing visible. The bubble is empty, whatever blew it is gone.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = 1.6;
    const [baseHex, rimHex, iris] = TINTS[a.film];
    const shift = new THREE.Color(mood.warmth > 0.5 ? '#ff9a4a' : '#5ab0ff');
    const lean = Math.abs(mood.warmth - 0.5) * 0.3;
    const base = new THREE.Color(baseHex).lerp(shift, lean), rim = new THREE.Color(rimHex).lerp(shift, lean * 0.6);
    const count = { one: 1, two: 2, three: 3, four: 4 }[a.shells];
    const lead = new THREE.Vector3(-0.55, 0.3, 0.78).normalize();
    const anyDirection = () => {
      const y = random() * 2 - 1, t = random() * Math.PI * 2, w = Math.sqrt(1 - y * y);
      return new THREE.Vector3(Math.cos(t) * w, y, Math.sin(t) * w);
    };
    // Up to four holes: a direction and the cosine of how wide it has opened.
    const mouth = new THREE.Vector3(0.45 + random() * 0.3, 0.55, 0.7).normalize();
    const holes: THREE.Vector4[] = [];
    if (a.state === 'open') holes.push(new THREE.Vector4(mouth.x, mouth.y, mouth.z, 0.62));
    if (a.state === 'popped') holes.push(new THREE.Vector4(mouth.x * 0.5, 0.85, mouth.z * 0.5, -0.15).normalize().setW(-0.15));
    if (a.state === 'torn') for (let i = 0; i < 4; i++) {
      const d = anyDirection();
      if (i < 2) { d.z = Math.abs(d.z); d.y = Math.abs(d.y) * 0.8; d.normalize(); }
      holes.push(new THREE.Vector4(d.x, d.y, d.z, 0.86 + random() * 0.09));
    }
    const pinholes = Math.round(mood.wear * 2.4);
    for (let i = 0; i < pinholes && holes.length < 4; i++) { const d = anyDirection(); holes.push(new THREE.Vector4(d.x, d.y, d.z, 0.955 + random() * 0.03)); }
    while (holes.length < 4) holes.push(new THREE.Vector4(0, 1, 0, 2));

    const bumps = Array.from({ length: 46 }, anyDirection);
    const shapeAt = (d: THREE.Vector3) => {
      let r = 1;
      if (a.skin === 'scalloped') {
        let best = 0;
        for (const bump of bumps) best = Math.max(best, d.dot(bump));
        r += 0.11 * Math.sqrt(Math.max(0, (best - 0.86) / 0.14)) - 0.04;
      }
      const p = d.clone().multiplyScalar(r);
      if (a.push === 'ploughing') { const back = Math.min(0, p.dot(lead)); p.addScaledVector(lead, back * 0.45); }
      if (a.push === 'squeezed') { p.y *= 0.72; p.x *= 1.1; p.z *= 1.1; }
      return p;
    };

    const bubble = new THREE.Group();
    s.root.add(bubble);
    const films: THREE.ShaderMaterial[] = [];
    for (let i = 0; i < count; i++) {
      const size = R * [1, 0.74, 0.52, 0.34][i];
      const geometry = new THREE.SphereGeometry(1, 72, 48);
      const at = geometry.attributes.position, d = new THREE.Vector3();
      for (let k = 0; k < at.count; k++) {
        const p = shapeAt(d.fromBufferAttribute(at, k).normalize());
        at.setXYZ(k, p.x * size, p.y * size, p.z * size);
      }
      geometry.computeVertexNormals();
      const tone = base.clone().offsetHSL(i * 0.035, 0, -i * 0.03);
      const film = new THREE.ShaderMaterial({
        vertexShader, fragmentShader, transparent: true, side: THREE.DoubleSide,
        uniforms: {
          uBase: { value: tone }, uRim: { value: rim.clone().offsetHSL(i * 0.035, 0, 0) }, uLead: { value: lead },
          uTime: { value: random() * 10 }, uIris: { value: Math.min(1, iris * mix(0.6, 1.3, mood.cheer)) },
          uRipple: { value: a.skin === 'rippled' ? 0.9 : a.skin === 'streaked' ? 0.75 : 0.12 },
          uFreq: { value: a.skin === 'rippled' ? 34 : a.skin === 'streaked' ? 3 : 9 },
          uLeadPower: { value: a.push === 'ploughing' ? 1.5 : 0.45 },
          uBody: { value: mix(0.2, 0.12, i / 3) }, uHoles: { value: holes },
        },
      });
      const shell = new THREE.Mesh(geometry, film);
      shell.renderOrder = 10 - i;
      shell.castShadow = i === 0;
      if (i > 0) film.depthWrite = false;
      bubble.add(shell);
      films.push(film);
    }
    if (a.skin === 'streaked') for (const film of films) film.fragmentShader = fragmentShader.replace('sin(along * uFreq + rag * 2.0 - uTime)', 'sin(atan(vDir.z, vDir.x) * 22.0 + rag * 3.0 + along * uFreq)');

    // Droplets where the film has given way.
    const drops: { at: [number, number, number]; size: number }[] = [];
    for (const hole of holes) {
      if (hole.w > 0.95) continue;
      const axis = new THREE.Vector3(hole.x, hole.y, hole.z), side = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0.3, 1, 0.2)).normalize(), other = new THREE.Vector3().crossVectors(axis, side);
      const flying = a.state === 'popped' ? 46 : 9;
      for (let i = 0; i < flying * mix(0.6, 1.4, mood.density); i++) {
        const angle = random() * Math.PI * 2, sine = Math.sqrt(1 - hole.w * hole.w);
        const d = axis.clone().multiplyScalar(hole.w).addScaledVector(side, Math.cos(angle) * sine).addScaledVector(other, Math.sin(angle) * sine);
        const p = shapeAt(d.normalize()).multiplyScalar(R * (1 + random() ** 2 * (a.state === 'popped' ? 0.45 : 0.12))).addScaledVector(axis, random() * (a.state === 'popped' ? 0.5 : 0.1));
        drops.push({ at: p.toArray() as [number, number, number], size: 0.018 + random() ** 2 * 0.05 });
      }
    }
    if (drops.length) bubble.add(s.scatter(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: rim.clone().lerp(new THREE.Color('#ffffff'), 0.3), roughness: 0.15, emissive: rim, emissiveIntensity: 0.25 }), drops));

    // The star that blew it.
    const heart = new THREE.Group();
    bubble.add(heart);
    const soft = (radius: number, colour: string, opacity: number) => new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, depthWrite: false }));
    let core: THREE.Mesh | null = null;
    if (a.star === 'dwarf') {
      core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.055, 16, 12), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#f2f8ff', emissiveIntensity: 1.3 }));
      heart.add(core, soft(R * 0.13, '#cfe6ff', 0.4));
      for (let i = 0; i < 4; i++) {
        const ray = new THREE.Mesh(new THREE.ConeGeometry(R * 0.012, R * 0.36, 4), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75, depthWrite: false }));
        ray.rotation.z = (i * Math.PI) / 2;
        ray.translateY(R * 0.18);
        heart.add(ray);
      }
    }
    if (a.star === 'giant') {
      core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.3, 32, 20), new THREE.MeshStandardMaterial({ color: '#f08a3c', emissive: '#e8641e', emissiveIntensity: 0.8, roughness: 1 }));
      heart.add(core, soft(R * 0.36, '#f6a45a', 0.25));
    }
    if (a.star === 'gusty') {
      core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.09, 20, 14), new THREE.MeshStandardMaterial({ color: '#dff0ff', emissive: '#7fc0ff', emissiveIntensity: 1.2 }));
      heart.add(core, soft(R * 0.16, '#8fc8ff', 0.35));
      const gusts = Math.round(mix(26, 70, mood.density));
      const gust = new THREE.ConeGeometry(0.5, 1, 5, 1, true);
      gust.rotateX(Math.PI);
      gust.translate(0, 0.5, 0);
      const wind = new THREE.InstancedMesh(gust, new THREE.MeshBasicMaterial({ color: rim.clone().lerp(new THREE.Color('#bfe2ff'), 0.5), transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }), gusts);
      const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion();
      for (let i = 0; i < gusts; i++) {
        const d = anyDirection();
        turn.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
        const reach = shapeAt(d).length() * R * [1, 0.74, 0.52, 0.34][count - 1] * (0.55 + random() * 0.4), girth = 0.03 + random() * 0.05;
        matrix.compose(d.clone().multiplyScalar(R * 0.1), turn, new THREE.Vector3(girth, reach, girth));
        wind.setMatrixAt(i, matrix);
      }
      heart.add(wind);
    }
    if (core) core.castShadow = false;

    bubble.rotation.y = (random() - 0.5) * 0.5;
    const pace = mix(0.25, 2.2, mood.energy), wobble = mix(0.004, 0.022, mood.energy);
    return s.finish({
      footprint: R * 0.6,
      update: (dt, time) => {
        for (const film of films) film.uniforms.uTime.value += dt * pace;
        bubble.scale.set(1 + Math.sin(time * 1.3) * wobble, 1 - Math.sin(time * 1.3) * wobble, 1 + Math.cos(time * 1.1) * wobble);
        heart.rotation.y += dt * pace * 0.2;
      },
    });
  },
});
