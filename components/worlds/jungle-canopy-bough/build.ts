import * as THREE from 'three';
import { type Placeable, choice, clamp01, defineWorld, disposeTree, mix } from '@conjure/kit';
import { type V3, strokes, sweep } from './beast';

const v3 = (p: V3) => new THREE.Vector3(p[0], p[1], p[2]);
const hex = (c: THREE.Color) => `#${c.getHexString()}`;

export default defineWorld({
  questions: {
    weather: choice('What is the air doing?', {
      clear: 'Clear and sharp: you can see crown after crown to the horizon.',
      mist: 'Thick mist banks drifting between the crowns, the far forest erased.',
      rain: 'Steady rain: streaks in the air, everything dripping and glossy.',
      steam: 'Just after rain: steam rising off the canopy and slanting shafts of sun.',
    }),
    tree: choice('What kind of tree is the bough?', {
      pale: 'A pale grey-buff giant, smooth-barked under its moss.',
      dark: 'A dark, wet, deeply furrowed old tree, almost black between the green.',
      red: 'A warm red-brown hardwood with flaking bark.',
    }),
    epiphytes: choice('What grows thickest on the bough?', {
      bromeliads: 'Spiky bromeliad rosettes with red hearts, cups full of water.',
      ferns: 'Great bird\'s-nest ferns, bright green shuttlecocks of fronds.',
      moss: 'Long beards and curtains of hanging moss, dripping.',
      mixed: 'A crowded garden of everything at once.',
    }),
    hanging: choice('What hangs from the bough?', {
      figs: 'Clusters of figs sprouting straight from the bark, green ripening to red.',
      orchids: 'Arching sprays of orchids in flower.',
      pods: 'Bunches of long brown seed pods.',
      lianas: 'Nothing but lianas, looping and dangling into the drop.',
    }),
    traces: choice('Who has been here?', {
      nobody: 'No sign of anyone: untouched.',
      feast: 'The scraps of a feast: bitten fruit, peel and stripped twigs left on the bough.',
      nest: 'A leafy ape sleeping nest woven into the upper branch.',
      climber: 'A researcher: a bright climbing rope hanging past the bough and a camera trap strapped to the trunk.',
      hollow: 'A nest hole in the trunk sealed with mud, leaving only a narrow feeding slit.',
    }),
    air: choice('What moves through the air?', {
      empty: 'Nothing; the air is still.',
      flock: 'A loose flock of birds crossing far off.',
      butterflies: 'Butterflies drifting close by.',
      leaffall: 'Leaves spinning down from higher up.',
    }),
    view: choice('Where is the viewer?', {
      level: 'Level with the bough, side-on, like a neighbour on the next tree.',
      below: 'Slightly beneath it looking up, the underside and the drips above you.',
      above: 'A little above it looking down through to the depths: vertigo.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const d = mood.daylight, wetness = a.weather === 'rain' ? 1 : a.weather === 'steam' ? 0.6 : a.weather === 'mist' ? 0.3 : 0;

    // Sky and mist colour: peach dawn, pale green-white noon, mid-tone mauve-teal dusk.
    const dawn = new THREE.Color('#ecd9c2'), noon = new THREE.Color('#d6e6dc'), dusk = new THREE.Color('#a7a9c0');
    const mist = (d < 0.5 ? dawn.clone().lerp(noon, d * 2) : noon.clone().lerp(dusk, (d - 0.5) * 2));
    mist.lerp(new THREE.Color('#aab4b4'), (a.weather === 'rain' ? 0.35 : 0) + (1 - mood.cheer) * 0.18);
    mist.offsetHSL((mood.warmth - 0.5) * 0.03, 0, 0);
    const haze = { clear: 0.72, mist: 1, rain: 0.94, steam: 0.86 }[a.weather];
    const sunTone = new THREE.Color().setHSL(mix(0.07, 0.13, Math.sin(d * Math.PI)), mix(0.9, 0.5, Math.sin(d * Math.PI)), mix(0.6, 0.86, Math.sin(d * Math.PI)));
    const fade = (colour: THREE.ColorRepresentation, z: number) => new THREE.Color(colour).lerp(mist, clamp01((Math.abs(z) / 56) ** 0.85 * haze + (haze - 0.72) * 0.6));

    // Backdrop: gradient sky with the sun's glow painted in.
    {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const top = mist.clone().lerp(new THREE.Color(d > 0.75 ? '#6f7fa8' : '#bcd6ea'), a.weather === 'clear' ? 0.55 : 0.2);
      const gradient = ctx.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, hex(top));
      gradient.addColorStop(0.5, hex(mist));
      gradient.addColorStop(1, hex(mist.clone().lerp(new THREE.Color('#7fa39a'), 0.25)));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 256);
      if (a.weather !== 'rain') {
        const sx = mix(40, 216, d), sy = mix(150, 60, Math.sin(d * Math.PI));
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 90);
        const c = sunTone.clone().lerp(new THREE.Color('#ffffff'), 0.25);
        glow.addColorStop(0, `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a.weather === 'mist' ? 0.5 : 0.85})`);
        glow.addColorStop(0.12, `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},0.5)`);
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, 256, 256);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const sky = new THREE.Mesh(new THREE.PlaneGeometry(190, 150), new THREE.MeshBasicMaterial({ map: texture }));
      sky.position.set(0, 6, -85);
      sky.renderOrder = -1;
      root.add(sky);
    }

    // Materials.
    const barkTone = { pale: '#8d8270', dark: '#4b3d33', red: '#6f4634' }[a.tree];
    const barkMap = strokes(context, barkTone, new THREE.Color(barkTone).multiplyScalar(0.55), { count: 240, length: 26, width: 2.8, vertical: false });
    barkMap.repeat.set(2, 7);
    const bark = new THREE.MeshStandardMaterial({ map: barkMap, roughness: mix(0.96, 0.5, wetness) });
    const mossGreen = new THREE.Color('#5c8c3a').lerp(new THREE.Color('#857f47'), mood.wear * 0.55).offsetHSL(0, (mood.cheer - 0.5) * 0.15, 0);
    const leafGreen = new THREE.Color('#3f8046').lerp(new THREE.Color('#8c8540'), mood.wear * 0.45);
    const vine = new THREE.MeshStandardMaterial({ color: new THREE.Color('#5d5236').lerp(mossGreen, 0.25), roughness: 0.9 });

    // Instance pools: round "dots" (moss pads, fruit, flowers, scraps) and "blades" (every long leaf).
    const dots: { at: THREE.Vector3; size: V3; colour: THREE.Color; turn?: number }[] = [];
    const blades: { at: THREE.Vector3; yaw: number; pitch: number; size: V3; colour: THREE.Color; roll?: number }[] = [];
    const dot = (at: V3 | THREE.Vector3, size: V3, colour: THREE.ColorRepresentation, turn = 0) => dots.push({ at: at instanceof THREE.Vector3 ? at.clone() : v3(at), size, colour: new THREE.Color(colour), turn });
    const jitter = (colour: THREE.Color, amount = 0.05) => colour.clone().offsetHSL((random() - 0.5) * amount * 0.6, 0, (random() - 0.5) * amount * 2);

    // Limbs.
    type Limb = { curve: THREE.CatmullRomCurve3; r: (t: number) => number };
    const limbs: Limb[] = [];
    const limb = (points: V3[], r: (t: number) => number, moss: number) => {
      const mesh = sweep(root, points, r, bark, { radial: 14, segments: points.length * 12 });
      const curve = new THREE.CatmullRomCurve3(points.map(v3), false, 'centripetal');
      const self = { curve, r };
      limbs.push(self);
      const pads = Math.round(curve.getLength() * moss * mix(2.6, 6, mood.density));
      for (let i = 0; i < pads; i++) {
        const t = random(), p = curve.getPointAt(t), size = r(t), lean = (random() - 0.5) * 1.5;
        p.y += Math.cos(lean) * size * 0.82; p.z += Math.sin(lean) * size * 0.82;
        dot(p, [size * (0.5 + random() * 0.6), size * (0.3 + random() * 0.2), size * (0.5 + random() * 0.45)], jitter(mossGreen, 0.1), random() * 3);
      }
      return { mesh, ...self };
    };
    const along = (l: Limb, x: number) => {
      let best = 0, gap = Infinity;
      for (let i = 0; i <= 160; i++) { const g = Math.abs(l.curve.getPointAt(i / 160).x - x); if (g < gap) { gap = g; best = i / 160; } }
      const p = l.curve.getPointAt(best), r = l.r(best);
      return { p, r, top: new THREE.Vector3(p.x, p.y + r * 0.9, p.z), under: new THREE.Vector3(p.x, p.y - r * 0.9, p.z) };
    };

    // The parent trunk at the left edge, running out of frame top and bottom.
    const trunk = limb([[-5.9, -16, -1.0], [-5.75, -6, -0.9], [-5.7, 0, -0.8], [-5.8, 6, -0.9], [-5.9, 13, -1.0]], (t) => mix(1.45, 1.1, t), 0.25);
    const main = limb([[-6.3, -1.0, -0.7], [-4.6, -0.78, -0.3], [-2.5, -0.62, 0], [0, -0.6, 0.1], [2.5, -0.5, 0], [5, -0.3, -0.2], [8, -0.1, -0.5]], (t) => mix(0.9, 0.33, t), 1);
    const fork = limb([[0.1, -0.5, 0], [1.9, 0.55, -1.0], [4.0, 2.25, -1.3], [6.2, 3.15, -1.4], [8.5, 3.6, -1.6]], (t) => mix(0.55, 0.2, t), 0.9);
    const stub = limb([[-5.4, 2.1, -0.5], [-4.2, 2.3, 0.1], [-3.3, 2.42, 0.35], [-2.75, 2.75, 0.45]], (t) => mix(0.42, 0.2, t), 0.9);
    const lower = limb([[8.5, -3.9, -0.6], [5.6, -3.15, 0.1], [3.6, -2.85, 0.4], [2.3, -3.0, 0.5]], (t) => mix(0.45, 0.17, t), 0.9);
    // Broken end of the stub and small side twigs.
    dot([-2.74, 2.78, 0.45], [0.19, 0.12, 0.19], new THREE.Color(barkTone).multiplyScalar(1.35));
    for (let i = 0; i < 5 + Math.round(mood.wear * 4); i++) {
      const l = [main, fork, lower][i % 3], at = along(l, mix(-3.5, 6, random())).p, up = random() < 0.6 ? 1 : -1, len = 0.6 + random() * 1.1, lean = (random() - 0.5) * 1.2;
      sweep(root, [[at.x, at.y, at.z], [at.x + lean * 0.4, at.y + up * len * 0.6, at.z - 0.5], [at.x + lean, at.y + up * len, at.z - 0.9 - random()]], (t) => mix(0.09, 0.025, t), bark, { segments: 8, radial: 6 });
    }

    // Standing places, at several heights. The hero takes the broad mossy fork.
    const heroTop = along(main, 0.25).top;
    dot([0.25, heroTop.y - 0.32, 0.25], [1.75, 0.5, 1.05], mossGreen.clone().offsetHSL(0, 0, 0.02));
    const cradle = new THREE.Vector3(-1.5, -3.0, 0.75);
    const slots: { at: THREE.Vector3; h: number; r: number }[] = [
      { at: new THREE.Vector3(0.25, heroTop.y + 0.16, 0.3), h: 2.5, r: 1.15 },
      { at: along(main, -2.9).top.add(new THREE.Vector3(0, -0.04, 0.2)), h: 1.6, r: 0.8 },
      { at: along(main, 3.0).top.add(new THREE.Vector3(0, -0.03, 0.25)), h: 1.5, r: 0.75 },
      { at: along(stub, -3.6).top.add(new THREE.Vector3(0, -0.03, 0.1)), h: 1.45, r: 0.7 },
      { at: along(fork, 4.4).top.add(new THREE.Vector3(0, -0.03, 0.15)), h: 1.35, r: 0.7 },
      { at: cradle.clone().add(new THREE.Vector3(0, 0.2, 0)), h: 1.5, r: 0.75 },
      { at: along(lower, 3.9).top.add(new THREE.Vector3(0, -0.03, 0.1)), h: 1.4, r: 0.7 },
    ];
    slots.slice(1).forEach((slot) => dot([slot.at.x, slot.at.y - 0.13, slot.at.z], [slot.r * 0.95, 0.17, slot.r * 0.8], jitter(mossGreen, 0.05)));
    // The cradle: a mass of moss and roots slung in a liana loop under the bough.
    dot(cradle, [1.0, 0.32, 0.8], mossGreen.clone().lerp(new THREE.Color('#4a3a28'), 0.35));
    const loopA = along(main, -2.95).p, loopB = along(main, -0.15).p;
    sweep(root, [[loopA.x, loopA.y + 0.9, 0.78], [loopA.x + 0.05, loopA.y - 0.6, 0.86], [-2.45, -2.2, 0.8], [-1.5, -3.22, 0.75], [-0.55, -2.2, 0.8], [loopB.x - 0.05, loopB.y - 0.6, 0.84], [loopB.x, loopB.y + 0.9, 0.72]], 0.055, vine, { segments: 60, radial: 7 });
    sweep(root, [[loopA.x + 0.5, loopA.y + 0.85, -0.55], [-2.2, -1.8, 0.3], [-1.55, -3.2, 0.5], [-0.9, -1.8, 0.2], [loopB.x - 0.4, loopB.y + 0.85, -0.55]], 0.04, vine, { segments: 50, radial: 6 });

    // Lianas: some drop the whole height of the frame, some loop from limb to limb.
    const lianas = Math.round(mix(3, 9, mood.density)) + (a.hanging === 'lianas' ? 4 : 0);
    for (let i = 0; i < lianas; i++) {
      const x = mix(-4.6, 5.6, random()), z = random() < 0.5 || slots.some((slot) => Math.abs(slot.at.x - x) < slot.r + 0.35) ? -0.9 - random() * 1.6 : 0.95 + random() * 0.5, sway = (random() - 0.5) * 1.6, end = random() < 0.4 ? -2 - random() * 3 : -9;
      sweep(root, [[x + sway, 8.5, z - 0.4], [x + sway * 0.4, 3.5, z], [x, 0.3, z], [x - sway * 0.3, mix(0, end, 0.5), z], [x + sway * 0.2, end, z + 0.1]], 0.025 + random() * 0.04, vine, { segments: 34, radial: 6 });
      if (random() < 0.5) for (let j = 0; j < 4; j++) blades.push({ at: new THREE.Vector3(x + sway * 0.4 * (1 - j / 4), 3.2 - j * 0.9, z), yaw: random() * 6, pitch: -0.5 - random() * 0.6, size: [1.1, 1, 0.5 + random() * 0.2], colour: jitter(leafGreen, 0.08) });
    }
    for (let i = 0; i < 2 + Math.round(mood.density * 2); i++) {
      const p = along(fork, mix(2, 6, random())).under, q = along(main, p.x + mix(-2, 1.2, random())).under, sag = 0.5 + random() * 1.3;
      sweep(root, [[p.x, p.y + 0.3, p.z], [mix(p.x, q.x, 0.3), Math.min(p.y, q.y) - sag * 0.2, 0.0], [mix(p.x, q.x, 0.7), q.y - sag * 0.1 + 0.3, 0.0], [q.x, q.y + 0.25, q.z - 0.4]], 0.03, vine, { segments: 26, radial: 6 });
    }

    // Epiphytes.
    const rosette = (at: THREE.Vector3, size: number, kind: 'bromeliad' | 'fern' | 'orchid') => {
      const n = kind === 'fern' ? 13 : kind === 'bromeliad' ? 12 : 5, start = random() * 6;
      for (let i = 0; i < n; i++) {
        const inner = i % 2, pitch = kind === 'fern' ? mix(0.45, 1.15, random()) : kind === 'bromeliad' ? (inner ? mix(0.9, 1.3, random()) : mix(0.25, 0.7, random())) : mix(0.1, 0.5, random());
        const base = kind === 'fern' ? new THREE.Color('#7db548') : kind === 'bromeliad' ? (inner ? new THREE.Color('#c63d3a').lerp(leafGreen, 0.25 + (1 - mood.cheer) * 0.4) : leafGreen.clone().lerp(new THREE.Color('#8fb85a'), 0.3)) : leafGreen;
        blades.push({ at, yaw: start + (i / n) * Math.PI * 2 + (random() - 0.5) * 0.3, pitch, size: [kind === 'fern' ? 1.5 : kind === 'bromeliad' ? 0.85 : 1.2, 1, size * (kind === 'fern' ? 1.25 : inner ? 0.6 : 1) * (0.8 + random() * 0.4)], colour: jitter(base, 0.06) });
      }
    };
    const want = Math.round(mix(7, 22, mood.density));
    const kinds = { bromeliads: ['bromeliad'], ferns: ['fern'], moss: ['fern', 'bromeliad'], mixed: ['bromeliad', 'fern', 'bromeliad', 'orchid'] }[a.epiphytes] as ('bromeliad' | 'fern' | 'orchid')[];
    const count = a.epiphytes === 'moss' ? Math.round(want * 0.3) : want;
    for (let i = 0; i < count; i++) {
      const l = [main, main, fork, stub, lower, trunk][i % 6];
      let at: THREE.Vector3;
      if (l === trunk) { const y = mix(-4.5, 4.5, random()); at = new THREE.Vector3(-4.6 - random() * 0.2, y, -0.1 + random() * 0.5); }
      else { const s = along(l, mix(-5, 7, random())); at = s.top.clone(); at.z += (random() - 0.5) * s.r; at.y -= 0.06; }
      if (slots.some((slot) => Math.abs(slot.at.x - at.x) < slot.r * 0.85 && Math.abs(slot.at.y - at.y) < 0.9)) continue;
      rosette(at, 0.55 + random() * 0.45, kinds[i % kinds.length]);
    }
    // Hanging moss beards under every limb.
    const beards = Math.round(mix(14, 60, mood.density) * (a.epiphytes === 'moss' ? 2.6 : a.epiphytes === 'mixed' ? 1.2 : 0.7));
    for (let i = 0; i < beards; i++) {
      const l = [main, fork, stub, lower][i % 4], s = along(l, mix(-5.5, 7.5, random()));
      blades.push({ at: new THREE.Vector3(s.p.x, s.p.y - s.r * 0.5, s.p.z + (random() - 0.5) * s.r * 1.4), yaw: random() * 6, pitch: -1.45 + (random() - 0.5) * 0.25, size: [0.5, 1.6, (a.epiphytes === 'moss' ? 0.9 : 0.45) * (0.5 + random() * 1.2)], colour: jitter(mossGreen.clone().lerp(new THREE.Color('#9aa57a'), 0.35), 0.06) });
    }

    // What hangs from the bough.
    const hangs = Math.round(mix(5, 15, mood.density));
    if (a.hanging === 'figs') {
      for (let i = 0; i < hangs; i++) {
        const l = i % 3 ? main : fork, s = along(l, mix(-4.5, 6.5, random())), side = random() * Math.PI * 2, c = new THREE.Vector3(s.p.x, s.p.y + Math.cos(side) * s.r * -0.75, s.p.z + Math.abs(Math.sin(side)) * s.r * 0.95);
        for (let j = 0; j < 5 + Math.round(random() * 5); j++) dot([c.x + (random() - 0.5) * 0.4, c.y - random() * 0.3, c.z + random() * 0.14], [0.085, 0.095, 0.085].map((u) => u * (0.8 + random() * 0.5)) as unknown as V3, new THREE.Color('#8faa3a').lerp(new THREE.Color(random() < 0.5 ? '#c93a2e' : '#7a2f5a'), random() * (0.4 + mood.cheer * 0.6)));
      }
    } else if (a.hanging === 'orchids') {
      const petal = new THREE.Color().setHSL([0.9, 0.13, 0.0, 0.78][Math.floor(random() * 4)], mix(0.45, 0.9, mood.cheer), 0.66);
      for (let i = 0; i < hangs; i++) {
        const l = [main, fork, stub][i % 3], s = along(l, mix(-4.8, 6.5, random())), dir = random() < 0.5 ? -1 : 1, len = 0.7 + random() * 0.8, z = s.top.z + 0.25 + random() * 0.3;
        const tip: V3 = [s.top.x + dir * len, s.top.y - 0.1 - random() * 0.5, z + 0.25];
        sweep(root, [[s.top.x, s.top.y - 0.1, z], [s.top.x + dir * len * 0.4, s.top.y + 0.45, z + 0.1], tip], 0.014, vine, { segments: 10, radial: 4 });
        for (let j = 0; j < 6; j++) { const k = 0.35 + (j / 6) * 0.65, y = s.top.y + 0.45 * Math.sin(k * 2.2) * (1 - k) * 2 + (tip[1] - s.top.y) * k * k; dot([s.top.x + dir * len * k, y - 0.05 + (j % 2 ? 0.07 : -0.07), z + 0.1 + k * 0.15], [0.12, 0.1, 0.05], jitter(petal, 0.07), random()); dot([s.top.x + dir * len * k, y - 0.06, z + 0.15 + k * 0.15], [0.028, 0.028, 0.028], '#f0c23a'); }
        rosette(new THREE.Vector3(s.top.x, s.top.y - 0.08, z), 0.5, 'orchid');
      }
    } else if (a.hanging === 'pods') {
      for (let i = 0; i < hangs; i++) {
        const l = i % 2 ? main : fork, s = along(l, mix(-4.5, 6.5, random())), z = s.p.z + (random() - 0.2) * s.r;
        for (let j = 0; j < 3 + Math.round(random() * 3); j++) blades.push({ at: new THREE.Vector3(s.under.x + (random() - 0.5) * 0.3, s.under.y + 0.15, z), yaw: random() * 6, pitch: -1.5 + (random() - 0.5) * 0.3, size: [0.42, 2.2, 0.7 + random() * 0.5], colour: jitter(new THREE.Color('#6b4a2a'), 0.08) });
      }
    }

    // Traces of whoever was here before.
    if (a.traces === 'feast') {
      for (let i = 0; i < 26; i++) {
        const s = along(main, mix(-2.2, 2.6, random())), kind = random();
        const at: V3 = [s.top.x, s.top.y + 0.02, s.top.z + 0.25 + random() * 0.5];
        if (kind < 0.4) dot(at, [0.09, 0.05, 0.09], random() < 0.5 ? '#c93a2e' : '#e9c9a0');
        else if (kind < 0.7) dot(at, [0.13, 0.02, 0.06], '#d9a23a', random() * 3);
        else blades.push({ at: v3(at), yaw: random() * 6, pitch: 0.05, size: [0.35, 0.6, 0.3 + random() * 0.2], colour: new THREE.Color('#a8934a') });
      }
    } else if (a.traces === 'nest') {
      const s = along(fork, 6.0).top;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.2, 7, 18), bark);
      ring.position.set(s.x, s.y + 0.1, s.z + 0.1);
      ring.rotation.x = Math.PI / 2;
      ring.scale.z = 0.8;
      ring.castShadow = true;
      root.add(ring);
      for (let i = 0; i < 46; i++) { const az = random() * 6.28, rr = random() * 0.95; blades.push({ at: new THREE.Vector3(s.x + Math.cos(az) * rr, s.y + 0.18 + random() * 0.12, s.z + 0.1 + Math.sin(az) * rr * 0.9), yaw: az + 1.5, pitch: (random() - 0.4) * 0.6, size: [1.3, 1, 0.45 + random() * 0.3], colour: jitter(leafGreen.clone().lerp(new THREE.Color('#9a8f4a'), 0.3 + mood.wear * 0.5), 0.08) }); }
    } else if (a.traces === 'climber') {
      const rope = new THREE.MeshStandardMaterial({ color: '#e8632a', roughness: 0.6 }), x = 1.55;
      sweep(root, [[x + 0.15, 9, 0.85], [x + 0.05, 3, 0.9], [x, -2, 0.92], [x + 0.08, -9, 0.9]], 0.03, rope, { segments: 20, radial: 6 });
      const sling = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 6, 26), new THREE.MeshStandardMaterial({ color: '#2f5fb0', roughness: 0.6 }));
      const m = along(main, x).p;
      sling.position.set(x - 0.35, m.y, m.z);
      sling.rotation.y = Math.PI / 2;
      root.add(sling);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.46, 0.22), new THREE.MeshStandardMaterial({ color: '#5a6148', roughness: 0.7 }));
      box.position.set(-4.75, 0.75, 0.42);
      box.rotation.y = 0.75;
      box.castShadow = true;
      root.add(box);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 14), new THREE.MeshStandardMaterial({ color: '#15171a', roughness: 0.2 }));
      lens.rotation.z = Math.PI / 2;
      lens.position.set(0.18, 0.08, 0);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshStandardMaterial({ color: '#ff4030', emissive: '#ff3020', emissiveIntensity: 2 }));
      led.position.set(0.18, -0.1, 0.06);
      box.add(lens, led);
      const strap = new THREE.Mesh(new THREE.TorusGeometry(1.24, 0.03, 5, 40), new THREE.MeshStandardMaterial({ color: '#23262a', roughness: 0.8 }));
      strap.position.set(-5.72, 0.75, -0.8);
      strap.rotation.x = Math.PI / 2;
      root.add(strap);
    } else if (a.traces === 'hollow') {
      const mud = new THREE.MeshStandardMaterial({ color: '#7a5f43', roughness: 0.75 });
      const plug = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), mud);
      plug.scale.set(0.22, 0.62, 0.42);
      plug.position.set(-4.72, 0.55, 0.05);
      plug.rotation.y = 0.75;
      plug.castShadow = true;
      root.add(plug);
      const slit = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: '#120d0a', roughness: 0.9 }));
      slit.scale.set(0.06, 0.36, 0.07);
      slit.position.set(-4.56, 0.55, 0.22);
      slit.rotation.y = 0.75;
      root.add(slit);
      for (let i = 0; i < 5; i++) dot([-4.6 + random() * 0.08, 0.0 - i * 0.4 - random() * 0.3, 0.2 + random() * 0.2], [0.04, 0.3 + random() * 0.3, 0.05], '#e9e2cf');
    }

    const camera0 = { level: [1.2, 0.9, 19.5], below: [1.8, -4.4, 18.8], above: [-1.2, 6.2, 18.6] }[a.view];
    // Distant canopy: rows of crowns stepping back into the mist, and a floor of crowns far below.
    const crowns: { at: V3; size: V3; colour: THREE.Color }[] = [];
    const crown = (x: number, y: number, z: number, r: number, tone: THREE.Color) => {
      crowns.push({ at: [x, y, z], size: [r, r * 0.55, r * 0.9], colour: tone });
      for (let j = 0; j < 5; j++) crowns.push({ at: [x + (random() - 0.5) * r * 1.6, y + r * (0.05 + random() * 0.3), z + (random() - 0.5) * r], size: [r * (0.35 + random() * 0.25), r * 0.36, r * 0.5], colour: tone.clone().offsetHSL(0, 0, (random() - 0.5) * 0.05) });
    };
    const crownTone = new THREE.Color('#2c6846').lerp(new THREE.Color('#1f5f6c'), 0.35).lerp(new THREE.Color('#6b6a3a'), mood.wear * 0.3);
    for (const [z, y, r, step] of [[-9, -8.5, 4.2, 5.5], [-16, -7.5, 5, 6.5], [-26, -6, 6, 8], [-38, -4.5, 7, 10], [-52, -3, 8.5, 12]] as const) {
      const half = (19 - z) * 0.3 + r;
      for (let x = -half; x <= half; x += step * (0.7 + random() * 0.6)) crown(x, y + (random() - 0.5) * r * 0.5, z + (random() - 0.5) * 3, r * (0.75 + random() * 0.5), fade(jitter(crownTone, 0.06), z));
    }
    for (let i = 0; i < 9; i++) crown((random() - 0.5) * 22, -15 - random() * 3, -4 + random() * 9, 4 + random() * 2, fade(crownTone, -22));
    const emergents = 3 + Math.round(random() * 2);
    for (let i = 0; i < emergents; i++) {
      const z = -22 - random() * 26, x = (random() - 0.5) * (30 - z * 0.3), top = 2 + random() * 5, tone = fade('#8d8779', z);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 14, 7), new THREE.MeshStandardMaterial({ color: tone, roughness: 1 }));
      pole.position.set(x, top - 7, z);
      root.add(pole);
      crown(x, top + 0.8, z, 4.5 + random() * 2, fade(jitter(crownTone, 0.05), z));
    }
    {
      const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), new THREE.MeshStandardMaterial({ roughness: 1 }), crowns.length);
      const matrix = new THREE.Matrix4();
      crowns.forEach((c, i) => { matrix.makeScale(...c.size).setPosition(...c.at); mesh.setMatrixAt(i, matrix); mesh.setColorAt(i, c.colour); });
      root.add(mesh);
    }

    // Mist banks, steam and sun shafts: see-through, never measured as solid.
    const drifters: { mesh: THREE.Mesh; speed: number }[] = [];
    {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      const g = ctx.createRadialGradient(64, 32, 0, 64, 32, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.save(); ctx.translate(64, 32); ctx.scale(1, 0.5); ctx.translate(-64, -32); ctx.fillRect(0, -32, 128, 128); ctx.restore();
      const puff = new THREE.CanvasTexture(canvas);
      const banks = { clear: 3, mist: 15, rain: 8, steam: 11 }[a.weather];
      for (let i = 0; i < banks; i++) {
        const z = a.weather === 'steam' ? -6 - random() * 30 : -4 - random() * 44, w = 14 + random() * 22, h = a.weather === 'steam' ? 5 + random() * 6 : 3 + random() * 4;
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: puff, color: mist.clone().lerp(new THREE.Color('#ffffff'), 0.35), transparent: true, opacity: { clear: 0.4, mist: 0.8, rain: 0.6, steam: 0.62 }[a.weather], depthWrite: false }));
        mesh.position.set((random() - 0.5) * (30 - z * 0.5), -6.5 + random() * (a.weather === 'mist' ? 9 : 5) - z * 0.04, z);
        root.add(mesh);
        drifters.push({ mesh, speed: (random() - 0.3) * 0.5 });
      }
      if (a.weather === 'steam' || (a.weather === 'clear' && Math.abs(d - 0.5) > 0.2)) {
        for (let i = 0; i < 5; i++) {
          const shaft = new THREE.Mesh(new THREE.PlaneGeometry(1 + random() * 1.6, 26), new THREE.MeshBasicMaterial({ color: sunTone.clone().lerp(new THREE.Color('#ffffff'), 0.4), transparent: true, opacity: 0.1 + random() * 0.08, depthWrite: false }));
          shaft.position.set(-6 + i * 3 + random() * 1.5, 2, -2.5 - random() * 3);
          shaft.rotation.z = mix(0.5, -0.5, d);
          root.add(shaft);
        }
      }
    }

    // Rain and drips.
    const rainGroup = new THREE.Group();
    root.add(rainGroup);
    const RAIN_SPAN = 12;
    if (a.weather === 'rain') {
      const n = Math.round(mix(160, 340, mood.energy));
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.5, 0.012), new THREE.MeshBasicMaterial({ color: '#f4f8fa', transparent: true, opacity: 0.55, depthWrite: false }), n);
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < n; i++) { matrix.makeRotationZ(-0.08).setPosition((random() - 0.5) * 16, (random() - 0.5) * RAIN_SPAN * 2, -6 + random() * 12); mesh.setMatrixAt(i, matrix); }
      rainGroup.add(mesh);
    }
    if (wetness > 0) {
      const n = Math.round(wetness * mix(14, 34, mood.density));
      for (let i = 0; i < n; i++) { const l = [main, fork, stub, lower][i % 4], s = along(l, mix(-5, 7, random())); dot([s.under.x, s.under.y - 0.06 - random() * 0.1, s.under.z + (random() - 0.5) * s.r], [0.03, 0.055, 0.03], '#d9eef4'); }
    }

    // Flush the instance pools.
    {
      const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 7), new THREE.MeshStandardMaterial({ roughness: mix(0.95, 0.55, wetness) }), dots.length);
      const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      dots.forEach((item, i) => { q.setFromAxisAngle(up, item.turn ?? 0); matrix.compose(item.at, q, new THREE.Vector3(...item.size)); mesh.setMatrixAt(i, matrix); mesh.setColorAt(i, item.colour); });
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
      const geometry = new THREE.SphereGeometry(1, 6, 4);
      geometry.scale(0.14, 0.03, 0.5);
      geometry.translate(0, 0, 0.5);
      const leafMesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ roughness: mix(0.75, 0.4, wetness) }), blades.length);
      const qy = new THREE.Quaternion(), qx = new THREE.Quaternion(), xAxis = new THREE.Vector3(1, 0, 0);
      blades.forEach((item, i) => {
        qy.setFromAxisAngle(up, item.yaw); qx.setFromAxisAngle(xAxis, -item.pitch);
        matrix.compose(item.at, qy.multiply(qx), new THREE.Vector3(item.size[0] * item.size[2], item.size[1] * item.size[2], item.size[2]));
        leafMesh.setMatrixAt(i, matrix); leafMesh.setColorAt(i, item.colour);
      });
      leafMesh.castShadow = leafMesh.receiveShadow = true;
      root.add(leafMesh);
    }

    // Things in the air.
    const fliers: { group: THREE.Group; wings: THREE.Mesh[]; phase: number; speed: number; kind: 'bird' | 'butterfly' | 'leaf'; home: THREE.Vector3 }[] = [];
    if (a.air !== 'empty') {
      const wingGeometry = new THREE.SphereGeometry(1, 6, 4);
      wingGeometry.scale(0.5, 0.04, 0.22);
      wingGeometry.translate(0.5, 0, 0);
      const n = a.air === 'flock' ? Math.round(mix(5, 13, mood.density)) : a.air === 'butterflies' ? Math.round(mix(3, 8, mood.density)) : Math.round(mix(6, 14, mood.energy));
      for (let i = 0; i < n; i++) {
        const group = new THREE.Group(), wings: THREE.Mesh[] = [];
        const kind = a.air === 'flock' ? 'bird' : a.air === 'butterflies' ? 'butterfly' : 'leaf';
        const home = kind === 'bird' ? new THREE.Vector3(-9 + (i % 5) * 1.6 + random() * 9, 4 + random() * 4 - (i % 5) * 0.4, -24 - random() * 8) : new THREE.Vector3((random() - 0.5) * 9, kind === 'leaf' ? (random() - 0.5) * 9 : -1 + random() * 4.5, 1 + random() * 2.5);
        const tone = kind === 'bird' ? fade('#2a2f33', -12) : kind === 'butterfly' ? new THREE.Color().setHSL([0.58, 0.1, 0.0, 0.14][i % 4], mix(0.5, 0.95, mood.cheer), 0.56) : jitter(new THREE.Color('#b08a3a').lerp(leafGreen, random() * 0.6), 0.06);
        const material = new THREE.MeshStandardMaterial({ color: tone, roughness: 0.7, emissive: kind === 'butterfly' ? tone : '#000000', emissiveIntensity: 0.25 });
        const sides = kind === 'leaf' ? [1] : [-1, 1];
        for (const side of sides) { const wing = new THREE.Mesh(wingGeometry, material); wing.scale.x = side; group.add(wing); wings.push(wing); }
        group.scale.setScalar(kind === 'bird' ? 1.3 + random() * 0.6 : kind === 'butterfly' ? 0.26 + random() * 0.1 : 0.42);
        group.position.copy(home);
        group.rotation.set(kind === 'bird' ? 0.2 : random() * 2, random() * 0.6, kind === 'leaf' ? random() * 6 : 0);
        root.add(group);
        fliers.push({ group, wings, phase: random() * 6, speed: 0.6 + random() * 0.8, kind, home });
      }
    }

    // Light.
    const lift = Math.sin(d * Math.PI);
    root.add(new THREE.HemisphereLight(mist.clone().lerp(new THREE.Color('#ffffff'), 0.5), new THREE.Color('#516b4c'), mix(1.15, 1.6, lift) * mix(0.85, 1, mood.cheer)));
    const key = new THREE.DirectionalLight(sunTone.clone().lerp(new THREE.Color('#ffffff'), 0.35).offsetHSL((mood.warmth - 0.5) * 0.05, 0, 0), (a.weather === 'rain' || a.weather === 'mist' ? 1.5 : 2.6) * mix(0.8, 1, lift));
    key.position.set(mix(-13, 13, d), mix(7, 17, lift), 11);
    key.target.position.set(0, 0, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.04;
    key.shadow.bias = -0.0004;
    const shadow = key.shadow.camera;
    shadow.left = shadow.bottom = -9.5; shadow.right = shadow.top = 9.5; shadow.near = 1; shadow.far = 60;
    root.add(key, key.target);
    const rim = new THREE.DirectionalLight(mist.clone().lerp(new THREE.Color('#ffffff'), 0.4), 0.7);
    rim.position.set(mix(8, -8, d), 3, -10);
    root.add(rim);

    const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 400);
    camera.position.set(camera0[0] + (random() - 0.5) * 0.6, camera0[1], camera0[2]);
    const aim = new THREE.Vector3(0, { level: 0.25, below: 0.5, above: -0.15 }[a.view], 0);
    camera.lookAt(aim);

    const speed = mix(0.3, 1.6, mood.energy);
    return {
      object: root,
      camera,
      background: mist.clone(),
      capacity: slots.length,
      ground: main.mesh,
      keyLight: key,
      place(items: readonly Placeable[]) {
        items.forEach((item, i) => {
          const slot = slots[i % slots.length];
          const scale = Math.min(slot.h / Math.max(item.height, 0.05), slot.r / Math.max(item.radius, 0.05));
          item.holder.scale.setScalar(scale);
          item.holder.position.copy(slot.at);
          item.holder.rotation.y = Math.atan2(camera.position.x - slot.at.x, camera.position.z - slot.at.z) * 0.8 + (context.random() - 0.5) * 0.5;
          item.holder.updateMatrixWorld(true);
        });
        camera.lookAt(aim);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        shadow.updateProjectionMatrix();
      },
      update(dt, time) {
        for (const bank of drifters) { bank.mesh.position.x += bank.speed * dt * speed; if (bank.mesh.position.x > 34) bank.mesh.position.x = -34; if (bank.mesh.position.x < -34) bank.mesh.position.x = 34; }
        if (a.weather === 'rain') rainGroup.position.y = -((time * mix(9, 18, mood.energy)) % RAIN_SPAN);
        for (const f of fliers) {
          const t = time * speed * f.speed + f.phase;
          if (f.kind === 'bird') { f.group.position.x = f.home.x + ((time * speed * 1.2) % 40); f.wings.forEach((wing, i) => { wing.rotation.z = (i ? -1 : 1) * Math.sin(t * 5) * 0.6; }); }
          else if (f.kind === 'butterfly') { f.group.position.set(f.home.x + Math.sin(t * 0.7) * 1.2, f.home.y + Math.sin(t * 1.3) * 0.5, f.home.z); f.wings.forEach((wing, i) => { wing.rotation.z = (i ? -1 : 1) * (0.2 + Math.abs(Math.sin(t * 9)) * 1.1); }); }
          else { f.group.position.set(f.home.x + Math.sin(t) * 0.6, f.home.y - ((time * speed * 0.8 + f.phase) % 10) + 5, f.home.z); f.group.rotation.z = t * 1.5; }
        }
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
