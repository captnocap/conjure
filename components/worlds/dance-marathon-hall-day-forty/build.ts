import * as THREE from 'three';
import { type Figure, choice, defineWorld, diorama, figure, mix, noul } from '@conjure/kit';
import { paint, rig } from './rig';

const SPONSORS = ["DUKE'S DINER", 'ACME SHOE REPAIR', 'SUNRISE BAKERY', 'STAR CAB CO.', 'MAJESTIC HOTEL', 'BLUE MOON CAFE', 'EMPIRE LAUNDRY', 'RIALTO DRUGS', 'OWL CIGARS', 'GOLD SEAL FLOUR'];

export default defineWorld({
  questions: {
    hour: choice('What hour is it?', {
      dawn: 'Grey dawn through the high windows, the bulbs still burning, the night shift of spectators gone home.',
      afternoon: 'Afternoon, flat daylight from the windows, matinee crowd on the bleachers.',
      midnight: 'Midnight under the bare bulbs, the windows black, the hall warm and loud.',
      smallhours: 'Three in the morning, the bulbs the only light, half the chairs empty, the band gone thin.',
    }),
    couples: choice('How many couples remain?', {
      crowded: 'Still crowded: forty-odd couples, the floor a slow shuffling herd.',
      thinning: 'Thinning out: twenty couples with gaps between them.',
      dozen: 'A dozen left, the floor mostly empty boards.',
      last: 'The last three couples, each in its own pool of light.',
    }),
    band: noul('Is the band playing?'),
    banner: choice('What does the painted banner over the stage promise as the prize?', {
      thousand: '$1,000 CASH PRIZE, in gold letters on red.',
      fifteen: '$1,500 TO THE LAST COUPLE STANDING.',
      home: 'A HOME OF YOUR OWN, with a painted bungalow.',
      job: '$500 AND A STEADY JOB.',
      fame: 'FAME AND FORTUNE, the lettering already peeling.',
    }),
    walls: choice('What are the walls like?', {
      cream: 'Cream plaster gone yellow with smoke.',
      green: 'Dark green paint to shoulder height, cream above.',
      brick: 'Bare brick painted over white long ago.',
      panel: 'Brown varnished wood panelling, a hall rented from a lodge.',
    }),
    bunting: choice('What hangs from the ceiling?', {
      patriotic: 'Red, white and blue bunting across the hall.',
      faded: 'Faded pastel bunting left from some other party.',
      none: 'Nothing but the bare bulbs on their strings.',
    }),
    crowd: choice('How full are the bleachers?', {
      packed: 'Packed, a dark mass of coats and hats.',
      sparse: 'A few diehards dotted along the planks.',
      empty: 'Empty planks, a coat left on one.',
    }),
    cards: noul('Are the walls covered in sponsor cards?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const night = { dawn: 0.45, afternoon: 0, midnight: 1, smallhours: 1 }[a.hour];
    const W = 16, D = 12;
    const background = { dawn: '#d6d4cf', afternoon: '#dedbd0', midnight: '#b8b0a4', smallhours: '#aca498' }[a.hour];
    const { art: s, world } = diorama(context, {
      background, floor: '#9c7e58', width: W, depth: D, maxHeight: 2.4, radius: 1.3, pitch: 30, yaw: 26, scale: [0.8, 1.35],
      slots: [[0, 1.0], [-3.0, -0.8], [3.0, -0.6], [-2.4, 2.8], [2.6, 2.9], [0, -2.6]],
    });
    const root = s.root;
    if (world.keyLight) {
      world.keyLight.intensity *= mix(1, 0.35, night);
      if (a.hour === 'dawn') world.keyLight.color.set('#c8d0e8');
      if (night === 1) world.keyLight.color.set('#f0d9b0');
    }
    for (const light of root.children) if ((light as THREE.HemisphereLight).isHemisphereLight) (light as THREE.HemisphereLight).intensity *= mix(1, 0.55, night);

    const wood = s.material(pick(['#8a6a44', '#7a5a3a', '#6a5038']), { roughness: 0.85 });
    const darkWood = s.material('#3e2e20', { roughness: 0.7 });
    const iron = s.material('#3a3a3c', { metalness: 0.6, roughness: 0.5 });
    const chrome = s.material('#d9dde0', { metalness: 0.9, roughness: 0.22 });

    // ---- the sprung floor: boards, and a scuffed grey oval where forty days of shoes have been
    const boards = paint(256, 256, (c) => {
      for (let x = 0; x < 256; x += 24) {
        const shade = 150 + random() * 40;
        c.fillStyle = `rgb(${shade + 20}, ${shade - 10}, ${shade - 60})`;
        c.fillRect(x, 0, 24, 256);
        c.fillStyle = 'rgba(60,40,20,0.5)';
        c.fillRect(x, 0, 2, 256);
        for (let i = 0; i < 5; i++) { c.fillStyle = `rgba(80,55,30,${0.1 + random() * 0.2})`; c.fillRect(x + 4 + random() * 14, random() * 256, 2, 20 + random() * 60); }
      }
    });
    boards.wrapS = boards.wrapT = THREE.RepeatWrapping;
    boards.repeat.set(W / 1.5, D / 1.5);
    const floor = s.mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: boards, roughness: 0.75 }), [0, 0.012, 0]);
    floor.rotation.x = -Math.PI / 2;
    const scuff = s.mesh(new THREE.CircleGeometry(4.2, 40), new THREE.MeshStandardMaterial({ color: '#4a4036', transparent: true, opacity: 0.05 + mood.wear * 0.2, depthWrite: false, roughness: 1 }), [0, 0.02, 0.4]);
    scuff.rotation.x = -Math.PI / 2;
    scuff.scale.x = 1.35;

    // ---- walls: a back wall and a left wall, high windows, smoke
    const wallColours = { cream: ['#e2d7b8', '#e2d7b8'], green: ['#2f4a3a', '#e3dcc4'], brick: ['#d9d2c0', '#d9d2c0'], panel: ['#5a3e28', '#5a3e28'] }[a.walls];
    const wallMap = (width: number) => {
      const map = paint(512, 256, (c) => {
        c.fillStyle = wallColours[1];
        c.fillRect(0, 0, 512, 256);
        if (a.walls === 'green') { c.fillStyle = wallColours[0]; c.fillRect(0, 150, 512, 106); c.fillStyle = '#1f3328'; c.fillRect(0, 148, 512, 6); }
        if (a.walls === 'brick') {
          c.fillStyle = 'rgba(150,100,80,0.35)';
          for (let y = 0; y < 256; y += 12) for (let x = ((y / 12) % 2) * 16; x < 512; x += 32) c.fillRect(x, y, 30, 10);
        }
        if (a.walls === 'panel') {
          for (let x = 0; x < 512; x += 20) { c.fillStyle = `rgba(30,15,5,${0.15 + random() * 0.25})`; c.fillRect(x, 0, 3, 256); }
          c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, 120, 512, 5);
        }
        const smoke = c.createLinearGradient(0, 0, 0, 256);
        smoke.addColorStop(0, `rgba(60,45,25,${0.25 + mood.wear * 0.4})`);
        smoke.addColorStop(0.5, 'rgba(60,45,25,0)');
        smoke.addColorStop(1, `rgba(40,40,30,${mood.wear * 0.35})`);
        c.fillStyle = smoke;
        c.fillRect(0, 0, 512, 256);
      });
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(width / 8, 1);
      return new THREE.MeshStandardMaterial({ map, roughness: 0.95 });
    };
    const WH = 5.6;
    s.mesh(new THREE.BoxGeometry(W + 0.4, WH, 0.2), wallMap(W), [0, WH / 2, -D / 2 - 0.1]);
    s.mesh(new THREE.BoxGeometry(0.2, WH, D), wallMap(D), [-W / 2 - 0.1, WH / 2, 0]);
    s.box([W + 0.4, 0.14, 0.05], [0, 0.07, -D / 2 + 0.02], darkWood);
    s.box([0.05, 0.14, D], [-W / 2 + 0.02, 0.07, 0], darkWood);
    const sky = { dawn: ['#c9cfe0', 1.4], afternoon: ['#e8eef4', 1.8], midnight: ['#1f2436', 0.15], smallhours: ['#181c2a', 0.1] }[a.hour] as [string, number];
    const pane = new THREE.MeshStandardMaterial({ color: sky[0], emissive: sky[0], emissiveIntensity: sky[1], roughness: 0.3 });
    const windowAt = (x: number, z: number, onBack: boolean) => {
      const frame = s.box(onBack ? [1.4, 1.7, 0.1] : [0.1, 1.7, 1.4], [x, 3.7, z], darkWood);
      void frame;
      const glass = s.mesh(new THREE.PlaneGeometry(1.2, 1.5), pane, onBack ? [x, 3.7, z + 0.06] : [x + 0.06, 3.7, z]);
      if (!onBack) glass.rotation.y = Math.PI / 2;
      for (const d of [-0.3, 0.3]) s.box(onBack ? [0.04, 1.5, 0.03] : [0.03, 1.5, 0.04], onBack ? [x + d, 3.7, z + 0.07] : [x + 0.07, 3.7, z + d], darkWood);
      s.box(onBack ? [1.2, 0.04, 0.03] : [0.03, 0.04, 1.2], onBack ? [x, 3.7, z + 0.07] : [x + 0.07, 3.7, z], darkWood);
    };
    for (const x of [-6.4, -4.4, 3.9, 7.0]) windowAt(x, -D / 2 + 0.02, true);
    for (const z of [-3.5, 0]) windowAt(-W / 2 + 0.02, z, false);

    // ---- the rail round the floor: a U of posts and planks, open at the front
    const posts: { at: [number, number, number]; size: number }[] = [];
    const RX = 5.6, RZB = -3.6, RZF = 4.3;
    for (let z = RZB; z <= RZF + 0.01; z += 1.13) { posts.push({ at: [-RX, 0.56, z], size: 1 }); posts.push({ at: [RX, 0.56, z], size: 1 }); }
    for (let x = -RX + 1.12; x < RX - 0.5; x += 1.12) posts.push({ at: [x, 0.56, RZB], size: 1 });
    s.scatter(new THREE.BoxGeometry(0.08, 1.12, 0.08), wood, posts);
    for (const x of [-RX, RX]) { s.box([0.2, 0.05, RZF - RZB + 0.2], [x, 1.12, (RZB + RZF) / 2], wood); s.box([0.05, 0.05, RZF - RZB + 0.2], [x, 0.62, (RZB + RZF) / 2], wood); }
    s.box([RX * 2 + 0.2, 0.05, 0.2], [0, 1.12, RZB], wood);
    s.box([RX * 2 + 0.2, 0.05, 0.05], [0, 0.62, RZB], wood);
    // Tin plates and mugs left along the back rail: the trough.
    const tin = s.material('#c9c4b4', { metalness: 0.65, roughness: 0.4 });
    for (let i = 0; i < 3 + Math.round(mood.density * 5); i++) {
      const x = (random() - 0.5) * 10;
      if (random() < 0.6) s.cylinder(0.12, 0.1, 0.012, [x, 1.15, RZB], tin, 14);
      else s.cylinder(0.035, 0.032, 0.09, [x, 1.19, RZB + 0.03], tin, 10);
    }

    // ---- the bandstand at the back, with a banner above it
    const SZ = -4.9, SH = 0.45;
    s.box([6.6, SH, 2.1], [0, SH / 2, SZ], s.material(pick(['#5a3a2a', '#3a3a40', '#6a4a3a']), { roughness: 0.8 }));
    s.box([6.6, 0.06, 2.1], [0, SH + 0.03, SZ], wood);
    const bannerText = { thousand: '$1,000 CASH PRIZE', fifteen: '$1,500 TO THE LAST COUPLE', home: 'A HOME OF YOUR OWN', job: '$500 AND A STEADY JOB', fame: 'FAME AND FORTUNE' }[a.banner];
    const bannerMap = paint(1024, 192, (c) => {
      const red = a.banner === 'fame' ? '#8a7a58' : '#8f2a26';
      c.fillStyle = red; c.fillRect(0, 0, 1024, 192);
      c.strokeStyle = '#e9c45a'; c.lineWidth = 10; c.strokeRect(14, 14, 996, 164);
      c.fillStyle = '#f1dc8a'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `bold ${bannerText.length > 18 ? 66 : 84}px sans-serif`;
      c.fillText(bannerText, 512, 78);
      c.font = 'bold 34px sans-serif'; c.fillStyle = '#f6ecc8';
      c.fillText('DANCE MARATHON  ·  DAY 40', 512, 148);
      if (a.banner === 'home') { c.fillStyle = '#f6ecc8'; c.fillRect(60, 60, 70, 50); c.beginPath(); c.moveTo(50, 62); c.lineTo(95, 28); c.lineTo(140, 62); c.closePath(); c.fill(); }
      if (a.banner === 'fame') for (let i = 0; i < 12; i++) { c.fillStyle = 'rgba(120,110,80,0.6)'; c.fillRect(random() * 1000, random() * 180, 10 + random() * 40, 6 + random() * 20); }
    });
    const banner = s.mesh(new THREE.PlaneGeometry(5.4, 1.0), new THREE.MeshStandardMaterial({ map: bannerMap, roughness: 0.9, side: THREE.DoubleSide }), [0, 4.35, SZ + 0.3]);
    banner.rotation.x = 0.08;
    for (const x of [-2.6, 2.6]) s.rod([x, 4.85, SZ + 0.3], [x, WH, SZ - 0.6], 0.012, iron);
    // Stands, chairs, a drum, an upright piano, the microphone.
    const standAt = (x: number, z: number) => {
      s.cylinder(0.02, 0.025, 1.0, [x, SH + 0.5, z], iron, 8);
      s.cylinder(0.16, 0.16, 0.02, [x, SH + 0.01, z], iron, 10);
      const desk = s.box([0.4, 0.3, 0.015], [x, SH + 1.1, z + 0.05], iron);
      desk.rotation.x = -0.45;
    };
    const standPositions: [number, number][] = [[-2.0, SZ + 0.6], [-0.7, SZ + 0.7], [0.7, SZ + 0.7], [2.0, SZ + 0.6]];
    for (const [x, z] of standPositions) { standAt(x, z); s.box([0.4, 0.04, 0.4], [x, SH + 0.46, z - 0.6], darkWood); s.box([0.4, 0.4, 0.04], [x, SH + 0.68, z - 0.8], darkWood); }
    s.cylinder(0.32, 0.32, 0.4, [-2.6, SH + 0.3, SZ - 0.5], s.material('#d9d0b4', { roughness: 0.6 }), 20).rotation.x = Math.PI / 2;
    s.cylinder(0.33, 0.33, 0.03, [-2.6, SH + 0.3, SZ - 0.29], chrome, 20).rotation.x = Math.PI / 2;
    s.box([1.5, 1.25, 0.6], [2.4, SH + 0.625, SZ - 0.55], s.material('#2a1e16', { roughness: 0.4 }));
    s.box([1.3, 0.02, 0.2], [2.4, SH + 0.86, SZ - 0.2], s.material('#f1ece0'));
    s.cylinder(0.17, 0.19, 0.025, [0, SH + 0.012, SZ + 1.5], chrome, 20);
    s.cylinder(0.011, 0.013, 1.5, [0, SH + 0.77, SZ + 1.5], chrome, 10);
    const micHead = s.mesh(new THREE.CapsuleGeometry(0.05, 0.09, 4, 14), chrome, [0, SH + 1.6, SZ + 1.5]);
    micHead.scale.z = 0.55;
    const band: Figure[] = [];
    if (a.band) {
      const brass = s.material('#c9a44a', { metalness: 0.7, roughness: 0.3 });
      standPositions.forEach(([x, z], i) => {
        if (a.hour === 'smallhours' && i % 2) return;
        const player = figure(s, { height: mix(1.66, 1.8, random()), style: 'silhouette', pose: 'sitting', hair: i % 2 ? 'hat' : 'short' });
        player.root.position.set(x, SH, z - 0.5);
        root.add(player.root);
        const rp = rig(player);
        rp.arm('left', { forward: 60, out: 15, bend: 90, across: 40 });
        rp.arm('right', { forward: 60, out: 15, bend: 90, across: 40 });
        rp.settle();
        player.root.position.set(x, SH, z - 0.55);
        rp.settle(false);
        player.root.position.y += SH;
        band.push(player);
        if (i % 2) s.rod([x, SH + 1.05, z - 0.3], [x, SH + 1.0, z + 0.15], 0.03, brass, 0.07);
        else s.tube([[x - 0.05, SH + 1.1, z - 0.3], [x - 0.05, SH + 0.75, z - 0.25], [x + 0.05, SH + 0.65, z - 0.1], [x + 0.1, SH + 0.8, z]], 0.025, brass);
      });
    } else {
      // The band is on a break: a wind-up gramophone plays from the stage.
      s.box([0.5, 0.3, 0.5], [-0.9, SH + 0.15, SZ + 0.9], darkWood);
      const horn = s.lathe([[0.03, 0], [0.05, 0.1], [0.12, 0.3], [0.26, 0.5]], s.material('#b89a4a', { metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }), [-0.9, SH + 0.35, SZ + 0.9]);
      horn.rotation.x = -0.9;
      s.label('BAND BREAK', 0.9, 0.35, [1.0, SH + 0.9, SZ + 0.9], '#2a2320', '#efe6cc').rotation.y = 0;
    }

    // ---- the tote board on the left wall
    const hours = { dawn: 950, afternoon: 958, midnight: 967, smallhours: 970 }[a.hour] + Math.floor(random() * 6);
    const remaining = { crowded: 38 + Math.floor(random() * 10), thinning: 17 + Math.floor(random() * 6), dozen: 10 + Math.floor(random() * 4), last: 3 }[a.couples];
    const toteMap = paint(256, 512, (c) => {
      c.fillStyle = '#1f2321'; c.fillRect(0, 0, 256, 512);
      c.fillStyle = '#efe6cf'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = 'bold 54px sans-serif'; c.fillText('HOURS', 128, 50); c.fillRect(20, 85, 216, 4);
      c.fillStyle = '#f0f0ea'; c.font = 'bold 96px monospace'; c.fillText(String(hours).padStart(4, '0'), 128, 160);
      c.fillStyle = '#efe6cf'; c.font = 'bold 30px sans-serif'; c.fillText('COUPLES LEFT', 128, 270); c.font = 'bold 80px monospace'; c.fillText(String(remaining), 128, 340);
      c.font = 'bold 28px sans-serif'; c.fillText(bannerText.length > 16 ? 'PRIZE' : bannerText, 128, 440);
    });
    // On the back wall beside the stage, where the whole hall can read it, with the chalk boy's stepladder below.
    const TX = 5.45;
    s.mesh(new THREE.PlaneGeometry(1.3, 2.6), new THREE.MeshStandardMaterial({ map: toteMap, roughness: 0.95 }), [TX, 2.3, -D / 2 + 0.13]);
    s.box([1.5, 2.8, 0.06], [TX, 2.3, -D / 2 + 0.1], darkWood);
    s.box([0.4, 0.04, 0.4], [TX - 0.9, 1.0, -D / 2 + 0.45], wood);
    for (const dx of [-0.17, 0.17]) s.rod([TX - 0.9 + dx * 1.4, 0, -D / 2 + 0.7], [TX - 0.9 + dx, 1.0, -D / 2 + 0.45], 0.02, wood);

    // ---- sponsor cards and bunting
    if (a.cards) {
      const names = [...SPONSORS].sort(() => random() - 0.5);
      names.slice(0, 5).forEach((name, i) => {
        const card = s.label(name, 1.1, 0.5, [-6.6 + i * 1.9 + (random() - 0.5) * 0.3, 2.3 + (random() - 0.5) * 0.3, -D / 2 + 0.03], pick(['#2a2320', '#8a2a2a', '#1f3a6a']), pick(['#efe6cc', '#f4e0a0', '#dfe8e4']));
        card.rotation.z = (random() - 0.5) * 0.08;
      });
      names.slice(5, 9).forEach((name, i) => {
        const card = s.label(name, 1.1, 0.5, [-W / 2 + 0.03, 2.9 + (random() - 0.5) * 0.3, -2.0 + i * 1.6], '#2a2320', pick(['#efe6cc', '#f4e0a0']));
        card.rotation.y = Math.PI / 2;
      });
    }
    if (a.bunting !== 'none') {
      const colours = a.bunting === 'patriotic' ? ['#b8322a', '#efe9dc', '#2a4a8a'] : ['#d9b8c0', '#c8d4b8', '#e8d8a8', '#b8c8d8'];
      const flag = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.16, 0), new THREE.Vector2(0.16, 0), new THREE.Vector2(0, -0.34)]));
      const cloth = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, side: THREE.DoubleSide });
      const strings: [THREE.Vector3, THREE.Vector3][] = [
        [new THREE.Vector3(-W / 2, 4.9, -1.6), new THREE.Vector3(W / 2, 4.7, -1.6)],
        [new THREE.Vector3(-W / 2, 4.8, 2.4), new THREE.Vector3(W / 2, 4.9, 2.4)],
        [new THREE.Vector3(-3.5, 5.2, -D / 2), new THREE.Vector3(5.5, 4.6, D / 2)],
      ];
      for (const [from, to] of strings) {
        const mid = from.clone().lerp(to, 0.5); mid.y -= 0.35;
        const curve = new THREE.CatmullRomCurve3([from, mid, to]);
        s.mesh(new THREE.TubeGeometry(curve, 24, 0.006, 5), iron);
        const flags: { at: [number, number, number]; size: number; color: string }[] = [];
        const count = Math.round(from.distanceTo(to) / 0.42);
        for (let i = 1; i < count; i++) { const p = curve.getPoint(i / count); flags.push({ at: [p.x, p.y - 0.01, p.z], size: 1, color: colours[i % colours.length] }); }
        const mesh = s.scatter(flag, cloth, flags);
        // Flags on the long string hang across it rather than along it.
        if (Math.abs(to.z - from.z) > Math.abs(to.x - from.x)) { const m = new THREE.Matrix4(); flags.forEach((f, i) => { m.makeRotationY(Math.PI / 2).setPosition(...f.at); mesh.setMatrixAt(i, m); }); mesh.instanceMatrix.needsUpdate = true; }
      }
    }

    // ---- bare bulbs on strings, the brightest over the hero
    const bulbGlow = mix(0.5, 2.6, night) * (a.hour === 'afternoon' ? 0.4 : 1);
    const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff3d0', emissive: new THREE.Color().setHSL(mix(0.12, 0.08, mood.warmth), 0.9, 0.6), emissiveIntensity: bulbGlow, roughness: 0.3 });
    const bulbs: { at: [number, number, number]; size: number }[] = [];
    for (const z of [-2.6, 0.0, 2.8]) {
      s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-W / 2, 4.6, z), new THREE.Vector3(0, 4.35, z), new THREE.Vector3(W / 2, 4.6, z)]), 24, 0.006, 5), iron);
      for (let x = -6.5; x <= 6.6; x += 1.3) bulbs.push({ at: [x, 4.2 + Math.abs(x) * 0.02, z], size: 0.07 });
    }
    s.scatter(new THREE.SphereGeometry(1, 10, 8), bulbMat, bulbs);
    s.scatter(new THREE.CylinderGeometry(0.03, 0.035, 0.07, 8), iron, bulbs.map((b) => ({ at: [b.at[0], b.at[1] + 0.08, b.at[2]] as [number, number, number], size: 1 })));
    s.rod([0, 4.35, 0.9], [0, 3.55, 1.0], 0.006, iron);
    s.cylinder(0.04, 0.045, 0.09, [0, 3.52, 1.0], iron, 8);
    const heroBulb = s.ball([0.1, 0.13, 0.1], [0, 3.4, 1.0], new THREE.MeshStandardMaterial({ color: '#fff3d0', emissive: bulbMat.emissive, emissiveIntensity: bulbGlow * 1.3, roughness: 0.3 }), 14);
    void heroBulb;
    const lamp = new THREE.PointLight(bulbMat.emissive, mix(0.3, 14, night), 10, 1.7);
    lamp.position.set(0, 3.3, 1.0);
    root.add(lamp);

    // ---- bleachers on the left with their spectators, folding chairs along the back right
    const dark = s.material('#2a2724', { roughness: 1 });
    const spectators: Figure[] = [];
    for (let tier = 0; tier < 3; tier++) {
      s.box([0.7, 0.42 * (tier + 1), 6.4], [-6.5 - tier * 0.7, 0.21 * (tier + 1), -0.2], tier % 2 ? darkWood : wood);
    }
    const crowdCount = { packed: 5, sparse: 2, empty: 0 }[a.crowd] - (a.hour === 'smallhours' && a.crowd === 'packed' ? 2 : 0);
    for (let i = 0; i < crowdCount; i++) {
      const tier = i % 3;
      const z = -2.6 + (i * 1.37 + random() * 0.6) % 5.4;
      const who = figure(s, { height: mix(1.6, 1.8, random()), style: 'silhouette', pose: random() < 0.3 ? 'slumped' : 'sitting', hair: random() < 0.6 ? 'hat' : 'short', build: pick(['average', 'heavy']) });
      root.add(who.root);
      who.root.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.4;
      who.root.position.set(-6.5 - tier * 0.7 + 0.15, 0.42 * (tier + 1) - who.hipHeight, z);
      spectators.push(who);
    }
    if (a.crowd === 'empty') s.box([0.5, 0.12, 0.9], [-6.4, 0.48, 1.2], s.material('#4a3f33', { roughness: 1 }));
    const chairSeats: { at: [number, number, number]; size: number }[] = [], chairBacks: { at: [number, number, number]; size: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const x = 3.6 + i * 0.62, z = -D / 2 + 0.7 + (random() - 0.5) * 0.2;
      chairSeats.push({ at: [x, 0.45, z], size: 1 });
      chairBacks.push({ at: [x, 0.78, z - 0.2], size: 1 });
    }
    s.scatter(new THREE.BoxGeometry(0.42, 0.03, 0.4), wood, chairSeats);
    s.scatter(new THREE.BoxGeometry(0.42, 0.4, 0.03), wood, chairBacks);
    s.scatter(new THREE.BoxGeometry(0.03, 0.45, 0.03), iron, chairSeats.flatMap((c) => [[-0.18, 0.18], [0.18, 0.18], [-0.18, -0.18], [0.18, -0.18]].map(([dx, dz]) => ({ at: [c.at[0] + dx, 0.22, c.at[2] + dz] as [number, number, number], size: 1 }))));

    // ---- the rest area: a curtain half drawn, cots beyond it, someone asleep
    const curtain = s.material(pick(['#5a1f24', '#3a2a4a', '#2a3a3a']), { roughness: 1 });
    s.rod([5.9, 3.3, -2.2], [W / 2, 3.3, -2.2], 0.02, iron);
    const drape = s.box([1.15, 3.2, 0.12], [W / 2 - 0.6, 1.65, -2.2], curtain);
    for (let i = 0; i < 6; i++) s.box([0.08, 3.1, 0.16], [W / 2 - 1.12 + i * 0.2, 1.65, -2.2], curtain);
    void drape;
    const blanket = s.material(pick(['#6f6f6a', '#5a5f5a', '#7a6a5a']), { roughness: 1 });
    for (let i = 0; i < 3; i++) {
      const z = -3.3 - i * 1.15, x = 7.1;
      s.box([0.8, 0.08, 1.95], [x, 0.38, z], s.material('#c9c2b0', { roughness: 1 }));
      for (const dx of [-0.35, 0.35]) for (const dz of [-0.9, 0.9]) s.box([0.04, 0.36, 0.04], [x + dx, 0.18, z + dz], iron);
      if (i !== 1) s.box([0.78, 0.12, 1.3], [x, 0.48, z + 0.2], blanket);
    }
    const sleeper = figure(s, { height: 1.72, style: 'silhouette', pose: 'lying' });
    sleeper.root.position.set(7.1, 0.42, -4.45);
    root.add(sleeper.root);

    // ---- couples still shuffling at the far edge of the floor, by how many remain
    const couples: Figure[][] = [];
    const pairCount = { crowded: 2, thinning: 2, dozen: 1, last: 0 }[a.couples];
    const spots: [number, number][] = [[-4.2, -2.4], [4.3, -2.6]];
    for (let i = 0; i < pairCount; i++) {
      const [cx, cz] = spots[i];
      const turn = random() * Math.PI * 2;
      const pair: Figure[] = [];
      for (const side of [-1, 1]) {
        const who = figure(s, { height: mix(1.6, 1.8, random()), style: 'silhouette', pose: 'standing', hair: side > 0 ? 'short' : 'bun' });
        const rp = rig(who);
        rp.arm('left', { forward: 30, out: 65, bend: 20, across: 0 });
        rp.arm('right', { forward: 50, out: 20, bend: 70, across: 60 });
        rp.lean(6);
        rp.look(20, 0, side * 25);
        rp.settle();
        who.root.rotation.y = turn + (side > 0 ? Math.PI : 0);
        who.root.position.set(cx + Math.sin(turn) * 0.17 * side, 0, cz + Math.cos(turn) * 0.17 * side);
        rp.settle(false);
        root.add(who.root);
        pair.push(who);
      }
      couples.push(pair);
    }

    // The bulbs sway, the couples shuffle, the band keeps time.
    const energy = mood.energy;
    const phase = random() * Math.PI * 2;
    const people = [...band, ...spectators, ...couples.flat(), sleeper];
    const restHips = couples.flat().map((who) => [who.joints.hips.left.rotation.x, who.joints.hips.right.rotation.x] as const);
    world.update = (dt, time) => {
      for (const who of people) who.update(dt, time);
      lamp.intensity = mix(0.3, 14, night) * (1 + Math.sin(time * 9 + phase) * 0.03 * energy);
      couples.flat().forEach((who, i) => {
        const step = Math.sin(time * mix(0.6, 2, energy) + phase + i);
        who.joints.hips.left.rotation.x = restHips[i][0] - step * mix(0.03, 0.1, energy);
        who.joints.hips.right.rotation.x = restHips[i][1] + step * mix(0.03, 0.1, energy);
      });
      band.forEach((who, i) => { who.joints.elbows.right.rotation.x = -90 * Math.PI / 180 + Math.sin(time * mix(2, 6, energy) + i) * 0.12 * (0.3 + energy); });
    };
    return world;
  },
});
