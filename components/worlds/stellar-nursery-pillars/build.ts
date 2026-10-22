import * as THREE from 'three';
import { type Placeable, choice, clamp01, defineWorld, disposeTree, mix, score } from '@conjure/kit';
import { blob, hazePaint, hull, limb, makeNoise, rimPaint, softBall, tint, vec } from './cosmos';

const GASES = {
  hubble: 'The classic telescope palette: teal-green haze with amber-gold rims.',
  ember: 'A warm rust and rose haze with pale gold light, like the inside of a forge.',
  orchid: 'Violet and magenta haze with cold blue accents, lush and strange.',
  dawn: 'Pale pastel blue and peach, soft and newly washed.',
} as const;
// Mid-tone haze, deeper gas, the bright clearing, the rim light on dust, an accent.
const GAS: Record<keyof typeof GASES, [string, string, string, string, string]> = {
  hubble: ['#3f9098', '#1d5a66', '#ffe6ae', '#ffc45f', '#86ecd9'],
  ember: ['#b3694a', '#70332f', '#ffeccb', '#ffd085', '#ff8f6b'],
  orchid: ['#7c62ad', '#40306f', '#ffdcee', '#ff9ad1', '#82d8ff'],
  dawn: ['#86a3bd', '#4f6a8c', '#fff5de', '#ffdf9f', '#ffb9a0'],
};

const gauss = (t: number, centre: number, width: number) => Math.exp(-(((t - centre) / width) ** 2));
type Column = { x: number; z: number; top: number; width: number; hang?: boolean };

export default defineWorld({
  questions: {
    gas: choice('What colours is the glowing gas?', GASES),
    pillars: choice('How do the dust pillars stand?', {
      colonnade: 'A colonnade: columns rising on both sides, an open aisle between them.',
      trinity: 'Three great fingers of descending height massed on one side, like the famous photograph.',
      cavern: 'A cavern mouth: columns rising from below and others hanging from a cloud ceiling above.',
      lone: 'One colossal pillar dominating the scene, the rest worn down to low mounds.',
    }),
    age: score('How far along is the nursery?', ['Dense and dim: the cloud is barely lit', 'Half carved, stars beginning to show', 'Mostly blown clear: thin worn pillars and bright open gas']),
    light: choice('Where does the carving light come from?', {
      above: 'From an unseen cluster overhead, falling in shafts.',
      behind: 'From behind: everything is backlit and rimmed in light.',
      side: 'Raking in from one side, long and low.',
    }),
    newborns: choice('How do the newborn stars show?', {
      hidden: 'They do not: all still wrapped up and out of sight.',
      sparks: 'As scattered sparks, each in a small bubble it has cleared.',
      cluster: 'As a tight blazing cluster of blue-white stars at the source of the light.',
    }),
    drifting: choice('What drifts through the space between?', {
      still: 'Nothing: clear, hushed and suspended.',
      motes: 'Slow glittering motes of dust.',
      streamers: 'Long pale streamers of gas winding across.',
      front: 'A great glowing arc, a wave of light advancing through the cloud.',
    }),
    view: choice('How do we look at it?', {
      level: 'Level and calm, as if floating among them.',
      up: 'From low down looking up, so the pillars tower.',
      askew: 'Tilted, adrift, with no sense of which way is up.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const noise = makeNoise(context.seed);
    const root = new THREE.Group();
    const age = clamp01(a.age * 0.85 + mood.wear * 0.15);
    const white = new THREE.Color('#ffffff');
    const [hazeHex, deepHex, glowHex, rimHex, accentHex] = GAS[a.gas];
    const lift = mix(-0.05, 0.05, mood.cheer) + mix(-0.04, 0.05, age);
    const haze = new THREE.Color(hazeHex).offsetHSL((mood.warmth - 0.5) * -0.04, 0, lift);
    const deep = new THREE.Color(deepHex).offsetHSL(0, 0, lift * 0.6);
    const shine = new THREE.Color(glowHex), rimColour = new THREE.Color(rimHex), accent = new THREE.Color(accentHex);
    const wobble = (amount: number) => (random() - 0.5) * amount;
    const side = random() < 0.5 ? -1 : 1;

    // Camera first: the backdrop and haze are laid out against it.
    const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 220);
    const eye = a.view === 'up' ? vec(0, -5.5, 25.4) : vec(0, 0.3, 26);
    const aim = a.view === 'up' ? vec(0, 1, 0) : vec(0, 0.3, 0);
    camera.position.copy(eye);
    camera.lookAt(aim);
    if (a.view === 'askew') camera.rotateZ(side * mix(0.14, 0.24, random()));
    camera.updateMatrixWorld(true);
    const gaze = aim.clone().sub(eye).normalize();

    const source = { above: vec(side * 2, 8.5, -14), behind: vec(side * 1.5, 1, -17), side: vec(-side * 10.5, 2.5, -11) }[a.light];
    const toLight = source.clone().sub(vec(0, 0, -6)).normalize();

    // Backdrop: a painted wall of glowing gas, brightest where the light comes from.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const css = (colour: THREE.Color, alpha: number) => `rgba(${Math.round(colour.r * 255)},${Math.round(colour.g * 255)},${Math.round(colour.b * 255)},${alpha})`;
    const srgb = (colour: THREE.Color) => colour.clone().convertLinearToSRGB();
    const hazeCss = srgb(haze), deepCss = srgb(deep), shineCss = srgb(shine), accentCss = srgb(accent);
    ctx.fillStyle = css(hazeCss, 1);
    ctx.fillRect(0, 0, 512, 512);
    const puff = (x: number, y: number, radius: number, colour: THREE.Color, alpha: number) => {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, css(colour, alpha));
      gradient.addColorStop(1, css(colour, 0));
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    };
    for (let i = 0; i < 46; i++) puff(random() * 512, random() * 512, mix(50, 170, random()), i % 3 === 0 ? accentCss : i % 3 === 1 ? deepCss : hazeCss, mix(0.1, 0.3, random()));
    const spot = source.clone().project(camera);
    const sx = clamp01(spot.x * 0.42 + 0.5) * 512, sy = clamp01(-spot.y * 0.42 + 0.5) * 512;
    puff(sx, sy, mix(250, 380, age), shineCss, mix(0.55, 0.9, age));
    puff(256, 270, 190, shineCss, mix(0.35, 0.6, age));
    puff(sx, sy, 90, srgb(white), 0.5);
    for (const [x, y] of [[0, 0], [512, 0], [0, 512], [512, 512]]) puff(x, y, 300, deepCss, mix(0.6, 0.35, age));
    for (let i = 0; i < 150 * mix(0.5, 1.5, mood.density); i++) {
      ctx.fillStyle = css(srgb(white), mix(0.25, 0.8, random()));
      ctx.beginPath();
      ctx.arc(random() * 512, random() * 512, mix(0.5, 1.5, random() ** 2), 0, 6.3);
      ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const far = 80;
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, depthWrite: false }));
    wall.scale.setScalar(far * 2 * Math.tan(THREE.MathUtils.degToRad(15)) * 1.55);
    wall.position.copy(eye).addScaledVector(gaze, far);
    wall.quaternion.copy(camera.quaternion);
    wall.renderOrder = -10;
    root.add(wall);

    root.add(new THREE.HemisphereLight(haze.clone().lerp(white, 0.55), deep, mix(1.1, 1.6, mood.cheer)));
    const key = new THREE.DirectionalLight(shine.clone().lerp(new THREE.Color(mood.warmth > 0.5 ? '#ffb070' : '#bcd6ff'), Math.abs(mood.warmth - 0.5) * 0.5), mix(1.8, 2.8, age));
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.normalBias = 0.04;
    key.shadow.bias = -0.0004;
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight(accent, 0.7);
    fill.position.set(-side * 6, -4, 12);
    root.add(fill);

    // Dust: dark painted bodies with a bright rim on the faces turned to the light, fading into the haze with distance.
    const dustLow = new THREE.Color('#0c0b1a').lerp(new THREE.Color('#1a0c08'), mood.warmth);
    const dustHigh = new THREE.Color('#2a2c50').lerp(new THREE.Color('#50301e'), mood.warmth);
    const dust = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96 });
    const rim = rimPaint(rimColour.clone().lerp(white, 0.15));
    const farRim = rimPaint(rimColour.clone().lerp(haze, 0.45));
    const shade = new THREE.Color();
    const dress = (geometry: THREE.BufferGeometry, width: number, depth: number) => {
      const fade = clamp01((-6 - depth) / 18) * 0.55;
      tint(geometry, (p, n) => shade.copy(dustLow).lerp(dustHigh, clamp01(0.45 + 0.5 * noise(p.x * 0.6, p.y * 0.6, p.z * 0.6, 3))).lerp(rimColour, 0.22 * Math.max(0, n.dot(toLight)) ** 2).lerp(haze, fade));
      const body = new THREE.Mesh(geometry, dust);
      body.castShadow = depth > -12;
      body.receiveShadow = true;
      const edge = new THREE.Mesh(hull(geometry, (_p, n) => width * (0.3 + 1.5 * Math.max(0, n.dot(toLight)) ** 1.3)), fade > 0.35 ? farRim : rim);
      root.add(body, edge);
    };
    const erode = mix(0.15, 0.4, age), thin = mix(1.15, 0.7, age);
    const tips: { at: THREE.Vector3; r: number; hang: boolean }[] = [];
    const column = (spec: Column) => {
      const depthHalf = (26 - spec.z) * 0.27;
      const foot = (spec.hang ? 1 : -1) * (depthHalf + 5);
      const top = spec.hang ? spec.top : foot + (spec.top - foot) * mix(1.04, 0.86, age);
      const width = spec.width * thin, bend = wobble(2.2), offset = random() * 50;
      const points = [0, 0.3, 0.6, 0.85, 1].map((t) => vec(spec.x + bend * t ** 1.8 + (t > 0 && t < 1 ? wobble(0.9) : 0), mix(foot, top, t), spec.z + (t > 0 && t < 1 ? wobble(0.7) : 0)));
      const f = 0.9 / width;
      const geometry = limb(points, {
        rings: 64, sides: 22,
        radius: (t) => {
          let r = mix(1.25, 0.6, t) + 0.8 * (1 - t) ** 3 + 0.26 * gauss(t, 0.88, 0.06) - age * 0.22 * gauss(t, 0.74, 0.06);
          if (t > 0.93) r *= Math.sqrt(Math.max(0, 1 - ((t - 0.93) / 0.07) ** 2));
          return r * width;
        },
        rough: (p, t) => 1 + erode * noise(p.x * f + offset, p.y * f * 0.55, p.z * f, 5) - erode * Math.max(0, noise(p.x * f * 0.5 - offset, p.y * f * 0.4, p.z * f * 0.5, 2)) * Math.min(1, t * 3) * (t < 0.95 ? 1 : 0),
      });
      dress(geometry, width * 0.1, spec.z);
      const curve = new THREE.CatmullRomCurve3(points);
      tips.push({ at: curve.getPointAt(0.9), r: width * 0.8, hang: !!spec.hang });
      // A knuckle or two budding off the flank.
      for (let i = 0; i < Math.floor(random() * 2.4); i++) {
        const from = curve.getPointAt(mix(0.5, 0.72, random()));
        const out = vec(wobble(2), 0, wobble(0.6)).normalize();
        const rise = (spec.hang ? -1 : 1) * width * mix(1.6, 2.8, random()), girth = width * mix(0.2, 0.3, random());
        const bud = limb([from, from.clone().addScaledVector(out, width * 0.6).add(vec(0, rise * 0.4, 0)), from.clone().addScaledVector(out, width * 0.72).add(vec(0, rise, 0))], {
          rings: 18, sides: 12,
          radius: (t) => girth * (mix(1.3, 0.75, t) + 0.3 * gauss(t, 0.82, 0.1)) * (t > 0.9 ? Math.sqrt(Math.max(0, 1 - ((t - 0.9) / 0.1) ** 2)) : 1),
          rough: (p) => 1 + erode * 0.8 * noise(p.x * f * 1.5 + offset, p.y * f, p.z * f * 1.5, 3),
        });
        dress(bud, girth * 0.14, spec.z);
      }
    };
    const layouts: Record<typeof a.pillars, Column[]> = {
      colonnade: [
        { x: -8.3, z: -12, top: 6.2, width: 1.5 }, { x: -6.3, z: -7, top: 3.2, width: 1.05 }, { x: 7.8, z: -11, top: 5, width: 1.4 }, { x: 6.2, z: -6, top: 1.2, width: 0.95 },
        { x: -2, z: -21, top: -1.5, width: 2 }, { x: 3, z: -23, top: 0.5, width: 2.2 }, { x: -7.6, z: 8, top: -1.8, width: 0.9 }, { x: 7.2, z: 9, top: -3.2, width: 1 },
      ],
      trinity: [
        { x: -7.4 * side, z: -10, top: 7.2, width: 1.5 }, { x: -4.7 * side, z: -9, top: 4.2, width: 1.2 }, { x: -2.5 * side, z: -8, top: 1.2, width: 0.95 },
        { x: 8 * side, z: -15, top: 2.4, width: 1.7 }, { x: 4 * side, z: -24, top: -1, width: 2.3 }, { x: 6.9 * side, z: 8, top: -2.6, width: 1 }, { x: -7.8 * side, z: 9, top: -4.2, width: 0.9 },
      ],
      cavern: [
        { x: -7.2, z: -9, top: 0.8, width: 1.4 }, { x: 6.8, z: -8, top: -0.2, width: 1.3 }, { x: -2.6, z: -19, top: -3, width: 2 }, { x: 3.2, z: -17, top: -2, width: 1.8 },
        { x: -5.2, z: -11, top: 3.6, width: 1.3, hang: true }, { x: 5.8, z: -12, top: 2.6, width: 1.4, hang: true }, { x: 0.6, z: -21, top: 6.5, width: 2, hang: true },
        { x: -7.4, z: 8, top: 4.4, width: 0.9, hang: true }, { x: 7.3, z: 8.5, top: 5, width: 0.95, hang: true },
      ],
      lone: [
        { x: -5.6 * side, z: -9, top: 7.6, width: 2.2 }, { x: 5.2 * side, z: -13, top: -2.4, width: 2 }, { x: 8.4 * side, z: -7, top: -1, width: 1.2 },
        { x: 1.2 * side, z: -21, top: -4, width: 2.5 }, { x: 7.2 * side, z: 9, top: -3.6, width: 1 },
      ],
    };
    for (const spec of layouts[a.pillars]) column({ ...spec, x: spec.x + wobble(0.8), top: spec.top + wobble(1) });

    // Cloud banks the pillars grow out of, below and (in the cavern) above.
    const banks = a.pillars === 'cavern' ? [-1, -1, -1, 1, 1, 1] : [-1, -1, -1, -1];
    banks.forEach((where, index) => {
      const z = mix(-22, -9, random()), half = (26 - z) * 0.27;
      const size = mix(5, 8, random()) * mix(1.1, 0.8, age);
      const geometry = blob(size, (d) => 1 + 0.3 * noise(d.x * 1.6 + index * 5, d.y * 1.6, d.z * 1.6, 4), 12);
      geometry.scale(1.7, 0.55, 1);
      geometry.translate(mix(-11, 11, (index % 4) / 3) + wobble(3), where * (half + size * 0.12), z);
      geometry.computeVertexNormals();
      dress(geometry, 0.14, z);
    });

    // Glow in the gas itself: the source, and the clearing the hero hangs in.
    // These are flat discs facing the eye, each at one depth, so nearer pillars stay dark against them.
    const bloomCanvas = document.createElement('canvas');
    bloomCanvas.width = bloomCanvas.height = 128;
    const bloomCtx = bloomCanvas.getContext('2d')!;
    const falloff = bloomCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    for (const [stop, alpha] of [[0, 1], [0.25, 0.72], [0.55, 0.3], [0.8, 0.08], [1, 0]]) falloff.addColorStop(stop, `rgba(255,255,255,${alpha})`);
    bloomCtx.fillStyle = falloff;
    bloomCtx.fillRect(0, 0, 128, 128);
    const bloomMap = new THREE.CanvasTexture(bloomCanvas);
    const bloom = (at: THREE.Vector3, radius: number, colour: THREE.Color, opacity: number) => {
      const disc = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), new THREE.MeshBasicMaterial({ map: bloomMap, color: colour, transparent: true, opacity, depthWrite: false }));
      disc.position.copy(at);
      disc.quaternion.copy(camera.quaternion);
      disc.renderOrder = 1;
      root.add(disc);
    };
    bloom(source.clone().setZ(Math.min(source.z, -14.5)), mix(8, 12, age), shine, mix(0.6, 0.9, age));
    bloom(vec(0, 0.2, -13.5), 8.5, shine, mix(0.45, 0.7, mood.cheer));
    bloom(vec(wobble(8), wobble(4), -19), 14, haze.clone().lerp(shine, 0.35), 0.45);
    bloom(vec(0, 0, -3.2), 5, shine, 0.16);
    if (a.light === 'above') {
      const shaftPaint = hazePaint(shine, 0.07, THREE.DoubleSide);
      for (let i = 0; i < 6; i++) {
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(mix(0.3, 0.9, random()), mix(1, 2.2, random()), 26, 10, 1, true), shaftPaint);
        shaft.position.set(source.x + wobble(12), source.y - 12, mix(-12, -3, random()));
        shaft.rotation.z = (shaft.position.x - source.x) * 0.045;
        root.add(shaft);
      }
    }

    const twinklers: { node: THREE.Object3D; phase: number }[] = [];
    const spark = (at: THREE.Vector3, size: number, colour: THREE.Color, bubble: boolean) => {
      const node = new THREE.Group();
      const paint = new THREE.MeshBasicMaterial({ color: colour.clone().lerp(white, 0.7), toneMapped: false });
      node.add(new THREE.Mesh(new THREE.SphereGeometry(size, 14, 10), paint), softBall(size * 3.2, colour.clone().lerp(white, 0.2), 0.45, 3));
      for (const turn of [0.2, Math.PI / 2 + 0.2]) {
        const spike = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), paint);
        spike.scale.set(size * 8, size * 0.2, size * 0.2);
        spike.rotation.z = turn;
        node.add(spike);
      }
      if (bubble) node.add(softBall(size * mix(5, 8, random()), shine, 0.5, 2.2, true));
      node.position.copy(at);
      node.quaternion.copy(camera.quaternion);
      root.add(node);
      twinklers.push({ node, phase: random() * 6.28 });
    };
    const sparkTones = [new THREE.Color('#8fc0ff'), new THREE.Color('#fff0c0'), accent];
    if (a.newborns === 'sparks') {
      const count = Math.round(mix(5, 14, age) * mix(0.7, 1.4, mood.density));
      for (let i = 0; i < count; i++) spark(vec(wobble(20), wobble(13), mix(-20, -7, random())), mix(0.1, 0.24, random()), sparkTones[i % 3], true);
    }
    if (a.newborns === 'cluster') {
      const count = 5 + Math.floor(random() * 4 + age * 3);
      const heart = source.clone().lerp(vec(0, 2, -10), 0.35);
      for (let i = 0; i < count; i++) spark(heart.clone().add(vec(wobble(4.5), wobble(3.2), wobble(3))), mix(0.14, 0.34, random() ** 2), sparkTones[i % 4 === 3 ? 1 : 0], false);
    }

    // Wisps boiling off the pillar heads.
    const swayers: { node: THREE.Object3D; phase: number }[] = [];
    const wispPaint = hazePaint(rimColour.clone().lerp(white, 0.3), 0.3);
    for (const tip of tips) {
      const count = 1 + Math.floor(mix(1, 4, mood.energy) * random() + age * 2);
      for (let i = 0; i < count; i++) {
        const upward = tip.hang ? -1 : 1;
        const out = vec(wobble(1.4), upward * (0.6 + random()), wobble(0.6)).normalize();
        const reach = tip.r * mix(1.3, 2.8, random());
        const curl = vec(toLight.x * -0.8 + wobble(0.8), upward * 0.8, 0);
        const local = [vec(0, 0, 0), out.clone().multiplyScalar(reach * 0.45), out.clone().multiplyScalar(reach * 0.7).addScaledVector(curl, reach * 0.4), out.clone().multiplyScalar(reach * 0.8).addScaledVector(curl, reach)];
        const girth = tip.r * mix(0.14, 0.26, random());
        const pivot = new THREE.Group();
        pivot.add(new THREE.Mesh(limb(local, { rings: 18, sides: 7, radius: (t) => girth * Math.sin(Math.PI * Math.min(1, t * 1.02)) ** 0.6 * (1 - t * 0.5) + 0.01 }), wispPaint));
        pivot.position.copy(tip.at).addScaledVector(out, tip.r * 0.6);
        root.add(pivot);
        swayers.push({ node: pivot, phase: random() * 6.28 });
      }
    }

    let motes: THREE.InstancedMesh | null = null;
    const moteHomes: { at: THREE.Vector3; phase: number; size: number }[] = [];
    const matrix = new THREE.Matrix4();
    if (a.drifting === 'motes') {
      const count = Math.round(mix(90, 240, mood.density));
      motes = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), hazePaint(shine.clone().lerp(accent, 0.3), 0.85), count);
      for (let i = 0; i < count; i++) moteHomes.push({ at: vec(wobble(24), wobble(17), mix(-16, 12, random())), phase: random() * 6.28, size: mix(0.025, 0.09, random() ** 2) });
      root.add(motes);
    }
    if (a.drifting === 'streamers') {
      const paint = hazePaint(accent.clone().lerp(shine, 0.5), 0.26);
      for (let i = 0; i < 6 + Math.floor(mood.density * 4); i++) {
        const y = wobble(13), z = mix(-14, 6, random()), slope = wobble(5);
        const local = [0, 0.25, 0.5, 0.75, 1].map((t) => vec(mix(-15, 15, t), slope * (t - 0.5) + 1.3 * Math.sin(t * 6 + i), wobble(1.5)));
        const girth = mix(0.12, 0.38, random());
        const pivot = new THREE.Group();
        pivot.add(new THREE.Mesh(limb(local, { rings: 40, sides: 7, radius: (t) => girth * Math.sin(Math.PI * Math.min(1, t * 1.01)) ** 0.5 * (0.6 + 0.4 * Math.sin(t * 11 + i)) + 0.01 }), paint));
        pivot.position.set(0, y, z);
        root.add(pivot);
        swayers.push({ node: pivot, phase: random() * 6.28 });
      }
    }
    if (a.drifting === 'front') {
      const radius = mix(13, 18, random());
      const centre = source.clone().setZ(-9);
      const start = Math.atan2(-centre.y, -centre.x) - 0.9;
      const arc = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.55, 8, 80, 1.8), hazePaint(shine, 0.3));
      const crest = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.35, 0.07, 6, 80, 1.8), new THREE.MeshBasicMaterial({ color: shine.clone().lerp(rimColour, 0.4), transparent: true, opacity: 0.9, depthWrite: false }));
      const wash = new THREE.Mesh(new THREE.TorusGeometry(radius - 1.6, 1.5, 8, 80, 1.8), hazePaint(accent, 0.1));
      for (const part of [arc, crest, wash]) {
        part.position.copy(centre);
        part.rotation.z = start;
        root.add(part);
      }
    }

    // Where the cast hangs: [x, y, z, size]. The hero has the clearing.
    const slots: [number, number, number, number][] = [
      [0, -0.2, 1.5, 5.6], [-4.9 * side, 2.2, -3.5, 3.5], [5 * side, -2.2, -2, 3.5], [-3.9 * side, -4, 4, 2.6], [4 * side, 4, -5, 2.9], [-1.2 * side, 5, -5.5, 2.4],
    ];
    const place = (items: readonly Placeable[]) => {
      const bounds = new THREE.Box3();
      items.forEach((item, index) => {
        const [x, y, z, size] = slots[index % slots.length];
        const scale = Math.min(size / Math.max(item.height, 0.05), (size * 0.62) / Math.max(item.radius, 0.05));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x, y - (item.height * scale) / 2, z);
        item.holder.rotation.y = (context.random() - 0.5) * 0.9;
        item.holder.updateMatrixWorld(true);
        bounds.expandByPoint(vec(x - size, y - size, z - size)).expandByPoint(vec(x + size, y + size, z + size));
      });
      if (bounds.isEmpty()) bounds.set(vec(-5, -5, -5), vec(5, 5, 5));
      const centre = bounds.getCenter(new THREE.Vector3());
      const span = Math.max(bounds.getSize(new THREE.Vector3()).length(), 12);
      // The key comes from the carving light, pulled round to the front enough to model the cast.
      const from = toLight.clone().add(vec((mood.daylight - 0.5) * 1.2, 0.35, 0.9)).normalize();
      key.target.position.copy(centre);
      key.position.copy(centre).addScaledVector(from, span * 1.4);
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -span * 0.6;
      shadow.right = shadow.top = span * 0.6;
      shadow.near = 0.1;
      shadow.far = span * 3.2;
      shadow.updateProjectionMatrix();
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
    };

    const pace = mix(0.15, 1.2, mood.energy);
    const settle = (time: number) => {
      if (!motes) return;
      for (const [i, mote] of moteHomes.entries()) {
        matrix.makeScale(mote.size, mote.size, mote.size).setPosition(mote.at.x + Math.sin(time * 0.3 + mote.phase) * 0.5, mote.at.y + Math.cos(time * 0.23 + mote.phase) * 0.4 + ((time * 0.12) % 1) * 0, mote.at.z);
        motes.setMatrixAt(i, matrix);
      }
      motes.instanceMatrix.needsUpdate = true;
    };
    settle(0);

    return {
      object: root,
      camera,
      background: haze.clone(),
      capacity: slots.length,
      ground: null,
      keyLight: key,
      place,
      update(_dt, time) {
        settle(time * pace);
        for (const sway of swayers) sway.node.rotation.z = Math.sin(time * pace * 0.8 + sway.phase) * 0.07;
        for (const twinkle of twinklers) twinkle.node.scale.setScalar(1 + 0.12 * Math.sin(time * pace * 3 + twinkle.phase));
      },
      dispose() {
        key.shadow.map?.dispose();
        disposeTree(root);
      },
    };
  },
});
