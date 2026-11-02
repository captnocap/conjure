import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, paint, paintHex, score } from '@conjure/kit';

type P = [number, number, number];

function puffMap() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.4)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

/** An alabaster wall: two tiers of round-arched windows, a moulding between, veining and dust. */
function wallMap(wear: number, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 30; i++) { g.strokeStyle = `rgba(150,130,100,${0.05 + random() * 0.08})`; g.lineWidth = 1 + random() * 2; g.beginPath(); g.moveTo(random() * 512, random() * 256); g.bezierCurveTo(random() * 512, random() * 256, random() * 512, random() * 256, random() * 512, random() * 256); g.stroke(); }
  const arch = (x: number, y: number, w: number, h: number) => { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); g.fill(); };
  for (let i = 0; i < 5; i++) {
    const x = 30 + i * 96;
    g.fillStyle = '#3a3e44'; arch(x + 14, 40, 34, 70); arch(x + 14, 150, 34, 80);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x + 8, 112, 46, 6);
  }
  g.fillStyle = 'rgba(120,110,95,0.35)'; g.fillRect(0, 128, 512, 8);
  const grad = g.createLinearGradient(0, 256, 0, 150);
  grad.addColorStop(0, `rgba(110,90,60,${0.2 + wear * 0.4})`); grad.addColorStop(1, 'rgba(110,90,60,0)');
  g.fillStyle = grad; g.fillRect(0, 150, 512, 106);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  return map;
}

/** Citadel masonry: big ashlar courses, darker joints, weather streaks. */
function coursesMap(random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 16; row++) {
    let x = -random() * 30;
    while (x < 256) { const w = 22 + random() * 30; g.fillStyle = `rgba(90,70,40,${0.04 + random() * 0.12})`; g.fillRect(x + 1, row * 16 + 1, w - 2, 14); x += w; }
    g.fillStyle = 'rgba(70,55,35,0.35)'; g.fillRect(0, row * 16, 256, 1.5);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(0.05, 0.08);
  return map;
}

export default defineThing({
  questions: {
    lights: choice('Are the minarets lit?', {
      dark: 'Unlit: pale stone needles against the sky.',
      rings: 'The balcony rings lit, a halo of light at each gallery.',
      ramadan: 'Ramadan: strings of bulbs swag from minaret to minaret and round every dome.',
    }),
    glow: paint('If lights are on, what colour are they?', ['white', 'amber', 'gold', 'green', 'turquoise', 'red', 'blue', 'cream']),
    finials: choice('What crowns the domes and minaret caps?', {
      gilded: 'Gilded brass crescents that catch the sun.',
      lead: 'Plain grey lead crescents, dull as the domes.',
    }),
    view: choice('How is the mosque raised?', {
      ridge: 'High on its rock spur: a cliff of ochre limestone and the battered citadel wall below it.',
      walls: 'Seen from the citadel walls: a crenellated rampart and a paved terrace at its foot.',
    }),
    dust: score('How much dust hangs in the air?', ['Clear blue air', 'A soft haze', 'A khamsin dust storm, the domes half gone']),
    birds: choice('What are the birds doing?', {
      wheeling: 'A flock of pigeons wheeling over the domes.',
      perched: 'Pigeons perched in rows along the dome rims.',
      kites: 'Black kites circling high above the minarets.',
      none: 'No birds.',
    }),
    scaffold: noul('Is one minaret wrapped in scaffolding for repair?'),
    courtyard: choice('What shows in the courtyard behind?', {
      clock: 'The arcaded courtyard with the copper clock tower and the domed fountain.',
      fountain: 'Only the domed ablution fountain in the middle of the arcade.',
      crowd: 'A crowd of worshippers filling the courtyard after prayer.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const dusk = Math.min(1, Math.max(0, lowSun * 1.3 - 0.3));
    const wear = mood.wear;

    const alabaster = s.material(new THREE.Color('#f1ebdf').lerp(new THREE.Color('#b9ab94'), wear * 0.6), { roughness: 0.55 });
    const hallMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#f1ebdf').lerp(new THREE.Color('#b9ab94'), wear * 0.6), map: wallMap(wear, random), roughness: 0.55 });
    const lead = s.material('#8a9299', { metalness: 0.45, roughness: 0.5 });
    const stone = new THREE.MeshStandardMaterial({ color: new THREE.Color('#c2a57a').lerp(new THREE.Color('#8f7d62'), wear * 0.5), map: coursesMap(random), roughness: 0.95 });
    const dark = s.material('#2d2f33', { roughness: 0.7 });
    const gold = a.finials === 'gilded' ? s.material('#d4a537', { metalness: 0.85, roughness: 0.25 }) : lead;
    const lightsOn = a.lights !== 'dark';
    const lightHex = paintHex(a.glow);
    const ringLight = new THREE.MeshStandardMaterial({ color: lightsOn ? lightHex : '#cfc7b6', emissive: lightsOn ? lightHex : '#000000', emissiveIntensity: lightsOn ? mix(1.0, 2.4, dusk) : 0, roughness: 0.5 });

    // The citadel beneath: a battered rampart, on a cliff of rock or with a paved terrace.
    const BASE = a.view === 'ridge' ? 22 : 8;
    const W = 68, D = 108;
    const wallShape = new THREE.Shape();
    wallShape.moveTo(-W / 2 - BASE * 0.25, 0); wallShape.lineTo(W / 2 + BASE * 0.25, 0); wallShape.lineTo(W / 2, BASE); wallShape.lineTo(-W / 2, BASE); wallShape.closePath();
    const rampart = s.mesh(new THREE.ExtrudeGeometry(wallShape, { depth: D, bevelEnabled: false }), stone, [0, 0, -D / 2 - 22]);
    void rampart;
    s.box([W, 0.4, D], [0, BASE + 0.2, -22], s.material('#cfc6b4', { roughness: 0.9 }));
    // Crenellations along the front edge.
    s.scatter(new THREE.BoxGeometry(1, 1, 1), stone, Array.from({ length: 24 }, (_u, i) => ({ at: [-W / 2 + 2 + i * (W - 4) / 23, BASE + 1.4, D / 2 - 22.5] as P, size: 1.8 })));
    s.box([W, 1.2, 1.2], [0, BASE + 0.6, D / 2 - 22.5], stone);
    if (a.view === 'ridge') {
      const rock = s.material(new THREE.Color('#b8945e').lerp(new THREE.Color('#8a7555'), wear * 0.4), { roughness: 1 });
      s.scatter(new THREE.DodecahedronGeometry(1, 0), rock, Array.from({ length: 40 }, (_u, i) => ({ at: [-W / 2 - 6 + (i / 39) * (W + 12) + (random() - 0.5) * 4, -2 + random() * 5, D / 2 - 18 + random() * 9] as P, size: 4 + random() * 5 })));
      s.box([W + 20, 4, 16], [0, -1, D / 2 - 14], rock);
    }
    const Y = BASE + 0.4;

    // The prayer hall: a square block with arched windows.
    const H = 20, S = 41;
    s.box([S, H, S], [0, Y + H / 2, 0], hallMat);
    s.box([S + 1.2, 1.2, S + 1.2], [0, Y + H + 0.6, 0], alabaster);
    // Corner turrets on the hall and the small corner domes.
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      s.cylinder(4.6, 4.6, 3, [x * 14.5, Y + H + 2.7, z * 14.5], alabaster, 16);
      s.surface((u, v, t) => { const th = u * Math.PI * 2, ph = v * Math.PI / 2; t.set(Math.cos(th) * Math.cos(ph) * 4.8, Math.sin(ph) * 4.6, Math.sin(th) * Math.cos(ph) * 4.8); }, lead, { segments: [20, 8], wrap: true, at: [x * 14.5, Y + H + 4.2, z * 14.5] });
      s.rod([x * 14.5, Y + H + 8.8, z * 14.5], [x * 14.5, Y + H + 10.4, z * 14.5], 0.15, gold);
    }
    // Four half-domes stepping down from the central dome.
    const R = 8.4, halfY = Y + H + 4;
    for (let k = 0; k < 4; k++) {
      const angle = (k * Math.PI) / 2;
      const cx = Math.sin(angle) * 10.2, cz = Math.cos(angle) * 10.2;
      s.cylinder(R, R, 4, [cx, halfY - 2, cz], alabaster, 20).scale.set(1, 1, 1);
      const half = s.mesh(new THREE.SphereGeometry(R, 24, 10, 0, Math.PI, 0, Math.PI / 2), lead, [cx, halfY, cz]);
      half.rotation.y = angle - Math.PI / 2 + Math.PI;
      // A small finial at the crown of each half-dome.
      s.rod([cx + Math.sin(angle) * 1.5, halfY + R - 0.4, cz + Math.cos(angle) * 1.5], [cx + Math.sin(angle) * 1.5, halfY + R + 1.4, cz + Math.cos(angle) * 1.5], 0.12, gold);
    }
    // The four tall corner turrets round the central drum.
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      s.cylinder(1.5, 1.7, 13, [x * 9, Y + H + 6.5, z * 9], alabaster, 10);
      s.cylinder(0.2, 1.8, 3.2, [x * 9, Y + H + 14.6, z * 9], lead, 10);
    }
    // The central drum with windows, the great dome and its crescent.
    const drumY = Y + H + 10;
    s.cylinder(10.6, 10.8, 5, [0, drumY + 2.5, 0], alabaster, 32);
    for (let i = 0; i < 20; i++) { const t = (i / 20) * Math.PI * 2; s.box([1.2, 2.6, 0.3], [Math.sin(t) * 10.75, drumY + 2.5, Math.cos(t) * 10.75], s.material('#33373c', { emissive: '#ffcf7a', emissiveIntensity: mix(0, 0.8, dusk) })).rotation.y = t; }
    s.ring(10.8, 0.4, [0, drumY + 5, 0], alabaster).rotation.x = Math.PI / 2;
    const domeH = 15;
    s.surface((u, v, t) => { const th = u * Math.PI * 2, ph = v * Math.PI / 2; t.set(Math.cos(th) * Math.cos(ph) * 10.7, Math.sin(ph) * domeH, Math.sin(th) * Math.cos(ph) * 10.7); }, lead, { segments: [40, 14], wrap: true, at: [0, drumY + 5, 0] });
    const crown = drumY + 5 + domeH;
    s.lathe([[0, 0], [0.8, 0.2], [0.5, 1.2], [0.7, 2], [0.2, 3.2], [0, 3.4]], gold, [0, crown - 0.3, 0]);
    const crescent = s.ring(1.4, 0.28, [0, crown + 4.6, 0], gold, Math.PI * 1.45);
    crescent.rotation.z = Math.PI * 0.27 + Math.PI / 2;

    // The courtyard behind: arcades of little domes, the fountain, the clock tower.
    const CZ = -S / 2 - 26, CS = 52;
    const arcadeDomes: P[] = [];
    for (let i = 0; i < 9; i++) {
      const t = -CS / 2 + 3 + i * (CS - 6) / 8;
      arcadeDomes.push([t, 0, CZ - CS / 2 + 3], [-CS / 2 + 3, 0, CZ + t], [CS / 2 - 3, 0, CZ + t]);
    }
    s.box([CS, 0.3, CS], [0, Y + 0.15, CZ], s.material('#e6dccb', { roughness: 0.8 }));
    for (const [x, z, len, rot] of [[0, CZ - CS / 2 + 3, CS, 0], [-CS / 2 + 3, CZ, CS, 1], [CS / 2 - 3, CZ, CS, 1]] as [number, number, number, number][])
      s.box(rot ? [6, 7, len] : [len, 7, 6], [x, Y + 3.5, z], hallMat);
    const domeGeo = new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    s.scatter(domeGeo, lead, arcadeDomes.map(([x, , z]) => ({ at: [x, Y + 7, z] as P, size: 2.6 })));
    s.cylinder(5, 5, 4, [0, Y + 2, CZ], alabaster, 8);
    s.surface((u, v, t) => { const th = u * Math.PI * 2, ph = v * Math.PI / 2; t.set(Math.cos(th) * Math.cos(ph) * 6, Math.sin(ph) * 3.6, Math.sin(th) * Math.cos(ph) * 6); }, lead, { segments: [16, 6], wrap: true, at: [0, Y + 4, CZ] });
    if (a.courtyard === 'clock') {
      const copper = s.material('#7fa08a', { metalness: 0.4, roughness: 0.5 });
      s.box([4, 14, 4], [0, Y + 14, CZ - CS / 2 + 3], copper);
      s.cylinder(0.2, 2.6, 4, [0, Y + 23, CZ - CS / 2 + 3], copper, 8);
      s.cylinder(1.3, 1.3, 0.2, [0, Y + 17, CZ - CS / 2 + 5.05], s.material('#f2ead6'), 20).rotation.x = Math.PI / 2;
    }
    if (a.courtyard === 'crowd') {
      const robes = ['#efece4', '#3a3a3e', '#7a6a58', '#c9c2b2', '#4a5a6a'];
      s.scatter(new THREE.CapsuleGeometry(0.25, 1.1, 2, 6), s.material('#ffffff', { roughness: 0.9 }), Array.from({ length: 220 }, () => ({ at: [(random() - 0.5) * (CS - 14), Y + 1.0, CZ + (random() - 0.5) * (CS - 14)] as P, size: 1, color: robes[Math.floor(random() * robes.length)] })));
    }

    // The two pencil minarets at the courtyard corners of the hall.
    const minaretTops: THREE.Vector3[] = [];
    const balconyY: number[] = [];
    for (const x of [-1, 1]) {
      const mx = x * (S / 2 + 0.5), mz = -S / 2 - 0.5;
      s.box([5, H + 3, 5], [mx, Y + (H + 3) / 2, mz], alabaster);
      s.cylinder(1.7, 2.0, 3, [mx, Y + H + 4.5, mz], alabaster, 12);
      const shaftTop = Y + 70;
      s.cylinder(1.45, 1.7, shaftTop - (Y + H + 6), [mx, (shaftTop + Y + H + 6) / 2, mz], alabaster, 14);
      for (const by of [Y + 50, Y + 62]) {
        s.cylinder(2.7, 1.5, 1.6, [mx, by - 0.8, mz], alabaster, 16);
        s.cylinder(2.7, 2.7, 0.4, [mx, by + 0.2, mz], alabaster, 16);
        s.mesh(new THREE.TorusGeometry(2.75, 0.4, 6, 28), ringLight, [mx, by + 1.2, mz]).rotation.x = Math.PI / 2;
        s.cylinder(2.68, 2.68, 1.1, [mx, by + 0.75, mz], s.material('#b9b2a2', { transparent: true, opacity: 0.35, depthWrite: false }), 16);
        balconyY.push(by);
      }
      s.cylinder(1.2, 1.4, 2.4, [mx, shaftTop + 1.2, mz], alabaster, 14);
      s.cylinder(0.05, 1.75, 11, [mx, shaftTop + 2.4 + 5.5, mz], lead, 14);
      s.rod([mx, shaftTop + 13.4, mz], [mx, shaftTop + 15.4, mz], 0.12, gold);
      const c = s.ring(0.6, 0.12, [mx, shaftTop + 16.1, mz], gold, Math.PI * 1.45);
      c.rotation.z = Math.PI * 0.27 + Math.PI / 2;
      minaretTops.push(new THREE.Vector3(mx, shaftTop + 2, mz));
      if (a.scaffold && x === 1) {
        const pipe = s.material('#7b7f84', { metalness: 0.5 });
        const tubes: { at: P; size: P }[] = [];
        for (const dx of [-2.4, 2.4]) for (const dz of [-2.4, 2.4]) tubes.push({ at: [mx + dx, Y + H + 18, mz + dz], size: [0.18, 30, 0.18] });
        for (let yy = Y + H + 4; yy < Y + H + 33; yy += 2.2) { tubes.push({ at: [mx, yy, mz + 2.4], size: [4.8, 0.14, 0.14] }, { at: [mx, yy, mz - 2.4], size: [4.8, 0.14, 0.14] }, { at: [mx + 2.4, yy, mz], size: [0.14, 0.14, 4.8] }, { at: [mx - 2.4, yy, mz], size: [0.14, 0.14, 4.8] }); }
        const grid = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), pipe, tubes.length);
        const m = new THREE.Matrix4();
        tubes.forEach(({ at, size }, i) => { m.makeScale(...size).setPosition(...at); grid.setMatrixAt(i, m); });
        grid.castShadow = true;
        s.root.add(grid);
      }
    }

    // Ramadan bulbs: swags between the minarets, round the dome and the half-domes.
    if (a.lights === 'ramadan') {
      const pts: P[] = [];
      const swag = (from: THREE.Vector3, to: THREE.Vector3, sag: number, n: number) => {
        for (let i = 0; i <= n; i++) { const t = i / n; const p = from.clone().lerp(to, t); p.y -= Math.sin(t * Math.PI) * sag; pts.push([p.x, p.y, p.z]); }
      };
      const domeTop = new THREE.Vector3(0, crown + 2, 0);
      swag(minaretTops[0], minaretTops[1], 10, 40);
      for (const top of minaretTops) swag(top, domeTop, 6, 24);
      for (const corner of [[-1, 1], [1, 1]]) swag(domeTop, new THREE.Vector3(corner[0] * (S / 2), Y + H + 1, corner[1] * (S / 2)), 4, 24);
      for (let i = 0; i < 48; i++) { const t = (i / 48) * Math.PI * 2; pts.push([Math.sin(t) * 11.1, drumY + 5.3, Math.cos(t) * 11.1]); }
      for (const by of balconyY) for (let i = 0; i < 0; i++) void by;
      s.scatter(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: lightHex, emissive: lightHex, emissiveIntensity: mix(1.0, 2.2, dusk) }), pts.map((at) => ({ at, size: 0.7 })));
    }

    // Birds.
    if (a.birds !== 'none') {
      const bird = s.material(a.birds === 'kites' ? '#2a2420' : '#5f6168', { side: THREE.DoubleSide });
      const flock: P[] = [];
      if (a.birds === 'perched') {
        for (let i = 0; i < 40; i++) { const t = random() * Math.PI * 2; flock.push([Math.sin(t) * 11, drumY + 5.6, Math.cos(t) * 11]); }
        for (let i = 0; i < 24; i++) flock.push([(random() - 0.5) * S, Y + H + 1.6, S / 2 + 0.2]);
        s.scatter(new THREE.SphereGeometry(1, 6, 4), bird, flock.map((at) => ({ at, size: 0.35 })));
      } else {
        const n = a.birds === 'kites' ? 7 : 40;
        for (let i = 0; i < n; i++) {
          const t = random() * Math.PI * 2, r = (a.birds === 'kites' ? 20 : 8) + random() * 18;
          const x = Math.sin(t) * r, z = Math.cos(t) * r + 6, y = (a.birds === 'kites' ? Y + 85 : crown + 2) + random() * 14;
          const span = a.birds === 'kites' ? 2.4 : 0.9;
          for (const side of [-1, 1]) { const w = s.box([span, 0.08, span * 0.3], [x + side * span * 0.45, y + span * 0.1, z], bird); w.rotation.z = side * 0.35; w.castShadow = false; }
        }
      }
    }

    // Dust: ochre veils drifting across the domes and minarets.
    const dust = Math.min(1, a.dust + wear * 0.25);
    if (dust > 0.08) {
      const puff = puffMap();
      const veilMat = new THREE.MeshBasicMaterial({ map: puff, color: '#d9b787', transparent: true, opacity: Math.min(0.55, 0.12 + dust * 0.45), depthWrite: false, side: THREE.DoubleSide });
      for (let i = 0; i < Math.round(5 + dust * 14); i++) {
        const w = 40 + random() * 40;
        s.mesh(new THREE.PlaneGeometry(w, w * 0.45), veilMat, [(random() - 0.5) * 80, Y + 10 + random() * (50 + dust * 20), 15 + random() * 25]).castShadow = false;
      }
    }

    return s.finish();
  },
});
