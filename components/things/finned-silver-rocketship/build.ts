import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const ART = {
  none: 'No nose art, bare polished metal.',
  star: 'A big five-pointed star in a ring.',
  shark: 'A grinning shark mouth with white teeth and an eye.',
  name: 'A hand-lettered ship name in looping script colours: LUCKY.',
  number: 'A fat racing numeral 7 in a white disc.',
  planet: 'A ringed planet with a rocket trail looping round it.',
  skull: 'A skull and crossed bones, a pirate ship of the spaceways.',
} as const;

const LIVERY = {
  chrome: { say: 'Bare mirror chrome from nose to tail.', body: '#d9dee2', trim: '#c9cfd4', fin: '#cfd5da', accent: '#c22b22' },
  red: { say: 'Silver hull with a fire-engine red nose, band and fins.', body: '#dadfe3', trim: '#cf2a21', fin: '#cf2a21', accent: '#cf2a21' },
  checker: { say: 'Silver with a yellow nose and a black and yellow checker belt, like a test rocket.', body: '#d6dbdf', trim: '#f2c21b', fin: '#f2c21b', accent: '#1d1d1f' },
  bluewhite: { say: 'Glossy white with long cobalt racing stripes and blue fins.', body: '#f1efe6', trim: '#1f52b5', fin: '#1f52b5', accent: '#1f52b5' },
  olive: { say: 'Olive drab with a white band and stencils, a military expedition.', body: '#6f7a45', trim: '#eee9d2', fin: '#5d6739', accent: '#e8c12c' },
  candy: { say: 'Red and white candy stripes round the upper hull, a circus of a ship.', body: '#f3eee4', trim: '#d8262c', fin: '#d8262c', accent: '#d8262c' },
  gold: { say: 'Warm brass and gold with turquoise fins, an emperor\'s yacht.', body: '#d9b45a', trim: '#1fa39a', fin: '#1fa39a', accent: '#1fa39a' },
} as const;

export default defineThing({
  questions: {
    livery: choice('How is the hull painted?', Object.fromEntries(Object.entries(LIVERY).map(([k, v]) => [k, v.say])) as Record<keyof typeof LIVERY, string>),
    art: choice('What nose art is painted high on the hull?', ART),
    fins: choice('What shape are the three tailfins?', {
      swept: 'Long swept-back blades, sharp as shark fins.',
      scimitar: 'Big curved scimitar fins that bow outward.',
      podded: 'Stubby fins each ending in a torpedo-shaped pod.',
      delta: 'Broad straight-edged delta wings reaching halfway up the hull.',
    }),
    nose: choice('How does the nose end?', {
      needle: 'A long needle spike.',
      ball: 'A spike tipped with a round antenna ball.',
      blunt: 'A smooth rounded bullet nose.',
      rings: 'A spike threaded with stacked radio rings.',
    }),
    windows: choice('How are the portholes arranged?', {
      column: 'A column of three round portholes up the front.',
      big: 'One large round cockpit window near the nose.',
      band: 'A ring of small portholes all the way round.',
      pairs: 'Portholes in pairs, like eyes, at two levels.',
    }),
    hatch: choice('What is the hatch doing?', {
      sealed: 'Sealed shut, ladder stowed: nobody has come out yet.',
      ladder: 'Closed, but the boarding ladder is down.',
      open: 'Swung wide open with the ladder down, dark inside.',
      lit: 'Open with warm light spilling out and down the ladder.',
    }),
    damage: choice('What state did the landing leave it in?', {
      perfect: 'A perfect three-point landing, standing straight.',
      crumpled: 'One fin crumpled under it, the whole ship leaning.',
      holed: 'Standing, but with meteor holes punched in the hull and a patch plate.',
      sunk: 'One fin sunk into soft ground, tilted a little.',
    }),
    exhaust: choice('What is the engine doing?', {
      cold: 'Cold and silent, long landed.',
      smoking: 'Just landed: smoke still curling from the nozzle over a scorched ring.',
      idling: 'Idling, a hot glow in the nozzle, ready to leave.',
      blasting: 'A cone of flame under it, about to lift.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lv = LIVERY[a.livery];
    const ship = new THREE.Group();
    s.root.add(ship);
    const put = <T extends THREE.Object3D>(o: T) => { ship.add(o); return o; };

    const Y0 = 1.25, Y1 = 9.1, R = 0.98;
    const blunt = a.nose === 'blunt';
    const hullR = (t: number) => R * Math.pow(Math.sin(Math.PI * (0.13 + (blunt ? 0.8 : 0.86) * t)), 0.72);
    const rAt = (y: number) => hullR((y - Y0) / (Y1 - Y0));
    const onHull = (y: number, angle: number, out = 0): [number, number, number] => [Math.sin(angle) * (rAt(y) + out), y, Math.cos(angle) * (rAt(y) + out)];

    // ---- Hull skin: livery, seams, rivets, soot, all painted on one canvas ----
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    const band = (t0: number, t1: number, colour: string) => { ctx.fillStyle = colour; ctx.fillRect(0, (1 - t1) * 1024, 512, (t1 - t0) * 1024); };
    band(0, 1, lv.body);
    if (a.livery === 'red') { band(0.8, 1, lv.trim); band(0.3, 0.36, lv.trim); band(0, 0.06, lv.trim); }
    if (a.livery === 'checker') {
      band(0.82, 1, lv.trim);
      for (let row = 0; row < 3; row++) for (let col = 0; col < 16; col++) { ctx.fillStyle = (row + col) % 2 ? '#1d1d1f' : lv.trim; ctx.fillRect(col * 32, (1 - 0.6) * 1024 + row * 32, 32, 32); }
    }
    if (a.livery === 'bluewhite') { band(0.86, 1, lv.trim); ctx.fillStyle = lv.trim; for (let i = 0; i < 6; i++) ctx.fillRect(i * 512 / 6 + 30, 180, 26, 760); }
    if (a.livery === 'olive') { band(0.62, 0.68, lv.trim); band(0.9, 1, '#4d5630'); }
    if (a.livery === 'candy') for (let i = 0; i < 7; i++) band(0.5 + i * 0.075, 0.5 + i * 0.075 + 0.037, lv.trim);
    if (a.livery === 'gold') { band(0.84, 1, lv.trim); band(0.4, 0.43, lv.trim); band(0.46, 0.475, lv.trim); }
    // Panel seams and rivets.
    ctx.strokeStyle = 'rgba(40,48,56,0.55)'; ctx.lineWidth = 2.5;
    for (let i = 1; i < 9; i++) { const y = i * 1024 / 9; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
    for (let i = 0; i < 8; i++) { const x = i * 64 + 32; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1024); ctx.stroke(); }
    ctx.fillStyle = 'rgba(40,48,56,0.5)';
    for (let i = 1; i < 9; i++) for (let j = 0; j < 32; j++) ctx.fillRect(j * 16 + 6, i * 1024 / 9 + 7, 3, 3);
    // Soot climbing from the tail, rust streaks with wear.
    const soot = ctx.createLinearGradient(0, 1024, 0, 1024 - mix(120, 420, mood.wear));
    soot.addColorStop(0, `rgba(25,20,18,${mix(0.55, 0.9, mood.wear)})`); soot.addColorStop(1, 'rgba(25,20,18,0)');
    ctx.fillStyle = soot; ctx.fillRect(0, 0, 512, 1024);
    for (let i = 0; i < Math.round(mood.wear * 46); i++) {
      const x = random() * 512, y = random() * 900, len = 40 + random() * 160;
      const streak = ctx.createLinearGradient(0, y, 0, y + len);
      streak.addColorStop(0, 'rgba(120,62,30,0.6)'); streak.addColorStop(1, 'rgba(120,62,30,0)');
      ctx.fillStyle = streak; ctx.fillRect(x, y, 3 + random() * 7, len);
    }
    const skin = new THREE.CanvasTexture(canvas);
    skin.colorSpace = THREE.SRGBColorSpace; skin.wrapS = THREE.RepeatWrapping;
    const shiny = a.livery === 'chrome' || a.livery === 'red' || a.livery === 'checker' || a.livery === 'gold';
    const hullMat = new THREE.MeshStandardMaterial({ map: skin, metalness: shiny ? 0.4 : 0.1, roughness: mix(0.26, 0.6, mood.wear) });
    const profile: [number, number][] = [[0.001, Y0]];
    for (let i = 0; i <= 44; i++) { const t = i / 44; profile.push([hullR(t), mix(Y0, Y1, t)]); }
    if (blunt) profile.push([0.001, Y1 + 0.12]);
    put(s.lathe(profile, hullMat));

    const finMat = s.material(lv.fin, { metalness: shiny ? 0.35 : 0.1, roughness: 0.35, side: THREE.DoubleSide });
    const steel = s.material('#aeb6bd', { metalness: 0.45, roughness: 0.35 });
    const dark = s.material('#2a2c30', { roughness: 0.7 });
    const accent = s.material(lv.accent, { roughness: 0.4 });
    const glow = new THREE.Color().setHSL(mix(0.52, 0.09, mood.warmth), 0.9, 0.62);

    // ---- Nose ----
    const top = blunt ? Y1 + 0.12 : Y1;
    if (!blunt) {
      put(s.rod([0, Y1 - 0.25, 0], [0, Y1 + 1.5, 0], 0.07, steel, 0.012));
      if (a.nose === 'ball') put(s.ball([0.16, 0.16, 0.16], [0, Y1 + 1.5, 0], accent, 14));
      if (a.nose === 'rings') for (let i = 0; i < 4; i++) put(s.ring(0.3 - i * 0.055, 0.025, [0, Y1 + 0.3 + i * 0.28, 0], accent)).rotation.x = Math.PI / 2;
    } else put(s.ball([0.1, 0.1, 0.1], [0, top + 0.06, 0], accent, 12));
    const beacon = new THREE.MeshStandardMaterial({ color: '#ff5a3c', emissive: '#ff3a1c', emissiveIntensity: 1.2 });
    put(s.ball([0.07, 0.07, 0.07], [0, blunt ? top + 0.2 : Y1 + (a.nose === 'ball' ? 1.72 : 1.55), 0], beacon, 10));

    // ---- Tailfins: three, set so the ladder comes down between two of them ----
    const finAngles = [Math.PI / 3, Math.PI, -Math.PI / 3];
    const crumpled = a.damage === 'crumpled' ? 0 : -1;
    const outline: Record<typeof a.fins, [number, number][]> = {
      swept: [[0.25, 4.3], [1.15, 2.7], [2.75, 0], [2.3, 0], [1.25, 1.35], [0.25, 1.5]],
      scimitar: [[0.25, 4.6], [1.9, 3.3], [2.85, 1.5], [2.7, 0], [2.3, 0], [2.1, 1.3], [1.3, 1.9], [0.25, 1.6]],
      podded: [[0.25, 3.5], [1.5, 2.3], [2.25, 1.5], [2.25, 0.5], [1.4, 1.2], [0.25, 1.5]],
      delta: [[0.25, 5.6], [3.0, 0.55], [3.0, 0], [2.5, 0], [0.25, 1.4]],
    };
    finAngles.forEach((angle, index) => {
      const shape = new THREE.Shape(outline[a.fins].map(([x, y]) => new THREE.Vector2(x, y)));
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, steps: 1, curveSegments: 8 });
      geometry.translate(0, 0, -0.05);
      const holder = new THREE.Group();
      holder.rotation.y = angle - Math.PI / 2;
      const fin = new THREE.Mesh(geometry, finMat);
      fin.castShadow = fin.receiveShadow = true;
      if (index === crumpled) {
        // Buckle the outer half: fold it sideways and squash it down.
        const p = geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), y = p.getY(i), k = Math.max(0, x - 1.1);
          p.setXYZ(i, x - k * 0.25, y + k * 0.42 + Math.sin(x * 7) * 0.05 * k, p.getZ(i) + Math.sin(x * 5 + y * 3) * 0.22 * k + k * k * 0.3);
        }
        geometry.computeVertexNormals();
      }
      holder.add(fin);
      if (a.fins === 'podded') {
        const pod = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 1.3, 6, 14), steel);
        pod.position.set(2.3, 0.9, 0); pod.castShadow = true;
        if (index !== crumpled) holder.add(pod);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 14), accent);
        cap.position.set(2.3, 2.0, 0); cap.castShadow = true;
        if (index !== crumpled) holder.add(cap);
      } else {
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.08, 14), dark);
        const fx = a.fins === 'delta' ? 2.75 : a.fins === 'scimitar' ? 2.5 : 2.52;
        foot.position.set(fx, 0.04, 0); foot.castShadow = true;
        if (index !== crumpled) holder.add(foot);
      }
      put(holder);
    });

    // ---- Engine bell ----
    put(s.lathe([[0.36, Y0 + 0.15], [0.42, Y0 - 0.1], [0.62, Y0 - 0.55], [0.66, Y0 - 0.6], [0.58, Y0 - 0.58], [0.3, Y0 - 0.05]], dark));
    const hot = a.exhaust === 'idling' || a.exhaust === 'blasting';
    const fireMat = new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: hot ? '#ff8a1e' : '#3a1508', emissiveIntensity: hot ? 2.2 : 0.3, roughness: 0.5 });
    put(s.cylinder(0.5, 0.5, 0.04, [0, Y0 - 0.45, 0], fireMat, 20));
    for (const y of [2.05, 2.25]) put(s.ring(rAt(y) + 0.015, 0.035, [0, y, 0], steel)).rotation.x = Math.PI / 2;

    // ---- Portholes ----
    const glassMat = new THREE.MeshStandardMaterial({ color: '#17314a', emissive: glow, emissiveIntensity: mix(0.15, 0.9, mood.cheer * 0.5 + (a.hatch === 'lit' ? 0.5 : 0.15)), roughness: 0.15 });
    const porthole = (y: number, angle: number, size: number) => {
      const holder = new THREE.Group();
      holder.position.set(...onHull(y, angle, -0.03));
      const slope = (rAt(y + 0.1) - rAt(y - 0.1)) / 0.2;
      holder.rotation.order = 'YXZ'; holder.rotation.y = angle; holder.rotation.x = Math.atan(slope);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(size, size * 0.24, 8, 24), accent.color.equals(new THREE.Color(lv.body)) ? steel : (a.livery === 'chrome' ? steel : accent));
      const pane = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 10), glassMat);
      pane.scale.z = 0.28;
      rim.castShadow = true;
      holder.add(rim, pane);
      put(holder);
    };
    if (a.windows === 'column') for (const [y, size] of [[5.0, 0.27], [6.0, 0.25], [6.95, 0.21]]) porthole(y, 0, size);
    if (a.windows === 'big') { porthole(6.6, 0, 0.44); porthole(4.9, 0, 0.2); }
    if (a.windows === 'band') for (let i = 0; i < 10; i++) porthole(5.6, i * Math.PI / 5, 0.19);
    if (a.windows === 'pairs') for (const y of [5.2, 6.7]) for (const side of [-1, 1]) porthole(y, side * 0.34 * (y > 6 ? 1.25 : 1), 0.22);

    // ---- Nose art, on a curved plate just proud of the hull ----
    if (a.art !== 'none') {
      const decal = document.createElement('canvas');
      decal.width = decal.height = 256;
      const d = decal.getContext('2d')!;
      d.lineJoin = 'round';
      const ink = a.livery === 'olive' ? '#f2ead0' : '#1b1c22';
      if (a.art === 'star') {
        d.fillStyle = '#f4f0e2'; d.beginPath(); d.arc(128, 128, 116, 0, 7); d.fill();
        d.fillStyle = '#c8202a'; d.beginPath();
        for (let i = 0; i < 10; i++) { const r = i % 2 ? 44 : 106, t = -Math.PI / 2 + i * Math.PI / 5; d.lineTo(128 + Math.cos(t) * r, 128 + Math.sin(t) * r); }
        d.fill(); d.strokeStyle = '#1d3f9a'; d.lineWidth = 12; d.beginPath(); d.arc(128, 128, 110, 0, 7); d.stroke();
      } else if (a.art === 'shark') {
        d.fillStyle = '#b3141c'; d.beginPath(); d.moveTo(8, 96); d.quadraticCurveTo(128, 60, 250, 132); d.quadraticCurveTo(128, 250, 8, 96); d.fill();
        d.fillStyle = '#ffffff';
        for (let i = 0; i < 8; i++) { const x = 30 + i * 26; d.beginPath(); d.moveTo(x, 86 + i * 3); d.lineTo(x + 24, 88 + i * 4); d.lineTo(x + 12, 124 + i * 2); d.fill(); d.beginPath(); d.moveTo(x + 6, 150 + (i < 4 ? i * 9 : (7 - i) * 9)); d.lineTo(x + 28, 150 + (i < 4 ? i * 9 : (7 - i) * 9)); d.lineTo(x + 16, 122 + i * 2); d.fill(); }
        d.fillStyle = '#ffffff'; d.beginPath(); d.arc(196, 52, 26, 0, 7); d.fill(); d.fillStyle = '#111'; d.beginPath(); d.arc(202, 54, 12, 0, 7); d.fill();
      } else if (a.art === 'name') {
        d.fillStyle = '#f6e7b0'; d.beginPath(); d.ellipse(128, 128, 124, 70, -0.15, 0, 7); d.fill();
        d.strokeStyle = '#c8202a'; d.lineWidth = 8; d.stroke();
        d.save(); d.translate(128, 132); d.rotate(-0.15); d.fillStyle = '#c8202a'; d.font = 'italic bold 78px serif'; d.textAlign = 'center'; d.textBaseline = 'middle'; d.fillText('LUCKY', 0, 0, 220); d.restore();
      } else if (a.art === 'number') {
        d.fillStyle = '#f7f3e6'; d.beginPath(); d.arc(128, 128, 118, 0, 7); d.fill(); d.strokeStyle = ink; d.lineWidth = 10; d.stroke();
        d.fillStyle = '#16171c'; d.font = 'bold 190px sans-serif'; d.textAlign = 'center'; d.textBaseline = 'middle'; d.fillText('7', 128, 140);
      } else if (a.art === 'planet') {
        d.strokeStyle = '#f2b61e'; d.lineWidth = 16; d.beginPath(); d.ellipse(128, 132, 118, 34, -0.35, Math.PI, Math.PI * 2); d.stroke();
        d.fillStyle = '#d2452c'; d.beginPath(); d.arc(128, 128, 66, 0, 7); d.fill();
        d.fillStyle = '#f08a3c'; d.fillRect(66, 108, 124, 14); d.fillRect(72, 142, 112, 10);
        d.beginPath(); d.ellipse(128, 132, 118, 34, -0.35, 0, Math.PI); d.stroke();
        d.fillStyle = '#ffffff'; d.beginPath(); d.moveTo(214, 40); d.lineTo(246, 22); d.lineTo(236, 58); d.fill();
      } else {
        d.fillStyle = '#16171c'; d.beginPath(); d.arc(128, 128, 122, 0, 7); d.fill();
        d.strokeStyle = '#f3efe2'; d.lineWidth = 20; d.lineCap = 'round';
        d.beginPath(); d.moveTo(50, 170); d.lineTo(206, 226); d.moveTo(206, 170); d.lineTo(50, 226); d.stroke();
        d.fillStyle = '#f3efe2'; d.beginPath(); d.arc(128, 104, 62, 0, 7); d.fill(); d.fillRect(96, 140, 64, 44);
        d.fillStyle = '#16171c'; d.beginPath(); d.arc(104, 104, 17, 0, 7); d.arc(152, 104, 17, 0, 7); d.fill(); d.fillRect(122, 128, 12, 18);
        for (let i = 0; i < 4; i++) d.fillRect(102 + i * 15, 160, 4, 24);
      }
      const map = new THREE.CanvasTexture(decal);
      map.colorSpace = THREE.SRGBColorSpace;
      const y = 7.75, h = 1.15, width = 1.25;
      const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(rAt(y + h / 2) + 0.012, rAt(y - h / 2) + 0.012, h, 16, 1, true, -width / 2, width),
        new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.4, roughness: 0.6 }));
      plate.position.y = y; plate.rotation.y = a.windows === 'big' ? 0.95 : 0.5;
      put(plate);
    }

    // ---- Hatch and ladder (front, +z) ----
    const hatchY = 3.55, hw = 0.5, hh = 1.15;
    const frameShape = (grow: number) => new THREE.CylinderGeometry(rAt(hatchY + hh / 2) + grow, rAt(hatchY - hh / 2) + grow, hh, 10, 1, true, -hw / rAt(hatchY), 2 * hw / rAt(hatchY));
    const openHatch = a.hatch === 'open' || a.hatch === 'lit';
    const frame = new THREE.Mesh(frameShape(0.02), steel); frame.position.y = hatchY; frame.castShadow = true; put(frame);
    const insideMat = a.hatch === 'lit'
      ? new THREE.MeshStandardMaterial({ color: '#ffe7a8', emissive: '#ffc54a', emissiveIntensity: 1.6 })
      : openHatch ? new THREE.MeshStandardMaterial({ color: '#0e1014', roughness: 1 }) : s.material(lv.body === '#6f7a45' ? '#7d8850' : '#c3c9cd', { metalness: 0.3, roughness: 0.4 });
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(rAt(hatchY + hh / 2) + 0.035, rAt(hatchY - hh / 2) + 0.035, hh * 0.86, 10, 1, true, -hw * 0.8 / rAt(hatchY), 1.6 * hw / rAt(hatchY)), insideMat);
    inner.position.y = hatchY; put(inner);
    if (openHatch) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.82, hh * 0.9, 0.07), steel);
      const hinge = new THREE.Group();
      hinge.position.set(-hw, hatchY, rAt(hatchY) - 0.02); hinge.rotation.y = -1.9 + (random() - 0.5) * 0.4;
      door.position.x = 0.41; door.castShadow = true; hinge.add(door);
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 16), dark); wheel.position.set(0.41, 0, -0.06); hinge.add(wheel);
      put(hinge);
    } else {
      put(s.ring(0.15, 0.028, onHull(hatchY, 0, 0.07), dark));
      put(s.rod(onHull(hatchY, 0, 0.02), onHull(hatchY, 0, 0.08), 0.03, dark));
    }
    if (a.hatch !== 'sealed') {
      const topZ = rAt(hatchY - hh / 2) + 0.05, footZ = 1.9, topY = hatchY - hh / 2;
      for (const x of [-0.26, 0.26]) put(s.rod([x, topY + 0.25, topZ], [x, 0, footZ], 0.035, steel));
      for (let i = 1; i < 10; i++) { const t = i / 10; put(s.rod([-0.26, mix(topY, 0, t), mix(topZ, footZ, t)], [0.26, mix(topY, 0, t), mix(topZ, footZ, t)], 0.025, steel)); }
      put(s.box([0.9, 0.06, 0.4], [0, topY - 0.02, topZ + 0.1], steel));
    } else put(s.box([0.62, 0.9, 0.07], onHull(2.55, 0, 0.04), steel));
    let spill: THREE.Mesh | null = null;
    if (a.hatch === 'lit') {
      spill = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: '#ffd77a', transparent: true, opacity: 0.4, depthWrite: false }));
      spill.rotation.x = -Math.PI / 2; spill.scale.set(1.1, 1.9, 1); spill.position.set(0, 0.02, 2.3);
      s.root.add(spill);
    }

    // ---- Meteor holes and a riveted patch ----
    if (a.damage === 'holed') {
      const holeMat = new THREE.MeshStandardMaterial({ color: '#0d0d10', roughness: 1 });
      for (let i = 0; i < 5; i++) {
        const y = 3 + random() * 4.2, angle = (random() - 0.5) * 2.4 + (i % 2 ? 0.9 : -0.7), size = 0.1 + random() * 0.16;
        const hole = put(s.ball([size, size * (0.7 + random() * 0.6), 0.04], onHull(y, angle, 0.0), holeMat, 10)); hole.rotation.y = angle; hole.castShadow = false;
        const lip = put(s.ring(size * 1.05, 0.02, onHull(y, angle, 0.01), dark)); lip.rotation.y = angle;
      }
      const patch = put(s.box([0.62, 0.5, 0.04], onHull(4.4, -0.75, 0.01), s.material('#8b6a4a', { metalness: 0.3 }))); patch.rotation.y = -0.75; patch.rotation.z = 0.2;
    }

    // ---- Lean ----
    const lean = a.damage === 'crumpled' ? 0.16 : a.damage === 'sunk' ? 0.075 : (random() - 0.5) * 0.012;
    const leanAngle = a.damage === 'sunk' ? finAngles[2] : finAngles[0];
    const axis = new THREE.Vector3(Math.cos(leanAngle), 0, -Math.sin(leanAngle));
    ship.quaternion.setFromAxisAngle(axis, lean);
    if (a.damage === 'crumpled') ship.position.y = -0.1;

    // ---- Ground marks, smoke and fire ----
    const groundMat = new THREE.MeshStandardMaterial({ color: '#241c1c', roughness: 1, transparent: true, opacity: 0.82 });
    const fresh = a.exhaust === 'smoking' || a.exhaust === 'blasting';
    if (a.exhaust !== 'cold' || mood.wear > 0.6) {
      const scorch = s.mesh(new THREE.RingGeometry(0.2, fresh ? 2.5 : 1.7, 40), groundMat, [0, 0.012, 0]);
      scorch.rotation.x = -Math.PI / 2; scorch.castShadow = false;
      for (let i = 0; i < 14; i++) {
        const t = random() * Math.PI * 2, len = (fresh ? 2.3 : 1.6) + random() * 1.1;
        const ray = s.mesh(new THREE.PlaneGeometry(0.16 + random() * 0.2, len), groundMat, [Math.sin(t) * len / 2, 0.011, -Math.cos(t) * len / 2]);
        ray.rotation.set(-Math.PI / 2, 0, -t); ray.castShadow = false;
      }
    }
    if (a.damage === 'sunk') {
      const p = new THREE.Vector3(Math.sin(leanAngle) * 2.4, 0.05, Math.cos(leanAngle) * 2.4);
      s.ball([0.75, 0.2, 0.75], [p.x, p.y, p.z], s.material('#5a4a50', { roughness: 1 }), 12);
    }
    const puffs: THREE.Mesh[] = [];
    if (a.exhaust === 'smoking' || (a.exhaust === 'blasting')) {
      const smokeMat = new THREE.MeshStandardMaterial({ color: a.exhaust === 'blasting' ? '#f1e6d6' : '#6d6a6c', transparent: true, opacity: 0.5, depthWrite: false, roughness: 1 });
      const count = Math.round(mix(9, 18, mood.density));
      for (let i = 0; i < count; i++) {
        const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), smokeMat);
        puff.userData = { phase: random(), angle: random() * Math.PI * 2, size: 0.35 + random() * 0.45 };
        s.root.add(puff); puffs.push(puff);
      }
    }
    let flame: THREE.Mesh | null = null;
    if (a.exhaust === 'blasting') {
      flame = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.3, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#ffb23a', transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
      flame.rotation.x = Math.PI; flame.position.y = 0.62; ship.add(flame);
      const core = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.0, 16), new THREE.MeshBasicMaterial({ color: '#fff6c8', transparent: true, opacity: 0.9, depthWrite: false }));
      core.position.y = 0.12; flame.add(core);
    }
    // Supplies unloaded at the foot when the scene is busy.
    if (mood.density > 0.55 && a.hatch !== 'sealed') {
      const crate = s.material('#a8743c');
      for (let i = 0; i < Math.round(mix(1, 4, mood.density)); i++) {
        const side = i % 2 ? 1 : -1, size = 0.4 + random() * 0.25;
        const box = s.box([size, size, size], [side * (0.9 + random() * 0.7), size / 2, 2.2 + random() * 0.8], crate); box.rotation.y = random();
      }
      s.cylinder(0.24, 0.24, 0.7, [-1.5, 0.35, 1.6], accent, 14);
    }

    const placeSmoke = (time: number) => {
      for (const puff of puffs) {
        const { phase, angle, size } = puff.userData as { phase: number; angle: number; size: number };
        const t = (phase + time * mix(0.03, 0.14, mood.energy)) % 1;
        if (a.exhaust === 'blasting') { const r = 0.6 + t * 2.4; puff.position.set(Math.sin(angle) * r, 0.25 + t * 0.7, Math.cos(angle) * r); }
        else puff.position.set(Math.sin(angle + t * 2) * (0.35 + t * 0.9), 0.5 + t * 3.6, Math.cos(angle + t * 2) * (0.35 + t * 0.9));
        puff.scale.setScalar(size * (0.5 + t * 1.3));
      }
    };
    placeSmoke(0);
    const thing = s.finish({
      footprint: a.fins === 'delta' ? 3.0 : 2.7,
      update: (_dt, time) => {
        placeSmoke(time);
        beacon.emissiveIntensity = 0.4 + (Math.sin(time * mix(1.5, 7, mood.energy)) > 0.3 ? 1.6 : 0);
        if (hot) fireMat.emissiveIntensity = 1.8 + Math.sin(time * 23) * 0.5 * mood.energy;
        if (flame) flame.scale.set(1 + Math.sin(time * 31) * 0.06, 1 + Math.sin(time * 19) * 0.12, 1 + Math.sin(time * 27) * 0.06);
      },
    });
    return thing;
  },
});
