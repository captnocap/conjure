import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, visibleBounds } from '@conjure/kit';

type P3 = [number, number, number];

const hex = (c: THREE.Color) => `#${c.getHexString()}`;

export default defineThing({
  questions: {
    landing: choice('How did it come to rest?', {
      upright: 'Square on its landing ring, as designed, the one thing that went right.',
      tilted: 'Tilted a dozen degrees with one side of the ring up on a slab edge.',
      sunk: 'The ring sunk into loose grit, soil heaped against it.',
      tipped: 'Over on its side, the aerobrake saucer dug into the ground, the sphere lying like a dropped bell.',
    }),
    state: choice('What is the mission doing right now?', {
      transmitting: 'Still transmitting: a red beacon lit on the drum, the shell crisp, every minute a gift.',
      silent: 'Gone silent: everything greyed with fallen dust, nothing lit, a monument nobody will visit.',
      crushed: 'Crushed: the sphere caved and flattened by the pressure, seams split, the port black.',
    }),
    aerobrake: choice('What is above the sphere?', {
      saucer: 'The flat saucer aerobrake intact, a wide titanium dish on a short neck.',
      cracked: 'The saucer split, one half sagging toward the ground.',
      gone: 'The saucer torn away on the way down, leaving the bare neck and drum.',
      bundled: 'The parachute still bundled on top of the drum, a lump of pale cloth and lines.',
    }),
    antenna: choice('What kind of antenna is on top?', {
      helix: 'A fat helical coil antenna, like a spring standing on end.',
      drum: 'A tall plain cylinder antenna with a knob.',
      twin: 'Two short angled whip antennas.',
      dish: 'A small flat dish tilted at the sky.',
    }),
    port: choice('What about the camera port?', {
      open: 'Open, the lens looking down at the ground in front of it.',
      capped: 'Still covered by its protective cap, blind.',
      dropped: 'The cap blown off and lying on the ground beneath the port.',
    }),
    finish: choice('What is the shell finished in?', {
      white: 'Chalk-white paint, institutional and clean.',
      titanium: 'Bare brushed titanium, grey with a warm sheen.',
      slate: 'Pale blue-grey enamel, slightly faded.',
      foil: 'Wrapped in crinkled gold insulation foil.',
    }),
    gear: choice('What hangs on the landing ring?', {
      bare: 'Nothing: a clean ring.',
      bars: 'Striped colour-calibration bars and a folded soil arm clamped to the front.',
      drill: 'A sampler drill tower with a hose and a hopper.',
      pennant: 'A pentagonal pennant plate bolted to the front, with a row of test bars.',
    }),
    ground: choice('What is under and around it?', {
      none: 'Nothing: it stands on the bare floor.',
      slab: 'A broad flat slab of dark basalt it happened to land on.',
      blast: 'A dark radial scorch where the retro-rockets fired.',
      rubble: 'A ring of broken rock pushed up around the landing ring.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const silent = a.state === 'silent', crushed = a.state === 'crushed';
    const dust = Math.min(0.7, (silent ? 0.45 : crushed ? 0.3 : 0.08) + mood.wear * 0.3);
    const ochre = new THREE.Color('#b58a4e');
    const dusted = (colour: string, keep = 1) => new THREE.Color(colour).lerp(ochre, dust * keep);
    const paint = (colour: string, options: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color: dusted(colour), roughness: mix(0.55, 0.95, dust), ...options });

    const shellHex = { white: '#e8e6dc', titanium: '#a8a9a2', slate: '#aeb9bd', foil: '#d2a63e' }[a.finish];
    const shellMetal = { white: 0.05, titanium: 0.7, slate: 0.15, foil: 0.75 }[a.finish];
    const scorch = mix(0.15, 0.95, mood.wear);

    // The pressure sphere's skin: panel seams, bolt rows and dents that deepen with wear.
    const skin = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const base = dusted(shellHex);
      ctx.fillStyle = hex(base);
      ctx.fillRect(0, 0, 512, 256);
      if (a.finish === 'foil') {
        for (let i = 0; i < 700; i++) {
          const x = random() * 512, y = random() * 256, r = 6 + random() * 22;
          const shade = base.clone().offsetHSL(0, 0, (random() - 0.5) * 0.28);
          ctx.fillStyle = `rgba(${Math.round(shade.r * 255)},${Math.round(shade.g * 255)},${Math.round(shade.b * 255)},0.6)`;
          ctx.beginPath();
          ctx.moveTo(x + (random() - 0.5) * r, y + (random() - 0.5) * r);
          for (let k = 0; k < 3; k++) ctx.lineTo(x + (random() - 0.5) * r * 2, y + (random() - 0.5) * r * 2);
          ctx.fill();
        }
      } else {
        // Brushed or painted: fine horizontal grain.
        for (let i = 0; i < 1800; i++) {
          ctx.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '40,30,20'},${0.05 + random() * 0.08})`;
          ctx.fillRect(random() * 512, random() * 256, 8 + random() * 40, 1);
        }
      }
      // Meridian seams and the equatorial flange band.
      ctx.strokeStyle = 'rgba(35,28,20,0.45)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64, 256); ctx.stroke(); }
      ctx.fillStyle = 'rgba(35,28,20,0.5)';
      ctx.fillRect(0, 122, 512, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 48; i++) { ctx.beginPath(); ctx.arc(i * 10.7 + 5, 128, 2.2, 0, Math.PI * 2); ctx.fill(); }
      // Dents: soft dark pools with a bright lip, more and deeper the worse the state.
      const dents = Math.round(mix(3, 12, mood.wear) + (crushed ? 8 : 0));
      for (let i = 0; i < dents; i++) {
        const x = random() * 512, y = 40 + random() * 180, r = mix(10, 34, random()) * (crushed ? 1.4 : 1);
        const pool = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r);
        pool.addColorStop(0, 'rgba(20,14,8,0.55)');
        pool.addColorStop(0.7, 'rgba(20,14,8,0.25)');
        pool.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = pool;
        ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, random(), 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,250,235,0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(x, y, r * 0.95, r * 0.75, random(), Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      }
      // Scorch streaks running up from the bottom.
      ctx.globalAlpha = scorch * 0.6;
      for (let i = 0; i < 26; i++) {
        const x = random() * 512, h = 40 + random() * 90;
        const streak = ctx.createLinearGradient(0, 256, 0, 256 - h);
        streak.addColorStop(0, 'rgba(25,15,8,0.9)');
        streak.addColorStop(1, 'rgba(25,15,8,0)');
        ctx.fillStyle = streak;
        ctx.fillRect(x, 256 - h, 10 + random() * 26, h);
      }
      if (crushed) {
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = 'rgba(15,10,6,0.9)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 7; i++) {
          ctx.beginPath();
          let x = random() * 512, y = 60 + random() * 140;
          ctx.moveTo(x, y);
          for (let k = 0; k < 5; k++) { x += (random() - 0.5) * 70; y += (random() - 0.5) * 50; ctx.lineTo(x, y); }
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: a.finish === 'foil' ? 2 : 1.2, metalness: shellMetal * (1 - dust * 0.8), roughness: mix(a.finish === 'foil' ? 0.4 : 0.5, 0.95, dust) });
    })();

    const shell = paint(shellHex, { metalness: shellMetal * (1 - dust * 0.8) });
    const sootShell = paint(hex(new THREE.Color(shellHex).lerp(new THREE.Color('#2a1f16'), scorch * 0.7)), { metalness: shellMetal * 0.3 });
    const frame = paint('#4a4b48', { metalness: 0.5, roughness: 0.5 });
    const dark = paint('#1d1b19', { roughness: 0.8 });
    const glass = new THREE.MeshStandardMaterial({ color: '#0f1a22', roughness: 0.15, metalness: 0.6, emissive: '#0a1420', emissiveIntensity: 0.3 });
    const cloth = paint('#d9cfb4', { roughness: 0.95 });
    const beacon = new THREE.MeshStandardMaterial({ color: '#ff5a3a', emissive: '#ff2a12', emissiveIntensity: a.state === 'transmitting' ? 2.4 : 0.1, roughness: 0.4 });

    // Everything hangs from one body group so the landing attitude can tip it all at once.
    const body = new THREE.Group();
    s.root.add(body);
    const put = <T extends THREE.Object3D>(node: T) => { body.add(node); return node; };

    // --- Landing ring and the struts that cradle the sphere -------------------------------
    const ringR = 1.08, tube = 0.12;
    put(s.ring(ringR, tube, [0, tube, 0], sootShell)).rotation.x = Math.PI / 2;
    // Crushable teeth: short dark blocks around the ring's underside, the sawtooth of the famous panoramas.
    const teeth = 22;
    for (let i = 0; i < teeth; i++) {
      const angle = (i / teeth) * Math.PI * 2;
      const tooth = put(s.box([0.11, 0.1, 0.16], [Math.sin(angle) * (ringR + 0.1), 0.07, Math.cos(angle) * (ringR + 0.1)], dark));
      tooth.rotation.y = angle;
    }
    const sphereY = 1.0, sphereR = 0.53;
    const squash = crushed ? 0.8 : 1;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const bent = random() < mood.wear * 0.5 ? (random() - 0.5) * 0.25 : 0;
      put(s.rod([Math.sin(angle) * (ringR - 0.05), 0.2, Math.cos(angle) * (ringR - 0.05)], [Math.sin(angle + bent) * 0.4, sphereY - sphereR * squash * 0.55, Math.cos(angle + bent) * 0.4], 0.028, frame));
      put(s.rod([Math.sin(angle) * (ringR - 0.05), 0.2, Math.cos(angle) * (ringR - 0.05)], [Math.sin(angle + Math.PI / 8 + bent) * 0.4, sphereY - sphereR * squash * 0.55, Math.cos(angle + Math.PI / 8 + bent) * 0.4], 0.028, frame));
    }
    // The cup the sphere sits in.
    put(s.cylinder(0.5, 0.36, 0.3, [0, sphereY - sphereR * squash + 0.05, 0], sootShell, 24));

    // --- Pressure sphere ---------------------------------------------------------------------
    const sphere = put(s.ball([sphereR, sphereR * squash, sphereR], [0, sphereY - (1 - squash) * sphereR * 0.5, 0], skin, 36));
    sphere.rotation.y = Math.PI;
    if (crushed) {
      // Split seams: a dark flange gap and a buckled plate standing proud.
      put(s.ring(sphereR * 1.005, 0.02, [0, sphereY - (1 - squash) * sphereR * 0.5, 0], dark)).rotation.x = Math.PI / 2;
      const buckle = put(s.box([0.3, 0.22, 0.03], [sphereR * 0.72, sphereY + 0.08, sphereR * 0.5], shell));
      buckle.rotation.set(0.3, 0.9, 0.5);
    }
    // Equatorial flange ring with bolts.
    put(s.ring(sphereR + 0.015, 0.025, [0, sphereY - (1 - squash) * sphereR * 0.5, 0], frame)).rotation.x = Math.PI / 2;

    // Camera port: a short housing low on the front, looking down and forward.
    const portY = sphereY - sphereR * squash * 0.45, portZ = Math.sqrt(Math.max(0, sphereR * sphereR - (sphereR * squash * 0.45) ** 2)) * 0.98;
    const port = new THREE.Group();
    port.position.set(0, portY, portZ);
    port.rotation.x = Math.PI / 2 - 0.9;
    put(port);
    const housing = s.cylinder(0.085, 0.1, 0.18, [0, 0, 0], frame, 18);
    housing.rotation.x = 0;
    port.add(housing);
    if (a.port === 'capped') {
      port.add(s.cylinder(0.095, 0.095, 0.03, [0, 0.1, 0], paint('#f1efe6'), 18));
    } else {
      port.add(s.cylinder(0.062, 0.062, 0.02, [0, 0.095, 0], crushed ? dark : glass, 18));
      port.add(s.mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 24), paint('#d7d6cf'), [0, 0.1, 0])).rotation.x = Math.PI / 2;
    }
    // A second, sealed instrument window on the other side keeps the sphere from reading as a face.
    const window = put(s.cylinder(0.06, 0.07, 0.1, [-portZ * 0.85, portY + 0.1, -portZ * 0.5], frame, 14));
    window.rotation.z = Math.PI / 2 - 0.5;
    window.rotation.y = 0.5;

    // --- Neck, aerobrake saucer and drum ------------------------------------------------------
    const neckBase = sphereY + sphereR * squash - 0.06;
    put(s.cylinder(0.3, 0.24, 0.32, [0, neckBase + 0.14, 0], frame, 20));
    const saucerY = neckBase + 0.3;
    const saucer = new THREE.Group();
    saucer.position.y = saucerY;
    put(saucer);
    if (a.aerobrake === 'saucer' || a.aerobrake === 'cracked') {
      const profile: [number, number][] = [[0.3, 0.12], [0.62, 0.11], [0.92, 0.07], [1.06, 0.02], [1.1, -0.05], [1.02, -0.08], [0.72, -0.02], [0.3, 0.0]];
      const dish = s.lathe(profile, sootShell);
      saucer.add(dish);
      // The underside took the heat: ribs and a scorched band.
      for (let i = 0; i < 12; i++) {
        const rib = s.box([0.75, 0.025, 0.03], [0, -0.03, 0], frame);
        rib.position.set(Math.sin((i / 12) * Math.PI * 2) * 0.66, -0.035, Math.cos((i / 12) * Math.PI * 2) * 0.66);
        rib.rotation.y = (i / 12) * Math.PI * 2 + Math.PI / 2;
        saucer.add(rib);
      }
      if (a.aerobrake === 'cracked') {
        dish.geometry = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 32, 0, Math.PI * 1.15);
        const half = s.mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 32, Math.PI * 1.2, Math.PI * 0.8), sootShell);
        half.position.set(0.1, -0.2, 0.05);
        half.rotation.set(0.35, 0, -0.4);
        saucer.add(half);
      }
      // Wear sags the saucer off level.
      saucer.rotation.set((random() - 0.5) * mood.wear * 0.25, 0, (random() - 0.5) * mood.wear * 0.25);
    }
    const drumY = saucerY + 0.16;
    put(s.cylinder(0.34, 0.34, 0.34, [0, drumY + 0.17, 0], shell, 24));
    put(s.cylinder(0.36, 0.36, 0.03, [0, drumY + 0.34, 0], frame, 24));
    put(s.cylinder(0.36, 0.36, 0.03, [0, drumY + 0.015, 0], frame, 24));
    // Beacon lamp and a small box of electronics on the drum.
    put(s.ball([0.045, 0.045, 0.045], [0.3, drumY + 0.3, 0.14], beacon, 10));
    put(s.box([0.12, 0.08, 0.1], [-0.25, drumY + 0.38, 0.1], frame));
    const topY = drumY + 0.355;
    if (a.aerobrake === 'bundled') {
      // The canopy slumped over the drum: a sagging, pleated dome of pale cloth.
      const canopy = new THREE.SphereGeometry(0.46, 40, 10, 0, Math.PI * 2, 0, Math.PI / 2);
      const position = canopy.attributes.position;
      const phase = random() * 6;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
        const fold = 1 + Math.sin(Math.atan2(z, x) * 11 + phase) * 0.07 * (1 - y / 0.46);
        position.setXYZ(i, x * fold, y * 0.5, z * fold);
      }
      canopy.computeVertexNormals();
      const lump = put(s.mesh(canopy, cloth, [0.04, topY - 0.02, 0.02]));
      lump.rotation.set((random() - 0.5) * 0.3, random() * 3, (random() - 0.5) * 0.3);
      for (let i = 0; i < 5; i++) put(s.rod([(random() - 0.5) * 0.5, topY + 0.04, (random() - 0.5) * 0.5], [(random() - 0.5) * 1.2, saucerY - 0.1 - random() * 0.4, 0.6 + random() * 0.5], 0.006, paint('#e6dcc2')));
    }
    // Antenna.
    let antennaTip: THREE.Mesh | null = null;
    if (a.antenna === 'helix') {
      const coil: P3[] = [];
      for (let i = 0; i <= 56; i++) coil.push([Math.sin(i * 0.45) * 0.11, topY + 0.02 + i * 0.0065, Math.cos(i * 0.45) * 0.11]);
      put(s.tube(coil, 0.014, paint('#cdbd8c', { metalness: 0.6 })));
      put(s.cylinder(0.025, 0.025, 0.4, [0, topY + 0.2, 0], frame, 8));
      antennaTip = put(s.ball([0.03, 0.03, 0.03], [0, topY + 0.41, 0], beacon, 8));
    } else if (a.antenna === 'drum') {
      put(s.cylinder(0.11, 0.13, 0.42, [0, topY + 0.21, 0], shell, 16));
      antennaTip = put(s.ball([0.06, 0.06, 0.06], [0, topY + 0.46, 0], frame, 10));
    } else if (a.antenna === 'twin') {
      for (const side of [-1, 1]) {
        const whip = put(s.rod([side * 0.12, topY, 0], [side * 0.42, topY + 0.45, 0.1], 0.012, paint('#d8d3c4', { metalness: 0.5 })));
        void whip;
      }
      antennaTip = put(s.ball([0.03, 0.03, 0.03], [0, topY + 0.05, 0], beacon, 8));
    } else {
      put(s.cylinder(0.02, 0.02, 0.25, [0, topY + 0.12, 0], frame, 8));
      const dish = put(s.lathe([[0, 0.04], [0.14, 0.02], [0.24, -0.02], [0.25, -0.05], [0.2, -0.04], [0, 0]], shell, [0, topY + 0.27, 0]));
      dish.rotation.x = -0.7;
      antennaTip = put(s.ball([0.025, 0.025, 0.025], [0, topY + 0.3, 0.06], beacon, 8));
    }

    // --- Instruments on the ring ----------------------------------------------------------------
    const frontZ = ringR - 0.02;
    const barTile = (text: string[], x: number, y: number, z: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      text.forEach((colour, i) => { ctx.fillStyle = colour; ctx.fillRect((i * 256) / text.length, 0, 256 / text.length + 1, 64); });
      ctx.fillStyle = `rgba(181,138,78,${dust * 0.6})`;
      ctx.fillRect(0, 0, 256, 64);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const tile = s.mesh(new THREE.BoxGeometry(0.26, 0.06, 0.02), [new THREE.MeshStandardMaterial({ color: '#333' }), new THREE.MeshStandardMaterial({ color: '#333' }), new THREE.MeshStandardMaterial({ color: '#333' }), new THREE.MeshStandardMaterial({ color: '#333' }), new THREE.MeshStandardMaterial({ map, roughness: 0.8 }), new THREE.MeshStandardMaterial({ color: '#333' })] as unknown as THREE.Material, [x, y, z]);
      return put(tile);
    };
    if (a.gear === 'bars' || a.gear === 'pennant') {
      barTile(['#111', '#444', '#777', '#aaa', '#ddd', '#fff'], -0.34, 0.1, frontZ + 0.12);
      barTile(['#d8322a', '#2d9a3f', '#2c4fd6', '#f2d23b', '#111', '#fff'], 0.0, 0.1, frontZ + 0.12);
      barTile(['#111', '#fff', '#111', '#fff', '#111', '#fff', '#111', '#fff'], 0.34, 0.1, frontZ + 0.12);
      for (const x of [-0.34, 0, 0.34]) put(s.rod([x, 0.2, frontZ], [x, 0.12, frontZ + 0.12], 0.008, frame));
    }
    if (a.gear === 'bars') {
      // The soil arm, folded against the ring with its conical tip tucked under.
      const hinge = put(s.box([0.12, 0.08, 0.08], [0.62, 0.3, frontZ * 0.78], frame));
      void hinge;
      put(s.rod([0.62, 0.3, frontZ * 0.78], [0.95, 0.12, frontZ * 0.78 + 0.5], 0.02, paint('#c9c6ba', { metalness: 0.5 })));
      put(s.cylinder(0.0, 0.045, 0.12, [0.97, 0.06, frontZ * 0.78 + 0.54], frame, 10));
    } else if (a.gear === 'drill') {
      put(s.box([0.22, 0.5, 0.22], [-0.7, 0.45, frontZ * 0.6], frame));
      put(s.cylinder(0.03, 0.03, 0.55, [-0.7, 0.28, frontZ * 0.6 + 0.2], paint('#c9c6ba', { metalness: 0.6 }), 8));
      put(s.cylinder(0.08, 0.1, 0.12, [-0.7, 0.76, frontZ * 0.6], shell, 12));
      put(s.tube([[-0.7, 0.7, frontZ * 0.6], [-0.4, 0.75, frontZ * 0.5], [-0.15, 0.6, frontZ * 0.65]], 0.018, dark));
    } else if (a.gear === 'pennant') {
      const plate = new THREE.Shape();
      for (let i = 0; i < 5; i++) { const t = (i / 5) * Math.PI * 2 - Math.PI / 2; i ? plate.lineTo(Math.cos(t) * 0.1, Math.sin(t) * 0.1) : plate.moveTo(Math.cos(t) * 0.1, Math.sin(t) * 0.1); }
      const pennant = put(s.mesh(new THREE.ExtrudeGeometry(plate, { depth: 0.012, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.003 }), paint('#c2b280', { metalness: 0.8, roughness: 0.35 }), [0.55, 0.36, frontZ * 0.7]));
      pennant.rotation.y = 0.3;
      put(s.box([0.12, 0.12, 0.03], [0.55, 0.36, frontZ * 0.7 - 0.02], paint('#a8201e'))).rotation.y = 0.3;
    }
    // Equipment boxes spaced round the ring.
    for (const angle of [1.1, 2.6, 4.0, 5.3]) {
      const box = put(s.box([0.22, 0.16, 0.18], [Math.sin(angle) * 0.92, 0.3, Math.cos(angle) * 0.92], frame));
      box.rotation.y = angle;
    }

    // --- Attitude --------------------------------------------------------------------------------
    if (a.landing === 'tilted') body.rotation.set(0.17, 0, 0.1);
    else if (a.landing === 'tipped') body.rotation.set(0.1, 0.4, 1.32);
    // Rest the lowest point on the ground, then let it dig in or sink.
    body.updateMatrixWorld(true);
    const low = visibleBounds(body).min.y;
    body.position.y = -low + (a.landing === 'sunk' ? -0.16 : a.landing === 'tipped' ? -0.08 : a.landing === 'tilted' ? -0.03 : 0);

    // --- Ground --------------------------------------------------------------------------------
    const basalt = paint('#4a4038', { roughness: 1 });
    const grit = paint('#8d6c45', { roughness: 1 });
    if (a.ground === 'slab') {
      const slab = new THREE.Shape();
      const corners = 7;
      for (let i = 0; i < corners; i++) { const t = (i / corners) * Math.PI * 2, r = 1.6 + random() * 0.5; i ? slab.lineTo(Math.cos(t) * r, Math.sin(t) * r) : slab.moveTo(Math.cos(t) * r, Math.sin(t) * r); }
      const plate = s.mesh(new THREE.ExtrudeGeometry(slab, { depth: 0.06, bevelEnabled: false }), basalt, [0, 0.0, 0]);
      plate.rotation.x = Math.PI / 2;
      plate.position.y = 0.0;
    } else if (a.ground === 'blast') {
      // A soft radial scorch painted on a decal: dark in the middle, fraying into streaks.
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      const core = ctx.createRadialGradient(256, 256, 40, 256, 256, 200);
      core.addColorStop(0, 'rgba(26,18,12,0.95)');
      core.addColorStop(0.6, 'rgba(32,22,14,0.7)');
      core.addColorStop(1, 'rgba(40,28,18,0)');
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 70; i++) {
        const angle = random() * Math.PI * 2, from = 90 + random() * 60, to = from + 50 + random() * 110;
        ctx.strokeStyle = `rgba(26,18,12,${0.25 + random() * 0.4})`;
        ctx.lineWidth = 2 + random() * 7;
        ctx.beginPath();
        ctx.moveTo(256 + Math.cos(angle) * from, 256 + Math.sin(angle) * from);
        ctx.lineTo(256 + Math.cos(angle) * to, 256 + Math.sin(angle) * to);
        ctx.stroke();
      }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const scar = s.mesh(new THREE.CircleGeometry(2.3, 40), new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: 1 }), [0, 0.012, 0]);
      scar.rotation.x = -Math.PI / 2;
      scar.castShadow = false;
    } else if (a.ground === 'rubble') {
      const stones = Array.from({ length: 34 }, () => {
        const angle = random() * Math.PI * 2, r = ringR + 0.15 + random() * 0.45;
        return { at: [Math.sin(angle) * r, 0.05 + random() * 0.08, Math.cos(angle) * r] as P3, size: mix(0.07, 0.2, random()) };
      });
      s.scatter(new THREE.DodecahedronGeometry(1, 0), basalt, stones);
    }
    if (a.landing === 'sunk' || a.ground === 'rubble') {
      const heap = s.ring(ringR + 0.05, 0.22, [0, -0.08, 0], grit);
      heap.rotation.x = Math.PI / 2;
      heap.castShadow = false;
    }
    if (a.port === 'dropped' && a.landing !== 'tipped') {
      const cap = s.cylinder(0.095, 0.095, 0.03, [0.25 + random() * 0.2, 0.015, portZ + 0.3 + random() * 0.2], paint('#f1efe6'), 18);
      cap.rotation.set(0.15, random() * 3, 0.1);
    }

    const pace = mix(0.4, 2.2, mood.energy);
    const lit = a.state === 'transmitting';
    const tipScale = antennaTip ? antennaTip.scale.x : 1;
    return s.finish({
      footprint: ringR + 0.25,
      update(_dt, time) {
        if (!lit) return;
        const blink = Math.sin(time * 3.1 * pace) > 0.4 ? 2.6 : 0.5;
        beacon.emissiveIntensity = blink;
        if (antennaTip) antennaTip.scale.setScalar(tipScale * (1 + Math.sin(time * 6 * pace) * 0.08));
      },
    });
  },
});
