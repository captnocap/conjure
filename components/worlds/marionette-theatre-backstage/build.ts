import * as THREE from 'three';
import { type Placeable, choice, clamp01, defineWorld, diorama, mix } from '@conjure/kit';

type P3 = [number, number, number];

function canvasTexture(width: number, height: number, draw: (g: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineWorld({
  questions: {
    theatre: choice('Whose theatre is it?', {
      prague: 'A Czech marionette company: dark walnut-stained timber, wine-red velvet curtain, gilt trim, playbills for Faust.',
      osaka: 'A Japanese bunraku troupe: pale cypress timber and a curtain in broad black, persimmon and green stripes.',
      pier: 'An English seaside pier show: flaking white paint, red and white striped curtain, a string of coloured bulbs.',
      sicily: 'A Sicilian opera dei pupi: ochre timber, a blue and yellow curtain, bright painted panels of knights.',
    }),
    hour: choice('What hour is it backstage?', {
      matinee: 'Minutes before a matinee: the stage lit bright beyond the curtain, everything laid out ready.',
      slack: 'The slack hour between two performances: light still on, nobody about.',
      night: 'Late after the last show: the stage dark, a single bare ghost light on a stand, the room blue.',
      shuttered: 'Off-season: shuttered and cold, dust sheets over the hampers, grey daylight through the gap.',
    }),
    gap: choice('How far open is the curtain?', {
      sliver: 'A sliver: one thin blade of light.',
      hand: "A hand's width, enough to peep through.",
      half: 'Half open: the footlights and the lit stage are plainly visible beyond.',
    }),
    hanging: choice('What hangs from the fly battens overhead?', {
      puppets: 'Spare marionettes, limp on their strings.',
      costumes: 'Small costumes on hangers: capes, gowns, a devil suit.',
      drops: 'A rolled backdrop and one half-unrolled painted cloth of sky and forest.',
      bare: 'Nothing but ropes and sandbags.',
    }),
    hampers: choice('How are the prop hampers?', {
      strapped: 'Closed and strapped, stencilled, ready to travel.',
      open: 'Lids thrown open, cloth and props spilling over the rims.',
      tipped: 'One tipped on its side with coloured balls and scraps rolled out across the floor.',
    }),
    floor: choice('What is underfoot?', {
      boards: 'Bare pale stage boards.',
      black: 'Boards painted matt black, scuffed grey along the walkways.',
      straw: 'Fairground duckboards scattered with straw.',
    }),
    board: choice('What is chalked on the call board?', {
      five: 'FIVE MINUTES', sold: 'SOLD OUT', silence: 'SILENCE', none: 'NO SHOW TODAY', next: 'NEXT TOWN FRIDAY',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const shut = a.hour === 'shuttered', night = a.hour === 'night';
    const neglect = clamp01(mood.wear * 0.7 + (shut ? 0.4 : 0));
    const dim = night ? 0.5 : shut ? 0.7 : a.hour === 'slack' ? 0.82 : 0.9;
    const background = night ? '#8a8fa3' : shut ? '#aeb0ac' : '#' + new THREE.Color('#c9b9a0').lerp(new THREE.Color('#d9bf9a'), mood.warmth * 0.6).getHexString();
    const floorColour = { boards: '#c2a57a', black: '#4a4744', straw: '#b79a6c' }[a.floor];
    // table, hamper lid, floor right, flown platform, floor left
    const slots: [number, number][] = [[0, 0.7], [-4.3, -1.5], [4.3, 2.3], [3.9, -2.2], [-3.6, 3.0]];
    const slotY = [1.07, 1.2, 0, 2.72, 0];
    const { art: s, world } = diorama(context, { background, floor: floorColour, width: 14.4, depth: 10, yaw: 19, pitch: 17, maxHeight: 3.4, radius: 1.4, slots });
    const root = s.root;
    root.traverse((node) => {
      const light = node as THREE.Light;
      if (!light.isLight) return;
      light.intensity *= dim;
      if (night) light.color.lerp(new THREE.Color('#9fb0e0'), 0.55);
      if (shut) light.color.lerp(new THREE.Color('#c4d0dc'), 0.5);
    });

    const dust = (c: string, k = 1) => new THREE.Color(c).lerp(new THREE.Color('#9b968a'), neglect * 0.45 * k);
    const mat = (c: string, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: dust(c), roughness: 0.82, ...o });
    const pal = {
      prague: { timber: '#5c3f2a', curtain: ['#7a1f2a', '#6a1823'], trim: '#c9a03a', accent: '#7a1f2a' },
      osaka: { timber: '#c9a876', curtain: ['#1d1c1e', '#c8622a', '#3d6b3f'], trim: '#1d1c1e', accent: '#c8622a' },
      pier: { timber: '#ddd6c6', curtain: ['#c8262b', '#f1ece0'], trim: '#2c5fae', accent: '#c8262b' },
      sicily: { timber: '#9a6a34', curtain: ['#1f4f8a', '#e0b030'], trim: '#c22a20', accent: '#e0b030' },
    }[a.theatre];
    const timber = mat(pal.timber), canvasMat = mat('#cdbb96', { roughness: 0.95 }), rope = mat('#b59a6a', { roughness: 0.95 }), iron = mat('#2b2c2f', { metalness: 0.5, roughness: 0.5 });
    const trim = mat(pal.trim, { metalness: a.theatre === 'prague' ? 0.6 : 0, roughness: 0.5 });

    // Floor detail.
    if (a.floor !== 'straw') for (let i = 0; i < 11; i++) s.box([0.025, 0.004, 10], [-6 + i * 1.2 + (random() - 0.5) * 0.1, 0.003, 0], mat(a.floor === 'black' ? '#2f2d2b' : '#9c7f55'));
    else {
      for (let i = 0; i < 5; i++) s.box([14.4, 0.05, 0.06], [0, 0.026, -4 + i * 2], mat('#8a6a40'));
      const straw = Array.from({ length: 130 }, () => ({ at: [(random() - 0.5) * 13.6, 0.02, (random() - 0.5) * 9.4] as P3, size: 0.6 + random() * 0.9, color: ['#e0c670', '#d1b257', '#c9a84a'][Math.floor(random() * 3)] }));
      const strawMesh = s.scatter(new THREE.BoxGeometry(0.5, 0.012, 0.02), new THREE.MeshStandardMaterial({ roughness: 1 }), straw);
      const m4 = new THREE.Matrix4();
      straw.forEach((p, i) => { m4.makeRotationY(random() * 3.14).scale(new THREE.Vector3(p.size, 1, 1)).setPosition(...p.at); strawMesh.setMatrixAt(i, m4); });
    }
    if (a.floor === 'black') for (const [x, z, w, d] of [[0, 2.4, 6, 1.6], [-2.6, -2, 1.4, 4]] as const) s.box([w, 0.004, d], [x, 0.004, z], mat('#6a6763', { roughness: 1 }));

    // Back of the proscenium: canvas flats on timber frames.
    const zf = -4.6, H = 6, half = 1.7, openH = 4.2;
    const flat = (x0: number, x1: number, y0: number, y1: number) => {
      const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      s.box([w, h, 0.03], [cx, cy, zf - 0.04], canvasMat);
      for (const y of [y0 + 0.07, y1 - 0.07]) s.box([w, 0.14, 0.07], [cx, y, zf], timber);
      if (h > 3) s.box([w, 0.12, 0.07], [cx, cy, zf], timber);
      for (const x of [x0 + 0.07, x1 - 0.07]) s.box([0.14, h, 0.07], [x, cy, zf], timber);
      if (w > 3) { s.box([0.12, h, 0.07], [cx, cy, zf], timber); for (const k of [-1, 1]) s.rod([cx + k * 0.1, y1 - 0.1, zf], [cx + k * (w / 2 - 0.1), y1 - 1.3, zf], 0.04, timber); }
    };
    flat(-7.2, -half, 0, H); flat(half, 7.2, 0, H); flat(-half, half, openH, H);
    // Stage braces with weights.
    for (const x of [-5.6, -2.6, 2.6, 5.6]) {
      s.rod([x, 3.6, zf + 0.05], [x, 0.05, zf + 1.5], 0.035, timber);
      s.box([0.5, 0.16, 0.36], [x, 0.08, zf + 1.55], iron);
      s.ring(0.09, 0.02, [x, 0.2, zf + 1.55], iron);
    }
    // Curtain from behind, and the light beyond it.
    const gap = { sliver: 0.26, hand: 0.6, half: 1.6 }[a.gap];
    const lightColour = shut ? new THREE.Color('#cfd9e2') : night ? new THREE.Color('#6f7fb0') : new THREE.Color().setHSL(mix(0.13, 0.075, mood.warmth), 0.95, mix(0.74, 0.66, mood.warmth));
    const strength = { matinee: 1, slack: 0.78, night: 0.22, shuttered: 0.5 }[a.hour];
    const glowMat = new THREE.MeshBasicMaterial({ color: lightColour.clone().multiplyScalar(mix(0.55, 1.25, strength)) });
    s.mesh(new THREE.PlaneGeometry(half * 2, openH), glowMat, [0, openH / 2, zf - 0.5]);
    if (a.gap === 'half' && !shut) {
      s.box([half * 2, 0.5, 0.5], [0, 0.25, zf - 0.3], timber);
      for (let i = 0; i < 5; i++) { const fx = -0.5 + i * 0.25; s.mesh(new THREE.SphereGeometry(0.12, 10, 6, 0, Math.PI), iron, [fx, 0.62, zf - 0.3]); s.ball([0.06, 0.06, 0.06], [fx, 0.62, zf - 0.34], glowMat, 8); }
    }
    const pleats: { at: P3; size: number; color: string }[] = [];
    for (const side of [-1, 1]) {
      const span = half - gap / 2, n = Math.max(3, Math.round(span / 0.2));
      for (let i = 0; i < n; i++) pleats.push({ at: [side * (gap / 2 + (i + 0.5) * span / n), openH / 2, zf - 0.12 + (i % 2) * 0.05], size: 1, color: '#' + dust(pal.curtain[Math.floor(i / (a.theatre === 'osaka' ? 3 : a.theatre === 'prague' ? 99 : 1)) % pal.curtain.length]).multiplyScalar(0.8).getHexString() });
    }
    s.scatter(new THREE.CylinderGeometry(0.115, 0.125, openH, 10), new THREE.MeshStandardMaterial({ roughness: 0.95 }), pleats);
    s.rod([-half - 0.2, openH + 0.06, zf - 0.1], [half + 0.2, openH + 0.06, zf - 0.1], 0.035, iron);
    // Light spilling through.
    const spill = new THREE.Shape();
    const g0 = gap / 2 + 0.03, g1 = gap / 2 + 0.75 + (a.gap === 'half' ? 0.5 : 0);
    spill.moveTo(-g0, zf); spill.lineTo(g0, zf); spill.lineTo(g1, 4.6); spill.lineTo(-g1, 4.6);
    const spillColour = shut || night ? lightColour : new THREE.Color().setHSL(mix(0.125, 0.08, mood.warmth), 1, 0.6);
    const spillMat = new THREE.MeshBasicMaterial({ color: spillColour, transparent: true, opacity: mix(0.16, 0.62, strength), depthWrite: false, blending: a.floor === 'black' ? THREE.AdditiveBlending : THREE.NormalBlending });
    const spillMesh = new THREE.Mesh(new THREE.ShapeGeometry(spill), spillMat);
    spillMesh.rotation.x = Math.PI / 2; spillMesh.position.y = 0.014;
    root.add(spillMesh);
    const tableGlow = new THREE.Mesh(new THREE.PlaneGeometry(g1 * 1.25, 2.02), spillMat);
    tableGlow.rotation.x = -Math.PI / 2; tableGlow.position.set(0, 1.076, 0.7);
    root.add(tableGlow);
    const beam = new THREE.SpotLight(lightColour, 150 * strength, 16, 0.3 + gap * 0.12, 0.7, 1.6);
    beam.position.set(0, 2.6, zf - 0.6);
    beam.target.position.set(0, 1.4, 1.2);
    root.add(beam, beam.target);

    // Left wall with playbills, and the pin rail.
    const wallTexture = canvasTexture(512, 320, (g) => {
      g.fillStyle = '#' + dust(a.theatre === 'pier' ? '#cfc8b8' : a.theatre === 'osaka' ? '#b89868' : '#6b4c34').getHexString(); g.fillRect(0, 0, 512, 320);
      g.strokeStyle = 'rgba(20,12,6,0.45)'; g.lineWidth = 2;
      for (let x = 0; x < 512; x += 32) { g.beginPath(); g.moveTo(x + random() * 2, 0); g.lineTo(x, 320); g.stroke(); }
      const bills = { prague: ['FAUST', 'DIVADLO', 'KASPAREK'], osaka: ['BUNRAKU-ZA', 'CHUSHINGURA', 'SONEZAKI'], pier: ['PUNCH', 'TWICE DAILY', 'PIER SHOW'], sicily: ['ORLANDO', 'OPERA DEI PUPI', 'RINALDO'] }[a.theatre];
      bills.forEach((text, i) => {
        const x = 40 + i * 150 + random() * 20, y = 70 + random() * 70, w = 110, h = 150;
        g.save(); g.translate(x + w / 2, y + h / 2); g.rotate((random() - 0.5) * 0.12);
        g.fillStyle = '#' + dust(['#e8dcb8', '#e3c9a0', '#d9d2c0'][i]).getHexString(); g.fillRect(-w / 2, -h / 2, w, h);
        g.fillStyle = '#' + dust(pal.accent).getHexString(); g.fillRect(-w / 2 + 8, -h / 2 + 40, w - 16, 62);
        g.fillStyle = '#2a1c14'; g.font = 'bold 20px serif'; g.textAlign = 'center'; g.fillText(text, 0, -h / 2 + 28, w - 12);
        g.font = '11px serif'; for (let k = 0; k < 3; k++) g.fillRect(-w / 2 + 14, h / 2 - 38 + k * 11, w - 28 - k * 14, 3);
        g.restore();
      });
    });
    s.mesh(new THREE.BoxGeometry(0.2, 5, 9.2), new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 0.9 }), [-7.1, 2.5, 0]);
    const railZ0 = -3.6, railZ1 = 1.6, railX = -6.55;
    s.box([0.22, 0.2, railZ1 - railZ0 + 0.4], [railX, 1.35, (railZ0 + railZ1) / 2], timber);
    for (const z of [railZ0, railZ1]) s.box([0.2, 1.35, 0.2], [railX, 0.675, z], timber);
    const swayers: { o: THREE.Object3D; phase: number; amp: number }[] = [];
    const pins = 8;
    for (let i = 0; i < pins; i++) {
      const z = mix(railZ0 + 0.3, railZ1 - 0.3, i / (pins - 1));
      s.cylinder(0.035, 0.028, 0.5, [railX, 1.4, z], mat('#d9c08a'), 8);
      if (i % 3 !== 2) {
        s.rod([railX, 1.5, z], [railX - 0.2, 5, z + (random() - 0.5) * 0.3], 0.018, rope);
        const hank = s.ring(0.17, 0.035, [railX + 0.14, 1.02, z], rope); hank.rotation.y = Math.PI / 2; hank.scale.y = 1.5;
      }
    }
    for (const z of [-2.4, 0.6]) {
      const bag = new THREE.Group(); bag.position.set(railX + 0.45, 3.3 + random() * 0.4, z); root.add(bag);
      bag.add(s.rod([0, 0, 0], [0, 1.6, 0], 0.015, rope));
      bag.add(s.ball([0.2, 0.3, 0.2], [0, -0.25, 0], mat('#a89474', { roughness: 1 }), 10));
      swayers.push({ o: bag, phase: random() * 6, amp: 0.5 });
    }

    // Fly battens overhead, carried by the wall and two posts.
    const battenY = 5.75;
    const battens = [-2.4, 0.9];
    for (const z of battens) {
      s.rod([-7, battenY, z], [6.7, battenY, z], 0.05, iron);
      s.box([0.2, battenY + 0.2, 0.2], [6.7, (battenY + 0.2) / 2, z], timber);
    }
    s.box([0.16, 0.16, 3.5], [6.7, battenY + 0.2, -0.75], timber);
    // Rope cleat on the near post.
    s.box([0.06, 0.34, 0.08], [6.56, 1.5, 0.9], iron);
    s.rod([6.56, 1.6, 0.9], [6.56, battenY, 0.9], 0.016, rope);
    for (let k = 0; k < 3; k++) s.ring(0.09, 0.016, [6.52, 1.5 + (k - 1) * 0.05, 0.9], rope).rotation.set(0.4 * (k - 1), Math.PI / 2, 0);
    // Call board.
    const text = { five: 'FIVE MINUTES', sold: 'SOLD OUT', silence: 'SILENCE', none: 'NO SHOW TODAY', next: 'NEXT TOWN FRIDAY' }[a.board];
    s.box([2.3, 0.86, 0.06], [4.4, 2.5, zf + 0.07], timber);
    s.label(text, 2.1, 0.68, [4.4, 2.5, zf + 0.11], '#ece8dc', '#26282a').rotation.z = (random() - 0.5) * 0.04;

    // What hangs from the battens.
    const hangX = [-5.2, -3.1, -1.2, 1.4, 5.6, 2.9].slice(0, 2 + Math.round(mood.density * 4));
    const hueMats = ['#b3262d', '#2f58b0', '#d9a52b', '#3f8f3a', '#6b2f9c', '#e9e3d0'].map((c) => mat(c));
    if (a.hanging === 'puppets') hangX.forEach((x, i) => {
      const z = battens[i % 2] + (i % 2 ? 0 : 0.0);
      if (i % 2 === 0 && Math.abs(x - 3.9) < 1.9) return;
      const g = new THREE.Group(); g.position.set(x, battenY, z); root.add(g);
      const drop = 1.3 + random() * 0.7, body = hueMats[i % hueMats.length], skin = mat('#e8c8a0');
      g.add(s.box([0.5, 0.04, 0.06], [0, -0.25, 0], mat('#d9c08a')));
      g.add(s.rod([0, 0, 0], [0, -0.25, 0], 0.012, rope));
      for (const k of [-1, 1]) { g.add(s.rod([k * 0.22, -0.25, 0], [k * 0.3, -drop - 0.75, 0.05], 0.007, iron)); g.add(s.rod([k * 0.06, -0.25, 0], [k * 0.1, -drop, 0], 0.007, iron)); }
      g.add(s.ball([0.17, 0.19, 0.17], [0, -drop - 0.12, 0.03], skin, 12));
      g.add(s.lathe([[0.3, 0], [0.22, 0.35], [0.1, 0.72], [0.001, 0.76]], body, [0, -drop - 1.05, 0]));
      for (const k of [-1, 1]) { g.add(s.rod([k * 0.12, -drop - 0.36, 0], [k * 0.3, -drop - 0.78, 0.05], 0.04, body)); g.add(s.rod([k * 0.09, -drop - 1.0, 0], [k * 0.11, -drop - 1.4, 0.04], 0.035, skin)); }
      const hat = i % 3;
      if (hat === 0) g.add(s.cylinder(0.001, 0.15, 0.36, [0, -drop + 0.2, 0.03], hueMats[(i + 2) % 6], 10));
      else if (hat === 1) g.add(s.cylinder(0.17, 0.14, 0.13, [0, -drop + 0.08, 0.03], trim, 10));
      g.rotation.y = (random() - 0.5) * 1.2;
      swayers.push({ o: g, phase: random() * 6, amp: 1 });
    });
    else if (a.hanging === 'costumes') hangX.forEach((x, i) => {
      const z = battens[i % 2];
      if (i % 2 === 0 && Math.abs(x - 3.9) < 1.9) return;
      const g = new THREE.Group(); g.position.set(x, battenY, z); root.add(g);
      const drop = 1.0 + random() * 0.5, cloth = hueMats[(i * 2 + 1) % hueMats.length];
      g.add(s.rod([0, 0, 0], [0, -drop, 0], 0.012, rope));
      g.add(s.rod([-0.4, -drop - 0.1, 0], [0, -drop, 0], 0.015, iron)); g.add(s.rod([0.4, -drop - 0.1, 0], [0, -drop, 0], 0.015, iron));
      const gown = s.lathe([[0.55, 0], [0.4, 0.6], [0.2, 1.25], [0.38, 1.38], [0.001, 1.42]], cloth, [0, -drop - 1.5, 0]); gown.scale.z = 0.35; g.add(gown);
      const band = s.cylinder(0.4, 0.42, 0.1, [0, -drop - 1.1, 0], trim, 14); band.scale.z = 0.36; g.add(band);
      g.rotation.y = (random() - 0.5) * 0.7;
      swayers.push({ o: g, phase: random() * 6, amp: 0.6 });
    });
    else if (a.hanging === 'drops') {
      const drop = canvasTexture(256, 256, (g) => {
        const sky = g.createLinearGradient(0, 0, 0, 256); sky.addColorStop(0, '#6fa3cf'); sky.addColorStop(0.6, '#d9e6d8'); sky.addColorStop(1, '#e9d9a8'); g.fillStyle = sky; g.fillRect(0, 0, 256, 256);
        g.fillStyle = '#f4f1e6'; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(random() * 256, 30 + random() * 70, 30 + random() * 26, 11, 0, 0, 7); g.fill(); }
        for (let i = 0; i < 16; i++) { const x = i * 17 + random() * 8, h = 60 + random() * 70; g.fillStyle = ['#2f5a36', '#3f7444', '#244a30'][i % 3]; g.beginPath(); g.moveTo(x - 20, 256); g.lineTo(x, 256 - h); g.lineTo(x + 20, 256); g.fill(); }
      });
      s.mesh(new THREE.PlaneGeometry(3.4, 2.6), new THREE.MeshStandardMaterial({ map: drop, roughness: 0.95, side: THREE.DoubleSide, color: dust('#ffffff', 0.7) }), [-4.6, battenY - 1.45, battens[0] + 0.02]);
      s.cylinder(0.11, 0.11, 3.5, [-4.6, battenY - 2.8, battens[0] + 0.02], canvasMat, 12).rotation.z = Math.PI / 2;
      const roll = s.cylinder(0.2, 0.2, 5.4, [-1.2, battenY - 0.55, battens[1]], canvasMat, 14); roll.rotation.z = Math.PI / 2;
      for (const x of [-3.4, -1.2, 1]) s.ring(0.24, 0.02, [x, battenY - 0.5, battens[1]], rope).rotation.y = Math.PI / 2;
    }
    if (a.hanging === 'bare' || a.hanging === 'drops') for (const x of [5.4, -5.8, 1.9].slice(0, 1 + Math.round(mood.density * 2))) {
      const bag = new THREE.Group(); bag.position.set(x, battenY, battens[1]); root.add(bag);
      const len = 1 + random() * 1.2;
      bag.add(s.rod([0, 0, 0], [0, -len, 0], 0.015, rope));
      bag.add(s.ball([0.2, 0.3, 0.2], [0, -len - 0.25, 0], mat('#a89474', { roughness: 1 }), 10));
      swayers.push({ o: bag, phase: random() * 6, amp: 0.7 });
    }
    if (a.theatre === 'pier') {
      const bulbs = Array.from({ length: 13 }, (_u, i) => ({ at: [-6.4 + i * 1.07, H + 0.16 - Math.sin((i % 4) / 4 * Math.PI) * 0.12, zf + 0.1] as P3, size: 1, color: ['#ffd24a', '#ff5a4a', '#5ac8ff', '#7be07a'][i % 4] }));
      const lit = !shut && !night;
      s.scatter(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshStandardMaterial({ emissive: '#ffffff', emissiveIntensity: lit ? mix(0.2, 0.7, mood.cheer) : 0, roughness: 0.3 }), bulbs);
      s.rod([-6.6, H + 0.26, zf + 0.1], [6.6, H + 0.26, zf + 0.1], 0.012, iron);
    } else if (a.theatre === 'prague' || a.theatre === 'sicily') { s.box([14.4, 0.14, 0.1], [0, H + 0.07, zf], trim); }

    // Flown platform (a hanging standing place).
    const [px, pz] = slots[3];
    s.box([2.9, 0.12, 2.0], [px, slotY[3] - 0.06, pz], timber);
    for (const x of [-1.35, 1.35]) for (const z of [-0.9, 0.9]) s.rod([px + x, slotY[3] - 0.06, pz + z], [px + x * 0.85, battenY, battens[0]], 0.022, rope);
    // Prop table in the light.
    const tableTop = mat('#a9865a');
    s.box([3.6, 0.1, 2.1], [0, slotY[0] - 0.05, 0.7], tableTop);
    for (const x of [-1.45, 1.45]) { for (const z of [-0.8, 0.8]) s.rod([x, slotY[0] - 0.1, 0.7 + z * 0.4], [x, 0, 0.7 + z], 0.05, timber); s.box([0.08, 0.08, 1.5], [x, 0.35, 0.7], timber); }
    const clutter = Math.round(mood.density * 4);
    for (let i = 0; i < clutter; i++) {
      const side = i % 2 ? 1 : -1, x = side * (1.52 + random() * 0.14), z = 0.0 + i * 0.36 + random() * 0.2;
      if (i % 3 === 0) { s.cylinder(0.1, 0.09, 0.2, [x, slotY[0] + 0.1, z], mat(['#b3262d', '#2f58b0', '#d9a52b'][i % 3], { roughness: 0.4 }), 12); s.rod([x, slotY[0] + 0.15, z], [x + 0.08, slotY[0] + 0.42, z + 0.05], 0.012, mat('#d9c08a')); }
      else if (i % 3 === 1) { const cross = s.box([0.5, 0.03, 0.05], [x, slotY[0] + 0.02, z], mat('#d9c08a')); cross.rotation.y = random() * 3; s.box([0.05, 0.03, 0.4], [x, slotY[0] + 0.045, z], mat('#d9c08a')).rotation.y = cross.rotation.y; }
      else s.ball([0.11, 0.13, 0.11], [x, slotY[0] + 0.13, z], mat('#e8c8a0'), 10);
    }

    // Hampers.
    const wicker = canvasTexture(128, 128, (g) => {
      g.fillStyle = '#' + dust('#b98f52').getHexString(); g.fillRect(0, 0, 128, 128);
      for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { g.fillStyle = (i + j) % 2 ? 'rgba(70,45,20,0.4)' : 'rgba(255,235,190,0.22)'; g.fillRect(i * 8, j * 8, 7, 7); }
    });
    wicker.wrapS = wicker.wrapT = THREE.RepeatWrapping; wicker.repeat.set(3, 2);
    const wickerMat = new THREE.MeshStandardMaterial({ map: wicker, roughness: 0.9 });
    const leather = mat('#5a3a22'), sheet = mat('#e2dfd4', { roughness: 1 });
    const hamper = (x: number, z: number, w: number, h: number, d: number, turn: number, mode: 'strapped' | 'open' | 'tipped' | 'slot') => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = turn; root.add(g);
      const add = <O extends THREE.Object3D>(o: O) => { g.add(o); return o; };
      if (shut && mode !== 'slot') { const cover = add(s.ball([w * 0.62, h * 1.05, d * 0.66], [0, 0.02, 0], sheet, 12)); cover.scale.y = h * 1.08; return; }
      add(s.mesh(new THREE.BoxGeometry(w, h, d), wickerMat, [0, h / 2, 0]));
      for (const k of [-1, 1]) add(s.box([0.09, h + 0.02, d + 0.03], [k * w * 0.3, h / 2, 0], leather));
      for (const k of [-1, 1]) add(s.ring(0.12, 0.022, [k * (w / 2 + 0.02), h * 0.68, 0], rope)).rotation.y = Math.PI / 2;
      const lidMesh = add(s.mesh(new THREE.BoxGeometry(w + 0.06, 0.09, d + 0.06), wickerMat, [0, h + 0.045, 0]));
      if (mode === 'open' || mode === 'tipped') {
        lidMesh.position.set(0, h + d * 0.42, -d / 2 - 0.12); lidMesh.rotation.x = -1.25;
        for (let i = 0; i < 4; i++) { const cloth = add(s.ball([w * 0.2, 0.16, d * 0.26], [(i - 1.5) * w * 0.22, h + 0.02, (random() - 0.5) * d * 0.4], hueMats[Math.floor(random() * 6)], 8)); cloth.rotation.y = random() * 3; }
        const over = add(s.box([w * 0.3, 0.04, 0.5], [w * 0.15, h - 0.1, d / 2 + 0.03], hueMats[Math.floor(random() * 6)])); over.rotation.x = 1.45;
      }
      if (mode === 'tipped') { g.rotation.z = Math.PI / 2 * 0.98; g.position.y = w / 2; g.position.x += h / 2; }
      if (mode === 'strapped' || mode === 'slot') { const stencil = add(s.label(a.theatre === 'osaka' ? 'KASHIRA' : a.theatre === 'sicily' ? 'PUPI N.3' : a.theatre === 'pier' ? 'PROPS' : 'LOUTKY', w * 0.4, h * 0.3, [0, h * 0.5, d / 2 + 0.012], '#2a1c14', '#c9a468')); void stencil; }
    };
    hamper(slots[1][0], slots[1][1], 2.9, slotY[1] - 0.09, 2.1, 0.06, 'slot');
    hamper(5.6, -0.4, 1.5, 0.9, 1.1, -0.35, a.hampers === 'tipped' ? 'strapped' : a.hampers);
    if (mood.density > 0.3) hamper(-0.6, 3.9, 1.3, 0.7, 0.95, 0.5, a.hampers === 'tipped' ? 'tipped' : a.hampers);
    else if (a.hampers === 'tipped') hamper(1.2, 3.9, 1.3, 0.7, 0.95, 0.5, 'tipped');
    if (mood.density > 0.6) hamper(-6.0, 3.6, 1.2, 0.8, 0.9, 0.2, 'strapped');
    if (a.hampers === 'tipped' && !shut) s.scatter(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshStandardMaterial({ roughness: 0.6 }), Array.from({ length: 9 }, (_u, i) => ({ at: [1.6 + random() * 2.2, 0.11, 3.2 + random() * 1.4] as P3, size: 0.7 + random() * 0.6, color: ['#b3262d', '#2f58b0', '#d9a52b', '#3f8f3a'][i % 4] })));

    // Ghost light, or cobwebs.
    let ghost: THREE.Mesh | null = null;
    if (night) {
      const gx = 2.3, gz = -2.9 + 3.6;
      s.cylinder(0.3, 0.34, 0.06, [gx, 0.03, gz], iron, 16);
      s.rod([gx, 0, gz], [gx, 2.3, gz], 0.03, iron);
      ghost = s.ball([0.13, 0.17, 0.13], [gx, 2.42, gz], new THREE.MeshBasicMaterial({ color: '#fff3c8' }), 12);
      const halo = s.ball([0.3, 0.3, 0.3], [gx, 2.42, gz], new THREE.MeshBasicMaterial({ color: '#ffe9a8', transparent: true, opacity: 0.12, depthWrite: false }), 12);
      halo.castShadow = false;
      const bulb = new THREE.PointLight('#ffe2a0', 26, 12, 1.6); bulb.position.set(gx, 2.42, gz); root.add(bulb);
      for (let k = 0; k < 4; k++) s.rod([gx + Math.cos(k * 1.57) * 0.16, 2.2, gz + Math.sin(k * 1.57) * 0.16], [gx + Math.cos(k * 1.57) * 0.12, 2.68, gz + Math.sin(k * 1.57) * 0.12], 0.008, iron);
    }
    if (neglect > 0.55) {
      const web = new THREE.MeshStandardMaterial({ color: '#e9e6df', roughness: 1 });
      for (const [p, q, r3] of [[[-7, 5, -4.5], [-5.6, 5, -4.5], [-7, 3.8, -4.5]], [[6.7, battenY, -2.4], [5.5, battenY, -2.4], [6.7, 4.6, -2.4]], [[-6.5, 1.35, 1.6], [-6.5, 0.2, 2.4], [-6.5, 1.35, 2.6]]] as [P3, P3, P3][])
        for (let k = 1; k <= 4; k++) { const t = k / 4; s.rod([mix(p[0], q[0], t), mix(p[1], q[1], t), mix(p[2], q[2], t)], [mix(p[0], r3[0], t), mix(p[1], r3[1], t), mix(p[2], r3[2], t)], 0.006, web); s.rod(p, [mix(q[0], r3[0], t), mix(q[1], r3[1], t), mix(q[2], r3[2], t)], 0.005, web); }
    }

    const basePlace = world.place.bind(world);
    world.place = (items: readonly Placeable[]) => {
      basePlace(items);
      items.forEach((item, index) => {
        item.holder.position.y = slotY[index % slotY.length];
        item.holder.updateMatrixWorld(true);
      });
    };
    const energy = mood.energy, baseOpacity = spillMat.opacity, baseBeam = beam.intensity;
    world.update = (_dt, time) => {
      for (const w of swayers) { w.o.rotation.z = Math.sin(time * (0.6 + energy) + w.phase) * 0.06 * w.amp * (0.2 + energy * 1.6); w.o.rotation.x = Math.cos(time * 0.45 + w.phase) * 0.03 * w.amp * (0.2 + energy); }
      const flick = 1 + Math.sin(time * 9.7) * Math.sin(time * 3.1) * 0.08 * energy;
      spillMat.opacity = baseOpacity * flick; beam.intensity = baseBeam * flick;
      if (ghost) ghost.scale.set(0.13, 0.17 * (1 + Math.sin(time * 17) * 0.03 * energy), 0.13);
    };
    return world;
  },
});
