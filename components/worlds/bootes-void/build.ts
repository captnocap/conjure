import * as THREE from 'three';
import { type Placeable, choice, defineWorld, diorama, mix, score } from '@conjure/kit';

type V3 = [number, number, number];

export default defineWorld({
  questions: {
    tone: choice('What colour is the emptiness?', {
      slate: 'Deep slate blue, the colour of a room at 4 a.m.',
      ink: 'Blue-black ink with a little green in it, like deep water.',
      mauve: 'A bruised grey-violet, tender and tired.',
      fog: 'A paler blue-grey haze, numb and weightless.',
      ember: 'A dim brown-plum dark, like the inside of closed eyelids.',
    }),
    wall: choice('What does the far wall of galaxies look like?', {
      shoreline: 'One thin unbroken line of lights, like a coast seen from far out at night, with a faint reflection under it.',
      towns: 'A broken line: a few separate clusters like harbour towns with long dark gaps between.',
      web: 'A line with faint threads rising from it and joining, the cosmic web seen from inside a hole in it.',
      faint: 'Almost nothing: three or four smudges and a scatter of specks.',
      aurora: 'A low line with a pale veil of glow standing above it like dawn that never arrives.',
    }),
    pools: choice('What does each thing rest in?', {
      pool: 'A soft round pool of pale light beneath it.',
      ring: 'A thin drawn ring, like a position marked on a chart.',
      beam: 'A faint column of light falling from above.',
      none: 'Nothing at all: only the dark around it.',
    }),
    trace: choice('What is the one sign that anyone was ever here?', {
      none: 'There is none.',
      grid: 'A faint survey grid still drawn across the emptiness.',
      buoys: 'A dotted line of dead marker lights leading away toward the wall.',
      ship: 'One small light far off, a ship or a window, leaving.',
      thread: 'A single long thread, a cable or a contrail, crossing the whole void.',
    }),
    drift: choice('What drifts in the near emptiness?', {
      nothing: 'Nothing. Perfect vacuum.',
      motes: 'A few slow motes of dust catching the light.',
      snow: 'Fine ice sifting down like snow.',
      sparks: 'A handful of dim warm sparks, like embers from a fire long out.',
    }),
    view: choice('Where do we look from?', {
      level: 'Level with the things, the wall a straight low line behind them.',
      above: 'From above, so the wall curves round as a full ring and the things sit small inside it.',
    }),
    apart: score('How far apart are the things?', ['Within reach of each other', 'Far apart', 'Each one alone, almost out of sight of the next']),
  },

  build(a, context) {
    const { mood, random } = context;
    const backgroundHex = { slate: '#42526c', ink: '#2f4250', mauve: '#514d6a', fog: '#7c8aa0', ember: '#55424c' }[a.tone];
    const reach = mix(0.72, 1.18, a.apart);
    const small = mix(0.72, 0.44, a.apart);
    // Hero a little left of centre and forward; the others scattered wide at their own heights.
    const slots: [number, number, number, number][] = [
      [-1.3, 0.9, 1.3, 1],
      [4.3 * reach, -2.0 * reach, 2.7, small],
      [-4.7 * reach, -2.3 * reach, 0.5, small * 0.9],
      [3.1 * reach, 2.9 * reach, 0.2, small * 0.8],
      [-3.8 * reach, 3.0 * reach, 3.1, small * 0.7],
    ];
    const above = a.view === 'above';
    const WALL = above ? 5.3 * reach + 1.7 : 16;
    const span = above ? WALL * 2 + 0.6 : 9.4 * reach + 2.6;
    const { art, world } = diorama(context, { background: backgroundHex, floor: null, width: span, depth: above ? span : 8, maxHeight: 4.4, radius: 2.3, pitch: above ? 27 : 9, yaw: 14, slots });
    const root = art.root;
    const background = new THREE.Color(backgroundHex);

    // Dim, cool the stock studio lights: this is starlight, not noon.
    root.traverse((node) => {
      const light = node as THREE.Light;
      if (!light.isLight) return;
      if ((light as THREE.HemisphereLight).isHemisphereLight) { light.intensity = 1.05; light.color.set('#c3d0ee'); (light as THREE.HemisphereLight).groundColor.copy(background).multiplyScalar(0.8); }
      else if (light === world.keyLight) { light.intensity = 2.1; light.color.lerp(new THREE.Color('#cfdcff'), 0.5); }
      else light.intensity = 0.45;
    });

    const gauss = () => (random() + random() + random() - 1.5) / 1.5;
    const warm = new THREE.Color('#ffd49a'), cool = new THREE.Color('#d5e3ff'), rose = new THREE.Color('#ffb9c9');
    const starTint = () => { const k = random(); return (k < mix(0.25, 0.7, mood.warmth) ? warm : k > 0.93 ? rose : cool).clone(); };
    type Dot = { at: V3; size: number; color: THREE.Color };
    const dots: Dot[] = [];
    const LO = Math.PI * 1.5 - 0.72, HI = Math.PI * 1.5 + 0.72;
    // Background specks are never solid: they must not widen the frame or hide the cast.
    const speckMaterial = () => new THREE.MeshBasicMaterial({ color: '#ffffff', depthWrite: false });
    const brightness = mix(0.55, 1, mood.cheer);
    const grain = above ? 1 : 1.25;
    const dim = (colour: THREE.Color, amount: number) => colour.lerp(background, 1 - amount);
    // The level view shows only the far side; from above the wall runs the whole way round.
    const angleOnWall = () => (above ? random() * Math.PI * 2 : LO + random() * (HI - LO));
    const onWall = (angle: number, out: number, height: number): V3 => [Math.cos(angle) * (WALL + out), height, Math.sin(angle) * (WALL + out)];
    const endFade = (angle: number) => (above ? 1 : Math.min(1, Math.min(angle - LO, HI - angle) / 0.12));

    const towns = Array.from({ length: a.wall === 'towns' ? 5 + Math.floor(random() * 3) : a.wall === 'faint' ? 4 : 9 }, () => angleOnWall());
    const lineCount = Math.round({ shoreline: 1500, towns: 150, web: 1000, faint: 70, aurora: 1100 }[a.wall] * mix(0.7, 1.2, mood.density) * (above ? 1.5 : 1));
    for (let i = 0; i < lineCount; i++) {
      const angle = angleOnWall();
      if (mood.wear > 0.5 && Math.sin(angle * 9 + context.seed) > 1.6 - mood.wear) continue;
      const c = dim(starTint(), brightness * endFade(angle) * (0.45 + random() * 0.55));
      dots.push({ at: onWall(angle, gauss() * 0.5, gauss() * 0.09), size: (0.022 + random() ** 3 * 0.05) * grain, color: c });
      // The reflection: a dimmer twin just below, as on still water.
      if (a.wall === 'shoreline' && i % 3 === 0) dots.push({ at: onWall(angle, gauss() * 0.5, -0.18 - random() * 0.5), size: (0.016 + random() * 0.014) * grain, color: dim(c.clone(), 0.4) });
    }
    // Clusters: denser knots along the line, each with one small tilted galaxy in it.
    const smudges: { at: V3; size: number; turn: V3; color: THREE.Color }[] = [];
    for (const angle of towns) {
      const members = a.wall === 'faint' ? 26 : a.wall === 'towns' ? 190 : 80;
      const girth = (0.16 + random() * 0.2) * (above ? 1 : 0.42);
      for (let i = 0; i < members; i++) { const at = angle + gauss() * girth * 0.45; dots.push({ at: onWall(at, gauss() * 0.7, gauss() * girth * 0.9), size: (0.024 + random() ** 2 * 0.06) * grain, color: dim(starTint(), brightness * endFade(angle)) }); }
      smudges.push({ at: onWall(angle + gauss() * 0.04, gauss() * 0.4, 0.1 + random() * 0.3), size: above ? 0.1 + random() * 0.12 : 0.09 + random() * 0.1, turn: [random() * 1.2, random() * 3, random() * 1.2], color: dim(starTint(), brightness * 0.95) });
    }
    if (a.wall === 'web') {
      // Threads climb from the wall and lean toward each other.
      const feet = Array.from({ length: above ? 7 : 5 }, () => angleOnWall()).sort();
      feet.forEach((from, index) => {
        const to = feet[(index + 1) % feet.length], top = 2.2 + random() * 2.6;
        for (let i = 0; i < 150; i++) { const k = random(), ang = mix(from, above && index === feet.length - 1 ? to + Math.PI * 2 : to, k); dots.push({ at: onWall(ang, 1 + gauss() * 0.5 + Math.sin(k * Math.PI) * 1.5, Math.sin(k * Math.PI) ** 0.7 * top + gauss() * 0.12), size: 0.018 + random() * 0.03, color: dim(starTint(), brightness * 0.55 * endFade(ang)) }); }
      });
    }
    // The void itself is not quite empty: a very few faint stars.
    for (let i = 0; i < Math.round(mix(14, 70, mood.density)); i++) dots.push({ at: [(random() - 0.5) * 17, -2 + random() * 9, -8 + random() * 12], size: 0.014 + random() * 0.02, color: dim(starTint(), 0.4) });

    const speck = new THREE.IcosahedronGeometry(1, 0);
    const wallMesh = art.scatter(speck, speckMaterial(), dots);
    wallMesh.castShadow = wallMesh.receiveShadow = false;
    for (const smudge of smudges) {
      const galaxy = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), new THREE.MeshBasicMaterial({ color: smudge.color, depthWrite: false }));
      galaxy.position.set(...smudge.at);
      galaxy.scale.set(smudge.size * 1.5, smudge.size * 0.2, smudge.size * 1.5);
      galaxy.rotation.set(...smudge.turn);
      root.add(galaxy);
    }

    const softDisc = (inner: string, outer: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const g = canvas.getContext('2d')!;
      const wash = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      wash.addColorStop(0, inner); wash.addColorStop(0.55, outer); wash.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = wash; g.fillRect(0, 0, 128, 128);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    const lightTint = new THREE.Color('#dfe9ff').lerp(new THREE.Color('#ffe6c2'), mood.warmth * 0.7);

    if (a.wall === 'aurora') {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 64;
      const g = canvas.getContext('2d')!;
      for (let x = 0; x < 256; x += 2) { const tall = 0.35 + 0.65 * Math.abs(Math.sin(x * 0.045 + random() * 0.6) * Math.sin(x * 0.013 + 2)); const wash = g.createLinearGradient(0, 64, 0, 64 - 64 * tall); wash.addColorStop(0, 'rgba(255,255,255,0.75)'); wash.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = wash; g.fillRect(x, 0, 2, 64); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping; texture.repeat.x = above ? 3 : 1.4;
      const veil = new THREE.Mesh(new THREE.CylinderGeometry(WALL + 0.6, WALL + 0.6, 3.4, 72, 1, true, above ? 0 : Math.PI / 2 - HI, above ? Math.PI * 2 : HI - LO), new THREE.MeshBasicMaterial({ map: texture, color: new THREE.Color('#9fe0c8').lerp(new THREE.Color('#ffc9a0'), mood.warmth), transparent: true, opacity: 0.42 * brightness, depthWrite: false, side: THREE.DoubleSide }));
      veil.position.y = 1.7;
      root.add(veil);
    }

    // What each thing rests in. Built for every slot, shown once something stands there.
    const rests = slots.map(() => {
      const group = new THREE.Group();
      group.visible = false;
      if (a.pools === 'pool' || a.pools === 'beam') {
        const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ map: softDisc('rgba(255,255,255,0.9)', 'rgba(255,255,255,0.3)'), color: lightTint, transparent: true, opacity: mix(0.4, 0.75, mood.cheer), depthWrite: false, side: THREE.DoubleSide }));
        disc.rotation.x = -Math.PI / 2;
        group.add(disc);
      }
      if (a.pools === 'beam') {
        const canvas = document.createElement('canvas');
        canvas.width = 8; canvas.height = 64;
        const g = canvas.getContext('2d')!;
        const wash = g.createLinearGradient(0, 0, 0, 64);
        wash.addColorStop(0, 'rgba(255,255,255,0)'); wash.addColorStop(1, 'rgba(255,255,255,0.55)');
        g.fillStyle = wash; g.fillRect(0, 0, 8, 64);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.55, 3.2, 28, 1, true), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), color: lightTint, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
        shaft.position.y = 1.6;
        group.add(shaft);
      }
      if (a.pools === 'ring') {
        const line = new THREE.MeshBasicMaterial({ color: lightTint, transparent: true, opacity: 0.8, depthWrite: false });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.012, 4, 72), line);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
        for (let i = 0; i < 4; i++) { const tick = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.008, 0.02), line); const ang = (i / 4) * Math.PI * 2; tick.position.set(Math.cos(ang) * 1.05, 0, Math.sin(ang) * 1.05); tick.rotation.y = -ang; group.add(tick); }
      }
      root.add(group);
      return group;
    });

    // The one trace.
    const faintLine = new THREE.LineBasicMaterial({ color: background.clone().lerp(new THREE.Color('#dfe9ff'), mix(0.3, 0.16, mood.wear)), transparent: true, opacity: 0.9 });
    if (a.trace === 'grid') {
      const points: number[] = [];
      for (let i = -5; i <= 5; i++) { points.push(i * 2, -0.6, -9, i * 2, -0.6, 7); if (i >= -4 && i <= 3) points.push(-10, -0.6, i * 2, 10, -0.6, i * 2); }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      root.add(new THREE.LineSegments(geometry, faintLine));
    } else if (a.trace === 'buoys') {
      const dead = new THREE.MeshBasicMaterial({ color: dim(new THREE.Color('#ff6a5a'), mix(0.5, 0.9, mood.cheer)), depthWrite: false });
      for (let i = 0; i < 9; i++) { const k = i / 8; const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(mix(0.085, 0.03, k), 0), dead); lamp.position.set(mix(2.4, 5.4, k), mix(0.1, 0.5, k), mix(3.4, -7.5, k)); root.add(lamp); }
    } else if (a.trace === 'ship') {
      const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), new THREE.MeshBasicMaterial({ color: '#ffd9a0', depthWrite: false }));
      lamp.position.set(4.6, 3.4, -5.5);
      root.add(lamp);
      const wake = Array.from({ length: 26 }, (_unused, i) => ({ at: [4.6 - i * 0.075, 3.4 - i * 0.022, -5.5 + i * 0.05] as V3, size: 0.03 * (1 - i / 26) + 0.004, color: dim(new THREE.Color('#ffd9a0'), 0.75 * (1 - i / 26)) }));
      art.scatter(speck.clone(), speckMaterial(), wake).castShadow = false;
    } else if (a.trace === 'thread') {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-12, 5.2, -7), new THREE.Vector3(-4, 3.6 + random(), -3), new THREE.Vector3(2, 2.3 + random(), 1), new THREE.Vector3(12, -0.4, 5)]);
      const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(80));
      root.add(new THREE.Line(geometry, faintLine));
    }

    // Near dust, kept in its own group so it can drift.
    const dust = new THREE.Group();
    root.add(dust);
    if (a.drift !== 'nothing') {
      const count = Math.round({ motes: 26, snow: 150, sparks: 16 }[a.drift] * mix(0.5, 1.6, mood.density));
      const tint = a.drift === 'sparks' ? new THREE.Color('#ff9a52') : new THREE.Color('#eef3ff');
      const flecks = Array.from({ length: count }, () => ({ at: [(random() - 0.5) * 13, -1 + random() * 7, (random() - 0.5) * 9] as V3, size: a.drift === 'snow' ? 0.012 + random() * 0.014 : 0.018 + random() * 0.03, color: dim(tint.clone(), a.drift === 'sparks' ? 0.9 : 0.4 + random() * 0.4) }));
      const mesh = art.scatter(speck.clone(), speckMaterial(), flecks);
      mesh.castShadow = mesh.receiveShadow = false;
      dust.add(mesh);
    }

    const basePlace = world.place.bind(world);
    world.place = (items: readonly Placeable[]) => {
      basePlace(items);
      rests.forEach((rest, index) => {
        const item = items[index];
        rest.visible = Boolean(item);
        if (!item) return;
        const scale = item.holder.scale.x;
        rest.position.copy(item.holder.position);
        rest.position.y -= 0.12 * scale;
        rest.scale.setScalar(Math.max(item.radius, item.height * 0.35) * scale * (a.pools === 'ring' ? 1.25 : 1.55));
      });
    };
    world.ground = null;
    const fall = a.drift === 'snow' ? mix(0.03, 0.25, mood.energy) : 0;
    const turn = mix(0.002, 0.03, mood.energy);
    world.update = (dt: number) => {
      dust.rotation.y += dt * turn;
      if (fall) dust.position.y = ((dust.position.y - dt * fall + 1.5) % 1.5 + 1.5) % 1.5 - 0.75;
    };
    return world;
  },
});
