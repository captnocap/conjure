import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

const PALETTES = {
  jovian: 'Cream zones and rust-brown belts, the classic striped giant.',
  butterscotch: 'Soft gold and pale butterscotch haze, gentle and old.',
  ice: 'Pale cyan and deep cobalt, a cold ice giant far from its sun.',
  methane: 'Teal and sea-green with white cloud streaks, strange and aquatic.',
  ember: 'Charcoal and glowing crimson, a scorched giant too close to its star.',
  orchid: 'Lavender, rose and peach, a dreamlike candy-coloured world.',
} as const;
const TONES: Record<keyof typeof PALETTES, { zones: string[]; belts: string[]; ring: string; glow: string }> = {
  jovian: { zones: ['#efe0c2', '#e6cfa4', '#f4ead6'], belts: ['#a8623c', '#8a4a2e', '#c48a5a'], ring: '#d9c8a8', glow: '#ffd9a0' },
  butterscotch: { zones: ['#f0dca0', '#e8cf8a', '#f5e7bd'], belts: ['#cfa861', '#d9b877', '#bf9650'], ring: '#e3d6b4', glow: '#ffe6a8' },
  ice: { zones: ['#bfe6ee', '#9fd4e6', '#dff3f5'], belts: ['#3f6fb5', '#2f559c', '#5a8fca'], ring: '#b9c7d6', glow: '#9fdcff' },
  methane: { zones: ['#8fd6c0', '#6ec5ae', '#d5f0e4'], belts: ['#2f8a7c', '#1f6e6a', '#49a592'], ring: '#b5cfc4', glow: '#a4ffe0' },
  ember: { zones: ['#d9542e', '#f08a3c', '#b8361f'], belts: ['#3a2a2c', '#231b20', '#5a3030'], ring: '#a88f84', glow: '#ff7a40' },
  orchid: { zones: ['#f1cfe0', '#f6dcc4', '#e3c6ef'], belts: ['#a56fc0', '#c9709a', '#8a62b8'], ring: '#e6d2e8', glow: '#ffc4f0' },
};

type Ringlet = { from: number; to: number; tone: number; start?: number; arc?: number };

export default defineThing({
  questions: {
    palette: choice('What colours are its cloud bands?', PALETTES),
    banding: score('How strongly striped is it?', ['A smooth featureless haze', 'Soft blurred bands', 'Clear belts and zones', 'Bold turbulent stripes']),
    rings: choice('What are its rings like?', {
      hairline: 'A couple of faint hairline rings, barely there.',
      narrow: 'One narrow bright band held tight by shepherd moons.',
      classic: 'A broad bright ring system split by one dark division.',
      vast: 'A vast disc of many ringlets and gaps, wider than the planet twice over.',
      arcs: 'Broken, clumpy arcs: a ring that is still forming or falling apart.',
      none: 'No rings at all: a bare striped globe.',
    }),
    tilt: score('How open are the rings to the viewer?', ['Edge-on, a thin line across the globe', 'Slightly tipped', 'Tilted, a clear ellipse', 'Wide open like a hat brim']),
    storm: choice('What weather marks its face?', {
      calm: 'Nothing: unbroken bands.',
      spot: 'One great oval storm, an eye that has stared for centuries.',
      pearls: 'A string of small white oval storms along one belt.',
      hexagon: 'A dark six-sided jet stream capping the pole.',
      scars: 'A chain of dark bruises where something struck it.',
    }),
    phase: choice('How is it lit?', {
      full: 'Fully lit and face-on, bright and plain.',
      gibbous: 'Mostly lit with a soft shadowed edge.',
      half: 'Half lit, half in night.',
      crescent: 'A thin bright crescent around a dark globe.',
      backlit: 'Backlit: a dark disc with a glowing rim of atmosphere and bright rings.',
    }),
    moons: choice('What keeps it company?', {
      none: 'Nothing; it is alone.',
      shepherd: 'One small shepherd moon riding the ring edge.',
      family: 'A family of several moons of different sizes.',
    }),
    event: choice('What is happening there right now?', {
      quiet: 'Nothing. It turns as it has for four billion years.',
      aurora: 'Glowing auroral crowns ring both poles.',
      shredding: 'A small moon has strayed too close and is being pulled into a trail of rubble.',
      lightning: 'Lightning flickers in the cloud tops on the night side.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tones = TONES[a.palette];
    const R = 1.5;
    const temper = new THREE.Color(mood.warmth > 0.5 ? '#ffb47a' : '#9fc0ff');
    const tint = (hex: string, towardMean = 0) => {
      const colour = new THREE.Color(hex);
      const hsl = { h: 0, s: 0, l: 0 };
      colour.getHSL(hsl);
      colour.setHSL(hsl.h, clamp01(hsl.s * mix(0.55, 1.2, mood.cheer)), hsl.l);
      colour.lerp(temper, Math.abs(mood.warmth - 0.5) * 0.3);
      if (towardMean) colour.lerp(new THREE.Color(tones.zones[0]).lerp(new THREE.Color(tones.belts[0]), 0.4), towardMean);
      return colour;
    };
    const css = (colour: THREE.Color, alpha = 1) => `rgba(${Math.round(colour.r * 255)},${Math.round(colour.g * 255)},${Math.round(colour.b * 255)},${alpha})`;

    // --- Cloud tops, painted as an equirectangular map -------------------------------------
    const W = 1024, H = 512;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const flatten = mix(0.85, 0, clamp01(a.banding * 1.25));
    const bandCount = Math.round(mix(5, 17, a.banding)) | 1;
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    let y = 0;
    const edges: number[] = [];
    for (let i = 0; i < bandCount; i++) {
      const height = (1 / bandCount) * mix(0.6, 1.4, random());
      const list = i % 2 === 0 ? tones.zones : tones.belts;
      const colour = css(tint(list[Math.floor(random() * list.length)], flatten));
      const top = clamp01(y + 0.012), bottom = clamp01(Math.max(top, y + height - 0.012));
      gradient.addColorStop(top, colour);
      gradient.addColorStop(i === bandCount - 1 ? 1 : bottom, colour);
      y += height;
      edges.push(y);
      if (y >= 1) break;
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
    // Turbulence: wavy filaments that wrap cleanly around the globe.
    const streaks = Math.round(mix(30, 420, a.banding));
    for (let i = 0; i < streaks; i++) {
      const list = random() < 0.5 ? tones.zones : tones.belts;
      ctx.strokeStyle = css(tint(list[Math.floor(random() * list.length)], flatten * 0.6), mix(0.08, 0.32, random()));
      ctx.lineWidth = mix(0.6, 5, random() * random());
      const at = random() * H, wobble = mix(0.5, 7, random()) * a.banding, k = 1 + Math.floor(random() * 6), p = random() * 6.28;
      const from = random() * W, length = mix(0.15, 1, random()) * W;
      ctx.beginPath();
      for (let x = 0; x <= length; x += 8) {
        const px = from + x, py = at + Math.sin((px / W) * Math.PI * 2 * k + p) * wobble;
        if (x === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.save(); ctx.translate(-W, 0); ctx.stroke(); ctx.restore();
    }
    // Scalloped edges between belts when the banding is bold.
    if (a.banding > 0.55) for (const edge of edges) {
      const k = 6 + Math.floor(random() * 10), p = random() * 6.28;
      ctx.strokeStyle = css(tint(tones.zones[2]), 0.35);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 4) ctx.lineTo(x, edge * H + Math.abs(Math.sin((x / W) * Math.PI * k + p)) * 7 * a.banding);
      ctx.stroke();
    }
    const oval = (cx: number, cy: number, rx: number, ry: number, fill: string, stroke?: string) => {
      for (const shift of [0, -W, W]) {
        ctx.beginPath(); ctx.ellipse(cx + shift, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = fill; ctx.fill();
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
      }
    };
    const facing = W * 0.25; // longitude that looks down +z
    if (a.storm === 'spot') {
      const cx = facing + mix(-70, 70, random()), cy = H * mix(0.6, 0.68, random());
      const core = tint(a.palette === 'ice' || a.palette === 'methane' ? '#f4fbff' : a.palette === 'ember' ? '#ffd24a' : '#c2452c');
      oval(cx, cy, 78, 36, css(tint(tones.zones[2]), 0.9));
      oval(cx, cy, 66, 29, css(core, 1), css(tint(tones.belts[1]), 0.7));
      oval(cx, cy, 40, 16, css(core.clone().offsetHSL(0, 0, 0.1), 0.9));
      oval(cx - 6, cy, 16, 6, css(core.clone().offsetHSL(0, 0, -0.12), 0.8));
    } else if (a.storm === 'pearls') {
      const cy = H * mix(0.58, 0.7, random()), n = 7 + Math.floor(random() * 4);
      for (let i = 0; i < n; i++) oval(facing - 190 + i * (380 / n) + random() * 14, cy + random() * 8, 17 + random() * 7, 10 + random() * 3, 'rgba(255,255,250,0.95)', css(tint(tones.belts[1]), 0.5));
    } else if (a.storm === 'hexagon') {
      ctx.fillStyle = css(tint(tones.belts[1]).multiplyScalar(0.55), 0.95);
      ctx.beginPath(); ctx.moveTo(0, 0);
      for (let x = 0; x <= W; x += 4) ctx.lineTo(x, H * 0.115 + Math.abs(Math.sin((x / W) * Math.PI * 6)) * -22 + 11);
      ctx.lineTo(W, 0); ctx.fill();
      ctx.strokeStyle = css(tint(tones.zones[2]), 0.9); ctx.lineWidth = 4;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 4) ctx.lineTo(x, H * 0.115 + Math.abs(Math.sin((x / W) * Math.PI * 6)) * -22 + 11);
      ctx.stroke();
    } else if (a.storm === 'scars') {
      const cy = H * mix(0.62, 0.72, random()), n = 5 + Math.floor(random() * 4);
      for (let i = 0; i < n; i++) {
        const cx = facing - 150 + i * (300 / n) + random() * 20, size = 10 + random() * 16;
        oval(cx, cy + random() * 10, size * 1.7, size * 0.8, 'rgba(60,40,36,0.35)');
        oval(cx, cy + random() * 6, size, size * 0.55, 'rgba(22,16,18,0.9)');
      }
    }
    // Polar darkening.
    for (const [from, to] of [[0, 0.16], [1, 0.84]]) {
      const shade = ctx.createLinearGradient(0, from * H, 0, to * H);
      shade.addColorStop(0, css(tint(tones.belts[1]).multiplyScalar(0.6), 0.75));
      shade.addColorStop(1, css(tint(tones.belts[1]), 0));
      ctx.fillStyle = shade; ctx.fillRect(0, Math.min(from, to) * H, W, 0.16 * H);
    }
    // Phase: the night side is painted in, because a thing cannot move the sun.
    const sunOffset = { full: 0, gibbous: 55, half: 90, crescent: 138, backlit: 180 }[a.phase] * (random() < 0.5 ? 1 : -1);
    const nightAt = (u: number) => {
      if (a.phase === 'full') return 0;
      const lit = Math.cos((u - 0.25) * Math.PI * 2 - THREE.MathUtils.degToRad(sunOffset));
      return 0.93 * (1 - THREE.MathUtils.smoothstep(lit, -0.16, 0.22));
    };
    for (let x = 0; x < W; x += 4) {
      const night = nightAt(x / W);
      if (night <= 0.002) continue;
      ctx.fillStyle = `rgba(8,10,20,${night})`;
      ctx.fillRect(x, 0, 4, H);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    map.anisotropy = 4;

    const system = new THREE.Group();
    const globe = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 40), new THREE.MeshStandardMaterial({ map, roughness: 0.95 }));
    globe.scale.y = 0.93; // spun flat at the poles
    globe.castShadow = globe.receiveShadow = true;
    system.add(globe);
    // Limb haze: a thin shell seen from inside, brightest when backlit.
    const haze = new THREE.Mesh(new THREE.SphereGeometry(R * (a.phase === 'backlit' ? 1.045 : 1.02), 48, 24),
      new THREE.MeshBasicMaterial({ color: tint(tones.glow), side: THREE.BackSide, transparent: true, opacity: a.phase === 'backlit' ? 0.95 : a.phase === 'crescent' ? 0.5 : 0.22, depthWrite: false }));
    haze.scale.y = 0.93;
    system.add(haze);

    // --- Rings: real annuli, so the gaps are true gaps in every capture pass -------------------
    const ringlets: Ringlet[] = [];
    const span = (from: number, to: number, count: number, tone: number, gap = 0.12) => {
      const step = (to - from) / count;
      for (let i = 0; i < count; i++) {
        if (random() < gap + mood.wear * 0.18) continue;
        ringlets.push({ from: from + i * step, to: from + (i + mix(0.78, 0.99, random())) * step, tone: tone * mix(0.6, 1.1, random()) });
      }
    };
    const fine = Math.round(mix(0.6, 1.5, mood.density) * 10);
    if (a.rings === 'hairline') { span(1.72, 1.78, 2, 0.8, 0); span(2.05, 2.09, 1, 0.6, 0); }
    else if (a.rings === 'narrow') span(1.55, 1.9, Math.max(4, fine), 1, 0.05);
    else if (a.rings === 'classic') { span(1.26, 1.5, Math.max(3, fine >> 1), 0.45, 0.2); span(1.52, 1.96, fine + 2, 1, 0.04); span(2.06, 2.3, Math.max(3, fine >> 1), 0.82, 0.1); ringlets.push({ from: 2.36, to: 2.375, tone: 0.7 }); }
    else if (a.rings === 'vast') { span(1.22, 1.55, fine, 0.5, 0.15); span(1.6, 2.1, fine + 4, 1, 0.06); span(2.18, 2.5, fine, 0.75, 0.15); span(2.58, 2.75, 3, 0.45, 0.25); }
    else if (a.rings === 'arcs') {
      for (let i = 0, n = Math.round(mix(10, 22, mood.density)); i < n; i++) {
        const from = mix(1.4, 2.4, random());
        ringlets.push({ from, to: from + mix(0.03, 0.12, random()), tone: mix(0.5, 1.1, random()), start: random() * Math.PI * 2, arc: mix(0.5, 3.4, random()) });
      }
    }
    const outer = ringlets.reduce((reach, ringlet) => Math.max(reach, ringlet.to), 1) * R;
    const ringPlane = new THREE.Group();
    if (ringlets.length) {
      const ringTint = tint(tones.ring).multiplyScalar(0.56);
      const parts = ringlets.map((ringlet) => {
        const geometry = new THREE.RingGeometry(ringlet.from * R, ringlet.to * R, ringlet.arc ? 48 : 96, 1, ringlet.start ?? 0, ringlet.arc ?? Math.PI * 2);
        const shade = ringTint.clone().multiplyScalar(ringlet.tone * (a.phase === 'backlit' ? 1.15 : 1));
        const colours = new Float32Array(geometry.attributes.position.count * 3);
        for (let i = 0; i < colours.length; i += 3) shade.toArray(colours, i);
        geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
        return geometry;
      });
      const merged = mergeGeometries(parts)!;
      for (const part of parts) part.dispose();
      const rings = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 1, emissive: ringTint, emissiveIntensity: a.phase === 'backlit' ? 0.5 : 0.08 }));
      rings.rotation.x = -Math.PI / 2;
      rings.castShadow = rings.receiveShadow = true;
      ringPlane.add(rings);
    }
    system.add(ringPlane);

    // --- Company ---------------------------------------------------------------------------
    const orbiters: { pivot: THREE.Group; rate: number }[] = [];
    const moonRock = s.material('#b9b4a8', { roughness: 0.95 });
    const addMoon = (distance: number, size: number, colour?: string) => {
      const pivot = new THREE.Group();
      const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 2), colour ? s.material(colour, { roughness: 0.95 }) : moonRock);
      moon.position.set(distance, 0, 0);
      moon.scale.set(1, mix(0.75, 1, random()), mix(0.8, 1, random()));
      moon.castShadow = true;
      pivot.add(moon);
      pivot.rotation.y = random() * Math.PI * 2;
      system.add(pivot);
      orbiters.push({ pivot, rate: 0.5 / distance ** 1.5 });
    };
    if (a.moons !== 'none') addMoon(Math.max(outer + 0.09, R * 1.5), 0.07);
    if (a.moons === 'family') {
      const count = 2 + Math.round(mood.density * 3);
      for (let i = 0; i < count; i++) addMoon(Math.max(outer, R * 1.6) + 0.3 + i * mix(0.22, 0.36, random()), mix(0.05, 0.16, random()), ['#d8c9a8', '#9aa3ad', '#c48f6a', '#e8eef0'][i % 4]);
    }

    // --- What is happening -------------------------------------------------------------------
    const flashes: THREE.Mesh[] = [];
    let crowns: THREE.MeshStandardMaterial | null = null;
    if (a.event === 'aurora') {
      crowns = new THREE.MeshStandardMaterial({ color: '#0d1a18', emissive: mood.warmth > 0.6 ? '#ff5fb0' : '#5cffb0', emissiveIntensity: 1.6, roughness: 1 });
      for (const side of [1, -1]) for (const [latitude, tube] of [[70, 0.022], [77, 0.012]] as const) {
        const angle = THREE.MathUtils.degToRad(latitude);
        const crown = new THREE.Mesh(new THREE.TorusGeometry(Math.cos(angle) * R * 1.01, tube, 8, 64), crowns);
        crown.rotation.x = Math.PI / 2;
        crown.position.y = side * Math.sin(angle) * R * 0.93 * 1.012;
        system.add(crown);
      }
    } else if (a.event === 'shredding') {
      const orbit = Math.max(outer + 0.22, R * 1.75), start = random() * Math.PI * 2;
      const pieces = Math.round(mix(40, 110, mood.density));
      const rubble = Array.from({ length: pieces }, (_unused, i) => {
        const along = (i / pieces) ** 1.6, angle = start - along * 2.4;
        const distance = orbit - along * 0.25 + (random() - 0.5) * 0.08 * (0.3 + along);
        return { at: [Math.cos(angle) * distance, (random() - 0.5) * 0.05, Math.sin(angle) * distance] as [number, number, number], size: mix(0.05, 0.008, Math.min(1, along * 1.6)) * mix(0.6, 1.3, random()) };
      });
      const trail = s.scatter(new THREE.IcosahedronGeometry(1, 0), moonRock, rubble);
      system.add(trail);
      const husk = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 1), moonRock);
      husk.position.set(Math.cos(start + 0.08) * orbit, 0, Math.sin(start + 0.08) * orbit);
      husk.scale.set(1.3, 0.8, 0.9);
      husk.rotation.y = -start;
      husk.castShadow = true;
      system.add(husk);
    } else if (a.event === 'lightning') {
      const spark = new THREE.MeshBasicMaterial({ color: '#f4f6ff' });
      for (let i = 0; i < 9; i++) {
        // Prefer the night side when there is one.
        let u = random();
        for (let tries = 0; tries < 12 && a.phase !== 'full' && nightAt(u) < 0.6; tries++) u = random();
        if (a.phase === 'full') u = mix(0.05, 0.45, random());
        const longitude = u * Math.PI * 2, latitude = (random() - 0.5) * 1.6;
        const flash = new THREE.Mesh(new THREE.SphereGeometry(mix(0.03, 0.065, random()), 8, 6), spark);
        flash.position.set(-Math.cos(longitude) * Math.cos(latitude) * R, Math.sin(latitude) * R * 0.93, Math.sin(longitude) * Math.cos(latitude) * R).multiplyScalar(1.004);
        flash.scale.y = 0.5;
        flash.userData.phase = random() * 20;
        system.add(flash);
        flashes.push(flash);
      }
    }

    // Tip the whole system: open the rings to the viewer, then roll the axis.
    const lean = THREE.MathUtils.degToRad(mix(-24, 6, a.tilt)), roll = THREE.MathUtils.degToRad(mix(8, 24, random())) * (random() < 0.5 ? -1 : 1);
    system.rotation.set(lean, 0, roll);
    s.root.add(system);

    const spin = mix(0.01, 0.12, mood.energy);
    return s.finish({
      footprint: R * 0.9,
      update: (dt, time) => {
        ringPlane.rotation.y -= dt * spin * 0.5;
        for (const { pivot, rate } of orbiters) pivot.rotation.y += dt * rate * mix(0.3, 2, mood.energy);
        if (crowns) crowns.emissiveIntensity = 1.3 + Math.sin(time * mix(0.6, 3, mood.energy)) * 0.5;
        for (const flash of flashes) flash.visible = Math.sin(time * mix(2, 9, mood.energy) + flash.userData.phase) > 0.25;
      },
    });
  },
});
