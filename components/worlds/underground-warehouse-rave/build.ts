import * as THREE from 'three';
import { choice, defineWorld, diorama, figure, mix, noul } from '@conjure/kit';
import { glow, paint, pick, rig } from './rig';

const BEAMS = {
  green: ['#3dff5a', '#3dff5a', '#8aff3a'],
  'magenta-cyan': ['#ff3fb0', '#22d8ff', '#ff3fb0'],
  'red-amber': ['#ff3a2e', '#ffb02a', '#ff6a1a'],
  'uv-purple': ['#8a4dff', '#b04dff', '#4d6aff'],
  white: ['#fff2d8', '#e8f0ff', '#fff2d8'],
} as const;
const BANNERS = {
  none: { say: 'No banner.', text: '', ink: '', paper: '' },
  'free-party': { say: 'FREE PARTY in dripping red on a bedsheet.', text: 'FREE PARTY', ink: '#e62d2d', paper: '#efe6d2' },
  'no-sleep': { say: 'NO SLEEP TIL DAWN in white on black.', text: 'NO SLEEP TIL DAWN', ink: '#f4f4f0', paper: '#1d1d1f' },
  plur: { say: 'PEACE LOVE UNITY RESPECT in rainbow letters.', text: 'PEACE LOVE UNITY RESPECT', ink: '#ff3fb0', paper: '#2b6cc4' },
  'sound-system': { say: 'The sound system name, DUB ENGINE, in green and gold.', text: 'DUB ENGINE', ink: '#2ec24a', paper: '#f2c21c' },
  acid: { say: 'A huge yellow smiley face.', text: '', ink: '#1d1d1f', paper: '#f2e21c' },
} as const;

export default defineWorld({
  questions: {
    time: choice('What time is it in the warehouse?', {
      peak: 'Peak time, three in the morning: haze thick, every beam cutting, the floor heaving.',
      early: 'Early, before midnight: the rig tested, beams on, the floor still half empty.',
      dawn: 'Grey dawn: the roller door cracked open, cold daylight leaking in, the beams off, litter everywhere.',
      afterparty: 'After the music: flat white work lights on, a few people left, cables being coiled.',
    }),
    beams: choice('What colour are the lights?', {
      green: 'Green lasers and green pars.',
      'magenta-cyan': 'Magenta and cyan.',
      'red-amber': 'Red and amber, hot and heavy.',
      'uv-purple': 'Ultraviolet purple and blue.',
      white: 'Plain white beams through the haze.',
    }),
    walls: choice('What are the walls like?', {
      soot: 'Soot-blackened red brick.',
      whitewash: 'Whitewashed brick, peeling.',
      graffiti: 'Brick covered in tags and a big spray-painted mural.',
      block: 'Bare grey concrete block.',
    }),
    door: choice('What about the roller door at the back?', {
      chained: 'Rolled down and chained shut with a padlock.',
      cracked: 'Rolled up a foot, a line of outside light under it.',
      tagged: 'Chained shut and covered in tags.',
      open: 'Rolled half up, the night outside showing.',
    }),
    banner: choice('What hangs from the mezzanine railing?', Object.fromEntries(Object.entries(BANNERS).map(([k, v]) => [k, v.say])) as Record<keyof typeof BANNERS, string>),
    crowd: choice('How many people are on the floor?', {
      packed: 'Packed: a crowd of dancers in silhouette round the edges.',
      scattered: 'A scattering of dancers.',
      empty: 'Nobody but the cast.',
    }),
    lasers: noul('Is a green laser fan cutting across the room from the mezzanine?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const W = 12.5, D = 9.5, HT = 5.4, backZ = -D / 2, leftX = -W / 2;
    const dawn = a.time === 'dawn', after = a.time === 'afterparty', lit = a.time === 'peak' || a.time === 'early';
    // A smoky mid-tone, never black: looks are calibrated for lighter backdrops.
    const background = dawn ? '#8d919b' : after ? '#726d74' : a.time === 'peak' ? '#5f5869' : '#5a5565';
    const floorHex = dawn ? '#6e6e72' : '#5a585e';
    const { art: s, world } = diorama(context, {
      background, floor: floorHex, width: W, depth: D, maxHeight: 3.0, radius: 1.45, pitch: 17, yaw: 12,
      slots: [[0, -1.2], [-3.3, 0.6], [3.3, 0.8], [-3.6, 2.8, 0, 0.85], [3.6, 3.0, 0, 0.85], [0.3, -3.5, 0.34, 0.8]],
      scale: [0.8, 1.35],
    });
    for (const child of s.root.children) {
      const light = child as THREE.HemisphereLight;
      if (light.isHemisphereLight) {
        light.color.set(dawn ? '#c4ccd8' : after ? '#d9d4cc' : '#8f82b0');
        light.groundColor.set(dawn ? '#5a5a60' : '#3a3440');
        light.intensity = dawn ? 1.3 : after ? 1.25 : 0.95;
      }
    }
    if (world.keyLight) {
      world.keyLight.color.set(dawn ? '#dfe8f4' : after ? '#fff1dc' : '#ffd2a0');
      world.keyLight.intensity = dawn ? 2.0 : after ? 2.2 : 1.5;
    }
    const std = (map: THREE.Texture, roughness = 0.9) => new THREE.MeshStandardMaterial({ map, roughness });
    const steel = s.material('#4a4d52', { metalness: 0.6, roughness: 0.55 });
    const dark = s.material('#1f1f23', { roughness: 0.8 });
    const palette = BEAMS[a.beams];
    const colourAt = (i: number) => palette[i % palette.length];

    // Floor: concrete with stains, a worn dance-floor patch, old painted lines and taped cables.
    const floorMap = paint(1024, 800, (c, w, h) => {
      c.fillStyle = floorHex; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '20,18,22' : '140,136,140'},${0.05 + random() * 0.12})`; c.beginPath(); c.ellipse(random() * w, random() * h, 8 + random() * 50, 5 + random() * 25, random() * 3, 0, 7); c.fill(); }
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 3;
      for (let x = 0; x < w; x += w / 4) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
      for (let y = 0; y < h; y += h / 3) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
      c.strokeStyle = 'rgba(200,170,40,0.35)'; c.lineWidth = 6; c.beginPath(); c.moveTo(w * 0.12, h * 0.1); c.lineTo(w * 0.12, h * 0.9); c.stroke();
      c.beginPath(); c.moveTo(w * 0.12, h * 0.1); c.lineTo(w * 0.9, h * 0.1); c.stroke();
      const g = c.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.45, w * 0.3);
      g.addColorStop(0, `rgba(170,165,170,${0.25 + mood.wear * 0.25})`); g.addColorStop(1, 'rgba(170,165,170,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      // Spilt drinks darken the floor as the night goes on.
      const spills = dawn || after ? 60 : a.time === 'peak' ? 30 : 10;
      for (let i = 0; i < spills; i++) { c.fillStyle = `rgba(20,14,24,${0.15 + random() * 0.25})`; c.beginPath(); c.ellipse(random() * w, random() * h, 6 + random() * 30, 4 + random() * 18, random() * 3, 0, 7); c.fill(); }
    });
    const floorMesh = s.mesh(new THREE.PlaneGeometry(W, D), std(floorMap, 0.85), [0, 0.005, 0]);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.castShadow = false;

    // Walls: brick painted per wall, fading up into the smoke.
    const wallArt = (len: number, height: number) => paint(1024, 480, (c, w, h) => {
      const base = { soot: '#4a2a26', whitewash: '#b9b2a4', graffiti: '#5a332c', block: '#7a7a78' }[a.walls];
      c.fillStyle = base; c.fillRect(0, 0, w, h);
      const bw = w / (len / 0.23), bh = h / (height / 0.075);
      for (let y = 0, r = 0; y < h; y += bh, r++) for (let x = (r % 2) * -bw / 2; x < w; x += bw) {
        if (a.walls === 'block') { if (r % 3) continue; c.fillStyle = `rgba(${random() < 0.5 ? '0,0,0' : '255,255,255'},${0.04 + random() * 0.06})`; c.fillRect(x, y, bw * 2 - 2, bh * 3 - 2); continue; }
        const soot = a.walls === 'soot' ? 1 : 0.5;
        c.fillStyle = a.walls === 'whitewash' ? `hsl(40 ${8 + random() * 10}% ${62 + random() * 14}%)` : `hsl(${8 + random() * 12} ${30 + random() * 15}% ${22 + random() * 12 - soot * 6}%)`;
        c.fillRect(x + 1, y + 1, bw - 2, bh - 2);
      }
      if (a.walls === 'whitewash') for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(120,80,60,${0.1 + random() * 0.2})`; c.beginPath(); c.ellipse(random() * w, h * 0.55 + random() * h * 0.45, 6 + random() * 16, 4 + random() * 12, random() * 3, 0, 7); c.fill(); }
      if (a.walls === 'graffiti') {
        const colours = ['#ff3fb0', '#3dff5a', '#22d8ff', '#f2e21c', '#ff6a1a', '#f4f1e8'];
        for (let i = 0; i < 14; i++) {
          c.save(); c.translate(random() * w, h * 0.45 + random() * h * 0.5); c.rotate((random() - 0.5) * 0.3);
          c.font = `bold ${40 + random() * 60}px sans-serif`; c.fillStyle = pick(random, colours); c.strokeStyle = '#1d1d1f'; c.lineWidth = 5;
          const tag = pick(random, ['ACID', 'DUB', 'RAVE', 'BASS', 'LOVE', 'TRIBE', 'FREE', '3AM', 'NOISE', 'EXIT']);
          c.strokeText(tag, 0, 0); c.fillText(tag, 0, 0); c.restore();
        }
        c.fillStyle = '#f2e21c'; c.beginPath(); c.arc(w * 0.5, h * 0.62, h * 0.18, 0, 7); c.fill();
        c.fillStyle = '#1d1d1f'; c.beginPath(); c.arc(w * 0.5 - h * 0.06, h * 0.58, h * 0.025, 0, 7); c.arc(w * 0.5 + h * 0.06, h * 0.58, h * 0.025, 0, 7); c.fill();
        c.lineWidth = 8; c.strokeStyle = '#1d1d1f'; c.beginPath(); c.arc(w * 0.5, h * 0.63, h * 0.1, 0.3, Math.PI - 0.3); c.stroke();
      }
      // Soot and damp low down, smoke high up: the top of the wall dissolves into the background.
      const grime = c.createLinearGradient(0, h, 0, h * 0.7); grime.addColorStop(0, `rgba(10,8,12,${0.35 + mood.wear * 0.3})`); grime.addColorStop(1, 'rgba(10,8,12,0)');
      c.fillStyle = grime; c.fillRect(0, 0, w, h);
      const smoke = c.createLinearGradient(0, h * 0.55, 0, 0);
      const bg = new THREE.Color(background);
      smoke.addColorStop(0, `rgba(${Math.round(bg.r * 255)},${Math.round(bg.g * 255)},${Math.round(bg.b * 255)},0)`);
      smoke.addColorStop(1, `rgba(${Math.round(bg.r * 255)},${Math.round(bg.g * 255)},${Math.round(bg.b * 255)},0.97)`);
      c.fillStyle = smoke; c.fillRect(0, 0, w, h);
    });
    s.mesh(new THREE.PlaneGeometry(W, HT), std(wallArt(W, HT)), [0, HT / 2, backZ]);
    s.mesh(new THREE.PlaneGeometry(D, HT), std(wallArt(D, HT)), [leftX, HT / 2, 0]).rotation.y = Math.PI / 2;
    s.box([W, 0.18, 0.08], [0, 0.09, backZ + 0.04], dark);

    // Steel columns: riveted I-sections, with the paint going at the base.
    const column = (x: number, z: number) => {
      s.box([0.34, HT, 0.03], [x, HT / 2, z], steel);
      s.box([0.34, HT, 0.03], [x, HT / 2, z + 0.3], steel);
      s.box([0.03, HT, 0.3], [x, HT / 2, z + 0.15], steel);
      s.box([0.5, 0.06, 0.5], [x, 0.03, z + 0.15], steel);
      s.box([0.36, 0.9, 0.34], [x, 0.45, z + 0.15], s.material('#6a4a2a', { roughness: 0.9 }));
    };
    column(-4.0, -2.0); column(4.0, -2.0); column(-5.6, 2.4); column(5.6, 2.4);

    // The roller door on the back wall, to the right of the stage.
    const doorX = 3.7, doorW = 3.0, doorH = 3.2;
    const corrugated = paint(256, 512, (c, w, h) => {
      c.fillStyle = a.door === 'tagged' ? '#4a5a6a' : '#5a6068'; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 16) { c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(0, y, w, 5); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, y + 10, w, 4); }
      if (a.door === 'tagged') for (let i = 0; i < 8; i++) { c.save(); c.translate(random() * w, h * 0.3 + random() * h * 0.6); c.rotate((random() - 0.5) * 0.4); c.font = `bold ${28 + random() * 30}px sans-serif`; c.fillStyle = pick(random, ['#ff3fb0', '#3dff5a', '#f2e21c', '#f4f1e8']); c.fillText(pick(random, ['ACID', 'RAVE', 'BASS', '3AM', 'KEEP OUT']), 0, 0); c.restore(); }
      c.fillStyle = `rgba(90,50,30,${mood.wear * 0.5})`; for (let i = 0; i < 20; i++) { c.beginPath(); c.ellipse(random() * w, random() * h, 6 + random() * 20, 4 + random() * 12, 0, 0, 7); c.fill(); }
    });
    const lift = a.door === 'open' ? doorH * 0.5 : a.door === 'cracked' ? 0.35 : 0;
    s.box([doorW + 0.3, 0.3, 0.3], [doorX, doorH + 0.15, backZ + 0.15], dark);
    for (const sx of [-1, 1]) s.box([0.12, doorH + 0.1, 0.1], [doorX + sx * (doorW / 2 + 0.06), doorH / 2, backZ + 0.05], steel);
    const door = s.mesh(new THREE.PlaneGeometry(doorW, doorH - lift), std(corrugated, 0.6), [doorX, lift + (doorH - lift) / 2, backZ + 0.03]);
    void door;
    if (lift > 0) {
      // Outside light under the door: cold at dawn, sodium orange at night.
      const outside = dawn ? '#d9e4f0' : '#ffb04a';
      const gap = s.mesh(new THREE.PlaneGeometry(doorW, lift), glow(outside, dawn ? 1.6 : 1.2), [doorX, lift / 2, backZ + 0.02]);
      gap.castShadow = false;
      const spill = s.mesh(new THREE.PlaneGeometry(doorW + 0.4, 2.2), new THREE.MeshBasicMaterial({ color: outside, transparent: true, opacity: dawn ? 0.3 : 0.18, depthWrite: false, toneMapped: false }), [doorX, 0.01, backZ + 1.12]);
      spill.rotation.x = -Math.PI / 2;
      spill.castShadow = false;
    }
    if (a.door === 'chained' || a.door === 'tagged') {
      const chain = s.material('#7a7d82', { metalness: 0.8, roughness: 0.35 });
      const links: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 18; i++) links.push({ at: [doorX - 0.9 + i * 0.1, 0.55 + Math.sin(i * 0.6) * 0.03, backZ + 0.08], size: 1 });
      s.scatter(new THREE.TorusGeometry(0.04, 0.012, 6, 10), chain, links);
      s.box([0.12, 0.16, 0.05], [doorX + 0.95, 0.5, backZ + 0.1], s.material('#c9a03c', { metalness: 0.8, roughness: 0.3 }));
      s.ring(0.05, 0.012, [doorX + 0.95, 0.62, backZ + 0.1], chain, Math.PI);
    }

    // The stage end: a low plywood riser with a black skirt, the truss above it, cables down to the floor.
    const riserZ = -3.65;
    s.box([5.2, 0.3, 2.0], [0.3, 0.15, riserZ], s.material('#2a2724', { roughness: 0.9 }));
    s.box([5.2, 0.04, 2.0], [0.3, 0.32, riserZ], s.material('#5a4a36', { roughness: 0.9 }));
    const cable = s.material('#17171a', { roughness: 0.9 });
    const tape = s.material('#7a7a7e', { roughness: 1 });
    s.tube([[-1.5, 0.35, riserZ + 1], [-2.0, 0.02, -2.0], [-3.2, 0.02, -0.8], [-4.8, 0.02, 1.0], [-5.8, 0.02, 2.3]], 0.018, cable);
    s.tube([[1.8, 0.35, riserZ + 1], [2.6, 0.02, -1.6], [4.0, 0.02, -0.3], [5.6, 0.02, 1.4]], 0.014, cable);
    for (const [x, z, r] of [[-2.7, -1.3, 0.4], [-4.0, 0.0, 0.5], [3.2, -1.0, -0.4], [4.8, 0.5, -0.5]] as const) { const strip = s.box([0.4, 0.004, 0.12], [x, 0.012, z], tape); strip.rotation.y = r; }
    const truss = s.material('#b9bec3', { metalness: 0.8, roughness: 0.3 });
    const TY = 4.2, TR = 0.16, TX0 = -4.0, TX1 = 4.0, TZ = -2.7;
    for (const [dy, dz] of [[TR, 0], [-TR * 0.6, TR * 0.9], [-TR * 0.6, -TR * 0.9]] as const) s.rod([TX0, TY + dy, TZ + dz], [TX1, TY + dy, TZ + dz], 0.022, truss);
    for (let i = 0; i <= 12; i++) { const x = TX0 + (i / 12) * (TX1 - TX0); s.rod([x, TY + TR, TZ], [x, TY - TR * 0.6, TZ + TR * 0.9], 0.008, truss); s.rod([x, TY + TR, TZ], [x, TY - TR * 0.6, TZ - TR * 0.9], 0.008, truss); }
    for (const x of [TX0, TX1]) { s.rod([x, 0, TZ], [x, TY - 0.2, TZ], 0.04, dark); s.box([0.9, 0.06, 0.9], [x, 0.03, TZ], dark); }

    // Fixtures on the truss: par cans and their beams, and the hero's cone of light.
    const beamMats: THREE.MeshBasicMaterial[] = [];
    const fixture = (x: number, aimAt: [number, number, number], colour: string, spread: number, on: boolean) => {
      const from = new THREE.Vector3(x, TY - 0.25, TZ);
      const to = new THREE.Vector3(...aimAt);
      const dir = to.clone().sub(from);
      const length = dir.length();
      const can = s.cylinder(0.11, 0.13, 0.32, [from.x, from.y, from.z], dark, 14);
      can.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize().negate());
      s.rod([x, TY - TR * 0.6, TZ], [x, TY - 0.2, TZ], 0.012, truss);
      const lens = s.mesh(new THREE.CircleGeometry(0.1, 14), glow(on ? colour : '#2a2a30', on ? 2.2 : 0), from.clone().addScaledVector(dir.clone().normalize(), 0.17).toArray() as [number, number, number]);
      lens.lookAt(to);
      lens.castShadow = false;
      if (on) {
        const material = new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: a.time === 'peak' ? 0.26 : 0.18, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
        beamMats.push(material);
        const cone = s.mesh(new THREE.CylinderGeometry(0.12, spread, length, 18, 1, true), material, from.clone().add(to).multiplyScalar(0.5).toArray() as [number, number, number]);
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize().negate());
        cone.castShadow = false;
      }
    };
    const beamsOn = lit;
    fixture(0, [0, 0, -1.2], a.beams === 'white' ? '#fff2d8' : '#ffe9c4', 1.7, lit || after);
    const aims: [number, number, number][] = [[-5.0, 0, 1.2], [-2.2, 0, 3.2], [2.2, 0, 3.5], [5.0, 0, 1.0], [-5.8, 1.8, 4.4], [5.8, 2.0, 4.4]];
    aims.forEach((aim, i) => fixture(TX0 + 0.8 + i * ((TX1 - TX0 - 1.6) / (aims.length - 1)), aim, colourAt(i), 1.2 + random() * 0.6, beamsOn));
    // The pool of light where the hero stands, and a dim bare bulb for the after-party.
    const pool = s.mesh(new THREE.CircleGeometry(1.6, 28), new THREE.MeshBasicMaterial({ color: '#ffe3b8', transparent: true, opacity: lit ? 0.32 : after ? 0.22 : 0.08, depthWrite: false, toneMapped: false }), [0, 0.012, -1.2]);
    pool.rotation.x = -Math.PI / 2;
    pool.castShadow = false;
    if (after || dawn) {
      for (const x of [-3, 3]) { s.rod([x, HT - 0.6, 0.5], [x, 3.9, 0.5], 0.01, dark); s.ball([0.1, 0.14, 0.1], [x, 3.8, 0.5], glow(after ? '#fff4dc' : '#6a6a70', after ? 2.5 : 0), 10); }
    }
    // The laser from the mezzanine corner: a flat fan of thin green ribbons across the room.
    if (a.lasers && lit) {
      const origin = new THREE.Vector3(leftX + 5.2, 3.75, backZ + 2.0);
      s.box([0.36, 0.14, 0.3], origin.toArray() as [number, number, number], dark);
      const fan = new THREE.Group();
      fan.position.copy(origin);
      fan.rotation.set(0.1, -0.55, 0);
      s.root.add(fan);
      const ribbon = new THREE.PlaneGeometry(0.03, 14);
      ribbon.translate(0, 7, 0);
      ribbon.rotateX(Math.PI / 2); // runs along +z from the box
      for (let i = 0; i < 14; i++) {
        const material = new THREE.MeshBasicMaterial({ color: '#3dff5a', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
        beamMats.push(material);
        const m = new THREE.Mesh(ribbon, material);
        m.rotation.set(0, (i / 13 - 0.5) * 1.0, 0);
        m.rotateZ(i % 2 ? Math.PI / 2 : 0);
        m.castShadow = false;
        fan.add(m);
      }
      world.update = (dt, time) => { fan.rotation.y = -0.55 + Math.sin(time * (0.5 + mood.energy)) * 0.25; };
    }

    // The mezzanine: a platform across the back-left corner with a railing facing the floor, stairs down the left wall, a banner on the rail.
    const MY = 3.3, MW = 5.6, MD = 2.4, railZ = backZ + MD, railX = leftX + MW;
    s.box([MW, 0.12, MD], [leftX + MW / 2, MY, backZ + MD / 2], s.material('#3a3a40', { roughness: 0.8 }));
    s.box([MW, 0.3, 0.12], [leftX + MW / 2, MY - 0.15, railZ], steel);
    s.box([0.12, 0.3, MD], [railX, MY - 0.15, backZ + MD / 2], steel);
    for (let i = 0; i <= 6; i++) { const x = leftX + i * (MW / 6); s.rod([x, MY + 0.06, railZ - 0.06], [x, MY + 1.1, railZ - 0.06], 0.02, steel); }
    for (let i = 0; i <= 2; i++) { const z = backZ + i * (MD / 2); s.rod([railX - 0.06, MY + 0.06, z], [railX - 0.06, MY + 1.1, z], 0.02, steel); }
    for (const y of [MY + 1.1, MY + 0.6]) { s.rod([leftX, y, railZ - 0.06], [railX, y, railZ - 0.06], y > MY + 1 ? 0.025 : 0.018, steel); s.rod([railX - 0.06, y, backZ], [railX - 0.06, y, railZ], y > MY + 1 ? 0.025 : 0.018, steel); }
    for (let i = 0; i < 3; i++) s.rod([leftX + 0.8 + i * 2.0, 0, railZ - 0.2], [leftX + 0.8 + i * 2.0, MY - 0.1, railZ - 0.2], 0.03, steel);
    for (let i = 0; i < 10; i++) s.box([0.3, 0.04, 0.9], [leftX + 0.5, (i + 1) * (MY / 10), railZ + 0.5 + i * 0.32], steel);
    s.box([0.06, MY, 0.06], [leftX + 0.75, MY / 2, railZ + 3.8], steel);
    // A couple of silhouettes leaning on the rail, looking down at the floor.
    if (a.crowd !== 'empty') for (let i = 0; i < (a.crowd === 'packed' ? 3 : 1); i++) {
      const onlooker = figure(s, { height: mix(1.6, 1.85, random()), style: 'silhouette', pose: 'leaning', hair: 'none' });
      onlooker.root.position.set(leftX + 0.9 + i * 1.7 + random(), MY + 0.06, railZ - 0.5);
      s.root.add(onlooker.root);
    }
    if (a.banner !== 'none') {
      const { text, ink, paper } = BANNERS[a.banner];
      const map = paint(1024, 320, (c, w, h) => {
        c.fillStyle = paper; c.fillRect(0, 0, w, h);
        if (a.banner === 'acid') { c.fillStyle = '#1d1d1f'; c.beginPath(); c.arc(w / 2, h / 2, h * 0.42, 0, 7); c.fill(); c.fillStyle = paper; c.beginPath(); c.arc(w / 2 - h * 0.15, h * 0.42, h * 0.06, 0, 7); c.arc(w / 2 + h * 0.15, h * 0.42, h * 0.06, 0, 7); c.fill(); c.lineWidth = 12; c.strokeStyle = paper; c.beginPath(); c.arc(w / 2, h * 0.52, h * 0.24, 0.3, Math.PI - 0.3); c.stroke(); }
        else { c.textAlign = 'center'; c.textBaseline = 'middle'; const size = Math.min(h * 0.55, (w * 0.92) / text.length * 1.7); c.font = `bold ${size}px sans-serif`; c.fillStyle = ink; c.fillText(text, w / 2, h / 2); for (let i = 0; i < 14; i++) c.fillRect(w * 0.08 + random() * w * 0.84, h * 0.66, 5, 10 + random() * 40); }
      });
      const bw = Math.min(4.6, MW - 0.4), bh = 1.3;
      const banner = s.mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshStandardMaterial({ map, roughness: 0.95, side: THREE.DoubleSide }), [leftX + MW / 2, MY - 0.25 - bh / 2, railZ + 0.03]);
      banner.rotation.x = -0.03;
      for (let i = 0; i < 4; i++) s.rod([leftX + MW / 2 - bw / 2 + i * (bw / 3), MY - 0.25, railZ + 0.03], [leftX + MW / 2 - bw / 2 + i * (bw / 3), MY + 0.6, railZ - 0.06], 0.006, s.material('#e8e2d0'));
    }

    // Drifting haze down at floor level in the beams.
    const puffs: THREE.Mesh[] = [];
    if (lit) for (let i = 0; i < 10; i++) {
      const puff = s.ball([1.2 + random(), 0.5 + random() * 0.4, 1.2 + random()], [(random() - 0.5) * 9, 0.6 + random() * 2.0, -2.5 + random() * 6], new THREE.MeshBasicMaterial({ color: background, transparent: true, opacity: 0.08 + mood.density * 0.06, depthWrite: false, toneMapped: false }), 10);
      puff.castShadow = puff.receiveShadow = false;
      puffs.push(puff);
    }

    // The crowd: silhouettes dancing round the edges, arms up, never in the cast's slots.
    const dancers: ReturnType<typeof figure>[] = [];
    const count = a.crowd === 'packed' ? 14 : a.crowd === 'scattered' ? 6 : 0;
    const spots: [number, number][] = [[-5.0, -0.8], [-5.3, 1.4], [-4.7, 3.8], [4.9, -0.6], [5.3, 1.6], [4.8, 3.9], [-2.0, 4.1], [1.6, 4.2], [-3.8, -2.6], [2.8, -2.3], [-1.2, -2.6], [4.0, 2.4], [-0.6, 4.3], [5.6, -2.3]];
    for (let i = 0; i < count; i++) {
      const [x, z] = spots[i % spots.length];
      const dancer = figure(s, { height: mix(1.55, 1.9, random()), style: 'silhouette', pose: pick(random, ['waving', 'reaching', 'standing', 'walking'] as const), hair: 'none' });
      const joints = rig(dancer);
      if (random() < 0.6) { joints.arm('left', { forward: 165, out: 25, bend: 10 }); joints.arm('right', { forward: 160, out: 20, bend: 15 }); }
      joints.look(-15, (random() - 0.5) * 40);
      joints.settle();
      dancer.root.position.set(x + (random() - 0.5) * 0.6, 0, z + (random() - 0.5) * 0.6);
      dancer.root.rotation.y = Math.PI + (random() - 0.5) * 1.2;
      s.root.add(dancer.root);
      dancers.push(dancer);
    }

    // Litter builds through the night: cans, bottles, a lost shoe.
    const litterCount = Math.round((dawn || after ? 40 : a.time === 'peak' ? 18 : 6) * (0.4 + mood.density * 0.8));
    const litter = Array.from({ length: litterCount }, () => ({ at: [(random() - 0.5) * (W - 2), 0.03, (random() - 0.5) * (D - 2)] as [number, number, number], size: 1, color: pick(random, ['#d8262c', '#2b6fb8', '#c9ccd0', '#f2c21c', '#2ec24a']) }));
    if (litter.length) {
      const canGeometry = new THREE.CylinderGeometry(0.033, 0.033, 0.12, 8);
      canGeometry.rotateX(Math.PI / 2);
      s.scatter(canGeometry, s.material('#ffffff', { metalness: 0.5, roughness: 0.4 }), litter);
    }

    const energy = mood.energy;
    const tempo = mix(1.4, 3.2, energy);
    const previous = world.update;
    world.update = (dt, time) => {
      previous?.(dt, time);
      for (const [i, d] of dancers.entries()) d.root.position.y = Math.abs(Math.sin(time * tempo * Math.PI + i)) * mix(0.01, 0.05, energy);
      for (const [i, m] of beamMats.entries()) m.opacity = Math.max(0.05, (m.userData.base ??= m.opacity) * (0.8 + Math.sin(time * tempo * 2 + i) * 0.2));
      for (const [i, p] of puffs.entries()) p.position.x += Math.sin(time * 0.3 + i) * dt * 0.08;
    };
    return world;
  },
});
