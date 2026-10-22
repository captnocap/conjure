import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Placeable, type World, choice, clamp01, defineWorld, disposeTree, mix, score } from '@conjure/kit';

// Standing places: x, z, tallest and widest a thing may be there. The hero stands on the crest.
const SLOTS: readonly (readonly [number, number, number, number])[] = [[0, 0, 4.6, 3.4], [-7.6, 6.5, 2.5, 2.1], [7.4, 8.5, 2.4, 2.0], [-4.6, 15, 1.9, 1.7], [4.4, 17.5, 1.7, 1.5], [-0.4, 23, 1.0, 1.0]];
const CAMERA = new THREE.Vector3(1.6, 1.75, 34);

const GIANTS = {
  butterscotch: { zones: ['#f1dfa8', '#ead394', '#f6ebc6'], belts: ['#cfa55f', '#dab876', '#b98f4c'], ring: '#e6dbbd', shine: '#ffe9b8' },
  jovian: { zones: ['#f0e2c6', '#e8d2a8', '#f5ecd9'], belts: ['#b06a42', '#93502f', '#c98f60'], ring: '#dccdb0', shine: '#ffdcae' },
  ice: { zones: ['#c8eaf0', '#a8d8e8', '#e4f5f6'], belts: ['#4a7cbd', '#3a62a6', '#6a9bd0'], ring: '#c6d2de', shine: '#b4e2ff' },
  jade: { zones: ['#a3dcc8', '#84ccb6', '#daf2e8'], belts: ['#3c9486', '#2b7872', '#58ad9a'], ring: '#c2d8ce', shine: '#b0ffe4' },
  ember: { zones: ['#e06a3c', '#f09a4c', '#c9482c'], belts: ['#4a3234', '#33262a', '#6a3a36'], ring: '#bfa79b', shine: '#ff9a60' },
  orchid: { zones: ['#f2d3e2', '#f6dfca', '#e6ccf0'], belts: ['#ab78c4', '#cc7aa0', '#9069bc'], ring: '#e8d6ea', shine: '#ffcff2' },
} as const;

export default defineWorld({
  questions: {
    ridge: choice('What is the ridge like?', {
      swell: 'A long gentle swell of dust, rounded and soft-shouldered.',
      rim: 'The sharp rim of an old crater: steep near the top and strewn with boulders.',
      terraces: 'Stepped ledges, like a staircase worn almost smooth.',
      notch: 'A crest broken by a deep notch, with the giant showing through the gap.',
    }),
    regolith: choice('What colour is the ground?', {
      ash: 'Pale ash grey, the classic moon.',
      charcoal: 'Dark charcoal basalt with paler crater rims.',
      tan: 'Warm tan and biscuit, sun-baked.',
      frost: 'Grey dust under a rime of white frost.',
      rust: 'Iron-red dust, dull and old.',
    }),
    giant: choice('What colours is the giant in the sky?', {
      butterscotch: 'Soft gold and butterscotch, calm and old.',
      jovian: 'Cream and rust-brown stripes, bold.',
      ice: 'Pale cyan and cobalt, an ice giant.',
      jade: 'Sea-green and teal with white streaks.',
      ember: 'Charcoal and glowing orange, a hot giant.',
      orchid: 'Lavender, rose and peach, dreamlike.',
    }),
    looming: score('How much of the sky does the giant take?', ['A large disc beyond the ridge', 'A third of the sky', 'It looms over everything, too big to see whole']),
    phase: choice('How is the giant lit?', {
      full: 'Full and bright, every band clear.',
      gibbous: 'Mostly lit, one edge falling into shadow.',
      half: 'Half lit, half dissolved into the sky.',
      crescent: 'A thin bright crescent with the rest only a darker presence.',
    }),
    rings: choice('What are its rings like?', {
      classic: 'A broad bright ring system with one dark division, tilted open.',
      vast: 'A vast disc of many ringlets and gaps that crosses the whole sky.',
      blade: 'Seen nearly edge-on: a thin bright blade cutting across the globe.',
      thin: 'A few faint thread-like rings.',
      none: 'No rings.',
    }),
    shadow: choice('How does the ring shadow fall on the ground?', {
      bands: 'A few broad bands of shadow lying diagonally across the slope.',
      lines: 'Many fine parallel lines, like a ruled page.',
      deep: 'Most of the slope is in ring shadow, with only narrow slits of sun.',
      none: 'It does not reach here: the slope is in plain hard sunlight.',
    }),
    sky: choice('What is the sky?', {
      slate: 'Deep slate blue, airless but not black.',
      paper: 'A pale grey, like the blank sky of an engraving.',
      violet: 'Dusky violet.',
      teal: 'Dark teal, cold.',
      ink: 'Near-black, hard and absolute, pricked with stars.',
    }),
    company: choice('What else is in the sky?', {
      home: 'One small blue-white point, brighter than any star: home.',
      moons: 'Two sister moons, one of them crossing the face of the giant.',
      sun: 'A small, hard, shrunken sun.',
      nothing: 'Only stars.',
    }),
    traces: choice('What did earlier visitors leave on the slope?', {
      none: 'Nothing: nobody has ever stood here.',
      prints: 'A single line of bootprints climbing to the crest.',
      tracks: 'The twin tracks of a rover, curving up and over.',
      stakes: 'A route of small orange marker flags.',
      crates: 'A few abandoned equipment crates and a dropped tarp.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const skyColour = new THREE.Color({ slate: '#4f5b76', paper: '#c9cdd0', violet: '#5d4f78', teal: '#2f5a62', ink: '#1a1e2a' }[a.sky]);
    const paleSky = a.sky === 'paper';
    const tones = GIANTS[a.giant];
    const temper = new THREE.Color(mood.warmth > 0.5 ? '#ffb47a' : '#9fc0ff');
    const tint = (hex: string, flatten = 0) => {
      const colour = new THREE.Color(hex), hsl = { h: 0, s: 0, l: 0 };
      colour.getHSL(hsl);
      colour.setHSL(hsl.h, clamp01(hsl.s * mix(0.6, 1.15, mood.cheer)), hsl.l).lerp(temper, Math.abs(mood.warmth - 0.5) * 0.25);
      if (flatten) colour.lerp(new THREE.Color(tones.zones[0]).lerp(new THREE.Color(tones.belts[0]), 0.4), flatten);
      return colour;
    };
    const css = (colour: THREE.Color, alpha = 1) => { const c = colour.clone().convertLinearToSRGB(); return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${alpha})`; };

    // --- Terrain ---------------------------------------------------------------------------------
    const phases = Array.from({ length: 8 }, () => random() * Math.PI * 2);
    const crestHeight = 7;
    const notchX = (random() < 0.5 ? -1 : 1) * mix(8, 10.5, random());
    const profile = (x: number, z: number) => {
      const crest = crestHeight + Math.sin(x * 0.17 + phases[0]) * 0.9 + Math.sin(x * 0.43 + phases[1]) * 0.35;
      let h: number;
      if (z >= 0) {
        const t = Math.min(1, z / 33);
        h = crest * (1 - t) ** (a.ridge === 'rim' ? 2.3 : a.ridge === 'swell' ? 1.25 : 1.5);
        if (a.ridge === 'terraces') { const step = 1.25, level = h / step, low = Math.floor(level), f = level - low; h = (low + THREE.MathUtils.smoothstep(f, 0.55, 0.95)) * step; }
      } else h = crest * Math.exp(-((z / (a.ridge === 'rim' ? 4.5 : 7)) ** 2)) - Math.min(14, z * z * 0.02);
      if (a.ridge === 'notch') h -= 5.2 * Math.exp(-(((x - notchX) / 2.6) ** 2)) * Math.exp(-((z / 9) ** 2));
      return h;
    };
    const craters: { x: number; z: number; r: number; depth: number }[] = [];
    for (let tries = 0; tries < 60 && craters.length < 5 + Math.round(mood.wear * 6); tries++) {
      const r = mix(0.9, 3.4, random() ** 1.6), x = (random() - 0.5) * 34, z = mix(2, 30, random());
      if (SLOTS.every(([sx, sz, , wide]) => Math.hypot(x - sx, z - sz) > r * 1.5 + wide + 1.4) && craters.every((c) => Math.hypot(x - c.x, z - c.z) > (r + c.r) * 1.3)) craters.push({ x, z, r, depth: r * mix(0.16, 0.28, random()) });
    }
    const heightAt = (x: number, z: number) => {
      let h = profile(x, z) + Math.sin(x * 0.7 + phases[2]) * Math.sin(z * 0.9 + phases[3]) * 0.22 + Math.sin(x * 2.1 + phases[4]) * Math.sin(z * 1.7 + phases[5]) * 0.07;
      for (const c of craters) {
        const d = Math.hypot(x - c.x, z - c.z) / c.r;
        if (d < 1) h -= c.depth * (1 - d * d);
        h += c.depth * 0.42 * Math.exp(-(((d - 1) / 0.28) ** 2));
      }
      for (const [sx, sz, , wide] of SLOTS) {
        const d = Math.hypot(x - sx, z - sz);
        if (d < wide + 3.2) h = mix(h, profile(sx, sz), 1 - THREE.MathUtils.smoothstep(d, wide + 0.5, wide + 3.2));
      }
      return h;
    };
    const dustHex = { ash: '#a3a098', charcoal: '#5e5c5a', tan: '#b9a283', frost: '#c9cfd2', rust: '#a26a4e' }[a.regolith];
    const dust = new THREE.Color(dustHex).lerp(temper, Math.abs(mood.warmth - 0.5) * 0.12);
    const rimDust = dust.clone().lerp(new THREE.Color('#ffffff'), a.regolith === 'charcoal' ? 0.4 : 0.2);
    const floorDust = dust.clone().multiplyScalar(a.regolith === 'frost' ? 0.62 : 0.78);
    const terrain = new THREE.PlaneGeometry(110, 84, 180, 140);
    terrain.rotateX(-Math.PI / 2);
    terrain.translate(0, 0, 8);
    {
      const p = terrain.attributes.position as THREE.BufferAttribute, colours = new Float32Array(p.count * 3), shade = new THREE.Color();
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i);
        p.setY(i, heightAt(x, z));
        shade.copy(dust).multiplyScalar(0.93 + 0.1 * Math.sin(x * 1.3 + phases[6]) * Math.sin(z * 1.1 + phases[7]) + (random() - 0.5) * 0.05);
        for (const c of craters) {
          const d = Math.hypot(x - c.x, z - c.z) / c.r;
          if (d < 0.85) shade.lerp(floorDust, 0.8 * (1 - d));
          else if (d < 1.5) shade.lerp(rimDust, 0.75 * (1 - Math.abs(d - 1.08) / 0.45));
        }
        shade.toArray(colours, i * 3);
      }
      terrain.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      terrain.computeVertexNormals();
    }
    // Lambert, so the stage's room environment does not wash the hard shadows out.
    const ground = new THREE.Mesh(terrain, new THREE.MeshLambertMaterial({ vertexColors: true }));
    ground.receiveShadow = true;
    root.add(ground);

    // Far country beyond the crest: the close, curved horizon of a small moon and a few worn peaks.
    const farTone = dust.clone().lerp(skyColour, 0.38);
    const farMaterial = new THREE.MeshLambertMaterial({ color: farTone, flatShading: true });
    const horizon = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 12, 0, Math.PI * 2, 0, 0.5), new THREE.MeshLambertMaterial({ color: dust.clone().lerp(skyColour, 0.25) }));
    horizon.position.set(0, -398, -120);
    root.add(horizon);
    for (let i = 0, n = a.ridge === 'swell' ? 4 : 7; i < n; i++) {
      const x = -130 + (i / (n - 1)) * 260 + (random() - 0.5) * 25, tall = mix(9, 24, random()) * (Math.abs(x) < 30 ? 0.55 : 1);
      const peak = new THREE.Mesh(new THREE.ConeGeometry(tall * mix(1.6, 2.6, random()), tall, 7, 1), farMaterial);
      peak.position.set(x, tall / 2 - 3, mix(-150, -95, random()));
      peak.rotation.y = random() * 3;
      root.add(peak);
    }

    // Boulders and stones.
    const stoneGeometries = [0, 1].map(() => {
      const geometry = new THREE.IcosahedronGeometry(1, 1), p = geometry.attributes.position as THREE.BufferAttribute, seen = new Map<string, number>();
      for (let i = 0; i < p.count; i++) { const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`; if (!seen.has(key)) seen.set(key, mix(0.7, 1.15, random())); const k = seen.get(key)!; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.8, p.getZ(i) * k); }
      geometry.computeVertexNormals();
      return geometry;
    });
    const stoneMaterial = new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true });
    const stoneCount = Math.round(mix(26, 110, mood.density) * (a.ridge === 'rim' ? 1.5 : 1));
    const clearOf = (x: number, z: number, margin: number) => SLOTS.every(([sx, sz, , wide]) => Math.hypot(x - sx, z - sz) > wide + margin);
    const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), shadeColour = new THREE.Color();
    for (const geometry of stoneGeometries) {
      const stones = new THREE.InstancedMesh(geometry, stoneMaterial, stoneCount);
      let placed = 0;
      for (let tries = 0; tries < stoneCount * 4 && placed < stoneCount; tries++) {
        const nearCrest = a.ridge === 'rim' && random() < 0.5;
        const z = nearCrest ? mix(-1.5, 5, random()) : mix(-2, 31, random()), x = (random() - 0.5) * mix(34, 16, Math.max(0, z) / 31);
        const size = mix(0.07, nearCrest ? 1.3 : z > 19 ? 0.32 : 0.75, random() ** 3);
        if (!clearOf(x, z, size + 0.3)) continue;
        turn.setFromEuler(new THREE.Euler(random() * 0.5, random() * 6.28, random() * 0.5));
        stones.setMatrixAt(placed, matrix.compose(new THREE.Vector3(x, heightAt(x, z) + size * 0.25, z), turn, new THREE.Vector3(size * mix(0.8, 1.3, random()), size * mix(0.6, 1, random()), size)));
        stones.setColorAt(placed, shadeColour.copy(dust).multiplyScalar(mix(0.55, 0.9, random())));
        placed++;
      }
      stones.count = placed;
      stones.castShadow = stones.receiveShadow = true;
      root.add(stones);
    }

    // --- Light -----------------------------------------------------------------------------------
    const side = mood.daylight < 0.5 ? -1 : 1, lowness = Math.abs(mood.daylight * 2 - 1);
    const sunward = new THREE.Vector3(side * mix(0.5, 1.05, lowness), mix(0.62, 0.3, lowness), 0.6).normalize();
    const aim = new THREE.Vector3(0, 3, 11);
    root.add(new THREE.HemisphereLight(skyColour.clone().lerp(new THREE.Color('#ffffff'), 0.55), dust, paleSky ? 0.75 : 0.5));
    const key = new THREE.DirectionalLight(new THREE.Color('#fff6e8').lerp(temper, Math.abs(mood.warmth - 0.5) * 0.5), 4.2);
    key.position.copy(aim).addScaledVector(sunward, 150);
    key.target.position.copy(aim);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.04;
    key.shadow.bias = -0.0002;
    // Planetshine: the giant lights the backs of things from behind the ridge.
    const shine = new THREE.DirectionalLight(tint(tones.shine), a.phase === 'crescent' ? 0.35 : 0.9);
    shine.position.set(-40, 50, -120);
    root.add(key, key.target, shine);

    // The ring shadow is cast for real, by unseen bars hung far up the sunbeam behind the camera.
    if (a.shadow !== 'none') {
      const stripe = new THREE.Vector3(Math.cos(mix(0.35, 0.75, random()) * -side), 0, Math.sin(mix(0.35, 0.75, random()) * -side));
      const along = stripe.clone().addScaledVector(sunward, -stripe.dot(sunward)).normalize(), across = new THREE.Vector3().crossVectors(sunward, along).normalize();
      const basis = new THREE.Matrix4().makeBasis(along, sunward, across);
      const veil = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
      // Keep the hero in the sun: the band of shadow starts just down-slope of the crest.
      const centre = new THREE.Vector3(0, heightAt(0, 13), 13).addScaledVector(sunward, 90);
      const total = a.shadow === 'deep' ? 26 : a.shadow === 'lines' ? 20 : 17;
      let offset = -total / 2;
      const parts: THREE.BufferGeometry[] = [];
      while (offset < total / 2) {
        const width = a.shadow === 'bands' ? mix(1.6, 4.2, random()) : a.shadow === 'lines' ? mix(0.25, 0.8, random()) : mix(3.5, 7, random());
        const gap = a.shadow === 'bands' ? mix(1.2, 3, random()) : a.shadow === 'lines' ? mix(0.35, 0.9, random()) : mix(0.5, 1.1, random());
        parts.push(new THREE.BoxGeometry(110, 0.2, width).translate(0, 0, offset + width / 2));
        offset += width + gap;
      }
      const bars = new THREE.Mesh(mergeGeometries(parts)!, veil);
      for (const part of parts) part.dispose();
      bars.applyMatrix4(basis);
      bars.position.copy(centre);
      bars.castShadow = true;
      bars.frustumCulled = false;
      root.add(bars);
    }

    // --- The giant -------------------------------------------------------------------------------
    const R = mix(40, 86, a.looming);
    const giant = new THREE.Group();
    giant.position.set(-R * mix(0.62, 0.5, a.looming) + side * 4, 46 + R * mix(0.8, 0.7, a.looming), -260);
    const W = 1024, H = 512;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    {
      const bandCount = 13, gradient = ctx.createLinearGradient(0, 0, 0, H);
      let y = 0;
      for (let i = 0; i < bandCount && y < 1; i++) {
        const height = (1 / bandCount) * mix(0.6, 1.4, random()), list = i % 2 === 0 ? tones.zones : tones.belts;
        const colour = css(tint(list[Math.floor(random() * list.length)], 0.1));
        const top = clamp01(y + 0.012), bottom = clamp01(Math.max(top, y + height - 0.012));
        gradient.addColorStop(top, colour);
        gradient.addColorStop(i === bandCount - 1 ? 1 : bottom, colour);
        y += height;
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 300; i++) {
        const list = random() < 0.5 ? tones.zones : tones.belts;
        ctx.strokeStyle = css(tint(list[Math.floor(random() * list.length)]), mix(0.08, 0.3, random()));
        ctx.lineWidth = mix(0.6, 5, random() * random());
        const at = random() * H, wobble = mix(0.5, 6, random()), k = 1 + Math.floor(random() * 6), ph = random() * 6.28, from = random() * W, length = mix(0.15, 1, random()) * W;
        ctx.beginPath();
        for (let x = 0; x <= length; x += 8) { const px = from + x, py = at + Math.sin((px / W) * Math.PI * 2 * k + ph) * wobble; if (x === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
        ctx.stroke();
        ctx.save(); ctx.translate(-W, 0); ctx.stroke(); ctx.restore();
      }
      // One old storm, turned toward the ridge.
      const sx = W * mix(0.2, 0.34, random()), sy = H * mix(0.58, 0.68, random());
      const storm = tint(a.giant === 'ice' || a.giant === 'jade' ? '#f4fbff' : a.giant === 'ember' ? '#ffd24a' : '#c2452c');
      for (const [rx, ry, colour] of [[50, 23, css(tint(tones.zones[2]), 0.9)], [41, 18, css(storm)], [22, 9, css(storm.clone().offsetHSL(0, 0, 0.1))]] as const) { ctx.fillStyle = colour; ctx.beginPath(); ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
      // The shadow the rings throw on their own planet.
      if (a.rings !== 'none') for (const [at, thick, alpha] of [[0.415, 9, 0.5], [0.44, 4, 0.35], [0.4, 2, 0.3]] as const) { ctx.fillStyle = `rgba(20,18,30,${alpha * (a.rings === 'thin' ? 0.5 : 1)})`; ctx.fillRect(0, H * at, W, thick); }
      for (const [from, to] of [[0, 0.16], [1, 0.84]]) {
        const shade = ctx.createLinearGradient(0, from * H, 0, to * H);
        shade.addColorStop(0, css(tint(tones.belts[1]).multiplyScalar(0.6), 0.7)); shade.addColorStop(1, css(tint(tones.belts[1]), 0));
        ctx.fillStyle = shade; ctx.fillRect(0, Math.min(from, to) * H, W, 0.16 * H);
      }
      // Phase: the night side melts toward the colour of the sky, as a daytime moon does.
      const night = skyColour.clone().multiplyScalar(paleSky ? 0.82 : 0.72);
      const sunOffset = THREE.MathUtils.degToRad({ full: 0, gibbous: 58, half: 92, crescent: 140 }[a.phase]) * side;
      if (a.phase !== 'full') for (let x = 0; x < W; x += 4) {
        const lit = Math.cos((x / W - 0.25) * Math.PI * 2 + sunOffset);
        const dark = 0.94 * (1 - THREE.MathUtils.smoothstep(lit, -0.14, 0.2));
        if (dark > 0.003) { ctx.fillStyle = css(night, dark); ctx.fillRect(x, 0, 4, H); }
      }
    }
    const giantMap = new THREE.CanvasTexture(canvas);
    giantMap.colorSpace = THREE.SRGBColorSpace;
    giantMap.wrapS = THREE.RepeatWrapping;
    const globe = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 40), new THREE.MeshBasicMaterial({ map: giantMap, fog: false, toneMapped: false }));
    globe.scale.y = 0.93;
    giant.add(globe);
    const haze = new THREE.Mesh(new THREE.SphereGeometry(R * 1.018, 48, 24), new THREE.MeshBasicMaterial({ color: tint(tones.shine).lerp(skyColour, 0.3), side: THREE.BackSide, transparent: true, opacity: 0.4, depthWrite: false }));
    haze.scale.y = 0.93;
    giant.add(haze);
    if (a.rings !== 'none') {
      const ringlets: [number, number, number][] = [];
      const span = (from: number, to: number, count: number, tone: number, gap: number) => { const step = (to - from) / count; for (let i = 0; i < count; i++) if (random() >= gap) ringlets.push([from + i * step, from + (i + mix(0.8, 0.99, random())) * step, tone * mix(0.7, 1.08, random())]); };
      if (a.rings === 'thin') { span(1.6, 1.66, 2, 0.9, 0); span(1.95, 1.985, 1, 0.75, 0); span(2.25, 2.27, 1, 0.6, 0); }
      else if (a.rings === 'vast') { span(1.22, 1.55, 9, 0.6, 0.15); span(1.6, 2.15, 14, 1, 0.06); span(2.24, 2.7, 10, 0.8, 0.15); span(2.8, 3.1, 4, 0.55, 0.25); }
      else { span(1.26, 1.5, 6, 0.6, 0.15); span(1.52, 1.96, 12, 1, 0.04); span(2.06, 2.3, 6, 0.86, 0.1); ringlets.push([2.36, 2.375, 0.75]); }
      const ringTint = tint(tones.ring).lerp(skyColour, paleSky ? 0.25 : 0.1);
      const parts = ringlets.map(([from, to, tone]) => {
        const geometry = new THREE.RingGeometry(from * R, to * R, 128, 1), colours = new Float32Array(geometry.attributes.position.count * 3);
        const shade = ringTint.clone().multiplyScalar(paleSky ? tone * 0.8 : Math.min(1.08, tone * 1.02));
        for (let i = 0; i < colours.length; i += 3) shade.toArray(colours, i);
        geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
        return geometry;
      });
      const rings = new THREE.Mesh(mergeGeometries(parts)!, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false, toneMapped: false }));
      for (const part of parts) part.dispose();
      rings.rotation.x = -Math.PI / 2;
      giant.add(rings);
    }
    // Tip the system. The ridge already looks up at it from below, which opens the rings a little.
    giant.rotation.set(a.rings === 'blade' ? -0.27 : mix(0.02, 0.26, random()), 0, -side * mix(0.2, 0.42, random()) * (random() < 0.8 ? 1 : -1));
    root.add(giant);

    // --- Company in the sky -----------------------------------------------------------------------
    const basic = (colour: THREE.ColorRepresentation) => new THREE.MeshBasicMaterial({ color: colour, fog: false, toneMapped: false });
    const starTone = paleSky ? skyColour.clone().multiplyScalar(0.72) : new THREE.Color('#f2f0e6');
    const starCount = Math.round(mix(50, 260, mood.density) * (a.sky === 'ink' ? 1.5 : paleSky ? 0.5 : 1));
    const stars = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), basic('#ffffff'), starCount);
    const giantDirection = giant.position.clone().sub(CAMERA).normalize(), giantAngle = Math.asin(Math.min(0.99, (R * (a.rings === 'none' ? 1.05 : 1.5)) / giant.position.distanceTo(CAMERA)));
    let starsPlaced = 0;
    for (let tries = 0; tries < starCount * 3 && starsPlaced < starCount; tries++) {
      const direction = new THREE.Vector3((random() - 0.5) * 1.5, mix(0.02, 0.95, random()), -1).normalize();
      if (direction.angleTo(giantDirection) < giantAngle) continue;
      const size = mix(1.1, 3.4, random() ** 4);
      stars.setMatrixAt(starsPlaced, matrix.makeScale(size, size, size).setPosition(CAMERA.x + direction.x * 620, CAMERA.y + direction.y * 620, CAMERA.z + direction.z * 620));
      stars.setColorAt(starsPlaced, shadeColour.copy(starTone).lerp(skyColour, random() * 0.5));
      starsPlaced++;
    }
    stars.count = starsPlaced;
    root.add(stars);
    const drifters: { pivot: THREE.Object3D; rate: number }[] = [];
    const skyPoint = (right: number, up: number, distance: number) => new THREE.Vector3(CAMERA.x + right * distance, CAMERA.y + up * distance, CAMERA.z - distance);
    if (a.company === 'home') {
      const at = skyPoint(side * -0.27 + 0.02, 0.52, 560);
      const home = new THREE.Mesh(new THREE.SphereGeometry(5.2, 16, 12), basic('#bfe2ff'));
      home.position.copy(at);
      root.add(home);
      for (const turnBy of [0, Math.PI / 2]) { const glint = new THREE.Mesh(new THREE.BoxGeometry(34, 1.1, 1.1), basic(paleSky ? '#8fb6d8' : '#dff1ff')); glint.position.copy(at); glint.rotation.z = turnBy; root.add(glint); }
    } else if (a.company === 'sun') {
      const at = skyPoint(side * 0.3, 0.6, 560);
      const sun = new THREE.Mesh(new THREE.SphereGeometry(8, 20, 14), basic('#fffbe6'));
      sun.position.copy(at);
      root.add(sun);
      for (let i = 0; i < 8; i++) { const ray = new THREE.Mesh(new THREE.BoxGeometry(mix(34, 62, random()), 1, 1), basic(paleSky ? '#f2e6b8' : '#fff6cf')); ray.position.copy(at); ray.rotation.z = (i / 8) * Math.PI; root.add(ray); }
    } else if (a.company === 'moons') {
      // One crosses the face of the giant, towing its round shadow; the other hangs out past the rings.
      const transit = new THREE.Group();
      const moon = new THREE.Mesh(new THREE.SphereGeometry(R * 0.055, 16, 12), new THREE.MeshLambertMaterial({ color: '#d9d4c8' }));
      moon.position.set(0, 0, R * 1.45);
      const spot = new THREE.Mesh(new THREE.SphereGeometry(R * 0.05, 14, 10), basic('#1c1a24'));
      spot.position.set(-side * R * 0.08, R * 0.03, R * 1.004);
      spot.scale.z = 0.05;
      transit.add(moon, spot);
      transit.rotation.set(-0.12, mix(-0.25, 0.3, random()), 0);
      giant.add(transit);
      drifters.push({ pivot: transit, rate: 0.006 });
      const sister = new THREE.Mesh(new THREE.SphereGeometry(11, 18, 12), new THREE.MeshLambertMaterial({ color: tint('#cbbfae') }));
      sister.position.copy(skyPoint(side * -0.2 + 0.22, 0.6, 520));
      root.add(sister);
    }

    // --- What earlier visitors left -------------------------------------------------------------------
    const routeX = (z: number) => 3.2 + Math.sin(z * 0.19 + phases[2]) * 2.2 - (1 - z / 30) * 5.6 * (z < 9 ? (9 - z) / 9 : 0) * 0.45 + (z < 9 ? ((9 - z) / 9) * 2.4 : 0);
    const darkDust = new THREE.MeshLambertMaterial({ color: dust.clone().multiplyScalar(0.5) });
    const lay = (mesh: THREE.InstancedMesh, i: number, x: number, z: number, heading: number, lift = 0.03) => {
      const e = 0.3, normal = new THREE.Vector3(heightAt(x - e, z) - heightAt(x + e, z), 2 * e, heightAt(x, z - e) - heightAt(x, z + e)).normalize();
      turn.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading));
      mesh.setMatrixAt(i, matrix.compose(new THREE.Vector3(x, heightAt(x, z) + lift, z), turn, new THREE.Vector3(1, 1, 1)));
    };
    if (a.traces === 'prints') {
      const count = 74, prints = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.075, 0.2, 2, 8).rotateX(Math.PI / 2).scale(1, 0.1, 1), darkDust, count);
      for (let i = 0; i < count; i++) { const z = 30 - i * 0.37, x = routeX(z) + (i % 2 ? 0.16 : -0.16); lay(prints, i, x, z, Math.atan2(routeX(z - 0.5) - routeX(z), -0.5) + Math.PI, 0.012); }
      prints.receiveShadow = true;
      root.add(prints);
    } else if (a.traces === 'tracks') {
      const count = 260, treads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.03, 0.1), darkDust, count);
      for (let i = 0; i < count; i++) { const z = 31 - Math.floor(i / 2) * 0.24, wheel = i % 2 ? 0.75 : -0.75; lay(treads, i, routeX(z) + wheel - 1.2, z, (Math.floor(i / 2) % 2 ? 0.3 : -0.3), 0.01); }
      treads.receiveShadow = true;
      root.add(treads);
    } else if (a.traces === 'stakes') {
      const wire = new THREE.MeshStandardMaterial({ color: '#c9ccce', metalness: 0.6, roughness: 0.4 }), flagMaterial = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.3 ? '#f0641e' : '#d8d3c4', roughness: 0.8, side: THREE.DoubleSide });
      for (let i = 0; i < 9; i++) {
        const z = 28 - i * 3.1, x = routeX(z) + (i % 2 ? 0.5 : -0.5), y = heightAt(x, z), lean = (random() - 0.5) * mix(0.05, 0.6, mood.wear);
        const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.95, 5).translate(0, 0.42, 0), wire), tab = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2).translate(0.15, 0.78, 0), flagMaterial);
        const post = new THREE.Group();
        post.add(stake, tab);
        post.position.set(x, y, z);
        post.rotation.z = lean;
        stake.castShadow = tab.castShadow = true;
        root.add(post);
      }
    } else if (a.traces === 'crates') {
      const paint = ['#d8d4c8', '#c9a23c', '#8d9aa6', '#b6532d'];
      for (let i = 0, n = 3 + Math.round(mood.density * 4); i < n; i++) {
        let x = 0, z = 0;
        for (let tries = 0; tries < 20; tries++) { z = mix(4, 24, random()); x = (random() - 0.5) * mix(26, 10, z / 24); if (clearOf(x, z, 0.9)) break; }
        const w = mix(0.5, 1.1, random()), h = mix(0.35, 0.7, random()), d = mix(0.5, 0.9, random());
        const crate = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: new THREE.Color(paint[i % paint.length]).lerp(dust, mood.wear * 0.5), roughness: 0.7, metalness: 0.2 }));
        crate.position.set(x, heightAt(x, z) + h / 2 - 0.04, z);
        crate.rotation.set((random() - 0.5) * 0.2, random() * 3, (random() - 0.5) * 0.2);
        crate.castShadow = crate.receiveShadow = true;
        root.add(crate);
      }
    }

    const camera = new THREE.PerspectiveCamera(41, 1, 0.5, 900);
    camera.position.copy(CAMERA);
    const turning = mix(0.002, 0.02, mood.energy);
    const world: World = {
      object: root, camera, background: skyColour, capacity: SLOTS.length, ground, keyLight: key,
      place(items: readonly Placeable[]) {
        items.forEach((item, index) => {
          const [x, z, tall, wide] = SLOTS[index % SLOTS.length];
          const scale = Math.min(tall / Math.max(item.height, 0.01), wide / Math.max(item.radius, 0.01), 3.4);
          item.holder.scale.setScalar(scale);
          item.holder.position.set(x, profile(x, z) - 0.03, z);
          item.holder.rotation.y = Math.atan2(CAMERA.x - x, CAMERA.z - z) * 0.8 + (context.random() - 0.5) * 0.6;
        });
        camera.lookAt(0, 8.6, 0);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        const shadow = key.shadow.camera;
        shadow.left = -40; shadow.right = 40; shadow.bottom = -40; shadow.top = 40;
        shadow.near = 10; shadow.far = 320;
        shadow.updateProjectionMatrix();
      },
      update(dt) {
        giantMap.offset.x -= dt * turning * 0.2;
        for (const { pivot, rate } of drifters) pivot.rotation.y += dt * rate * mix(0.4, 2.5, mood.energy);
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
    return world;
  },
});
