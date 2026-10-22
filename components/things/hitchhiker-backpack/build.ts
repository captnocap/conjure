import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { grime, painted, scrawl } from './paint';

type P = [number, number, number];
const CITIES = ['DENVER', 'TULSA', 'RENO', 'EL PASO', 'FARGO', 'MEMPHIS', 'BOISE'];
const JOKES = [['NOT A', 'SERIAL', 'KILLER'], ['MOM', 'SAYS HI'], ['FREE', 'COOKIES'], ['WILL TELL', 'JOKES']];

export default defineThing({
  questions: {
    sign: choice('What does the cardboard sign say?', {
      city: 'The name of a city, a real destination a day or two away.',
      anywhere: 'ANYWHERE.',
      home: 'HOME.',
      west: 'WEST, with an arrow.',
      joke: 'A joke to disarm drivers.',
      help: 'ANYTHING HELPS, GOD BLESS.',
      blank: 'Nothing yet: blank cardboard and an uncapped marker.',
    }),
    pack: choice('What kind of pack is it?', {
      frame: 'A 1970s external-frame backpack, aluminium tubes and bright nylon.',
      duffel: 'An olive military duffel standing on end with a name stencilled on it.',
      school: 'A small school bag, too little for the road.',
      guitar: 'A soft rucksack with a battered guitar case leaning on it.',
      binbag: 'No pack at all: a knotted black bin bag and a grocery sack.',
    }),
    colour: choice('What colour is the pack?', {
      orange: 'Sun-bleached orange.',
      olive: 'Army olive.',
      navy: 'Navy blue.',
      red: 'Red.',
      purple: 'Faded purple.',
      tan: 'Canvas tan.',
    }),
    company: choice('What else is with it?', {
      nothing: 'Nothing.',
      boots: 'A pair of worn boots, unlaced, airing.',
      dog: 'A dog\'s leash and a steel water bowl.',
      coffee: 'A paper coffee cup.',
      paperback: 'A swollen paperback, face down to keep the place.',
      bedroll: 'A sleeping bag unrolled along the kerb.',
    }),
    waiting: score('How long does it seem to have been waiting?', ['Set down a minute ago', 'An hour or two', 'All day, cigarette ends gathering', 'Days: leaves and litter drifted against it']),
    owner: choice('Where is its owner?', {
      away: 'Clearly just stepped away: a jacket draped over it and a hat on top.',
      undisturbed: 'Unknown: everything is zipped and tidy and still.',
      rifled: 'Gone for good, and somebody has been through it: flap open, clothes pulled out.',
      tagged: 'Long gone: an official notice has been tied to it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear, wait = a.waiting;
    const tint = { orange: '#e0762a', olive: '#5d6a3a', navy: '#27406e', red: '#b9302a', purple: '#7a5a96', tan: '#b59a6c' }[a.colour];
    const cloth = s.material(tint, { roughness: 0.9 });
    const clothDark = s.material(new THREE.Color(tint).multiplyScalar(0.62), { roughness: 0.95 });
    const strap = s.material('#2b2c2a', { roughness: 0.9 });
    const alu = s.material('#c3c7c8', { metalness: 0.8, roughness: 0.35 });
    const tin = s.material('#aeb4b5', { metalness: 0.85, roughness: 0.4 });
    const foam = s.material('#4f8fc2', { roughness: 0.95 });
    const concrete = s.material('#b3afa3', { roughness: 0.95 });
    const K = 0.15;

    // Kerb and a strip of gutter.
    s.box([1.9, K, 0.62], [0, K / 2, -0.12], concrete);
    s.box([1.9, 0.02, 0.5], [0, 0.01, 0.44], s.material('#6d6c68', { roughness: 0.95 }));
    s.box([1.9, 0.006, 0.05], [0, K + 0.002, 0.165], s.material(mood.cheer > 0.5 ? '#e3b414' : '#b8b2a2', { roughness: 0.8 }));

    const pack = new THREE.Group();
    pack.position.set(-0.1, K, -0.12);
    s.root.add(pack);
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P, parent: THREE.Object3D = pack) => { const m = new THREE.Mesh(geometry, material); m.position.set(...at); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
    const rodIn = (from: P, to: P, r: number, material: THREE.Material, parent: THREE.Object3D = pack) => {
      const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to), d = B.clone().sub(A);
      const m = add(new THREE.CylinderGeometry(r, r, d.length(), 8), material, A.clone().add(B).multiplyScalar(0.5).toArray() as P, parent);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
    };
    const roll = (r: number, len: number, material: THREE.Material, at: P, bands = true) => {
      const m = add(new THREE.CylinderGeometry(r, r, len, 16), material, at); m.rotation.z = Math.PI / 2;
      if (bands) for (const x of [-1, 1]) { const ring = add(new THREE.TorusGeometry(r + 0.004, 0.008, 5, 16), strap, [at[0] + x * len * 0.28, at[1], at[2]]); ring.rotation.y = Math.PI / 2; }
      for (const x of [-1, 1]) { const end = add(new THREE.TorusGeometry(r * 0.5, r * 0.18, 5, 14), material, [at[0] + x * len * 0.5, at[1], at[2]]); end.rotation.y = Math.PI / 2; }
      return m;
    };

    let front = 0.14, topY = 0.9, mugAt: P = [0.24, 0.62, 0.02], signLean: P = [0.12, 0, 0.3], halfW = 0.22;
    if (a.pack === 'frame') {
      for (const x of [-1, 1]) { rodIn([x * 0.18, 0.0, -0.13], [x * 0.18, 1.05, -0.15], 0.013, alu); rodIn([x * 0.18, 0.0, -0.13], [x * 0.18, 0.02, 0.06], 0.013, alu); }
      for (const y of [0.12, 0.5, 0.85, 1.05]) rodIn([-0.18, y, -0.14], [0.18, y, -0.14], 0.011, alu);
      add(new THREE.BoxGeometry(0.38, 0.52, 0.22), cloth, [0, 0.62, 0]);
      add(new THREE.SphereGeometry(1, 14, 8), cloth, [0, 0.88, 0]).scale.set(0.2, 0.09, 0.125);
      add(new THREE.BoxGeometry(0.4, 0.06, 0.25), clothDark, [0, 0.86, 0.005]);
      for (const x of [-1, 1]) add(new THREE.BoxGeometry(0.075, 0.26, 0.15), clothDark, [x * 0.225, 0.56, 0.0]);
      add(new THREE.BoxGeometry(0.26, 0.2, 0.06), clothDark, [0, 0.54, 0.135]);
      for (const x of [-0.08, 0.08]) add(new THREE.BoxGeometry(0.025, 0.5, 0.01), strap, [x, 0.64, 0.116]);
      roll(0.125, 0.44, s.material(a.colour === 'olive' ? '#b9302a' : '#3e5a3a', { roughness: 0.95 }), [0, 0.2, 0.0]);
      roll(0.085, 0.52, foam, [0, 1.02, -0.04]);
      topY = 1.11; front = 0.17; mugAt = [0.27, 0.72, 0.03]; halfW = 0.27;
      pack.rotation.x = -0.1;
    } else if (a.pack === 'duffel') {
      const olive = a.colour === 'olive' ? cloth : cloth;
      add(new THREE.CapsuleGeometry(0.17, 0.62, 6, 16), olive, [0, 0.47, 0]);
      add(new THREE.CylinderGeometry(0.05, 0.12, 0.12, 10), clothDark, [0, 0.98, 0]);
      add(new THREE.TorusGeometry(0.04, 0.008, 5, 10), alu, [0, 1.05, 0]);
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.1, 0.93, 0.04), new THREE.Vector3(0.27, 0.62, 0.03), new THREE.Vector3(0.25, 0.3, 0.03), new THREE.Vector3(0.14, 0.1, 0.04)]), 16, 0.018, 6), strap, [0, 0, 0]);
      const stencil = painted(0.24, 0.2, (ctx, w, h) => { ctx.font = `bold ${h * 0.34}px monospace`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(20,20,18,0.85)'; ctx.fillText(['MILLER J', 'ORTIZ R', 'KOWALSKI', 'NGUYEN T'][Math.floor(random() * 4)], w / 2, h * 0.4, w * 0.95); ctx.fillText('US ' + (1000 + Math.floor(random() * 8999)), w / 2, h * 0.82, w * 0.9); }, { px: 192 });
      stencil.position.set(0, 0.55, 0.176); pack.add(stencil);
      roll(0.08, 0.46, foam, [0, 0.085, 0.27]);
      topY = 1.07; front = 0.2; mugAt = [-0.19, 0.78, 0.04]; halfW = 0.2;
      pack.rotation.x = -0.12; pack.rotation.z = 0.05;
    } else if (a.pack === 'school') {
      add(new THREE.BoxGeometry(0.3, 0.3, 0.16), cloth, [0, 0.15, 0]);
      const top = add(new THREE.CylinderGeometry(0.15, 0.15, 0.16, 16, 1, false, 0, Math.PI), cloth, [0, 0.3, 0]); top.rotation.set(Math.PI / 2, Math.PI / 2, 0);
      add(new THREE.BoxGeometry(0.22, 0.17, 0.05), clothDark, [0, 0.13, 0.095]);
      add(new THREE.BoxGeometry(0.2, 0.012, 0.01), alu, [0, 0.2, 0.123]);
      add(new THREE.TorusGeometry(0.035, 0.008, 5, 12, Math.PI), strap, [0, 0.45, 0]);
      for (const x of [-1, 1]) add(new THREE.BoxGeometry(0.035, 0.36, 0.015), strap, [x * 0.09, 0.2, -0.088]);
      add(new THREE.SphereGeometry(0.028, 8, 6), s.material(['#f2c81c', '#e24a8a', '#3fc4d6'][Math.floor(random() * 3)]), [0.13, 0.17, 0.1]);
      const blanket = add(new THREE.CylinderGeometry(0.07, 0.07, 0.34, 14), s.material('#c9b08a', { roughness: 1 }), [0, 0.07, 0.2]); blanket.rotation.z = Math.PI / 2;
      topY = 0.46; front = 0.14; mugAt = [-0.17, 0.3, 0.05]; halfW = 0.17; signLean = [0.42, 0, 0.12];
      pack.rotation.x = -0.06;
    } else if (a.pack === 'guitar') {
      add(new THREE.SphereGeometry(1, 16, 12), cloth, [-0.12, 0.27, 0]).scale.set(0.2, 0.28, 0.15);
      add(new THREE.SphereGeometry(1, 12, 8), clothDark, [-0.12, 0.2, 0.12]).scale.set(0.13, 0.12, 0.06);
      add(new THREE.BoxGeometry(0.3, 0.05, 0.2), clothDark, [-0.12, 0.5, 0.0]).rotation.x = 0.1;
      roll(0.075, 0.44, foam, [-0.12, 0.6, -0.02]);
      // Guitar case: an extruded outline, standing on its tail and leaning.
      const outline = new THREE.Shape();
      outline.moveTo(-0.19, 0); outline.bezierCurveTo(-0.25, 0.02, -0.25, 0.3, -0.16, 0.34); outline.bezierCurveTo(-0.12, 0.38, -0.12, 0.42, -0.14, 0.46);
      outline.bezierCurveTo(-0.2, 0.52, -0.16, 0.66, -0.07, 0.68); outline.lineTo(-0.06, 1.0); outline.lineTo(-0.08, 1.14); outline.lineTo(0.08, 1.14); outline.lineTo(0.06, 1.0); outline.lineTo(0.07, 0.68);
      outline.bezierCurveTo(0.16, 0.66, 0.2, 0.52, 0.14, 0.46); outline.bezierCurveTo(0.12, 0.42, 0.12, 0.38, 0.16, 0.34); outline.bezierCurveTo(0.25, 0.3, 0.25, 0.02, 0.19, 0); outline.closePath();
      const caseGeo = new THREE.ExtrudeGeometry(outline, { depth: 0.12, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 8 });
      const guitar = new THREE.Group(); guitar.position.set(0.24, 0, -0.1); guitar.rotation.set(-0.16, -0.25, -0.12);
      add(caseGeo, s.material('#1c1b1a', { roughness: 0.6 }), [0, 0, -0.06], guitar);
      for (const [x, y] of [[0.235, 0.2], [0.17, 0.52], [0.075, 0.9]]) add(new THREE.BoxGeometry(0.02, 0.05, 0.03), alu, [x, y, 0.01], guitar);
      add(new THREE.TorusGeometry(0.06, 0.012, 5, 12, Math.PI), strap, [0.25, 0.36, 0], guitar).rotation.z = -Math.PI / 2;
      const hues = ['#e24a3a', '#f2c81c', '#3fa9d6', '#f2f2ee', '#58b368'];
      for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(0.05 + random() * 0.06, 0.04 + random() * 0.04, 0.004), s.material(hues[i % 5]), [(random() - 0.5) * 0.26, 0.06 + random() * 0.56, 0.076], guitar).rotation.z = random() * 2;
      pack.add(guitar);
      topY = 0.68; front = 0.18; mugAt = [-0.33, 0.36, 0.05]; halfW = 0.34; signLean = [-0.12, 0, 0.3];
    } else {
      const bag = s.material('#1b1c1e', { roughness: 0.35 });
      add(new THREE.SphereGeometry(1, 12, 9), bag, [0, 0.24, 0]).scale.set(0.3, 0.26, 0.25);
      for (let i = 0; i < 6; i++) add(new THREE.SphereGeometry(1, 8, 6), bag, [(random() - 0.5) * 0.36, 0.14 + random() * 0.22, (random() - 0.5) * 0.3]).scale.setScalar(0.11 + random() * 0.07);
      add(new THREE.ConeGeometry(0.07, 0.16, 7), bag, [0, 0.55, 0]).rotation.x = Math.PI;
      add(new THREE.SphereGeometry(1, 10, 8), s.material('#f1efe8', { roughness: 0.4, transparent: true, opacity: 0.9 }), [0.38, 0.14, 0.08]).scale.set(0.16, 0.15, 0.13);
      for (const x of [-1, 1]) add(new THREE.TorusGeometry(0.05, 0.006, 4, 10), s.material('#f1efe8'), [0.38 + x * 0.04, 0.3, 0.08]);
      roll(0.08, 0.46, foam, [-0.42, 0.085, 0.02]);
      topY = 0.6; front = 0.25; mugAt = [0.2, 0.05, 0.3]; halfW = 0.3;
    }

    // Tin mug, dangling on a cord (or sitting, for the bin bag).
    const mug = new THREE.Group();
    mug.position.set(...mugAt);
    const dangling = a.pack !== 'binbag';
    const cupY = dangling ? -0.16 : 0;
    add(new THREE.CylinderGeometry(0.045, 0.04, 0.08, 14, 1, true), s.material('#aeb4b5', { metalness: 0.85, roughness: 0.4, side: THREE.DoubleSide }), [0, cupY, 0], mug);
    add(new THREE.CylinderGeometry(0.04, 0.04, 0.006, 14), tin, [0, cupY - 0.037, 0], mug);
    add(new THREE.TorusGeometry(0.03, 0.007, 5, 12), tin, [0.055, cupY, 0], mug);
    add(new THREE.TorusGeometry(0.046, 0.004, 4, 14), s.material('#2a4a8a'), [0, cupY + 0.04, 0], mug).rotation.x = Math.PI / 2;
    if (dangling) { rodIn([0, 0, 0], [0.05, cupY + 0.03, 0], 0.003, strap, mug); add(new THREE.TorusGeometry(0.014, 0.004, 4, 8), alu, [0, 0, 0], mug); }
    pack.add(mug);

    // The owner's traces.
    if (a.owner === 'away') {
      const jacket = s.material(a.colour === 'navy' ? '#7a4a2a' : '#34455c', { roughness: 0.95, side: THREE.DoubleSide });
      const drape = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
      add(drape, jacket, [0.02, topY - 0.16, 0.0]).scale.set(halfW + 0.05, 0.2, 0.2);
      const sleeve = rodIn([halfW, topY - 0.14, 0.05], [halfW + 0.08, topY - 0.52, 0.12], 0.045, jacket);
      void sleeve;
      // A hat on top.
      add(new THREE.CylinderGeometry(0.17, 0.18, 0.012, 18), s.material('#8a6f4a', { roughness: 0.9 }), [0.03, topY + 0.045, 0.0]).rotation.z = 0.08;
      add(new THREE.CylinderGeometry(0.085, 0.095, 0.09, 16), s.material('#8a6f4a', { roughness: 0.9 }), [0.03, topY + 0.09, 0.0]).rotation.z = 0.08;
      add(new THREE.CylinderGeometry(0.097, 0.097, 0.02, 16), strap, [0.03, topY + 0.06, 0.0]).rotation.z = 0.08;
    } else if (a.owner === 'rifled') {
      const hues = ['#d9d4c4', '#7a8fa8', '#b9302a', '#3e5a3a', '#e7c9a0'];
      for (let i = 0; i < 6; i++) {
        const rag = s.ball([0.12 + random() * 0.1, 0.025 + random() * 0.02, 0.09 + random() * 0.07], [0.25 + random() * 0.6, (i < 2 ? 0.02 : K) + 0.03, i < 2 ? 0.3 + random() * 0.25 : -0.3 + random() * 0.35], s.material(hues[i % 5], { roughness: 1 }), 8);
        rag.rotation.y = random() * 3;
      }
      const flap = add(new THREE.BoxGeometry(halfW * 1.5, 0.02, 0.2), clothDark, [0, topY + 0.02, -0.12]); flap.rotation.x = -1.1;
      const sock = s.tube([[0.5, K + 0.03, 0.1], [0.6, K + 0.03, 0.12], [0.66, K + 0.03, 0.2]], 0.03, s.material('#e9e4d4', { roughness: 1 }));
      void sock;
    } else if (a.owner === 'tagged') {
      const tag = painted(0.2, 0.28, (ctx, w, h) => { ctx.fillStyle = '#f26a1b'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#16181a'; ctx.font = `bold ${h * 0.14}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('NOTICE', w / 2, h * 0.2); ctx.font = `bold ${h * 0.085}px sans-serif`; ctx.fillText('UNATTENDED', w / 2, h * 0.4); ctx.fillText('PROPERTY', w / 2, h * 0.52); ctx.fillText('REMOVE BY', w / 2, h * 0.7); ctx.fillRect(w * 0.15, h * 0.84, w * 0.7, h * 0.02); ctx.fillStyle = '#f5f5f0'; ctx.beginPath(); ctx.arc(w / 2, h * 0.05, w * 0.05, 0, 7); ctx.fill(); }, { px: 192 });
      tag.position.set(a.pack === 'guitar' ? -0.12 : 0.06, Math.min(topY - 0.14, 0.72), front + 0.012); tag.rotation.z = -0.15; pack.add(tag);
    }

    // The sign.
    const lines = a.sign === 'city' ? [CITIES[Math.floor(random() * CITIES.length)]] : a.sign === 'anywhere' ? ['ANYWHERE'] : a.sign === 'home' ? ['HOME'] : a.sign === 'west' ? ['WEST', '<———'] : a.sign === 'joke' ? JOKES[Math.floor(random() * JOKES.length)] : a.sign === 'help' ? ['ANYTHING', 'HELPS', 'GOD BLESS'] : [];
    const SW = 0.66, SH = lines.length > 2 ? 0.5 : 0.42;
    const board = painted(SW, SH, (ctx, w, h) => {
      ctx.fillStyle = '#b98d5c';
      ctx.beginPath(); ctx.moveTo(w * 0.01, h * 0.04); ctx.lineTo(w * 0.6, h * 0.01); ctx.lineTo(w * 0.99, h * 0.05); ctx.lineTo(w * 0.97, h * 0.82); ctx.lineTo(w * 0.9, h * 0.98); ctx.lineTo(w * 0.3, h * 0.99); ctx.lineTo(w * 0.02, h * 0.95); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(120,84,48,0.35)'; ctx.lineWidth = 1.5; for (let x = 0; x < w; x += w / 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(90,60,30,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, h * 0.5); ctx.lineTo(w, h * 0.52); ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = 'source-atop';
      if (lines.length) scrawl(ctx, lines, w, h, mix(0, 1, wait) > 0.8 ? '#3d3630' : '#15120f', random);
      ctx.fillStyle = `rgba(214,200,170,${wait * 0.3 + wear * 0.15})`; ctx.fillRect(0, 0, w, h);
      grime(ctx, w, h, random, wait * 0.5 + wear * 0.3, '#5a4630');
      ctx.restore();
    }, { px: 512, cutout: true });
    const fallen = wait > 0.82 && random() < 0.6;
    const signGroup = new THREE.Group();
    signGroup.add(board);
    if (fallen) { signGroup.position.set(-0.1 + signLean[0] * 0.5, 0.026, 0.45); signGroup.rotation.set(-Math.PI / 2 + 0.02, 0, (random() - 0.5) * 0.9); }
    else { signGroup.position.set(-0.1 + signLean[0], K + SH / 2 * Math.cos(0.3) - 0.005, -0.12 + front + 0.09); signGroup.rotation.set(-0.3, (random() - 0.5) * 0.25 + (a.pack === 'school' ? -0.25 : 0), (random() - 0.5) * 0.06); }
    board.castShadow = true;
    s.root.add(signGroup);
    if (a.sign === 'blank') { const pen = s.cylinder(0.011, 0.011, 0.14, [0.45, K + 0.012, 0.05], strap, 8); pen.rotation.set(Math.PI / 2, 0, 0.7); s.cylinder(0.012, 0.012, 0.03, [0.56, K + 0.012, 0.1], s.material('#e9e4d4'), 8).rotation.x = Math.PI / 2; }

    // Company.
    const cx = 0.6;
    if (a.company === 'boots') {
      const leather = s.material('#5a3d28', { roughness: 0.85 });
      for (let i = 0; i < 2; i++) {
        const x = cx + i * 0.17, z = -0.15 + i * 0.05, flop = i === 1 && random() < 0.5;
        s.box([0.1, 0.07, 0.27], [x, K + 0.035, z + 0.04], leather);
        s.box([0.105, 0.02, 0.28], [x, K + 0.01, z + 0.04], strap);
        const shaft = s.cylinder(0.055, 0.05, 0.2, [x, K + 0.16, z - 0.05], leather, 10); if (flop) { shaft.rotation.z = -0.6; shaft.position.x += 0.06; shaft.position.y -= 0.03; }
        s.tube([[x, K + 0.09, z + 0.06], [x + 0.08, K + 0.02, z + 0.2], [x + 0.03, K + 0.008, z + 0.3]], 0.004, s.material('#c9b08a'));
      }
    } else if (a.company === 'dog') {
      s.lathe([[0.0, 0], [0.11, 0], [0.085, 0.055], [0.075, 0.055], [0.09, 0.012], [0, 0.012]], tin, [cx, K, -0.05]);
      s.cylinder(0.078, 0.078, 0.004, [cx, K + 0.035, -0.05], s.material('#7fb4d8', { roughness: 0.1 }), 14);
      const leash = s.material('#c2302a', { roughness: 0.8 });
      for (let i = 0; i < 3; i++) s.ring(0.09 + i * 0.012, 0.009, [cx + 0.25, K + 0.01 + i * 0.012, 0.0], leash).rotation.x = Math.PI / 2;
      s.tube([[cx + 0.34, K + 0.02, 0], [cx + 0.42, K + 0.03, 0.15], [cx + 0.3, 0.03, 0.4]], 0.009, leash);
      s.ring(0.02, 0.005, [cx + 0.3, 0.03, 0.42], alu);
    } else if (a.company === 'coffee') {
      s.cylinder(0.042, 0.03, 0.11, [cx, K + 0.055, 0.0], s.material('#f1eee4'), 12);
      s.cylinder(0.044, 0.044, 0.012, [cx, K + 0.115, 0.0], s.material('#3a2a20'), 12);
      s.cylinder(0.041, 0.035, 0.045, [cx, K + 0.055, 0.0], s.material('#9c6a3c', { roughness: 0.9 }), 12);
    } else if (a.company === 'paperback') {
      const book = s.material(['#c2302a', '#2f6fa8', '#e7b512', '#3e7a4a'][Math.floor(random() * 4)], { roughness: 0.7 });
      for (const x of [-1, 1]) { const half = s.box([0.11, 0.012, 0.17], [cx + x * 0.052, K + 0.03, -0.02], book); half.rotation.z = x * -0.35; }
      s.box([0.2, 0.02, 0.16], [cx, K + 0.012, -0.02], s.material('#efe7cf'));
    } else if (a.company === 'bedroll') {
      const bagMat = s.material(a.colour === 'red' ? '#3e5a3a' : '#a8372d', { roughness: 0.95 });
      const bedroll = s.ball([0.27, 0.055, 0.8], [0, 0, 0], bagMat, 12); bedroll.rotation.y = Math.PI / 2 + 0.08; bedroll.position.set(0.1, 0.06, 0.5);
      s.ball([0.16, 0.045, 0.12], [0.72, 0.075, 0.5], s.material('#e9e4d4', { roughness: 1 }), 10);
    }

    // Time passing: cigarette ends, then drifted leaves and litter.
    const butts = Math.round(Math.max(0, wait - 0.3) * 14);
    for (let i = 0; i < butts; i++) { const butt = s.cylinder(0.006, 0.006, 0.035, [-0.75 + random() * 0.5, 0.027, 0.25 + random() * 0.3], s.material(random() < 0.5 ? '#d9a35a' : '#efece2'), 6); butt.rotation.set(Math.PI / 2, 0, random() * 3); }
    if (wait > 0.6) {
      const n = Math.round((wait - 0.6) * 110 * mix(0.6, 1.3, mood.density));
      const hues = ['#a8642a', '#c98a2e', '#7a4a22', '#b9a04a', '#8a3a22'];
      const leaves: { at: P; size: number; color: string }[] = [];
      for (let i = 0; i < n; i++) { const against = random() < 0.6; leaves.push({ at: [(random() - 0.5) * 1.8, 0.03 + (against ? random() * 0.05 : 0), against ? 0.2 + random() * 0.1 : 0.2 + random() * 0.45], size: 0.6 + random() * 0.8, color: hues[Math.floor(random() * hues.length)] }); }
      const leafGeo = new THREE.SphereGeometry(0.035, 6, 4); leafGeo.scale(1, 0.12, 0.6);
      const drift = s.scatter(leafGeo, s.material('#ffffff', { roughness: 1 }), leaves);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      leaves.forEach((leaf, i) => { q.setFromEuler(new THREE.Euler((random() - 0.5) * 0.8, random() * 6, (random() - 0.5) * 0.8)); drift.setMatrixAt(i, m.compose(new THREE.Vector3(...leaf.at), q, new THREE.Vector3(leaf.size, leaf.size, leaf.size))); });
      const flyer = s.box([0.2, 0.004, 0.14], [0.5 + random() * 0.3, 0.026, 0.33], s.material('#e9e4d4')); flyer.rotation.y = random() * 3;
    }

    const swing = mix(0.03, 0.3, mood.energy);
    return s.finish({
      update: (_dt, time) => { if (dangling) { mug.rotation.z = Math.sin(time * 2.6) * swing; mug.rotation.x = Math.sin(time * 1.7 + 1) * swing * 0.5; } },
    });
  },
});
