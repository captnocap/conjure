import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { gearGeometry, painted, windKey } from './parts';

type P = readonly [number, number, number];

const TARIFFS = {
  penny: { head: 'WINDING', lines: ['ONE TURN . . 1d', 'TEN TURNS . . 6d', 'FULL WIND . . 1s'] },
  guinea: { head: 'WINDING', lines: ['FULL WIND ONLY', 'ONE GUINEA', 'NO CHANGE GIVEN'] },
  free: { head: 'FREE WINDING', lines: ['BY ORDER OF', 'THE CITY', 'ONE WIND DAILY'] },
  classes: { head: 'TARIFF', lines: ['GENTRY . . . 2s', 'TRADES . . . 6d', 'SERVANTS . . 1d'] },
  credit: { head: 'NO CREDIT', lines: ['PAY BEFORE', 'YOU STOP', 'DEBTORS UNWOUND'] },
} as const;

export default defineThing({
  questions: {
    state: choice('What state is the kiosk in?', {
      open: 'Open for business: window lit, crank turning, sign glowing.',
      closed: 'Closed: ribbed shutter pulled down, a CLOSED board hung on it, rope across the front.',
      'broken-into': 'Broken into overnight: shutter torn aside, coin box ripped open, coins and the crank wheel lying in the road.',
      'out-of-order': 'Out of order: the crank chained and padlocked, a paper notice pasted over the window.',
    }),
    tariff: choice('What does the tariff board say?', {
      penny: 'A penny a turn: cheap, for everyone.',
      guinea: 'A guinea for a full wind only: ruinous.',
      free: 'Free winding by order of the city, one a day.',
      classes: 'Different prices for gentry, trades and servants.',
      credit: 'No credit: pay before you stop.',
    }),
    finish: choice('How is the booth finished?', {
      municipal: 'Dark green cast iron with cream panels, a city utility.',
      salon: 'White and gilt with red velvet at the window, for the well-to-do.',
      shack: 'Patched tin and bare planks, a back-street winder.',
      company: 'Black and polished brass, a private winding company.',
    }),
    roof: choice('What is its roof?', {
      dome: 'A ribbed dome with a key for a finial.',
      awning: 'A striped canvas awning roof.',
      sign: 'A flat roof carrying a big illuminated sign.',
    }),
    waiting: choice('Who is waiting to be wound?', {
      nobody: 'Nobody.',
      one: 'One figure, stooped, back turned to the spindle.',
      queue: 'A queue of three slowing figures behind the rope.',
      collapsed: 'A figure that ran down a few steps short and lies on the ground.',
    }),
    rope: score('How long is the queue rope?', ['A single short span', 'A few posts', 'A long doubling maze']),
    attendant: noul('Is an attendant visible at the window?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const open = a.state === 'open';
    const robbed = a.state === 'broken-into';
    const tone = { municipal: ['#2f5a45', '#e6dfc6'], salon: ['#f1ece0', '#f6f2e8'], shack: ['#7c6a52', '#8f8f86'], company: ['#1d1e22', '#2a2c31'] }[a.finish];
    const frame = s.material(tone[0], { roughness: 0.5, metalness: a.finish === 'shack' ? 0 : 0.2 });
    const panel = s.material(tone[1], { roughness: 0.65 });
    const brass = s.material(new THREE.Color(a.finish === 'salon' ? '#dcb548' : '#c99a3e').lerp(new THREE.Color('#5f9a84'), mood.wear * 0.4), { metalness: 0.55, roughness: 0.36 });
    const dark = s.material('#18181b', { roughness: 0.8 });
    const iron = s.material('#3a3d42', { metalness: 0.4, roughness: 0.55 });
    const W = 1.6, D = 1.3, H = 2.2, F = D / 2;

    // Plinth, corner posts, panels.
    s.box([W + 0.3, 0.14, D + 0.3], [0, 0.07, 0], s.material('#8d8a80', { roughness: 0.95 }));
    s.box([W - 0.06, H, D - 0.06], [0, 0.14 + H / 2, 0], panel);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.12, H, 0.12], [x * (W / 2 - 0.03), 0.14 + H / 2, z * (F - 0.03)], frame);
    s.box([W + 0.06, 0.1, D + 0.06], [0, 0.19, 0], frame);
    s.box([W + 0.06, 0.1, D + 0.06], [0, 1.02, 0], frame);
    s.box([W + 0.12, 0.14, D + 0.12], [0, 0.14 + H, 0], frame);
    if (a.finish === 'shack') {
      for (let i = 0; i < 5; i++) {
        const patch = s.box([0.3 + random() * 0.3, 0.25 + random() * 0.3, 0.02], [(random() - 0.5) * 1.0, 0.4 + random() * 1.6, F - 0.02], s.material(['#8f8f86', '#a36f4a', '#6c7a80'][i % 3], { roughness: 0.8, metalness: 0.2 }));
        patch.rotation.z = (random() - 0.5) * 0.3;
        if (i % 2) { patch.position.set(W / 2 - 0.02, patch.position.y, (random() - 0.5) * 0.8); patch.rotation.set(0, Math.PI / 2, 0); }
      }
    }

    // Service window with counter.
    const winY = 1.62, winW = 0.74, winX = 0.3;
    const lit = open ? mix(0.5, 1.2, 1 - mood.daylight * 0.5) : 0;
    s.box([winW, 0.84, 0.04], [winX, winY, F - 0.015], new THREE.MeshStandardMaterial({ color: open ? '#f3d894' : '#22252a', emissive: '#ffcf70', emissiveIntensity: lit, roughness: 0.4 }));
    for (const [w, h, x, y] of [[winW + 0.1, 0.06, 0, 0.45], [winW + 0.1, 0.06, 0, -0.45], [0.06, 0.9, -winW / 2, 0], [0.06, 0.9, winW / 2, 0]] as const) s.box([w, h, 0.06], [winX + x, winY + y, F], brass);
    s.box([winW + 0.24, 0.05, 0.28], [winX, winY - 0.48, F + 0.1], brass);
    if (a.finish === 'salon') for (const x of [-1, 1]) s.box([0.14, 0.8, 0.03], [winX + x * (winW / 2 - 0.1), winY, F + 0.012], s.material('#9a1f2a', { roughness: 0.9 }));
    if (a.attendant && (open || a.state === 'out-of-order')) {
      s.ball([0.11, 0.13, 0.05], [winX, winY + 0.08, F + 0.01], s.material(open ? '#3a2f2a' : '#101114'), 14);
      s.box([0.4, 0.3, 0.03], [winX, winY - 0.24, F + 0.008], s.material(open ? '#3a2f2a' : '#101114'));
      s.box([0.26, 0.04, 0.08], [winX, winY + 0.18, F + 0.03], s.material(open ? '#2f5a45' : '#101114'));
    }
    if (open) for (let i = 1; i < 4; i++) s.rod([winX - winW / 2 + i * winW / 4, winY - 0.42, F + 0.02], [winX - winW / 2 + i * winW / 4, winY + 0.42, F + 0.02], 0.008, brass);
    if (a.state === 'closed') {
      s.box([winW + 0.02, 0.86, 0.03], [winX, winY, F + 0.02], iron);
      for (let i = 0; i < 9; i++) s.box([winW + 0.02, 0.02, 0.05], [winX, winY - 0.4 + i * 0.1, F + 0.02], dark);
      const board = s.label('CLOSED', 0.5, 0.18, [winX, winY, F + 0.06], '#f1e8cf', '#8f1c16');
      board.rotation.z = (random() - 0.5) * 0.2;
    } else if (robbed) {
      const torn = s.box([winW, 0.5, 0.03], [winX + 0.2, winY + 0.14, F + 0.08], iron);
      torn.rotation.set(0.3, 0.25, -0.5);
      const shard = new THREE.MeshStandardMaterial({ color: '#dfe8ea', roughness: 0.2 });
      for (let i = 0; i < 6; i++) { const sh = s.rod([winX + (random() - 0.5) * 0.6, winY - 0.42, F + 0.03], [winX + (random() - 0.5) * 0.6, winY - 0.42 + 0.15 + random() * 0.3, F + 0.03], 0.05, shard, 0.002); sh.scale.z = 0.1; }
    } else if (a.state === 'out-of-order') {
      const note = s.label('OUT OF ORDER', 0.6, 0.3, [winX, winY, F + 0.045], '#1b1b1e', '#efe7cf');
      note.rotation.z = -0.06;
    }

    // Coin plate and tray, right of the window.
    const coinX = winX + 0.0, coinY = 0.82;
    const boxOpen = robbed;
    s.box([0.42, 0.46, 0.1], [coinX, coinY, F + 0.03], boxOpen ? dark : brass);
    if (boxOpen) {
      const lidd = s.box([0.42, 0.46, 0.02], [coinX + 0.36, coinY - 0.06, F + 0.14], brass);
      lidd.rotation.set(0, -1.0, 0.3);
    } else {
      s.box([0.16, 0.02, 0.02], [coinX, coinY + 0.1, F + 0.085], dark);
      s.ring(0.05, 0.012, [coinX, coinY - 0.07, F + 0.085], dark);
      for (const x of [-1, 1]) for (const y of [-1, 1]) s.ball([0.016, 0.016, 0.016], [coinX + x * 0.18, coinY + y * 0.2, F + 0.085], dark, 6);
    }
    s.box([0.3, 0.03, 0.12], [coinX, coinY - 0.27, F + 0.12], brass);

    // The winding spindle: back up to it, at shoulder height, feet on the plate.
    const spX = -0.42, spY = 1.38;
    s.cylinder(0.2, 0.2, 0.04, [spX, spY, F + 0.01], brass, 24).rotation.x = Math.PI / 2;
    s.ring(0.2, 0.025, [spX, spY, F + 0.03], frame);
    const spindle = new THREE.Group();
    spindle.position.set(spX, spY, F + 0.03);
    s.root.add(spindle);
    const shaft = s.cylinder(0.035, 0.045, 0.34, [0, 0, 0.17], iron, 4);
    shaft.rotation.x = Math.PI / 2;
    const chuck = s.mesh(gearGeometry(0.1, 8, 0.05, 0.03), brass, [0, 0, 0.06]);
    spindle.add(shaft, chuck);
    s.cylinder(0.36, 0.38, 0.03, [spX, 0.155, F + 0.52], brass, 28);
    for (const x of [-1, 1]) s.ball([0.04, 0.005, 0.13], [spX + x * 0.09, 0.172, F + 0.5], dark, 10).rotation.y = x * 0.18;

    // Tariff board on the left of the front.
    const tariff = TARIFFS[a.tariff];
    const board = painted(256, 384, (ctx, w, h) => {
      ctx.fillStyle = a.finish === 'company' ? '#141416' : '#efe6cc';
      ctx.fillRect(0, 0, w, h);
      const ink = a.finish === 'company' ? '#e4c15a' : '#1d1a17';
      ctx.strokeStyle = ink; ctx.lineWidth = 6; ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.fillStyle = a.tariff === 'credit' || a.tariff === 'guinea' ? '#b3261e' : ink;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 40px serif';
      ctx.fillText(tariff.head, w / 2, 60, w - 40);
      ctx.fillStyle = ink;
      ctx.fillRect(40, 96, w - 80, 4);
      ctx.font = 'bold 30px monospace';
      tariff.lines.forEach((line, index) => ctx.fillText(line, w / 2, 160 + index * 78, w - 44));
      // Wear: chalked corrections and grime.
      ctx.fillStyle = 'rgba(60,45,30,0.25)';
      for (let i = 0; i < Math.floor(mood.wear * 30); i++) ctx.fillRect(random() * w, random() * h, 10 + random() * 40, 3 + random() * 8);
    });
    s.box([0.56, 0.82, 0.04], [-0.42, 2.0 - 0.14 + 0.0, F + 0.0], frame);
    const tariffMesh = s.mesh(new THREE.PlaneGeometry(0.5, 0.76), new THREE.MeshStandardMaterial({ map: board, roughness: 0.8 }), [-0.42, 1.86, F + 0.024]);
    tariffMesh.castShadow = false;
    if (robbed) tariffMesh.rotation.z = 0.12;

    // The great crank wheel on the side.
    const CR = 0.82, crY = 1.2;
    const crank = new THREE.Group();
    s.cylinder(0.07, 0.07, 0.34, [W / 2 + 0.14, crY, 0], iron, 12).rotation.z = Math.PI / 2;
    s.box([0.06, 0.5, 0.5], [W / 2 + 0.01, crY, 0], brass);
    const wheelMesh = s.mesh(gearGeometry(CR, 28, 0.07, 0.07, 6, 0.07), brass);
    const handle = s.cylinder(0.035, 0.035, 0.3, [CR * 0.62, 0, 0.18], s.material('#3a2a20', { roughness: 0.6 }), 10);
    handle.rotation.x = Math.PI / 2;
    const knob = s.ball([0.06, 0.06, 0.06], [CR * 0.62, 0, 0.34], s.material('#b3261e', { roughness: 0.4 }), 10);
    crank.add(wheelMesh, handle, knob);
    crank.rotation.z = random() * 6;
    const crankHolder = new THREE.Group();
    crankHolder.add(crank);
    s.root.add(crankHolder);
    if (robbed) {
      crankHolder.position.set(W / 2 + 0.9, 0.05, 0.9 + random() * 0.4);
      crankHolder.rotation.set(-Math.PI / 2, 0, random());
    } else {
      crankHolder.position.set(W / 2 + 0.3, crY, 0);
      crankHolder.rotation.y = Math.PI / 2;
    }
    if (a.state === 'out-of-order') {
      const links: P[] = [];
      for (let i = 0; i <= 12; i++) { const t = i / 12; links.push([W / 2 + 0.36 + Math.sin(t * Math.PI * 3) * 0.06, crY + 0.7 - t * 1.4, Math.cos(t * Math.PI) * 0.25]); }
      s.tube(links, 0.022, iron);
      s.box([0.1, 0.13, 0.05], [W / 2 + 0.4, crY - 0.72, -0.22], brass);
    }
    // A small pinion meshing above the crank, for the look of a train.
    const pinion = s.mesh(gearGeometry(0.2, 9, 0.07, 0.04), brass, [W / 2 + 0.3, crY + CR + 0.16, 0]);
    pinion.rotation.y = Math.PI / 2;
    pinion.visible = !robbed;

    // Roof.
    const roofY = 0.14 + H + 0.07;
    let finial: THREE.Object3D | null = null;
    if (a.roof === 'dome') {
      const dome = s.mesh(new THREE.SphereGeometry(1, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2), frame, [0, roofY, 0]);
      dome.scale.set(W / 2 + 0.06, 0.62, F + 0.06);
      finial = windKey(brass, 0.55, 'butterfly');
      finial.position.set(0, roofY + 0.6, 0);
      s.root.add(finial);
    } else if (a.roof === 'awning') {
      const stripes = painted(256, 64, (ctx, w, h) => {
        for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#f1ece0' : a.finish === 'salon' ? '#9a1f2a' : a.finish === 'municipal' ? '#2f5a45' : '#b3721e'; ctx.fillRect(i * w / 8, 0, w / 8, h); }
      });
      stripes.wrapS = THREE.RepeatWrapping;
      stripes.repeat.set(2, 1);
      const tent = s.mesh(new THREE.ConeGeometry(1.42, 0.7, 4, 1), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.9 }), [0, roofY + 0.35, 0]);
      tent.rotation.y = Math.PI / 4;
      tent.scale.set(1, 1, (D + 0.6) / (W + 0.6));
      s.ball([0.07, 0.07, 0.07], [0, roofY + 0.74, 0], brass, 10);
    } else {
      s.box([W + 0.2, 0.08, D + 0.2], [0, roofY + 0.04, 0], frame);
      const text = open ? 'WINDING' : a.state === 'closed' ? 'WINDING' : 'W ND NG';
      const sign = s.label(text, 1.5, 0.42, [0, roofY + 0.34, F - 0.1], open ? '#fff3c4' : '#6f6a5c', open ? '#b3261e' : '#3a2f2c');
      (sign.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#ff7a4a');
      (sign.material as THREE.MeshStandardMaterial).emissiveIntensity = open ? 0.5 : 0;
      s.box([1.6, 0.5, 0.08], [0, roofY + 0.34, F - 0.15], dark);
    }
    // Gas lamp on a bracket.
    s.rod([-W / 2, 2.2, F], [-W / 2 - 0.3, 2.3, F + 0.2], 0.018, iron);
    s.ball([0.09, 0.11, 0.09], [-W / 2 - 0.3, 2.2, F + 0.2], new THREE.MeshStandardMaterial({ color: open ? '#ffe2a0' : '#8b8778', emissive: '#ffb648', emissiveIntensity: open ? 1.3 : 0, roughness: 0.4 }), 12);

    // Queue rope.
    const posts = 2 + Math.round(a.rope * 5);
    const rope = s.material(a.finish === 'salon' ? '#9a1f2a' : a.finish === 'shack' ? '#8a7a5a' : '#7a1f24', { roughness: 0.9 });
    const route: P[] = [];
    for (let i = 0; i < posts; i++) {
      const lane = Math.floor(i / 3), along = i % 3;
      const z = F + 1.1 + lane * 0.95;
      const x = lane % 2 ? -1.15 + (2 - along) * 1.0 : -1.15 + along * 1.0;
      route.push([x + (random() - 0.5) * 0.08, 0, z + (random() - 0.5) * 0.08]);
    }
    if (a.state === 'closed') route.splice(0, route.length, [-0.95, 0, F + 0.75], [0.95, 0, F + 0.75]);
    const toppled = robbed ? Math.floor(random() * route.length) : -1;
    route.forEach(([x, , z], index) => {
      if (index === toppled) {
        const post = s.cylinder(0.025, 0.025, 0.95, [x, 0.04, z], brass, 10);
        post.rotation.set(Math.PI / 2, 0, random() * 3);
        s.cylinder(0.15, 0.17, 0.04, [x + 0.3, 0.02, z + 0.3], brass, 16);
        return;
      }
      s.cylinder(0.15, 0.17, 0.04, [x, 0.02, z], brass, 16);
      s.cylinder(0.025, 0.025, 0.95, [x, 0.5, z], brass, 10);
      s.ball([0.05, 0.05, 0.05], [x, 1.0, z], brass, 10);
    });
    for (let i = 0; i + 1 < route.length; i++) {
      if (i === toppled || i + 1 === toppled) continue;
      const [x0, , z0] = route[i], [x1, , z1] = route[i + 1];
      s.tube([[x0, 0.94, z0], [(x0 + x1) / 2, 0.74, (z0 + z1) / 2], [x1, 0.94, z1]], 0.022, rope);
    }

    // Those who wait.
    const figure = (at: P, turn: number, stoop: number, fallen = false) => {
      const person = new THREE.Group();
      person.position.set(at[0], 0, at[2]);
      person.rotation.y = turn;
      s.root.add(person);
      const coat = s.material(['#4a4f58', '#5a4638', '#39453e', '#6a5a66'][Math.floor(random() * 4)], { roughness: 0.9 });
      const upper = new THREE.Group();
      upper.position.y = 0.9;
      upper.rotation.x = stoop;
      const skirt = s.cylinder(0.15, 0.24, 0.9, [0, 0.45, 0], coat, 12);
      const chest = s.cylinder(0.12, 0.17, 0.5, [0, 0.25, 0], coat, 12);
      const head = s.ball([0.1, 0.12, 0.1], [0, 0.66, 0.02], s.material('#efe9dd', { roughness: 0.35 }), 12);
      const hat = s.cylinder(0.09, 0.13, 0.08, [0, 0.77, 0], dark, 12);
      const key = windKey(brass, 0.34, 'butterfly');
      key.position.set(0, 0.3, -0.13);
      key.rotation.x = -Math.PI / 2;
      upper.add(chest, head, hat, key);
      person.add(skirt, upper);
      if (fallen) { person.rotation.set(Math.PI / 2 - 0.08, 0, turn, 'YXZ'); person.rotation.order = 'YXZ'; person.rotation.set(-Math.PI / 2 + 0.1, turn, 0); person.position.y = 0.22; }
      return person;
    };
    if (a.waiting === 'one') figure([spX, 0, F + 0.56], 0, 0.3);
    else if (a.waiting === 'queue') {
      figure([spX, 0, F + 0.56], 0, 0.22);
      for (let i = 0; i < 3; i++) figure([spX - 0.25 + (random() - 0.5) * 0.2, 0, F + 1.55 + i * 0.75], Math.PI + (random() - 0.5) * 0.4, 0.15 + i * 0.14);
    } else if (a.waiting === 'collapsed') figure([spX + 0.5 + random() * 0.5, 0, F + 2.1 + random() * 0.4], Math.PI + (random() - 0.5), 0, true);

    if (robbed) {
      const coin = s.material('#e8c552', { metalness: 0.5, roughness: 0.3 });
      s.scatter(new THREE.CylinderGeometry(1, 1, 0.3, 10), coin, Array.from({ length: 24 + Math.round(mood.density * 30) }, () => ({ at: [coinX + (random() - 0.5) * 1.8, 0.008, F + 0.3 + random() * 1.4] as const, size: 0.035 + random() * 0.015 })));
      const bar = s.rod([coinX + 0.5, 0.03, F + 0.5], [coinX + 1.2, 0.03, F + 0.9], 0.025, iron);
      void bar;
    }

    const speed = open ? mix(0.3, 1.8, mood.energy) : 0;
    return s.finish({
      footprint: 1.5,
      update: (dt) => {
        crank.rotation.z -= dt * speed;
        pinion.rotation.z += dt * speed * 4.1;
        spindle.rotation.z += dt * speed * 3;
        if (finial) finial.rotation.y += dt * speed * 0.6;
      },
    });
  },
});
