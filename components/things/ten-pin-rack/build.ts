import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

function paint(width: number, height: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

const PIN_STYLES = {
  classic: 'Gloss white pins with two red neck stripes, the ones everybody draws.',
  crown: 'White pins with a single broad red band and a red crown mark on the belly, league issue.',
  cosmic: 'Blacklight pins glowing acid green and pink for cosmic bowling.',
  wooden: 'Old lacquered maple pins gone the colour of tea, stripes worn to brown.',
  candy: 'Novelty party pins striped red and white from foot to crown.',
} as const;

export default defineThing({
  questions: {
    state: choice('What has just happened to the pins?', {
      fresh: 'A fresh full rack of ten, untouched, waiting.',
      split: 'A 7-10 split: only the two back corner pins stand, as far apart as pins get.',
      wobble: 'Nine are down and one pin is still rocking, deciding whether to fall.',
      crash: 'The instant of a strike: pins thrown up and outward in mid-air.',
      alldown: 'All ten lie scattered across the deck and gutters.',
      gutter: 'Nearly a full rack still standing, with one pin lying in the gutter and a gap where it stood.',
      lonely: 'A single head pin standing alone on an otherwise cleared deck.',
    }),
    pins: choice('What do the pins look like?', PIN_STYLES),
    lane: choice('What is the lane surface?', {
      maple: 'Honey-coloured maple boards under thick gloss.',
      walnut: 'Dark old walnut-stained boards with pale pin spots.',
      synthetic: 'Pale grey-blue synthetic panels, modern and flat.',
      cosmic: 'A dark lane glowing violet under blacklight.',
    }),
    sweep: choice('Where is the sweep bar?', {
      up: 'Raised out of the way above the pins.',
      down: 'Lowered to the lane in front of the pins, about to clear the deck.',
      crooked: 'Jammed halfway down at an angle, the machine has stopped.',
      none: 'No sweep bar, just the open deck.',
    }),
    ball: choice('If a ball is in the picture, where is it?', {
      none: 'No ball in sight.',
      arriving: 'A ball rolling up the lane toward the head pin.',
      gutter: 'A ball trundling uselessly along the gutter.',
      pit: 'A ball resting at the back of the pit behind the deck.',
    }),
    mask: choice('What is on the masking panel behind the pins?', {
      sunburst: 'A 1970s sunburst of orange and brown stripes.',
      stars: 'Atomic-age stars and boomerangs on turquoise.',
      number: 'A big lane number in a lit circle.',
      plain: 'A plain dark panel with a strip of light under it.',
      none: 'No panel: the open black of the pit.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const cosmicLane = a.lane === 'cosmic';

    // ---- pin geometry: a lathe whose texture rows follow the real height of the profile
    const curve = new THREE.SplineCurve([
      [0.001, 0], [0.026, 0.0], [0.029, 0.008], [0.045, 0.06], [0.0605, 0.114], [0.052, 0.17], [0.031, 0.225], [0.023, 0.262],
      [0.027, 0.3], [0.032, 0.336], [0.027, 0.366], [0.012, 0.379], [0.001, 0.381],
    ].map(([x, y]) => new THREE.Vector2(x, y)));
    const profile = curve.getPoints(40);
    const pinGeometry = new THREE.LatheGeometry(profile, 20);
    const heightAt = (v: number) => {
      const f = v * (profile.length - 1), i = Math.min(profile.length - 2, Math.floor(f));
      return mix(profile[i].y, profile[i + 1].y, f - i);
    };
    const wornInk = (hex: string) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#8a7a66'), mood.wear * 0.5).getHexString();
    const pinMap = paint(64, 256, (c, w, h) => {
      for (let row = 0; row < h; row++) {
        const y = heightAt(1 - row / (h - 1));
        let ink = '#f6f3ea';
        if (a.pins === 'classic') { if ((y > 0.236 && y < 0.25) || (y > 0.262 && y < 0.276)) ink = '#c8202a'; }
        else if (a.pins === 'crown') { if (y > 0.235 && y < 0.275) ink = '#c8202a'; }
        else if (a.pins === 'cosmic') { ink = '#1f1a2e'; if (y > 0.23 && y < 0.28) ink = '#ff4fc0'; else if (y > 0.03 && y < 0.2) ink = '#a8ff3a'; }
        else if (a.pins === 'wooden') { ink = y < 0.02 ? '#5a4632' : '#d9bd8a'; if ((y > 0.236 && y < 0.25) || (y > 0.262 && y < 0.276)) ink = '#7a3a26'; }
        else if (a.pins === 'candy') { ink = Math.floor(y / 0.032) % 2 ? '#d8263c' : '#f6f3ea'; }
        c.fillStyle = a.pins === 'cosmic' || a.pins === 'wooden' ? ink : ink === '#f6f3ea' ? ink : wornInk(ink);
        c.fillRect(0, row, w, 1);
      }
      if (a.pins === 'crown') {
        c.fillStyle = wornInk('#c8202a');
        const cy = h * 0.72;
        for (const u of [0.25, 0.75]) {
          c.beginPath(); c.moveTo(w * u - 9, cy + 8); c.lineTo(w * u - 9, cy - 8); c.lineTo(w * u - 4, cy); c.lineTo(w * u, cy - 10);
          c.lineTo(w * u + 4, cy); c.lineTo(w * u + 9, cy - 8); c.lineTo(w * u + 9, cy + 8); c.fill();
        }
      }
      // scuffs gather round the belly where pins hit each other
      c.fillStyle = 'rgba(70,60,50,0.5)';
      for (let i = 0; i < mood.wear * 90; i++) c.fillRect(random() * w, h * mix(0.55, 0.9, random()), 1 + random() * 5, 1 + random() * 2);
    });
    const pinMaterial = new THREE.MeshStandardMaterial({
      map: pinMap, roughness: mix(0.22, 0.6, mood.wear),
      emissive: a.pins === 'cosmic' ? '#ffffff' : '#000000', emissiveMap: a.pins === 'cosmic' ? pinMap : null, emissiveIntensity: 0.75,
    });

    // ---- the slab of lane
    const LANE = 1.07, GUTTER = 0.24, DEPTH = 1.5, TOP = 0.1, BACK = -0.72, FRONT = BACK + DEPTH;
    const laneTone = { maple: ['#d9a55c', '#c48f48', '#e6b877'], walnut: ['#6e4426', '#5c381f', '#7d5230'], synthetic: ['#b9c4cc', '#aab6bf', '#c6d0d6'], cosmic: ['#2a1f55', '#231a48', '#352a6b'] }[a.lane];
    const boards = 26;
    const laneMap = paint(512, 512, (c, w, h) => {
      for (let i = 0; i < boards; i++) {
        c.fillStyle = laneTone[Math.floor(random() * 3)];
        c.fillRect((i / boards) * w, 0, w / boards + 1, h);
        if (a.lane !== 'synthetic') { c.fillStyle = 'rgba(40,20,5,0.35)'; c.fillRect((i / boards) * w, 0, 1.2, h); }
      }
      // pin spots
      const toU = (x: number) => (x / LANE + 0.5) * w, toV = (z: number) => ((z - BACK) / DEPTH) * h;
      for (let k = 0; k < 4; k++) for (let j = 0; j <= k; j++) {
        c.fillStyle = cosmicLane ? '#c8a8ff' : a.lane === 'walnut' ? '#e8d9b8' : '#3a2a1c';
        c.beginPath(); c.ellipse(toU((j - k / 2) * 0.305), toV(0.36 - k * 0.264), w * 0.034, h * 0.019, 0, 0, Math.PI * 2); c.fill();
      }
      // ball tracks and pin scars
      c.strokeStyle = 'rgba(30,20,10,0.22)';
      for (let i = 0; i < mood.wear * 40; i++) { c.lineWidth = 1 + random() * 3; c.beginPath(); const u = random() * w; c.moveTo(u, h); c.lineTo(u + (random() - 0.5) * 60, h * random() * 0.6); c.stroke(); }
    });
    const laneMaterial = new THREE.MeshStandardMaterial({ map: laneMap, roughness: mix(0.18, 0.7, mood.wear), emissive: cosmicLane ? '#5a35ff' : '#000000', emissiveIntensity: cosmicLane ? 0.45 : 0 });
    const dark = s.material('#1d1f24', { roughness: 0.8 });
    const gutterMaterial = s.material(cosmicLane ? '#191630' : '#2b2d33', { roughness: 0.55 });
    const trim = s.material(cosmicLane ? '#3c2f7a' : a.lane === 'synthetic' ? '#8e99a3' : '#7a5330', { roughness: 0.5 });
    const steel = s.material('#b8bdc2', { metalness: 0.8, roughness: 0.3 });

    s.box([LANE, TOP, DEPTH], [0, TOP / 2, BACK + DEPTH / 2], laneMaterial);
    const HALF = LANE / 2 + GUTTER;
    for (const side of [-1, 1]) {
      // a rounded gutter channel: half a tube sunk beside the lane
      const channel = s.mesh(new THREE.CylinderGeometry(GUTTER / 2, GUTTER / 2, DEPTH, 16, 1, true, -Math.PI / 2, Math.PI), gutterMaterial, [side * (LANE / 2 + GUTTER / 2), TOP, BACK + DEPTH / 2]);
      channel.rotation.x = Math.PI / 2;
      (channel.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      s.box([GUTTER, 0.02, DEPTH], [side * (LANE / 2 + GUTTER / 2), 0.01, BACK + DEPTH / 2], dark);
      // kickback: the side wall pins bounce off
      s.box([0.06, 0.5, 1.1], [side * (HALF + 0.03), 0.25, BACK + 0.55], trim);
      s.box([0.065, 0.12, DEPTH], [side * (HALF + 0.03), 0.06, BACK + DEPTH / 2], trim);
      s.box([0.012, 0.28, 1.0], [side * (HALF - 0.004), 0.27, BACK + 0.55], dark);
    }
    // pit, cushion and curtain behind the deck
    s.box([HALF * 2 + 0.12, 0.04, 0.4], [0, 0.02, BACK - 0.2], dark);
    s.box([HALF * 2 + 0.12, 0.5, 0.06], [0, 0.25, BACK - 0.4], dark);
    const curtain = s.material('#3a3136', { roughness: 0.95 });
    for (let i = 0; i < 9; i++) s.box([0.15, mix(0.3, 0.36, random()), 0.03], [(i - 4) * 0.165, 0.3, BACK - 0.3 + (i % 2) * 0.02], curtain).rotation.x = -0.12;
    for (const side of [-1, 1]) s.box([0.06, 0.5, 0.4], [side * (HALF + 0.03), 0.25, BACK - 0.2], trim);

    // ---- masking panel
    const glow = mix(0.35, 1, mood.cheer);
    if (a.mask !== 'none') {
      const W = HALF * 2 + 0.12, H = 0.52;
      const maskMap = paint(512, 192, (c, w, h) => {
        if (a.mask === 'sunburst') {
          c.fillStyle = '#f0dfb4'; c.fillRect(0, 0, w, h);
          const tones = ['#d9661f', '#8a4a22', '#e6a52c', '#b23a1c'];
          for (let i = 0; i < 18; i++) { c.fillStyle = tones[i % 4]; c.beginPath(); c.moveTo(w / 2, h * 1.25); c.arc(w / 2, h * 1.25, w, Math.PI + (i / 18) * Math.PI, Math.PI + ((i + 0.55) / 18) * Math.PI); c.fill(); }
          c.fillStyle = '#e6a52c'; c.beginPath(); c.arc(w / 2, h * 1.25, h * 0.62, 0, Math.PI * 2); c.fill();
        } else if (a.mask === 'stars') {
          c.fillStyle = '#2f9a98'; c.fillRect(0, 0, w, h);
          for (let i = 0; i < 9; i++) {
            const x = (i + 0.5) / 9 * w + (random() - 0.5) * 20, y = h * mix(0.25, 0.75, random()), r = mix(10, 30, random());
            c.fillStyle = ['#f6efd6', '#f2b632', '#e8553a'][i % 3];
            c.beginPath();
            for (let p = 0; p < 8; p++) { const rr = p % 2 ? r * 0.22 : r, t = p / 8 * Math.PI * 2; c.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); }
            c.fill();
          }
          c.strokeStyle = '#f6efd6'; c.lineWidth = 5;
          for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(w * (0.2 + i * 0.3), h * 0.5, 60, 18, 0.5 - i * 0.5, 0, Math.PI * 1.2); c.stroke(); }
        } else if (a.mask === 'number') {
          c.fillStyle = '#28324a'; c.fillRect(0, 0, w, h);
          c.fillStyle = '#f7e9a8'; c.beginPath(); c.arc(w / 2, h / 2, h * 0.4, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#b3261e'; c.font = `bold ${h * 0.6}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(String(1 + Math.floor(random() * 24)), w / 2, h * 0.54);
          c.fillStyle = '#d9661f'; c.fillRect(0, h * 0.44, w * 0.36, h * 0.12); c.fillRect(w * 0.64, h * 0.44, w * 0.36, h * 0.12);
        } else { c.fillStyle = '#2a2c33'; c.fillRect(0, 0, w, h); c.fillStyle = '#3a3d46'; c.fillRect(0, h * 0.46, w, h * 0.08); }
      });
      s.mesh(new THREE.BoxGeometry(W, H, 0.07), new THREE.MeshStandardMaterial({ map: maskMap, roughness: 0.6, emissive: '#ffffff', emissiveMap: maskMap, emissiveIntensity: a.mask === 'plain' ? 0.05 : 0.3 * glow }), [0, 0.5 + H / 2, BACK - 0.4]);
      s.box([W, 0.035, 0.1], [0, 0.495, BACK - 0.37], s.material('#fff3c2', { emissive: '#fff0b0', emissiveIntensity: glow }));
      s.box([W + 0.04, 0.04, 0.11], [0, 0.5 + H + 0.02, BACK - 0.4], trim);
    }

    // ---- sweep bar on two arms pivoting from the kickbacks
    if (a.sweep !== 'none') {
      const sweep = new THREE.Group();
      const barY = a.sweep === 'up' ? 0.5 : a.sweep === 'down' ? TOP + 0.07 : 0.34;
      const barZ = a.sweep === 'up' ? 0.5 : 0.62;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2 - 0.02, 0.1, 0.035), s.material(cosmicLane ? '#ff4fc0' : '#c8202a', { roughness: 0.45, emissive: cosmicLane ? '#ff2fa8' : '#000000', emissiveIntensity: 0.5 }));
      bar.position.set(0, barY, barZ);
      const rubber = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2 - 0.02, 0.03, 0.04), dark);
      rubber.position.set(0, barY - 0.06, barZ);
      sweep.add(bar, rubber);
      for (const side of [-1, 1]) {
        const pivot = new THREE.Vector3(side * (HALF - 0.03), 0.48, BACK + 0.2), end = new THREE.Vector3(side * (HALF - 0.03), barY, barZ);
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, pivot.distanceTo(end), 8), steel);
        arm.position.copy(pivot).add(end).multiplyScalar(0.5);
        arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(pivot).normalize());
        sweep.add(arm);
      }
      sweep.traverse((node) => { node.castShadow = true; });
      if (a.sweep === 'crooked') { sweep.rotation.z = 0.09; sweep.position.y = 0.03; }
      s.root.add(sweep);
    }

    // ---- the pins
    const spots: [number, number][] = [];
    for (let k = 0; k < 4; k++) for (let j = 0; j <= k; j++) spots.push([(j - k / 2) * 0.305, 0.36 - k * 0.264]);
    const pin = (x: number, y: number, z: number) => {
      const holder = new THREE.Group();
      const mesh = new THREE.Mesh(pinGeometry, pinMaterial);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.rotation.y = random() * 6.28;
      holder.add(mesh);
      holder.position.set(x, y, z);
      s.root.add(holder);
      return holder;
    };
    const stand = (index: number, lean = 0) => {
      const p = pin(spots[index][0] + (random() - 0.5) * 0.012, TOP, spots[index][1] + (random() - 0.5) * 0.012);
      p.rotation.z = lean * (random() - 0.5);
      return p;
    };
    const lie = (x: number, z: number, y = TOP + 0.058) => {
      const p = pin(x, y, z);
      p.rotation.set(0, random() * 6.28, Math.PI / 2 - 0.09);
      p.rotation.order = 'YXZ';
      return p;
    };
    const inGutter = (side: number, z: number) => { const p = pin(side * (LANE / 2 + GUTTER / 2), TOP - 0.05, z); p.rotation.set(Math.PI / 2 - 0.05, 0, 0); p.position.z = z - 0.18; return p; };
    const onDeck = () => [(random() - 0.5) * (LANE - 0.3), mix(BACK + 0.1, 0.55, random())] as const;
    let rocker: THREE.Group | null = null;
    const flyers: { p: THREE.Group; spin: THREE.Vector3 }[] = [];
    const all = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    if (a.state === 'fresh') all.forEach((i) => stand(i));
    else if (a.state === 'split') {
      stand(6); stand(9);
      if (a.sweep !== 'down') for (let i = 0, n = Math.floor(random() * 3); i < n; i++) lie(...onDeck());
    } else if (a.state === 'lonely') {
      stand(0);
      if (random() < 0.5) inGutter(random() < 0.5 ? -1 : 1, BACK + 0.4);
    } else if (a.state === 'wobble') {
      const keep = [0, 4, 6, 9, 3, 5][Math.floor(random() * 6)];
      rocker = stand(keep);
      rocker.rotation.z = 0.2;
      const down = 5 + Math.floor(random() * 4);
      for (let i = 0; i < down; i++) { const [x, z] = onDeck(); if (Math.hypot(x - spots[keep][0], z - spots[keep][1]) > 0.2) lie(x, z); }
      inGutter(random() < 0.5 ? -1 : 1, BACK + 0.5);
    } else if (a.state === 'alldown') {
      for (let i = 0; i < 7; i++) lie(...onDeck());
      inGutter(-1, BACK + mix(0.3, 0.9, random())); inGutter(1, BACK + mix(0.3, 0.9, random()));
      lie((random() - 0.5) * 0.8, BACK - 0.18, 0.1);
    } else if (a.state === 'gutter') {
      const gone = [6, 9, 3, 5, 1][Math.floor(random() * 5)];
      all.forEach((i) => { if (i !== gone) stand(i, i === gone - 1 || i === gone + 1 ? 0.16 : 0.03); });
      inGutter(spots[gone][0] < 0 ? -1 : 1, mix(-0.1, 0.5, random()));
    } else {
      for (const i of all) {
        const out = new THREE.Vector3(spots[i][0] * 1.5 + (random() - 0.5) * 0.3, 0, spots[i][1] - 0.36 - random() * 0.2).multiplyScalar(mix(0.7, 1.5, random()));
        const p = pin(spots[i][0] + out.x, TOP + 0.06 + random() * mix(0.15, 0.6, mood.energy * 0.6 + 0.4), Math.max(BACK + 0.05, spots[i][1] + out.z * 0.6));
        p.position.x = THREE.MathUtils.clamp(p.position.x, -HALF + 0.1, HALF - 0.1);
        p.rotation.set(random() * 6.28, random() * 6.28, random() * 6.28);
        flyers.push({ p, spin: new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(2) });
      }
    }

    // ---- ball
    let ball: THREE.Mesh | null = null;
    if (a.ball !== 'none' || a.state === 'crash') {
      const hue = random();
      const ballMap = paint(128, 64, (c, w, h) => {
        c.fillStyle = `hsl(${hue * 360},55%,${a.pins === 'cosmic' ? 50 : 26}%)`; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 40; i++) { c.strokeStyle = `hsla(${hue * 360 + (random() - 0.5) * 60},70%,${mix(35, 70, random())}%,0.5)`; c.lineWidth = 2 + random() * 5; c.beginPath(); c.moveTo(random() * w, random() * h); c.bezierCurveTo(random() * w, random() * h, random() * w, random() * h, random() * w, random() * h); c.stroke(); }
        c.fillStyle = '#0a0a0a';
        for (const [x, y] of [[20, 30], [27, 26], [25, 36]]) { c.beginPath(); c.arc(x, y, 2.4, 0, 7); c.fill(); }
      });
      const R = 0.109;
      const where: [number, number, number] =
        a.state === 'crash' && a.ball !== 'gutter' ? [0.05, TOP + R, -0.1]
          : a.ball === 'arriving' ? [(random() - 0.5) * 0.4, TOP + R, FRONT - 0.2]
            : a.ball === 'gutter' ? [(random() < 0.5 ? -1 : 1) * (LANE / 2 + GUTTER / 2), TOP - 0.01, mix(0.2, 0.9, random())]
              : [(random() - 0.5) * 0.9, 0.04 + R, BACK - 0.2];
      ball = s.mesh(new THREE.SphereGeometry(R, 24, 16), new THREE.MeshStandardMaterial({ map: ballMap, roughness: 0.2 }), where);
      ball.rotation.set(random() * 6, random() * 6, 0);
    }

    const energy = mix(0.25, 1.4, mood.energy);
    const rolling = a.ball === 'arriving' || a.ball === 'gutter';
    return s.finish({
      update(dt, time) {
        if (rocker) rocker.rotation.z = Math.sin(time * 5 * energy) * 0.16 + 0.05;
        for (const { p, spin } of flyers) { p.rotation.x += spin.x * dt * energy; p.rotation.z += spin.z * dt * energy; }
        if (ball && rolling) ball.rotation.x -= dt * 4 * energy;
      },
    });
  },
});
