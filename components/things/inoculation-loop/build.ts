import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { MEDIA, MEDIA_COLOUR, TAU, agarPad, gloss, painted } from './plate';

export default defineThing({
  questions: {
    rest: choice('Where is the loop right now?', {
      rim: 'Laid down across the glass rim of an open dish, the loop hanging over the gel.',
      streak: 'In use: the loop touches the gel mid-stroke, the handle rising toward an unseen hand.',
      flame: 'Held in the flame of a little glass spirit lamp, being sterilised.',
      stand: 'Parked on its bench stand, pointing up into the air like a mast.',
    }),
    state: choice('What state is the wire in?', {
      cold: 'Cold, clean, dull grey metal.',
      'red-hot': 'Glowing orange-red along its length, brightest at the loop.',
      cooling: 'Almost cooled: only the loop itself still shows a dull cherry red.',
      film: 'Loaded: a glistening liquid film is stretched across the loop like a soap bubble.',
      blob: 'Carrying a creamy dab of picked colony on the loop.',
      charred: 'Crusted black with burnt-on residue that nobody flamed off properly.',
    }),
    tip: choice('What is on the end of the wire?', {
      loop: 'A round loop, the standard tool.',
      twisted: 'A loop whose tail is twisted back around the stem, hand-made.',
      needle: 'No loop: a straight needle for stabbing.',
      hook: 'A bent L-shaped hook for spreading.',
    }),
    handle: choice('What is the handle like?', {
      aluminium: 'Bare knurled aluminium, the lab-supply standard.',
      blue: 'Blue anodised metal with a silver chuck.',
      bakelite: 'Black bakelite with a brass collet, decades old.',
      cork: 'Wrapped in cork and tape by someone who burnt their fingers once.',
    }),
    trail: choice('If there is gel beneath it, what is on the gel?', {
      clean: 'Nothing. Untouched, sterile gel.',
      fresh: 'A faint, wet zigzag where the loop has just been dragged.',
      grown: 'A zigzag of grown colonies following an old streak.',
    }),
    medium: choice('If there is gel beneath it, what kind?', MEDIA),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const HANDLE = 36, CHUCK = 7, WIRE = a.tip === 'needle' ? 31 : 25, LOOP = 5.2;
    const tool = new THREE.Group();
    const own = <T extends THREE.Object3D>(node: T) => { tool.add(node); return node; };

    // Handle, built along +y from the butt.
    const knurl = painted(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      for (let i = -h; i < w + h; i += 9) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.moveTo(i + h, 0); ctx.lineTo(i, h); ctx.stroke(); }
    });
    knurl.wrapS = knurl.wrapT = THREE.RepeatWrapping;
    knurl.repeat.set(4, 5);
    const bodyColour = { aluminium: '#b9bec2', blue: '#2f62b8', bakelite: '#1d1b1c', cork: '#b98a5a' }[a.handle];
    const metal = a.handle === 'aluminium' || a.handle === 'blue';
    const body = s.material(bodyColour, { metalness: metal ? 0.7 : 0, roughness: metal ? 0.35 : a.handle === 'cork' ? 0.95 : 0.4 });
    const grip = s.material(bodyColour, { metalness: metal ? 0.6 : 0, roughness: 0.6, map: a.handle === 'bakelite' ? null : knurl });
    const collet = s.material(a.handle === 'bakelite' || a.handle === 'cork' ? '#c9a03e' : '#d5d9db', { metalness: 0.85, roughness: 0.25 });
    own(s.cylinder(2.2, 2.2, HANDLE, [0, HANDLE / 2, 0], body, 20));
    own(s.cylinder(2.35, 2.35, HANDLE * 0.5, [0, HANDLE * 0.58, 0], grip, 20));
    own(s.ball([2.2, 1.4, 2.2], [0, 0.2, 0], body, 16));
    if (a.handle === 'cork') for (let i = 0; i < 3; i++) own(s.cylinder(2.45, 2.45, 2.2, [0, 6 + i * 11 + random() * 3, 0], s.material(['#e8e2cf', '#2b2d33', '#b23a2e'][i % 3], { roughness: 0.8 }), 16));
    if (a.handle === 'bakelite') for (let i = 0; i < 6; i++) own(s.ring(2.25, 0.18, [0, 12 + i * 3.4, 0], s.material('#3a3637'))).rotation.x = Math.PI / 2;
    own(s.cylinder(1.0, 2.2, CHUCK * 0.55, [0, HANDLE + CHUCK * 0.275, 0], collet, 20));
    own(s.cylinder(1.45, 1.45, CHUCK * 0.45, [0, HANDLE + CHUCK * 0.775, 0], collet, 6));

    // Wire: short lengths so the heat can run along it.
    const heatAt = (t: number) => (a.state === 'red-hot' ? Math.min(1, Math.max(0, (t - 0.15) * 1.5)) : a.state === 'cooling' ? Math.max(0, (t - 0.8) * 3) * 0.75 : 0);
    const coldColour = new THREE.Color(a.state === 'charred' ? '#2a2623' : '#8f9296');
    const wireAt = (t: number) => {
      const heat = heatAt(t);
      const hot = new THREE.Color('#7a1608').lerp(new THREE.Color('#ffb04a'), heat);
      return new THREE.MeshStandardMaterial({ color: coldColour.clone().lerp(hot, Math.min(1, heat * 1.6)), metalness: heat > 0 ? 0 : 0.6, roughness: a.state === 'charred' ? 0.95 : 0.45, emissive: hot, emissiveIntensity: heat * 1.6 });
    };
    const from = HANDLE + CHUCK, radius = 0.62, parts = 10;
    for (let i = 0; i < parts; i++) own(s.rod([0, from + (WIRE * i) / parts, 0], [0, from + (WIRE * (i + 1)) / parts + 0.05, 0], radius, wireAt((i + 0.5) / (parts + 3))));
    const tipMaterial = wireAt(1);
    const end = from + WIRE;
    let loopCentre = new THREE.Vector3(0, end, 0);
    if (a.tip === 'loop' || a.tip === 'twisted') {
      loopCentre = new THREE.Vector3(0, end + LOOP, 0);
      const ring = own(s.ring(LOOP, radius, [0, end + LOOP, 0], tipMaterial, TAU * 0.96));
      ring.rotation.z = -Math.PI / 2 + TAU * 0.02;
      if (a.tip === 'twisted') {
        const turns: [number, number, number][] = [];
        for (let i = 0; i <= 24; i++) { const t = i / 24; turns.push([Math.cos(t * TAU * 3.5) * 0.62, end - t * 9, Math.sin(t * TAU * 3.5) * 0.62]); }
        own(s.tube(turns, radius * 0.85, wireAt(0.9)));
      }
    } else if (a.tip === 'hook') {
      own(s.rod([0, end, 0], [7, end + 1.4, 0], radius, tipMaterial));
      loopCentre = new THREE.Vector3(3, end + 0.8, 0);
    }
    if (heatAt(1) > 0) {
      const halo = own(s.ball([LOOP * 1.5, LOOP * 1.5, LOOP * 1.5], loopCentre.toArray() as [number, number, number], new THREE.MeshBasicMaterial({ color: '#ff7a2a', transparent: true, opacity: 0.22 * heatAt(1) + 0.05, depthWrite: false }), 16));
      halo.castShadow = false;
    }
    if (a.state === 'film' && a.tip !== 'needle' && a.tip !== 'hook') {
      const film = own(s.mesh(new THREE.CircleGeometry(LOOP * 0.97, 28), gloss('#dfeef0', { transparent: true, opacity: 0.6, side: THREE.DoubleSide, roughness: 0.05, emissive: '#bfe6ee', emissiveIntensity: 0.25 }), loopCentre.toArray() as [number, number, number]));
      film.castShadow = false;
    } else if (a.state === 'film') own(s.ball([0.9, 1.5, 0.9], [loopCentre.x, loopCentre.y - 0.6, 0], gloss('#dfeef0', { transparent: true, opacity: 0.75 }), 12));
    if (a.state === 'blob') own(s.ball([1.9, 1.5, 1.6], [loopCentre.x + (a.tip === 'hook' ? 2 : 0), loopCentre.y + (a.tip === 'loop' || a.tip === 'twisted' ? LOOP * 0.8 : 0.4), 0.3], gloss(['#efe4c4', '#f0b92a', '#f09a8c'][Math.floor(random() * 3)]), 14));
    if (a.state === 'charred') {
      const crust = Array.from({ length: 16 }, () => { const angle = random() * TAU; return { at: [loopCentre.x + Math.cos(angle) * LOOP * (a.tip === 'needle' ? 0.1 : a.tip === 'hook' ? 0.6 : 1), loopCentre.y + Math.sin(angle) * LOOP * (a.tip === 'hook' ? 0.15 : 1), (random() - 0.5) * 0.5] as [number, number, number], size: 0.35 + random() * 0.5 }; });
      own(s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#191614', { roughness: 1, flatShading: true }), crust));
    }

    /** Aim the tool: butt at `butt`, pointing along `direction`, loop standing in a vertical plane unless `flat`. */
    const aim = (butt: THREE.Vector3, direction: THREE.Vector3, flat = false) => {
      const y = direction.clone().normalize();
      const z = new THREE.Vector3().crossVectors(y, new THREE.Vector3(0, 1, 0)).normalize();
      const x = new THREE.Vector3().crossVectors(y, z);
      tool.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
      if (flat) tool.rotateY(Math.PI / 2);
      tool.position.copy(butt);
      s.root.add(tool);
    };
    const length = end + (a.tip === 'needle' || a.tip === 'hook' ? 0 : LOOP);

    const flames: THREE.Mesh[] = [];
    if (a.rest === 'rim' || a.rest === 'streak') {
      const padR = 24, wallR = 26.5, wallH = 9.5;
      const strokes: [number, number][][] = [];
      for (let k = 0; k < 3; k++) {
        const turn = k * 1.9 + random() * 0.4, line: [number, number][] = [];
        for (let i = 0; i < 9; i++) { const u = -8 + i * 2, v = (i % 2 ? 1 : -1) * mix(6.5, 2.5, k / 2); line.push([Math.cos(turn) * (u + 9) - Math.sin(turn) * v, Math.sin(turn) * (u + 9) + Math.cos(turn) * v]); }
        strokes.push(line);
      }
      const faceR = padR - 0.56;
      const map = a.trail === 'clean' ? undefined : painted(512, 512, (ctx, w, h) => {
        ctx.fillStyle = MEDIA_COLOUR[a.medium];
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = a.trail === 'fresh' ? 'rgba(255,255,255,0.45)' : 'rgba(255,250,225,0.5)';
        ctx.lineWidth = a.trail === 'fresh' ? 7 : 4;
        ctx.lineJoin = ctx.lineCap = 'round';
        for (const line of strokes) { ctx.beginPath(); for (const [x, z] of line) ctx.lineTo((0.5 + x / (2 * faceR)) * w, (0.5 + z / (2 * faceR)) * h); ctx.stroke(); }
      });
      const top = agarPad(s, padR, a.medium, { map });
      if (a.trail === 'grown') {
        const beads = strokes.flatMap((line, k) => line.slice(1).flatMap(([x, z], i) => {
          const [px, pz] = line[i], count = Math.round(mix(7, 2, k / 2));
          return Array.from({ length: count }, () => { const t = random(); return { at: [mix(px, x, t) + (random() - 0.5), top, mix(pz, z, t) + (random() - 0.5)] as [number, number, number], size: mix(0.7, 1.5, k / 2) * (0.6 + random() * 0.7) }; });
        }));
        s.scatter(new THREE.SphereGeometry(1, 12, 6, 0, TAU, 0, Math.PI / 2).scale(1, 0.6, 1), gloss('#efe2b8'), beads);
      }
      // The dish: a clear wall you mostly see as its bright rim.
      const glass = new THREE.MeshPhysicalMaterial({ color: '#dff1f4', transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
      s.mesh(new THREE.CylinderGeometry(wallR, wallR, wallH, 56, 1, true), glass, [0, wallH / 2, 0]).castShadow = false;
      const bright = s.material('#eef8fa', { roughness: 0.15, emissive: '#cfeaf0', emissiveIntensity: 0.35 });
      s.ring(wallR, 0.4, [0, wallH, 0], bright).rotation.x = Math.PI / 2;
      s.ring(wallR, 0.3, [0, 0.3, 0], s.material('#b9cfd4', { roughness: 0.3 })).rotation.x = Math.PI / 2;

      const azimuth = 0.25 + random() * 0.5;
      const out = new THREE.Vector3(Math.cos(azimuth), 0, Math.sin(azimuth));
      if (a.rest === 'rim') {
        // The wire rests on the rim; the butt sits on the bench outside.
        const buttD = wallR + HANDLE + CHUCK + 5, rise = (wallH + 0.4 + radius - 2.2) / (buttD - wallR);
        aim(out.clone().multiplyScalar(buttD).setY(2.2), out.clone().multiplyScalar(-1).setY(rise));
      } else {
        const touch = new THREE.Vector3(-3 + random() * 4, top + 0.5, 2 + random() * 3);
        const direction = out.clone().multiplyScalar(-1).setY(-0.55).normalize();
        aim(touch.clone().addScaledVector(direction, -length), direction, true);
      }
    } else if (a.rest === 'flame') {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#bfe0e6', transparent: true, opacity: 0.5, roughness: 0.08 });
      s.lathe([[0, 0], [11, 0], [13, 3], [13, 9], [9, 14], [4, 16.5], [3.4, 19], [0, 19]], glass);
      s.lathe([[0, 0.6], [10.5, 0.6], [12, 3], [12, 8], [0, 8]], s.material('#8a5fb8', { roughness: 0.2, transparent: true, opacity: 0.8 }));
      s.cylinder(3.9, 4.1, 2.6, [0, 19.6, 0], s.material('#c9a03e', { metalness: 0.8, roughness: 0.3 }), 20);
      s.cylinder(1.2, 1.4, 4, [0, 22, 0], s.material('#efe9d6', { roughness: 1 }), 10);
      s.cylinder(1.25, 1.2, 1, [0, 24.2, 0], s.material('#3a2c22', { roughness: 1 }), 10);
      const teardrop: [number, number][] = [[0, 0], [2.6, 2.2], [3.3, 5], [2.4, 9.5], [1, 14], [0, 17]];
      const outer = s.lathe(teardrop, new THREE.MeshBasicMaterial({ color: '#5aa8ff', transparent: true, opacity: 0.3, depthWrite: false }), [0, 23.8, 0]);
      const inner = s.lathe(teardrop.map(([r, y]) => [r * 0.62, y * 0.78] as [number, number]), new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffae3a', emissiveIntensity: 1.4, transparent: true, opacity: 0.92 }), [0, 24.2, 0]);
      outer.castShadow = false;
      flames.push(outer, inner);
      const azimuth = -0.3 + random() * 0.6;
      const direction = new THREE.Vector3(-Math.cos(azimuth), -0.42, -Math.sin(azimuth) * 0.6).normalize();
      aim(new THREE.Vector3(0, 32, 0).addScaledVector(direction, -(length - LOOP)), direction);
    } else {
      // A bench stand: weighted foot, post, and a forked cradle.
      const iron = s.material('#3d4246', { metalness: 0.5, roughness: 0.5 });
      const chrome = s.material('#cfd4d6', { metalness: 0.8, roughness: 0.25 });
      s.lathe([[0, 0], [10, 0], [10, 2], [8.5, 3.4], [0, 3.4]], iron);
      s.cylinder(0.9, 0.9, 26, [0, 16, 0], chrome, 12);
      for (const side of [-1, 1]) s.rod([0, 28, 0], [0, 32.5, side * 3.4], 0.6, chrome);
      const azimuth = (random() - 0.5) * 0.5;
      const cradle = new THREE.Vector3(0, 30.2 + 2.2, 0);
      const direction = new THREE.Vector3(Math.cos(azimuth) * -1, 0.95, Math.sin(azimuth) * 0.2).normalize();
      const along = (cradle.y - 2.2) / direction.y;
      aim(cradle.clone().addScaledVector(direction, -along), direction);
    }

    s.root.scale.setScalar(0.01);
    const flicker = mix(3, 14, mood.energy);
    return s.finish({
      update: (_dt, time) => flames.forEach((flame, i) => {
        flame.scale.set(1 + 0.08 * Math.sin(time * flicker + i), 1 + 0.12 * Math.sin(time * flicker * 1.3 + i * 2), 1 + 0.08 * Math.cos(time * flicker * 0.9));
      }),
    });
  },
});
