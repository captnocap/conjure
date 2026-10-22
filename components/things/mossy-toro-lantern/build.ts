import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const STONES = {
  granite: 'Mid-grey speckled granite, the ordinary temple stone.',
  pale: 'Pale, almost white weathered limestone.',
  dark: 'Dark volcanic stone, nearly charcoal, heavy and wet-looking.',
  rust: 'Warm brownish stone stained with iron and lichen.',
} as const;
const STONE_HEX: Record<keyof typeof STONES, string> = { granite: '#9c9b93', pale: '#cfcabb', dark: '#55565a', rust: '#a08670' };

export default defineThing({
  questions: {
    form: choice('What form of stone lantern is it?', {
      kasuga: 'Tall and slender on a round shaft with a six-sided firebox and an upswept cap: the classic shrine-path lantern.',
      yukimi: 'A low snow-viewing lantern: a very wide round cap squatting on splayed curved legs, made for pond edges.',
      oribe: 'A plain square post sunk straight into the earth with a square firebox and a simple pyramid cap: a tea-garden lantern.',
      nozura: 'Rough unworked boulders balanced on one another, barely shaped, a mountain lantern.',
    }),
    stone: choice('What stone is it cut from?', STONES),
    growth: choice('What has grown or settled on it?', {
      clean: 'Almost nothing: scrubbed stone with only a green tinge in the joints.',
      moss: 'Thick cushions of moss over the cap and base, soft and bright green.',
      ferns: 'Moss, plus small ferns and ivy sprouting from the joints and climbing the shaft.',
      snow: 'A deep round cap of snow on the roof and every ledge.',
      leaves: 'Fallen red and yellow maple leaves caught on the cap and heaped at the foot.',
    }),
    flame: choice('Is there a light inside?', {
      dark: 'Dark and cold; nobody has lit it in years.',
      candle: 'A steady warm candle glow behind the paper.',
      bright: 'Burning strongly, festival bright, throwing gold through every window.',
      spirit: 'A pale blue-green light that is not a candle.',
    }),
    window: choice('What do the firebox windows look like?', {
      paper: 'Plain squares of white paper screen.',
      moon: 'A round full-moon opening.',
      crescent: 'A crescent moon cut through the stone.',
      lattice: 'A fine wooden lattice over paper.',
      torn: 'Paper torn and hanging, the hole behind it black.',
    }),
    state: choice('What has happened to it?', {
      upright: 'Standing true, as the mason left it.',
      leaning: 'The whole lantern leans, roots or frost having lifted one side.',
      askew: 'The cap has been knocked crooked and sits off centre.',
      toppled: 'The top stones have fallen and lie beside the stump of the lantern.',
      offerings: 'Someone has left coins, a cup of sake and a mandarin on its base.',
    }),
    setting: choice('What is at its foot?', {
      nothing: 'Bare ground.',
      stones: 'A few flat stepping stones leading past it.',
      rocks: 'Two or three mossy garden rocks set against it.',
      grass: 'Tufts of long grass and a spray of small flowers.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const mossy = a.growth === 'moss' || a.growth === 'ferns' ? 1 : a.growth === 'clean' ? 0.12 : 0.4;
    const mossAmount = Math.min(1, mossy * mix(0.7, 1.2, mood.wear));
    const mossColour = new THREE.Color().setHSL(mix(0.3, 0.24, mood.warmth), mix(0.45, 0.6, mood.cheer), mix(0.22, 0.3, mood.cheer));

    // Stone surface: speckle, streaks of damp and blotches of moss, shared by every block.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const stoneColour = new THREE.Color(STONE_HEX[a.stone]);
    ctx.fillStyle = `#${stoneColour.getHexString()}`;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.14)';
      ctx.fillRect(random() * 256, random() * 256, 1 + random() * 2, 1 + random() * 2);
    }
    for (let i = 0; i < 20 * mood.wear; i++) {
      ctx.fillStyle = 'rgba(30,30,25,0.12)';
      ctx.fillRect(random() * 256, random() * 256, 2 + random() * 5, 30 + random() * 90);
    }
    for (let i = 0; i < 90 * mossAmount; i++) {
      const x = random() * 256, y = random() * 256, r = 6 + random() * 26 * mossAmount;
      const blot = ctx.createRadialGradient(x, y, 0, x, y, r);
      const tone = mossColour.clone().offsetHSL((random() - 0.5) * 0.05, 0, (random() - 0.5) * 0.1);
      blot.addColorStop(0, `rgba(${Math.round(tone.r * 255)},${Math.round(tone.g * 255)},${Math.round(tone.b * 255)},0.95)`);
      blot.addColorStop(1, `rgba(${Math.round(tone.r * 255)},${Math.round(tone.g * 255)},${Math.round(tone.b * 255)},0)`);
      ctx.fillStyle = blot;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const skin = new THREE.CanvasTexture(canvas);
    skin.colorSpace = THREE.SRGBColorSpace;
    skin.wrapS = skin.wrapT = THREE.RepeatWrapping;
    const stone = new THREE.MeshStandardMaterial({ map: skin, roughness: 0.95, flatShading: true });
    const smooth = new THREE.MeshStandardMaterial({ map: skin, roughness: 0.95 });
    const moss = new THREE.MeshStandardMaterial({ color: mossColour.clone().multiplyScalar(0.7), roughness: 1 });
    const snow = new THREE.MeshStandardMaterial({ color: '#f5f7f9', roughness: 0.85 });

    // The light and the window it shows through.
    const lit = a.flame !== 'dark';
    const dusk = Math.abs(mood.daylight - 0.5) * 2;
    const flame = a.flame === 'spirit' ? new THREE.Color('#7fffd9') : new THREE.Color().setHSL(mix(0.13, 0.07, mood.warmth), 1, 0.6);
    const glow = lit ? (a.flame === 'bright' ? 2.6 : 1.5) * mix(0.8, 1.4, dusk) : 0;
    const pane = document.createElement('canvas');
    pane.width = pane.height = 128;
    const p = pane.getContext('2d')!;
    p.fillStyle = '#000000';
    p.fillRect(0, 0, 128, 128);
    p.fillStyle = '#ffffff';
    if (a.window === 'moon') { p.beginPath(); p.arc(64, 64, 46, 0, Math.PI * 2); p.fill(); }
    else if (a.window === 'crescent') {
      p.beginPath(); p.arc(64, 64, 48, 0, Math.PI * 2); p.fill();
      p.fillStyle = '#000000'; p.beginPath(); p.arc(84, 54, 42, 0, Math.PI * 2); p.fill();
    } else {
      p.fillRect(14, 14, 100, 100);
      p.fillStyle = '#000000';
      if (a.window === 'lattice') for (let i = 1; i < 5; i++) { p.fillRect(14 + i * 20 - 2, 14, 5, 100); p.fillRect(14, 14 + i * 20 - 2, 100, 5); }
      if (a.window === 'torn') {
        p.beginPath(); p.moveTo(30, 14);
        for (let i = 0; i < 9; i++) p.lineTo(20 + random() * 90, 30 + random() * 84);
        p.closePath(); p.fill();
      }
    }
    const mask = new THREE.CanvasTexture(pane);
    const paperColour = lit ? new THREE.Color('#fff3d6').lerp(flame, 0.45) : new THREE.Color('#cfc8b4');
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: paperColour, map: mask, emissive: flame, emissiveMap: mask, emissiveIntensity: glow, roughness: 0.9,
    });

    const lathe = (profile: [number, number][], sides: number, material: THREE.Material) => {
      const geometry = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), sides);
      if (sides < 12) geometry.rotateY(Math.PI / sides);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      return mesh;
    };
    /** A lumpy boulder: a low sphere pushed about by a position-based ripple so seams stay closed. */
    const boulder = (rx: number, ry: number, rz: number, material: THREE.Material) => {
      const geometry = new THREE.SphereGeometry(1, 9, 7);
      const k = random() * 10;
      const at = geometry.attributes.position;
      for (let i = 0; i < at.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(at, i);
        const bump = 1 + 0.16 * Math.sin(v.x * 3.1 + k) * Math.cos(v.z * 2.7 + k * 1.7) + 0.1 * Math.sin(v.y * 4.3 + k * 0.6);
        at.setXYZ(i, v.x * bump * rx, v.y * bump * ry, v.z * bump * rz);
      }
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      return mesh;
    };
    const pad = (parent: THREE.Object3D, x: number, y: number, z: number, r: number, material: THREE.Material = moss) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 9, 6), material);
      mesh.scale.set(r, r * mix(0.3, 0.55, random()), r * mix(0.8, 1.1, random()));
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
    };

    // The lantern is three stacked groups so it can lean, slip or fall apart.
    const whole = new THREE.Group(), lower = new THREE.Group(), box = new THREE.Group(), top = new THREE.Group();
    whole.add(lower, box, top);
    s.root.add(whole);
    let boxY = 1.12, boxR = 0.2, boxH = 0.3, capR = 0.5, sides = 6, capTop = 0.3;

    if (a.form === 'kasuga') {
      lower.add(lathe([[0, 0], [0.36, 0], [0.36, 0.09], [0.28, 0.15], [0.19, 0.19], [0, 0.19]], 6, stone));
      const shaft = lathe([[0.105, 0.19], [0.1, 0.5], [0.125, 0.53], [0.125, 0.57], [0.1, 0.6], [0.105, 0.94]], 20, smooth);
      lower.add(shaft);
      lower.add(lathe([[0, 0.94], [0.13, 0.94], [0.29, 1.04], [0.29, 1.1], [0.22, 1.12], [0, 1.12]], 6, stone));
      top.add(lathe([[0, 0], [0.24, 0], [0.5, 0.035], [0.52, 0.075], [0.3, 0.14], [0.14, 0.24], [0.08, 0.3], [0, 0.3]], 6, stone));
      // Fern-curl corners sweeping up from the six ridges.
      for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3;
        const curl = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.022, 6, 10, Math.PI * 1.2), smooth);
        curl.position.set(Math.sin(angle) * 0.5, 0.11, Math.cos(angle) * 0.5);
        curl.rotation.set(0, angle - Math.PI / 2, 0);
        curl.castShadow = true;
        top.add(curl);
      }
      const jewel = lathe([[0, 0.3], [0.09, 0.31], [0.07, 0.34], [0.11, 0.4], [0.07, 0.48], [0, 0.54]], 16, smooth);
      top.add(jewel);
      capTop = 0.3;
    } else if (a.form === 'yukimi') {
      boxY = 0.5; boxR = 0.19; boxH = 0.22; capR = 0.62; capTop = 0.2;
      const legs = 3 + Math.floor(random() * 2);
      for (let i = 0; i < legs; i++) {
        const angle = i / legs * Math.PI * 2 + Math.PI / legs;
        const points = [[0.2, 0.44], [0.3, 0.36], [0.38, 0.18], [0.43, 0]].map(([r, y]) => new THREE.Vector3(Math.sin(angle) * r, y, Math.cos(angle) * r));
        const leg = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 10, 0.055, 6), smooth);
        leg.scale.set(1, 1, 1);
        leg.castShadow = true;
        lower.add(leg);
      }
      lower.add(lathe([[0, 0.4], [0.2, 0.4], [0.34, 0.44], [0.34, 0.5], [0, 0.5]], 6, stone));
      top.add(lathe([[0, 0], [0.26, 0], [0.6, 0.02], [0.63, 0.05], [0.4, 0.12], [0.16, 0.18], [0, 0.2]], 28, smooth));
      top.add(lathe([[0, 0.19], [0.07, 0.2], [0.09, 0.25], [0.05, 0.31], [0, 0.33]], 14, smooth));
    } else if (a.form === 'oribe') {
      boxY = 0.86; boxR = 0.2; boxH = 0.26; capR = 0.36; sides = 4; capTop = 0.26;
      lower.add(lathe([[0, -0.2], [0.16, -0.2], [0.16, 0.5], [0.21, 0.58], [0.21, 0.72], [0.16, 0.8], [0.22, 0.82], [0.22, 0.86], [0, 0.86]], 4, stone));
      top.add(lathe([[0, 0], [0.34, 0], [0.37, 0.05], [0.12, 0.2], [0, 0.22]], 4, stone));
      top.add(lathe([[0, 0.2], [0.06, 0.21], [0.085, 0.27], [0.04, 0.34], [0, 0.36]], 12, smooth));
    } else {
      boxY = 0.98; boxR = 0.21; boxH = 0.26; capR = 0.5; capTop = 0.26;
      const foot = boulder(0.42, 0.16, 0.38, smooth); foot.position.y = 0.12; lower.add(foot);
      const pillar = boulder(0.17, 0.36, 0.16, smooth); pillar.position.y = 0.56; lower.add(pillar);
      const shelf = boulder(0.33, 0.07, 0.3, smooth); shelf.position.y = 0.93; lower.add(shelf);
      const cap = boulder(0.52, 0.13, 0.47, smooth); cap.position.y = 0.1; cap.rotation.z = (random() - 0.5) * 0.12; top.add(cap);
      const knob = boulder(0.11, 0.09, 0.1, smooth); knob.position.y = 0.27; top.add(knob);
    }

    // Firebox: a prism with a paper window let into every other face (every face when square).
    const body = new THREE.Mesh(new THREE.CylinderGeometry(boxR, boxR, boxH, sides), stone);
    body.rotation.y = Math.PI / sides;
    body.position.y = boxH / 2;
    body.castShadow = true;
    box.add(body);
    const apothem = boxR * Math.cos(Math.PI / sides);
    const face = 2 * boxR * Math.sin(Math.PI / sides);
    for (let i = 0; i < sides; i++) {
      if (sides === 6 && i % 2 === 1 && a.window !== 'paper') continue;
      const angle = i * Math.PI * 2 / sides;
      const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(face * 0.74, boxH * 0.78), windowMaterial);
      windowMesh.position.set(Math.sin(angle) * (apothem + 0.004), boxH / 2, Math.cos(angle) * (apothem + 0.004));
      windowMesh.rotation.y = angle;
      box.add(windowMesh);
    }
    box.position.y = boxY;
    top.position.y = boxY + boxH;

    // Growth and weather.
    const capY = boxY + boxH;
    if (a.growth === 'moss' || a.growth === 'ferns') {
      const n = Math.round(mix(14, 30, mood.density));
      for (let i = 0; i < n; i++) {
        const angle = random() * Math.PI * 2, r = capR * mix(0.25, 0.92, random());
        pad(top, Math.sin(angle) * r, mix(capTop * 0.75, 0.07, r / capR), Math.cos(angle) * r, 0.05 + random() * 0.06);
      }
      for (let i = 0; i < 7; i++) {
        const angle = random() * Math.PI * 2;
        pad(lower, Math.sin(angle) * 0.3, 0.12, Math.cos(angle) * 0.3, 0.07 + random() * 0.06);
      }
    }
    if (a.growth === 'ferns') {
      const leaf = new THREE.MeshStandardMaterial({ color: mossColour.clone().offsetHSL(0.04, 0.1, 0.06), roughness: 0.9, side: THREE.DoubleSide });
      const fronds = 10 + Math.floor(random() * 8);
      for (let i = 0; i < fronds; i++) {
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.26 + random() * 0.14, 4), leaf);
        const angle = random() * Math.PI * 2, low = random() < 0.6;
        const r = low ? 0.3 : boxR + 0.06;
        frond.scale.z = 0.25;
        frond.position.set(Math.sin(angle) * r, low ? 0.2 : boxY + 0.03, Math.cos(angle) * r);
        frond.rotation.set(0.9, angle, 0, 'YXZ');
        frond.castShadow = true;
        whole.add(frond);
      }
      // Ivy winding up the shaft.
      const vine = new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_u, i) => new THREE.Vector3(Math.sin(i * 1.1) * 0.14, i / 8 * boxY, Math.cos(i * 1.1) * 0.14)));
      const stem = new THREE.Mesh(new THREE.TubeGeometry(vine, 30, 0.012, 5), leaf);
      whole.add(stem);
      for (let i = 0; i < 22; i++) {
        const at = vine.getPoint(random());
        pad(whole, at.x * 1.15, at.y, at.z * 1.15, 0.035 + random() * 0.02, leaf);
      }
    }
    if (a.growth === 'snow') {
      const drift = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), snow);
      drift.scale.set(capR * 1.02, capTop * 0.75 + 0.1, capR * 1.02);
      drift.position.y = 0.06;
      top.add(drift);
      const hump = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), snow);
      hump.scale.y = 0.7;
      hump.position.y = capTop + (a.form === 'kasuga' ? 0.24 : 0.12);
      top.add(hump);
      for (let i = 0; i < 9; i++) {
        const angle = random() * Math.PI * 2, r = 0.25 + random() * 0.35;
        pad(s.root, Math.sin(angle) * r, 0.01, Math.cos(angle) * r, 0.12 + random() * 0.12, snow);
      }
    }
    if (a.growth === 'leaves') {
      const leaves: { at: [number, number, number]; size: number; color: THREE.Color }[] = [];
      const n = Math.round(mix(30, 110, mood.density));
      for (let i = 0; i < n; i++) {
        const onCap = random() < 0.3, angle = random() * Math.PI * 2;
        const r = onCap ? capR * random() * 0.9 : 0.25 + random() * 0.55;
        leaves.push({
          at: [Math.sin(angle) * r, onCap ? capY + mix(capTop * 0.8, 0.09, r / capR) + 0.012 : 0.012 + random() * 0.03, Math.cos(angle) * r],
          size: 0.6 + random() * 0.8,
          color: new THREE.Color().setHSL(random() * 0.13, 0.85, 0.42 + random() * 0.15),
        });
      }
      const leaf = new THREE.CircleGeometry(0.045, 5);
      leaf.rotateX(-Math.PI / 2);
      s.scatter(leaf, new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide }), leaves);
    }

    // What happened to it.
    if (a.state === 'leaning') { whole.rotation.z = mix(0.1, 0.2, random()) * (random() < 0.5 ? -1 : 1); whole.rotation.x = (random() - 0.5) * 0.12; whole.position.y = -0.03; }
    if (a.state === 'askew') { top.rotation.y = 0.5; top.rotation.z = 0.1; top.position.x = capR * 0.22; top.position.y -= 0.01; }
    if (a.state === 'toppled') {
      top.position.set(capR + 0.42, 0.1, 0.15);
      top.rotation.set(0.12, random() * 3, 0.42);
      if (random() < 0.6) { box.position.set(-0.45, boxR * 0.85, 0.3); box.rotation.set(Math.PI / 2, 0, 0.7); }
    }
    if (a.state === 'offerings') {
      const gold = s.material('#c9a23a', { metalness: 0.8, roughness: 0.35 });
      const coins = 3 + Math.floor(random() * 6 * (0.4 + mood.density));
      for (let i = 0; i < coins; i++) s.cylinder(0.012, 0.012, 0.003, [0.2 + random() * 0.16, 0.012, 0.3 + random() * 0.14], gold, 10);
      s.cylinder(0.03, 0.02, 0.035, [-0.12, 0.02, 0.4], s.material('#f2f0e8', { roughness: 0.3 }), 12);
      s.ball([0.035, 0.03, 0.035], [-0.24, 0.03, 0.36], s.material('#f08a1d', { roughness: 0.6 }), 10);
      s.ball([0.035, 0.03, 0.035], [-0.3, 0.03, 0.4], s.material('#f29a25', { roughness: 0.6 }), 10);
    }

    if (a.setting === 'stones') {
      const n = 3 + Math.floor(random() * 2);
      for (let i = 0; i < n; i++) {
        const slab = boulder(0.2 + random() * 0.08, 0.03, 0.17 + random() * 0.06, smooth);
        slab.position.set(-0.75 + i * 0.5 + (random() - 0.5) * 0.1, 0.012, 0.55 + Math.sin(i * 1.3) * 0.12);
        slab.rotation.y = random() * 3;
        s.root.add(slab);
      }
    } else if (a.setting === 'rocks') {
      const n = 2 + Math.floor(random() * 2);
      for (let i = 0; i < n; i++) {
        const r = 0.14 + random() * 0.16;
        const rock = boulder(r * 1.2, r, r, smooth);
        const angle = Math.PI * 0.7 + i * 1.1 + random() * 0.4;
        rock.position.set(Math.sin(angle) * 0.55, r * 0.6, Math.cos(angle) * 0.5);
        s.root.add(rock);
        if (mossAmount > 0.3) pad(s.root, rock.position.x, r * 1.45, rock.position.z, r * 0.7);
      }
    } else if (a.setting === 'grass') {
      const blades: { at: [number, number, number]; size: number; color: THREE.Color }[] = [];
      const n = Math.round(mix(40, 130, mood.density));
      for (let i = 0; i < n; i++) {
        const angle = random() * Math.PI * 2, r = 0.3 + random() * 0.4;
        blades.push({ at: [Math.sin(angle) * r, 0, Math.cos(angle) * r], size: 0.5 + random(), color: mossColour.clone().offsetHSL((random() - 0.5) * 0.06, 0, 0.05 + random() * 0.15) });
      }
      const blade = new THREE.ConeGeometry(0.012, 0.3, 3);
      blade.translate(0, 0.15, 0);
      s.scatter(blade, new THREE.MeshStandardMaterial({ roughness: 0.9 }), blades);
      const petals = s.material(mood.cheer > 0.5 ? '#f3e37a' : '#d8cdea', { roughness: 0.7 });
      for (let i = 0; i < 9; i++) {
        const angle = 0.5 + random() * 1.2, r = 0.45 + random() * 0.2;
        s.ball([0.022, 0.012, 0.022], [Math.sin(angle) * r, 0.14 + random() * 0.14, Math.cos(angle) * r], petals, 6);
      }
    }
    whole.traverse((node) => { node.castShadow = node.receiveShadow = true; });

    const speed = mix(2, 11, mood.energy), depth = mix(0.05, 0.3, mood.energy);
    return s.finish({
      footprint: a.state === 'toppled' ? undefined : Math.max(capR, 0.45) + (a.setting === 'nothing' ? 0 : 0.35),
      update: lit ? (_dt, time) => { windowMaterial.emissiveIntensity = glow * (1 - depth + depth * Math.sin(time * speed) * Math.sin(time * speed * 0.37 + 1)); } : undefined,
    });
  },
});
