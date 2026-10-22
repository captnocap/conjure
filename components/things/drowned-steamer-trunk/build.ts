import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';
import { encrust, painted, stained } from './sea';

type P3 = [number, number, number];
const ROUTES = {
  atlantic: ['LIVERPOOL', 'NEW YORK', 'QUEENSTOWN', 'CABIN', 'SOUTHAMPTON', 'BOSTON'],
  orient: ['BOMBAY', 'PORT SAID', 'SHANGHAI', 'COLOMBO', 'SINGAPORE', 'ADEN'],
  emigrant: ['HAMBURG', 'STEERAGE', 'ELLIS ISLAND', 'BREMEN', 'NOT WANTED ON VOYAGE', 'NAPOLI'],
  tour: ['PARIS', 'ROMA', 'CAIRO', 'GRAND HOTEL', 'VENEZIA', 'NICE'],
} as const;

export default defineThing({
  questions: {
    contents: choice('What is inside it?', {
      china: 'The good china: blue and white plates and cups, some smashed.',
      letters: 'Bundles of letters tied with ribbon, and loose envelopes.',
      clothes: 'Clothes: a dress and linen dragging over the rim, a hat, a shoe.',
      coins: 'Gold coins, a small fortune heaped and scattered.',
      toys: 'A child\'s things: a doll, wooden blocks, a toy boat.',
      silt: 'Nothing but silt, and a crab that lives there now.',
    }),
    lid: choice('What state is the lid in?', {
      sprung: 'Sprung wide open on its hinges.',
      ajar: 'Ajar, a dark gap you could get a hand into.',
      torn: 'Torn off, lying upside down beside it.',
      closed: 'Still shut and latched, but something is caught in it.',
    }),
    spill: score('How far have the contents spilled?', ['All still packed inside', 'Heaped over the rim', 'Strewn across the ground']),
    route: choice('Where do the travel labels say it was going?', {
      atlantic: 'The Atlantic crossing: Liverpool, Queenstown, New York.',
      orient: 'East by steamer: Port Said, Bombay, Shanghai.',
      emigrant: 'An emigrant passage: Hamburg, steerage, Ellis Island.',
      tour: 'A grand tour: hotel labels from Paris, Rome and Cairo.',
      none: 'No labels at all, only stencilled initials.',
    }),
    covering: choice('What is the trunk covered in?', {
      leather: 'Brown leather, cracked.',
      canvas: 'Olive painted canvas.',
      tin: 'Black japanned tin.',
      oxblood: 'Oxblood red leather, expensive.',
    }),
    dome: noul('Does it have a domed camel-back lid rather than a flat one?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 0.95, H = 0.42, D = 0.52, T = 0.02;
    const hide = { leather: '#7a4d2b', canvas: '#6b6f4a', tin: '#232528', oxblood: '#6e2420' }[a.covering];
    const skin = stained(random, hide, a.covering === 'tin' ? '#5a3a24' : '#33241a', clamp01(0.1 + mood.wear * 0.32), { metalness: a.covering === 'tin' ? 0.4 : 0, roughness: a.covering === 'tin' ? 0.45 : 0.85, drips: false });
    const brass = stained(random, '#c9a548', '#5fb39c', clamp01(mood.wear * 0.8 - 0.1));
    const slat = s.material('#a07a4a', { roughness: 0.8 });
    const lining = s.material(mood.warmth > 0.5 ? '#d9c8a4' : '#b7c4c6', { roughness: 1, side: THREE.DoubleSide });
    const hosts: THREE.Mesh[] = [];

    // Body: an open box so the inside is real.
    hosts.push(s.box([W, T, D], [0, T / 2, 0], skin));
    hosts.push(s.box([W, H, T], [0, H / 2, D / 2 - T / 2], skin));
    s.box([W, H, T], [0, H / 2, -D / 2 + T / 2], skin);
    for (const x of [-1, 1]) hosts.push(s.box([T, H, D], [x * (W / 2 - T / 2), H / 2, 0], skin));
    s.box([W - T * 2.2, H - 0.02, 0.004], [0, H / 2 + 0.01, D / 2 - T - 0.003], lining);
    s.box([W - T * 2.2, H - 0.02, 0.004], [0, H / 2 + 0.01, -D / 2 + T + 0.003], lining);
    for (const x of [-1, 1]) s.box([0.004, H - 0.02, D - T * 2.2], [x * (W / 2 - T - 0.003), H / 2 + 0.01, 0], lining);
    // Slats, corners, lock and handles.
    for (const x of [-0.3, 0, 0.3]) {
      s.box([0.05, H, 0.012], [x, H / 2, D / 2 + 0.005], slat);
      s.box([0.05, H, 0.012], [x, H / 2, -D / 2 - 0.005], slat);
    }
    for (const y of [0.03, H - 0.03]) for (const z of [-1, 1]) s.box([W + 0.012, 0.045, 0.012], [0, y, z * (D / 2 + 0.005)], slat);
    for (const x of [-1, 1]) for (const z of [-1, 1]) for (const y of [0.035, H - 0.035]) s.box([0.07, 0.07, 0.07], [x * (W / 2 - 0.025), y, z * (D / 2 - 0.025)], brass);
    s.box([0.09, 0.1, 0.014], [0, H - 0.07, D / 2 + 0.014], brass);
    s.cylinder(0.012, 0.012, 0.016, [0, H - 0.085, D / 2 + 0.022], s.material('#1b1b1b'), 10).rotation.x = Math.PI / 2;
    for (const x of [-1, 1]) {
      s.tube([[x * (W / 2 + 0.008), H * 0.62, -0.1], [x * (W / 2 + 0.05), H * 0.5, 0], [x * (W / 2 + 0.008), H * 0.62, 0.1]], 0.014, s.material('#3a2616', { roughness: 0.9 }));
      for (const z of [-0.1, 0.1]) s.box([0.012, 0.05, 0.05], [x * (W / 2 + 0.006), H * 0.62, z], brass);
    }

    // Lid, hinged along the back top edge.
    const lid = new Sculpture(context);
    const lidH = a.dome ? 0.17 : 0.11;
    if (a.dome) {
      const shell = (r: number, width: number, material: THREE.Material, x = 0) => {
        const geometry = new THREE.CylinderGeometry(r, r, width, 24, 1, false, 0, Math.PI);
        geometry.rotateZ(Math.PI / 2);
        geometry.scale(1, lidH / (D / 2), 1);
        geometry.translate(x, 0, D / 2);
        return lid.mesh(geometry, material);
      };
      const top = shell(D / 2, W, skin);
      (top.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      hosts.push(top);
      for (const x of [-0.3, 0, 0.3]) shell(D / 2 + 0.008, 0.05, slat, x);
      for (const x of [-1, 1]) shell(D / 2 + 0.006, 0.06, brass, x * (W / 2 - 0.03));
    } else {
      hosts.push(lid.box([W, T, D], [0, lidH - T / 2, D / 2], skin));
      lid.box([W, lidH, T], [0, lidH / 2, D - T / 2], skin);
      lid.box([W, lidH, T], [0, lidH / 2, T / 2], skin);
      for (const x of [-1, 1]) lid.box([T, lidH, D], [x * (W / 2 - T / 2), lidH / 2, D / 2], skin);
      for (const x of [-0.3, 0, 0.3]) lid.box([0.05, 0.012, D + 0.012], [x, lidH + 0.005, D / 2], slat);
      for (const x of [-1, 1]) for (const z of [0.025, D - 0.025]) lid.box([0.07, 0.07, 0.07], [x * (W / 2 - 0.025), lidH - 0.03, z], brass);
      lid.box([W - T * 2.2, 0.004, D - T * 2.2], [0, lidH - T - 0.003, D / 2], lining);
    }
    lid.box([0.07, 0.09, 0.012], [0, 0.0, D + 0.012], brass); // hasp
    s.root.add(lid.root);
    const angle = { sprung: mix(1.75, 2.15, random()), ajar: mix(0.28, 0.5, random()), torn: 0, closed: 0 }[a.lid];
    lid.root.position.set(0, H, -D / 2);
    lid.root.rotation.x = -angle;
    if (a.lid === 'torn') {
      const side = random() < 0.5 ? -1 : 1;
      lid.root.rotation.set(Math.PI + mix(-0.06, 0.06, random()), mix(-0.5, 0.5, random()), 0);
      lid.root.position.set(side * (W * 0.5 + D * 0.62), lidH + 0.004, mix(0.25, 0.45, random()));
      lid.root.rotation.order = 'YXZ';
      // Torn hinges left on the body.
      for (const x of [-0.25, 0.25]) s.box([0.07, 0.02, 0.03], [x, H + 0.004, -D / 2 + 0.01], brass).rotation.z = mix(-0.4, 0.4, random());
    }

    // Travel labels on the front, the ends and the lid.
    const ink = ['#b3261e', '#1f4f7a', '#e0b23a', '#2f6b4a', '#e8e1cc', '#c96a2a'];
    const sticker = (text: string) => {
      const kind = Math.floor(random() * 4), colour = ink[Math.floor(random() * ink.length)];
      const light = colour === '#e8e1cc' || colour === '#e0b23a';
      const fade = mood.wear;
      const map = painted(256, 160, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.fillStyle = colour;
        g.beginPath();
        if (kind === 0) g.rect(4, 10, w - 8, h - 20);
        else if (kind === 1) g.ellipse(w / 2, h / 2, w / 2 - 4, h / 2 - 6, 0, 0, 7);
        else if (kind === 2) { g.moveTo(w / 2, 2); g.lineTo(w - 2, h / 2); g.lineTo(w / 2, h - 2); g.lineTo(2, h / 2); g.closePath(); }
        else { g.moveTo(4, 12); g.lineTo(w - 40, 12); g.lineTo(w - 4, h / 2); g.lineTo(w - 40, h - 12); g.lineTo(4, h - 12); g.closePath(); }
        g.fill();
        g.strokeStyle = light ? '#2a2620' : '#f1ead6';
        g.lineWidth = 4;
        g.stroke();
        g.fillStyle = light ? '#2a2620' : '#f6f0dc';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        const lines = text.length > 11 ? [text.slice(0, text.lastIndexOf(' ', 11)), text.slice(text.lastIndexOf(' ', 11) + 1)] : [text];
        const size = Math.min(44, (kind === 2 ? 250 : 380) / Math.max(...lines.map((line) => line.length)));
        g.font = `bold ${size}px sans-serif`;
        lines.forEach((line, i) => g.fillText(line, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.05, kind === 2 ? 130 : 200));
        // Scuffs and peeled corners.
        g.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 2 + fade * 14; i++) { g.beginPath(); g.arc(random() * w, random() * h, 4 + random() * 22 * fade, 0, 7); g.fill(); }
      });
      return new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.5, roughness: 0.9, side: THREE.DoubleSide });
    };
    if (a.route === 'none') {
      const initials = 'ABCDEHJMRSTW';
      const text = `${initials[Math.floor(random() * 12)]}. ${initials[Math.floor(random() * 12)]}. ${initials[Math.floor(random() * 12)]}.`;
      const map = painted(256, 96, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = a.covering === 'tin' ? '#d9d2bd' : '#1d1a16'; g.font = 'bold 64px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2, 240); });
      s.mesh(new THREE.PlaneGeometry(0.3, 0.11), new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.4, roughness: 0.9 }), [-0.2, H * 0.45, D / 2 + 0.013]);
    } else {
      const names = [...ROUTES[a.route]];
      const count = Math.round(mix(3, 7, mood.density));
      for (let i = 0; i < count; i++) {
        const text = names[i % names.length];
        const wide = mix(0.16, 0.24, random()), tall = wide * 0.62;
        const label = new THREE.Mesh(new THREE.PlaneGeometry(wide, tall), sticker(text));
        const place = i % 4;
        if (place === 3) {
          const side = random() < 0.5 ? -1 : 1;
          label.position.set(side * (W / 2 + 0.003), mix(0.12, 0.3, random()), mix(-0.12, 0.12, random()));
          label.rotation.y = side * Math.PI / 2;
          label.rotateZ(mix(-0.4, 0.4, random()));
          s.root.add(label);
        } else if (place === 2 && !a.dome) {
          label.position.set(mix(-0.3, 0.3, random()), lidH + 0.013, mix(0.12, D - 0.12, random()));
          label.rotation.x = -Math.PI / 2;
          label.rotateZ(mix(-0.6, 0.6, random()));
          lid.root.add(label);
        } else {
          const lane = [-0.15, 0.15, -0.38, 0.38][i % 4] + mix(-0.03, 0.03, random());
          label.position.set(lane, mix(0.13, 0.27, random()), D / 2 + 0.013 + i * 0.0006);
          label.rotation.z = mix(-0.35, 0.35, random());
          s.root.add(label);
        }
      }
    }

    // Contents.
    const fillY = H * mix(0.78, 0.92, random());
    const inside = (): P3 => [mix(-1, 1, random()) * (W / 2 - 0.14), fillY, mix(-1, 1, random()) * (D / 2 - 0.12)];
    const outside = (): P3 => [mix(-W / 2 - 0.05, W / 2 + 0.15, random()), 0, D / 2 + mix(0.1, 0.62, random() * mix(0.5, 1, a.spill))];
    const gap = a.lid !== 'closed';
    const strewn = Math.round(mix(0, 1, clamp01((a.spill - 0.25) / 0.75)) * mix(6, 14, mood.density));
    const packing = (colour: string) => { if (gap) s.box([W - T * 2.4, 0.02, D - T * 2.4], [0, fillY - 0.012, 0], s.material(colour, { roughness: 1 })); };
    const drape = (colour: string, x: number, width: number, reach: number) => {
      // Cloth that runs from inside, over the front rim, down the face and out across the ground.
      const path = [new THREE.Vector3(0, fillY + 0.01, 0.02), new THREE.Vector3(0, H + 0.016, D / 2 - 0.02), new THREE.Vector3(0, H + 0.012, D / 2 + 0.02), new THREE.Vector3(0, H * 0.45, D / 2 + 0.03), new THREE.Vector3(0, 0.012, D / 2 + 0.06 + reach * 0.3), new THREE.Vector3(0, 0.008, D / 2 + 0.08 + reach)];
      const curve = new THREE.CatmullRomCurve3(path, false, 'catmullrom', 0.2);
      const geometry = new THREE.PlaneGeometry(width, 1, 6, 24);
      const position = geometry.attributes.position;
      const wave = random() * 6;
      for (let i = 0; i < position.count; i++) {
        const t = position.getY(i) + 0.5, u = position.getX(i);
        const p = curve.getPoint(t);
        const ripple = Math.sin(u * 34 + wave + t * 5) * 0.012 * (0.3 + t);
        position.setXYZ(i, x + u * (1 + t * 0.35) + Math.sin(t * 6 + wave) * 0.02, p.y + (t > 0.8 ? Math.abs(ripple) : 0), p.z + (t > 0.4 && t < 0.8 ? ripple : 0));
      }
      geometry.computeVertexNormals();
      s.mesh(geometry, s.material(colour, { roughness: 0.95, side: THREE.DoubleSide }));
    };
    const spillsOver = gap ? a.spill > 0.25 : true;

    if (a.contents === 'china') {
      packing('#cdbf9a');
      const white = s.material('#f1f0ea', { roughness: 0.35 }), blue = s.material('#2e5c9a', { roughness: 0.4 });
      const plate = (at: P3, tilt = 0) => {
        const p = s.cylinder(0.105, 0.07, 0.016, at, white, 20);
        const rim = s.ring(0.098, 0.006, [at[0], at[1] + 0.009, at[2]], blue);
        rim.rotation.x = Math.PI / 2;
        if (tilt) { p.rotation.z = tilt; rim.rotation.y = 0; rim.rotation.set(Math.PI / 2, tilt, 0); }
      };
      if (gap) {
        for (let stack = 0; stack < 2; stack++) { const at = inside(); for (let i = 0; i < 3 + Math.floor(random() * 4); i++) plate([at[0], fillY + 0.01 + i * 0.018, at[2]]); }
        for (let i = 0; i < 3; i++) { const at = inside(); const cup = s.lathe([[0.02, 0], [0.035, 0.01], [0.042, 0.05], [0.044, 0.055]], white, [at[0], fillY, at[2]]); (cup.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide; s.ring(0.014, 0.004, [at[0] + 0.05, fillY + 0.03, at[2]], white); }
      }
      for (let i = 0; i < strewn; i++) {
        const at = outside();
        if (i % 3 === 0) plate([at[0], 0.009, at[2]]);
        else {
          const shard = s.mesh(new THREE.CylinderGeometry(0.06 + random() * 0.04, 0.05, 0.012, 3), i % 2 ? white : blue, [at[0], 0.008, at[2]]);
          shard.rotation.y = random() * 6;
          shard.scale.x = 0.5 + random() * 0.5;
        }
      }
    } else if (a.contents === 'letters') {
      packing('#b9a98a');
      const paper = s.material('#eee3c8', { roughness: 0.95 }), ribbon = s.material(mood.cheer > 0.5 ? '#c0392f' : '#3a4a7a');
      const bundle = (at: P3, turn: number) => {
        const h = 0.03 + random() * 0.04;
        s.box([0.16, h, 0.1], [at[0], at[1] + h / 2, at[2]], paper).rotation.y = turn;
        s.box([0.164, h + 0.004, 0.014], [at[0], at[1] + h / 2, at[2]], ribbon).rotation.y = turn;
        s.box([0.014, h + 0.004, 0.104], [at[0], at[1] + h / 2, at[2]], ribbon).rotation.y = turn;
      };
      if (gap) for (let i = 0; i < 5; i++) bundle(inside(), random() * 3);
      for (let i = 0; i < strewn + (spillsOver ? 2 : 0); i++) {
        const at = outside();
        if (i % 4 === 0) bundle([at[0], 0, at[2]], random() * 3);
        else {
          const envelope = s.box([0.15, 0.003, 0.095], [at[0], 0.004 + i * 0.0015, at[2]], paper);
          envelope.rotation.y = random() * 6;
          const stamp = s.box([0.02, 0.004, 0.024], [at[0], 0.0045 + i * 0.0015, at[2]], s.material('#b3261e'));
          stamp.rotation.y = envelope.rotation.y;
          stamp.translateX(0.055); stamp.translateZ(-0.03);
        }
      }
      if (spillsOver) drape('#eee3c8', mix(-0.2, 0.2, random()), 0.12, 0.05);
    } else if (a.contents === 'clothes') {
      packing('#d8d2c2');
      const cloths = mood.cheer > 0.5 ? ['#f1eee2', '#c0392f', '#e2b23a', '#3a5f8a'] : ['#e6e2d6', '#3b3f55', '#6e2420', '#4a5a4a'];
      if (gap) for (let i = 0; i < 4; i++) { const at = inside(); s.box([0.24, 0.035, 0.18], [at[0] * 0.8, fillY + 0.018 + i * 0.012, at[2] * 0.6], s.material(cloths[i % 4], { roughness: 1 })).rotation.y = mix(-0.4, 0.4, random()); }
      drape(cloths[1], mix(-0.22, -0.08, random()), 0.3, mix(0.15, 0.5, a.spill));
      if (spillsOver) drape(cloths[0], mix(0.12, 0.26, random()), 0.2, mix(0.05, 0.3, a.spill));
      if (strewn > 2) {
        // A hat and a single shoe.
        const at = outside();
        const felt = s.material('#2a2622', { roughness: 0.9 });
        s.cylinder(0.14, 0.14, 0.008, [at[0], 0.004, at[2]], felt, 20);
        s.ball([0.085, 0.07, 0.085], [at[0], 0.03, at[2]], felt, 14);
        s.ring(0.088, 0.008, [at[0], 0.022, at[2]], s.material(cloths[1])).rotation.x = Math.PI / 2;
        const at2 = outside();
        const shoe = new Sculpture(context);
        const leather = shoe.material('#4a2f1c', { roughness: 0.5 });
        shoe.ball([0.04, 0.03, 0.1], [0, 0.03, 0], leather, 12);
        shoe.cylinder(0.034, 0.036, 0.07, [0, 0.06, -0.055], leather, 12);
        shoe.box([0.05, 0.02, 0.04], [0, 0.01, -0.07], shoe.material('#1d140d'));
        shoe.root.position.set(at2[0], 0, at2[2]);
        shoe.root.rotation.set(0, random() * 6, random() < 0.5 ? 1.3 : 0);
        s.root.add(shoe.root);
      }
    } else if (a.contents === 'coins') {
      packing('#3a2f22');
      const gold = new THREE.MeshStandardMaterial({ color: '#e6b422', metalness: 0.85, roughness: 0.3, emissive: '#7a5200', emissiveIntensity: mix(0.15, 0.6, mood.cheer) });
      if (gap) {
        s.ball([W / 2 - 0.1, 0.07 + a.spill * 0.05, D / 2 - 0.08], [0, fillY, 0], gold, 18);
        s.scatter(new THREE.CylinderGeometry(1, 1, 0.16, 12), gold, Array.from({ length: 60 }, () => { const at = inside(); return { at: [at[0], fillY + 0.03 + random() * 0.07 * (1 - Math.abs(at[0]) / (W / 2)), at[2]] as P3, size: 0.02 }; }));
      }
      const loose: { at: P3; size: number }[] = [];
      for (let i = 0; i < strewn * 5 + 3; i++) { const at = outside(); loose.push({ at: [at[0], 0.004 + random() * 0.006, at[2]], size: 0.02 }); }
      if (spillsOver) {
        s.ball([0.2, 0.05, 0.14], [mix(-0.2, 0.2, random()), 0, D / 2 + 0.14], gold, 14);
        for (let i = 0; i < 22; i++) loose.push({ at: [mix(-0.25, 0.25, random()), 0.02 + random() * 0.03, D / 2 + 0.05 + random() * 0.2], size: 0.02 });
      }
      s.scatter(new THREE.CylinderGeometry(1, 1, 0.16, 12), gold, loose);
    } else if (a.contents === 'toys') {
      packing('#c9bfa6');
      const doll = (at: P3, lying: boolean) => {
        const d = new Sculpture(context);
        const porcelain = d.material('#f0dcc8', { roughness: 0.4 });
        d.cylinder(0.02, 0.07, 0.15, [0, 0.085, 0], d.material(mood.cheer > 0.5 ? '#d9728a' : '#7a8fa6', { roughness: 1 }), 12);
        d.ball([0.042, 0.046, 0.042], [0, 0.2, 0], porcelain, 14);
        d.ball([0.046, 0.03, 0.046], [0, 0.222, -0.006], d.material('#5a3a1e'), 12);
        for (const x of [-1, 1]) { d.rod([x * 0.02, 0.15, 0], [x * 0.075, 0.09, 0.01], 0.01, porcelain); d.rod([x * 0.025, 0.02, 0], [x * 0.035, -0.05, 0.01], 0.011, porcelain); d.ball([0.006, 0.008, 0.004], [x * 0.016, 0.205, 0.04], d.material('#1b1b1b'), 6); }
        d.root.position.set(at[0], at[1] + (lying ? 0.045 : 0.05), at[2]);
        d.root.rotation.set(lying ? -Math.PI / 2 + 0.1 : -0.3, lying ? random() * 6 : mix(-0.4, 0.4, random()), 0);
        d.root.rotation.order = 'YXZ';
        s.root.add(d.root);
      };
      const block = (at: P3) => { const b = s.box([0.055, 0.055, 0.055], [at[0], at[1] + 0.028, at[2]], s.material(['#c0392f', '#e2b23a', '#3a6fa0', '#3f8a5a'][Math.floor(random() * 4)])); b.rotation.y = random() * 3; };
      const boat = (at: P3) => {
        const hull = s.mesh(new THREE.CylinderGeometry(0.04, 0.02, 0.18, 3), s.material('#b3261e'), [at[0], at[1] + 0.022, at[2]]);
        hull.rotation.set(Math.PI / 2, 0, Math.PI);
        hull.scale.set(1, 1, 0.9);
        s.rod([at[0], at[1] + 0.03, at[2]], [at[0], at[1] + 0.17, at[2]], 0.005, slat);
        const sail = s.mesh(new THREE.CylinderGeometry(0.001, 0.06, 0.12, 3), s.material('#f1eee2', { side: THREE.DoubleSide }), [at[0], at[1] + 0.105, at[2] + 0.005]);
        sail.scale.x = 0.08;
      };
      if (gap) { const at = inside(); doll([at[0] * 0.5, fillY, at[2] * 0.3 + 0.08], a.spill < 0.4); for (let i = 0; i < 4; i++) block(inside()); boat(inside()); }
      if (!gap || a.spill > 0.5) doll([mix(-0.25, 0.25, random()), 0, D / 2 + mix(0.16, 0.3, random())], true);
      for (let i = 0; i < strewn; i++) { const at = outside(); if (i % 4 === 1) boat([at[0], 0, at[2]]); else block([at[0], 0, at[2]]); }
    } else {
      const mud = s.material(mood.warmth > 0.5 ? '#857554' : '#6b7268', { roughness: 1 });
      if (gap) { s.box([W - T * 2.4, 0.02, D - T * 2.4], [0, fillY - 0.012, 0], mud); s.ball([0.26, 0.06, 0.16], [mix(-0.15, 0.15, random()), fillY, 0], mud, 14); }
      s.ball([0.24, 0.03 + a.spill * 0.04, 0.16], [mix(-0.2, 0.2, random()), 0, D / 2 + 0.1], mud, 16);
      const crab = new Sculpture(context);
      const shell = crab.material(mood.cheer > 0.5 ? '#d9532f' : '#8a4a36', { roughness: 0.5 });
      crab.ball([0.07, 0.03, 0.05], [0, 0.045, 0], shell, 14);
      for (const x of [-1, 1]) {
        for (let i = 0; i < 4; i++) { const z = -0.03 + i * 0.02; crab.rod([x * 0.05, 0.045, z], [x * 0.1, 0.07, z * 1.6], 0.006, shell); crab.rod([x * 0.1, 0.07, z * 1.6], [x * 0.13, 0, z * 2.2], 0.005, shell, 0.002); }
        crab.rod([x * 0.04, 0.045, 0.04], [x * 0.08, 0.06, 0.09], 0.009, shell);
        crab.ball([0.026, 0.018, 0.034], [x * 0.085, 0.065, 0.115], shell, 10);
        crab.rod([x * 0.02, 0.06, 0.04], [x * 0.022, 0.085, 0.048], 0.003, shell);
        crab.ball([0.007, 0.007, 0.007], [x * 0.022, 0.088, 0.049], crab.material('#111111'), 6);
      }
      const where: P3 = gap && a.spill < 0.6 ? [mix(-0.2, 0.2, random()), fillY + 0.03, 0.05] : [mix(-0.3, 0.3, random()), 0.03, D / 2 + mix(0.2, 0.4, random())];
      crab.root.position.set(...where);
      crab.root.rotation.y = mix(-0.8, 0.8, random());
      crab.root.scale.setScalar(1.25);
      s.root.add(crab.root);
    }
    if (a.lid === 'closed' && a.contents !== 'clothes' && a.contents !== 'letters') {
      // Something caught in the lid: a corner of lining cloth.
      const scrap = s.box([0.12, 0.09, 0.004], [mix(-0.3, 0.3, random()), H - 0.04, D / 2 + 0.02], lining);
      scrap.rotation.z = mix(-0.3, 0.3, random());
    }

    // The sea's own additions scale with how far gone the scene is.
    if (mood.wear > 0.55) encrust(s, hosts, (mood.wear - 0.55) * 300, 0.014);

    return s.finish();
  },
});
