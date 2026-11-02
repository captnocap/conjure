import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, paint, paintHex } from '@conjure/kit';

type P3 = [number, number, number];

const canvasTexture = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat = true) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
};

const beam = (a: P3, b: P3, r: number) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const dir = B.clone().sub(A);
  const g = new THREE.CylinderGeometry(r, r, Math.max(dir.length(), 0.01), 5, 1, true);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return g;
};

const RAINBOW = ['#e40303', '#ff8c00', '#ffed00', '#008026', '#24408e', '#732982'];

export default defineThing({
  questions: {
    era: choice('When is the tower seen?', {
      new: '1981, brand new: the gold turret glinting, no branding, the cables taut and bright.',
      eye: 'Today, as Sydney Tower Eye: the name in a band around the turret, a little weathered.',
      maintenance: 'Under maintenance: rings of scaffold around the turret and a cradle hanging off it.',
      christmas: 'Dressed as the city\'s giant Christmas tree, strings of coloured lights running down the cables and a star on the spire.',
    }),
    turretLight: choice('How is the turret lit?', {
      gold: 'Warm gold light, the tower\'s own colour.',
      white: 'Clean white floodlight.',
      rainbow: 'Rainbow bands, one colour to each ring, for Mardi Gras.',
      cause: 'One solid colour for a cause or a team.',
      dark: 'Unlit: just the gold metal in daylight.',
    }),
    causeColour: paint('If the turret is lit for a cause, in what colour?', ['red', 'magenta', 'pink', 'blue', 'green', 'turquoise', 'purple', 'orange']),
    weather: choice('What is the weather doing around it?', {
      clear: 'Clear blue air, the whole needle sharp.',
      cloud: 'Low cloud swallowing the turret, only the shaft showing below it.',
      storm: 'A storm: lightning striking the antenna spire.',
      haze: 'Summer haze softening the top of the tower.',
    }),
    roof: choice('What is on the turret roof?', {
      nothing: 'Nothing but the spire and its aerials.',
      skywalk: 'A Skywalk group in orange suits edging around the open-air platform on the roof.',
      crane: 'A small crane perched on the roof, lifting something up the spire.',
    }),
    base: choice('What is at the foot of the tower?', {
      mall: 'The Westfield shopping podium, banners and lit shopfronts.',
      bare: 'A plain concrete rooftop, the cables anchored in a ring.',
      crowd: 'The mall podium with a queue of people and a big crowd at street level.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const night = Math.min(1, Math.max(0, (lowSun - 0.35) / 0.65));
    const fresh = a.era === 'new';
    const ROOF = 26, TURRET = 238;

    const concrete = s.material(new THREE.Color('#c9c6bd').lerp(new THREE.Color('#8e8a80'), mood.wear * 0.5), { roughness: 0.8 });
    const steel = s.material('#b9bec2', { roughness: 0.35, metalness: 0.6 });
    const goldHex = new THREE.Color(fresh ? '#e2b545' : '#cf9f3a').lerp(new THREE.Color('#8c7448'), mood.wear * 0.35);
    const lit = a.turretLight !== 'dark';
    const lightColour = (k: number) => a.turretLight === 'gold' ? '#ffb64a' : a.turretLight === 'white' ? '#fff4e2' : a.turretLight === 'rainbow' ? RAINBOW[k % RAINBOW.length] : paintHex(a.causeColour);
    const glowLevel = lit ? mix(0.12, 1.1, night) : 0;
    const gold = (k: number) => s.material(goldHex, {
      metalness: 0.65, roughness: fresh ? 0.22 : 0.35,
      emissive: lit ? lightColour(k) : '#000000', emissiveIntensity: a.turretLight === 'rainbow' || a.turretLight === 'cause' ? glowLevel * 1.5 + 0.25 : glowLevel,
    });

    // ----- base: the podium or a plain roof -----
    const podiumMap = canvasTexture(128, 64, (c) => {
      c.fillStyle = '#d8d3c7'; c.fillRect(0, 0, 128, 64);
      for (let r = 0; r < 4; r++) { c.fillStyle = r % 2 ? '#47515a' : '#cfc8b8'; c.fillRect(0, r * 16 + 3, 128, 10); }
    });
    podiumMap.repeat.set(8, 1);
    const glowMap = canvasTexture(128, 64, (c) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, 128, 64);
      for (let r = 0; r < 4; r++) if (r % 2) { c.fillStyle = '#ffd99a'; c.fillRect(0, r * 16 + 3, 128, 10); }
    });
    glowMap.repeat.set(8, 1);
    if (a.base !== 'bare') {
      const podium = s.material('#ffffff', { map: podiumMap, emissive: '#ffd99a', emissiveMap: glowMap, emissiveIntensity: mix(0.05, 1, night), roughness: 0.7 });
      s.box([96, ROOF, 64], [0, ROOF / 2, 0], podium);
      s.box([98, 1.2, 66], [0, ROOF + 0.6, 0], concrete);
      // Banners down the street face.
      const bannerColours = ['#c8102e', '#f4f2ec', '#1f5fd1', '#f0a215'];
      for (let k = 0; k < 6; k++) s.box([5, 14, 0.4], [-38 + k * 15, ROOF - 9, 32.4], s.material(bannerColours[k % bannerColours.length]));
    } else {
      s.box([60, ROOF, 60], [0, ROOF / 2, 0], concrete);
    }
    s.cylinder(21, 22, 2, [0, ROOF + 1.4, 0], concrete, 40);

    // ----- shaft, in barrel sections -----
    const shaftMap = canvasTexture(64, 64, (c) => {
      c.fillStyle = '#c8c5bd'; c.fillRect(0, 0, 64, 64);
      c.fillStyle = '#9d9a92'; c.fillRect(0, 0, 64, 4);
      c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(0, 30, 64, 2);
    });
    shaftMap.repeat.set(3, 46);
    s.cylinder(4.4, 4.8, TURRET - ROOF, [0, ROOF + (TURRET - ROOF) / 2, 0], s.material('#ffffff', { map: shaftMap, roughness: 0.6, metalness: 0.2 }), 20);

    // ----- the cable net: two families of straight cables twisting into a waist -----
    const cables: THREE.BufferGeometry[] = [];
    const n = 20, baseR = 18, topR = 7;
    const ends: { a: P3; b: P3 }[] = [];
    for (const dir of [-1, 1]) for (let k = 0; k < n; k++) {
      const t0 = (k / n) * Math.PI * 2, t1 = t0 + dir * 1.05;
      const A: P3 = [Math.cos(t0) * baseR, ROOF + 2.4, Math.sin(t0) * baseR];
      const B: P3 = [Math.cos(t1) * topR, TURRET - 1, Math.sin(t1) * topR];
      cables.push(beam(A, B, 0.3));
      ends.push({ a: A, b: B });
    }
    s.mesh(mergeGeometries(cables), steel);
    s.ring(topR, 0.9, [0, TURRET - 1, 0], steel).rotation.x = Math.PI / 2;
    // Christmas lights strung down the cables.
    if (a.era === 'christmas') {
      const bulbs: { at: P3; size: number; color: string }[] = [];
      const colours = ['#ff3b3b', '#3bff6a', '#ffd84a', '#4aa8ff', '#ff7ae0'];
      ends.forEach(({ a: A, b: B }, k) => {
        for (let i = 1; i < 26; i++) { const t = i / 26; bulbs.push({ at: [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t], size: 1, color: colours[(k + i) % colours.length] }); }
      });
      const bulbMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
      const mesh = s.scatter(new THREE.SphereGeometry(1.3, 6, 4), bulbMat, bulbs);
      // Instance colours drive the emissive through the colour; keep shadows off the bulbs.
      mesh.castShadow = false;
    }

    // ----- the turret: cone underside, window rings between gold bands, roof -----
    const T = TURRET;
    s.lathe([[3.6, 0], [9, 3], [14, 6.5], [16.2, 8.4], [0, 8.4]], gold(0), [0, T, 0]);
    const windowMap = canvasTexture(256, 32, (c) => {
      c.fillStyle = '#3a4650'; c.fillRect(0, 0, 256, 32);
      for (let i = 0; i < 16; i++) { c.fillStyle = '#7a8c98'; c.fillRect(i * 16 + 1, 2, 13, 26); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(i * 16 + 2, 3, 4, 10); }
    });
    windowMap.repeat.set(5, 1);
    const windowGlow = canvasTexture(256, 32, (c) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, 256, 32);
      for (let i = 0; i < 16; i++) { c.fillStyle = random() < 0.85 ? '#ffd394' : '#5a4630'; c.fillRect(i * 16 + 1, 2, 13, 26); }
    });
    windowGlow.repeat.set(5, 1);
    const windows = new THREE.MeshStandardMaterial({ map: windowMap, emissive: '#ffd394', emissiveMap: windowGlow, emissiveIntensity: mix(0.05, 1.4, night), roughness: 0.15, metalness: 0.3 });
    const bands: [number, number, number][] = [[8.4, 4.2, 16.4], [13.6, 4, 16.8], [18.6, 3.8, 16.4], [23.4, 3, 15.4]];
    bands.forEach(([y, h, r], k) => {
      s.cylinder(r, r, h, [0, T + y + h / 2, 0], windows, 40);
      s.cylinder(r + 0.9, r + 0.9, 1.1, [0, T + y + h + 0.55, 0], gold(k + 1), 40);
    });
    s.lathe([[15.6, 0], [15.8, 1], [12, 2.6], [8, 3.4], [0, 3.6]], gold(5), [0, T + 27.6, 0]);
    // The name band of today's tower.
    if (a.era === 'eye') {
      const name = canvasTexture(1024, 64, (c) => {
        c.fillStyle = '#1b2a55'; c.fillRect(0, 0, 1024, 64);
        c.fillStyle = '#ffffff'; c.font = 'bold 44px sans-serif'; c.textBaseline = 'middle';
        for (let k = 0; k < 2; k++) c.fillText('SYDNEY TOWER EYE', 40 + k * 512, 34);
      }, false);
      s.cylinder(16.6, 16.6, 2.6, [0, T + 7.2, 0], new THREE.MeshStandardMaterial({ map: name, emissive: '#ffffff', emissiveMap: name, emissiveIntensity: mix(0.1, 0.8, night), roughness: 0.5 }), 40);
    }

    // ----- spire and aerials -----
    const spireTop = 309;
    s.cylinder(1.6, 3.2, 14, [0, T + 31 + 7, 0], steel, 12);
    s.cylinder(0.45, 1.4, spireTop - (T + 45), [0, (spireTop + T + 45) / 2, 0], steel, 10);
    for (let k = 0; k < 4; k++) s.cylinder(2.4 - k * 0.4, 2.4 - k * 0.4, 0.6, [0, T + 48 + k * 6, 0], steel, 12);
    const beacon = new THREE.MeshStandardMaterial({ color: '#ff5040', emissive: '#ff3020', emissiveIntensity: mix(0.4, 2.2, night) });
    s.ball([0.9, 0.9, 0.9], [0, spireTop, 0], beacon, 10);
    if (a.era === 'christmas') {
      const star = new THREE.Shape();
      for (let k = 0; k < 10; k++) { const t = k / 10 * Math.PI * 2 + Math.PI / 2, r = k % 2 ? 3.2 : 8; k ? star.lineTo(Math.cos(t) * r, Math.sin(t) * r) : star.moveTo(Math.cos(t) * r, Math.sin(t) * r); }
      const mesh = s.mesh(new THREE.ExtrudeGeometry(star, { depth: 1, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: '#fff2a0', emissive: '#ffd84a', emissiveIntensity: mix(0.6, 1.8, night) }), [0, spireTop - 8, 0]);
      mesh.castShadow = false;
    }

    // ----- maintenance scaffold -----
    if (a.era === 'maintenance') {
      const scaffold = s.material('#8b8f93', { metalness: 0.4 });
      const poles: THREE.BufferGeometry[] = [];
      for (const y of [T + 2, T + 9, T + 16, T + 23, T + 30]) for (let k = 0; k < 24; k++) {
        const t0 = k / 24 * Math.PI * 2, t1 = (k + 1) / 24 * Math.PI * 2, r = 19;
        poles.push(beam([Math.cos(t0) * r, y, Math.sin(t0) * r], [Math.cos(t1) * r, y, Math.sin(t1) * r], 0.35));
      }
      for (let k = 0; k < 24; k++) { const t = k / 24 * Math.PI * 2; poles.push(beam([Math.cos(t) * 19, T + 2, Math.sin(t) * 19], [Math.cos(t) * 19, T + 30, Math.sin(t) * 19], 0.3)); }
      s.mesh(mergeGeometries(poles), scaffold);
      s.box([8, 2.4, 2.4], [6, T - 14, 18], s.material('#f0a215'));
      s.rod([2, T - 12.8, 18], [2, T + 2, 18.5], 0.12, scaffold);
      s.rod([10, T - 12.8, 18], [10, T + 2, 18.5], 0.12, scaffold);
    }

    // ----- the roof -----
    if (a.roof === 'skywalk') {
      const rail: THREE.BufferGeometry[] = [];
      for (let k = 0; k < 40; k++) { const t0 = k / 40 * Math.PI * 2, t1 = (k + 1) / 40 * Math.PI * 2; rail.push(beam([Math.cos(t0) * 15.4, T + 29.4, Math.sin(t0) * 15.4], [Math.cos(t1) * 15.4, T + 29.4, Math.sin(t1) * 15.4], 0.12)); }
      s.mesh(mergeGeometries(rail), steel);
      const people: { at: P3; size: number; color: string }[] = [];
      const start = random() * Math.PI * 2;
      for (let k = 0; k < 10; k++) { const t = start + k * 0.12; people.push({ at: [Math.cos(t) * 14.2, T + 28.6, Math.sin(t) * 14.2], size: 1, color: k === 0 ? '#1b2a55' : '#ee7a12' }); }
      s.scatter(new THREE.CapsuleGeometry(0.4, 1.1, 2, 6), s.material('#ffffff'), people);
    }
    if (a.roof === 'crane') {
      const red = s.material('#c8102e');
      s.box([1.4, 16, 1.4], [8, T + 39, 0], red);
      s.box([22, 1, 1], [12, T + 47, 0], red);
      s.rod([22, T + 47, 0], [22, T + 36, 0], 0.1, steel);
      s.box([2.4, 2, 2.4], [22, T + 35, 0], s.material('#7d7466'));
    }
    if (a.base === 'crowd') {
      const people = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.3, 1.1, 2, 6), s.material('#ffffff'), 260);
      const m = new THREE.Matrix4();
      const clothes = ['#1b2a55', '#34363a', '#c8102e', '#efe3c4', '#7ec3ef', '#f4f2ec', '#2f9e44'];
      for (let i = 0; i < 260; i++) {
        m.makeTranslation(-46 + random() * 92, 0.85, 33 + random() * 7);
        people.setMatrixAt(i, m);
        people.setColorAt(i, new THREE.Color(clothes[Math.floor(random() * clothes.length)]));
      }
      s.root.add(people);
      s.box([100, 0.3, 10], [0, 0.15, 37], concrete);
    }

    // ----- weather -----
    const veils: THREE.Mesh[] = [];
    if (a.weather === 'cloud' || a.weather === 'haze') {
      const puff = canvasTexture(128, 128, (c) => {
        const g = c.createRadialGradient(64, 64, 6, 64, 64, 64);
        g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(0, 0, 128, 128);
      }, false);
      const cloud = a.weather === 'cloud';
      const fog = new THREE.MeshBasicMaterial({ map: puff, transparent: true, opacity: cloud ? 0.95 : 0.4, depthWrite: false, color: cloud ? '#eceff1' : '#f1e6d2' });
      for (let k = 0; k < (cloud ? 18 : 8); k++) {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(60 + random() * 50, cloud ? 22 + random() * 14 : 60), fog);
        mesh.position.set((random() - 0.5) * 50, cloud ? T + 4 + random() * 32 : T - 40 + random() * 80, (random() - 0.2) * 30);
        s.root.add(mesh);
        veils.push(mesh);
      }
    }
    if (a.weather === 'storm') {
      const bolt: P3[] = [];
      let x = 0, y = spireTop + 80;
      while (y > spireTop) { bolt.push([x, y, 0]); x += (random() - 0.5) * 16; y -= 10 + random() * 8; }
      bolt.push([0, spireTop, 0]);
      const flash = new THREE.MeshBasicMaterial({ color: '#eef2ff', transparent: true, opacity: 0.9, depthWrite: false });
      s.tube(bolt, 1.1, flash).castShadow = false;
    }

    const energy = 0.2 + mood.energy;
    return s.finish({
      update: (_dt, time) => {
        beacon.emissiveIntensity = mix(0.4, 2.2, night) * (0.5 + 0.5 * Math.abs(Math.sin(time * 1.2 * energy)));
        for (const [i, v] of veils.entries()) v.position.x += Math.sin(time * 0.1 + i) * 0.02 * energy;
      },
    });
  },
});
