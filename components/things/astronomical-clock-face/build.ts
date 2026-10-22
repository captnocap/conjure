import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { gearGeometry, painted } from './parts';

const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

export default defineThing({
  questions: {
    hour: choice('What hour does the clock insist on?', {
      midnight: 'Midnight exactly, both hands straight up.',
      'three-am': 'Three in the morning, the sleepless hour.',
      dawn: 'Six, hands in one vertical line, the start of a working day.',
      noon: 'High noon, the hour the figures come out.',
      'five-to': 'Five minutes to twelve, always almost.',
      thirteen: 'An impossible thirteenth hour, marked in red at the top of the dial.',
    }),
    running: choice('How is it keeping time?', {
      steady: 'Steadily, as it has for centuries.',
      racing: 'Racing, the hands sweeping round far too fast.',
      backwards: 'Running backwards.',
      stopped: 'Stopped: the glass is cracked and the long hand hangs loose toward the ground.',
    }),
    figure: choice('Which figure has come out of the little doors?', {
      none: 'None. The doors are shut.',
      death: 'A white skeleton with a scythe and an hourglass.',
      rooster: 'A golden rooster with a red comb.',
      king: 'A crowned king in a red robe.',
      dancers: 'A pair of dancers, one in pink and one in blue, turning.',
      angel: 'A white angel with wings and a trumpet.',
      apostles: 'A procession of three hooded brown figures.',
    }),
    style: choice('What is the case like?', {
      gothic: 'Grey carved stone with a pointed gable and pinnacles, a cathedral square.',
      baroque: 'Dark polished wood with a round pediment and gilt urns.',
      enamel: 'Deep blue enamel scattered with gold stars.',
      iron: 'Black riveted iron with brass pipes, a factory-town clock.',
    }),
    dial: choice('How is the great dial painted?', {
      prague: 'Blue day, orange dusk and black night bands inside a black ring of gold numerals.',
      ivory: 'Ivory with fine black numerals.',
      night: 'Midnight blue with gold stars and numerals.',
      verdigris: 'Green-crusted copper with dark numerals.',
    }),
    moon: choice('What phase does the moon globe show?', {
      new: 'New: all dark.',
      crescent: 'A thin silver crescent.',
      half: 'Half silver, half black.',
      gibbous: 'Nearly full.',
      full: 'Full and bright.',
    }),
    top: choice('What crowns the clock?', {
      spire: 'A slender spire with a ball finial.',
      bell: 'An open belfry with a bronze bell.',
      dome: 'A small onion dome.',
      sun: 'A gilded toothed sunburst wheel.',
    }),
    lower: choice('What is in the lower stage, beneath the great dial?', {
      calendar: 'A smaller calendar dial ringed with twelve medallions.',
      pendulum: 'A dark window with a swinging pendulum.',
      weights: 'An open arch with hanging chains and weights.',
      plaque: 'An engraved plaque with a motto.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const caseColour = { gothic: '#a9a598', baroque: '#5a3a26', enamel: '#234a8c', iron: '#2c2e33' }[a.style];
    const body = s.material(caseColour, { roughness: a.style === 'gothic' ? 0.85 : 0.5, metalness: a.style === 'iron' ? 0.4 : 0.05 });
    const shade = s.material(new THREE.Color(caseColour).multiplyScalar(0.72), { roughness: 0.8 });
    const gold = s.material(new THREE.Color('#d6aa3c').lerp(new THREE.Color('#5f9a84'), mood.wear * 0.35), { metalness: 0.6, roughness: 0.32 });
    const dark = s.material('#17171a', { roughness: 0.8 });
    const silver = s.material('#d9dde2', { metalness: 0.5, roughness: 0.25, emissive: '#cfd8e6', emissiveIntensity: mix(0.1, 0.5, 1 - mood.daylight) });
    const F = 0.4; // front face of the main body

    // Case: plinth, lower stage, main stage, door stage, gable.
    s.box([2.0, 0.45, 1.15], [0, 0.225, 0], shade);
    s.box([1.8, 0.15, 1.0], [0, 0.525, 0], body);
    s.box([1.5, 1.05, 0.8], [0, 1.125, 0], body);
    s.box([1.74, 0.1, 0.96], [0, 1.7, 0], a.style === 'gothic' ? shade : gold);
    s.box([1.62, 1.7, 0.8], [0, 2.6, 0], body);
    s.box([1.84, 0.12, 1.0], [0, 3.51, 0], a.style === 'gothic' ? shade : gold);
    s.box([1.3, 0.78, 0.7], [0, 3.96, 0], body);
    s.box([1.44, 0.08, 0.84], [0, 4.39, 0], a.style === 'gothic' ? shade : gold);
    for (const x of [-1, 1]) {
      s.cylinder(0.055, 0.065, 1.56, [x * 0.76, 2.6, F + 0.05], a.style === 'iron' ? gold : shade, 12);
      s.box([0.17, 0.07, 0.17], [x * 0.76, 3.4, F + 0.05], gold);
      s.box([0.17, 0.07, 0.17], [x * 0.76, 1.79, F + 0.05], gold);
    }
    let topY = 4.43;
    if (a.style === 'gothic') {
      const tri = new THREE.Shape();
      tri.moveTo(-0.72, 0); tri.lineTo(0.72, 0); tri.lineTo(0, 0.8); tri.closePath();
      s.mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.7, bevelEnabled: false }), body, [0, topY, -0.35]);
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        s.box([0.14, 0.4, 0.14], [x * 0.82, 3.77, z * 0.4], shade);
        s.cylinder(0, 0.1, 0.5, [x * 0.82, 4.22, z * 0.4], shade, 4);
      }
      topY += 0.8;
    } else if (a.style === 'iron') {
      s.box([1.3, 0.62, 0.7], [0, topY + 0.31, 0], body);
      for (const x of [-1, 1]) s.rod([x * 0.74, 0.6, -0.3], [x * 0.74, 4.2, -0.3], 0.05, gold);
      for (let i = 0; i < 9; i++) for (const y of [1.84, 3.36]) s.ball([0.022, 0.022, 0.022], [-0.64 + i * 0.16, y, F + 0.005], gold, 8);
      topY += 0.62;
    } else {
      const arch = s.cylinder(0.68, 0.68, 0.7, [0, topY, 0], body, 28);
      arch.rotation.x = Math.PI / 2;
      arch.scale.set(1, 1, 1.05);
      s.ring(0.68, 0.035, [0, topY, 0.35], gold, Math.PI);
      for (const x of [-1, 1]) {
        if (a.style === 'baroque') s.lathe([[0, 0], [0.06, 0], [0.04, 0.05], [0.1, 0.14], [0.08, 0.24], [0.03, 0.28], [0.05, 0.32], [0, 0.36]], gold, [x * 0.8, 3.57, 0.3]);
        else s.ball([0.07, 0.07, 0.07], [x * 0.8, 3.65, 0.3], gold, 12);
      }
      topY += 0.68;
    }
    if (a.style === 'enamel') {
      const stars = Array.from({ length: 46 }, () => {
        const y = 0.75 + random() * 3.5;
        const half = y < 1.65 ? 0.72 : y < 3.45 ? 0.78 : 0.62;
        const depth = y < 3.45 ? 0.405 : 0.355;
        return { at: [(random() * 2 - 1) * half, y, depth] as const, size: 0.014 + random() * 0.02 };
      }).filter((star) => Math.hypot(star.at[0], star.at[1] - 2.6) > 0.82);
      s.scatter(new THREE.OctahedronGeometry(1), gold, stars);
    }

    // The great dial.
    const R = 0.72, dialY = 2.6;
    const palette = {
      prague: { ring: '#191715', numeral: '#e4b94a', day: '#2f6fb5', dusk: '#c9632b', nightSky: '#15182a', line: '#e4b94a' },
      ivory: { ring: '#efe7d2', numeral: '#1d1a17', day: '#e2d8be', dusk: '#cdbf9e', nightSky: '#8d8672', line: '#3a332b' },
      night: { ring: '#141c3f', numeral: '#e8c45a', day: '#1d2b63', dusk: '#27367a', nightSky: '#0c1028', line: '#e8c45a' },
      verdigris: { ring: '#4d8f7b', numeral: '#1c2a26', day: '#b0623a', dusk: '#8a4a2c', nightSky: '#3a5a50', line: '#1c2a26' },
    }[a.dial];
    const count = a.hour === 'thirteen' ? 13 : 12;
    const dialMap = painted(512, 512, (ctx) => {
      const c = 256;
      ctx.fillStyle = palette.ring;
      ctx.beginPath(); ctx.arc(c, c, 256, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.arc(c, c, 182, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = palette.day; ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = palette.dusk; ctx.beginPath(); ctx.arc(c, c + 96, 172, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = palette.nightSky; ctx.beginPath(); ctx.arc(c, c + 128, 132, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = palette.line; ctx.lineWidth = 3;
      for (const r of [70, 120, 172]) { ctx.beginPath(); ctx.arc(c, c + 20, r, 0, Math.PI * 2); ctx.stroke(); }
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(c, c - 150 + i * 4, 150 + i * 46, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke(); }
      if (a.dial === 'night') {
        ctx.fillStyle = palette.numeral;
        for (let i = 0; i < 60; i++) { ctx.beginPath(); ctx.arc(c + (random() * 2 - 1) * 180, c + (random() * 2 - 1) * 180, 1.5 + random() * 3, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.restore();
      ctx.strokeStyle = palette.numeral; ctx.lineWidth = 5;
      for (const r of [184, 250]) { ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.stroke(); }
      ctx.font = 'bold 44px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < count; i++) {
        const angle = i / count * Math.PI * 2;
        ctx.save();
        ctx.translate(c + Math.sin(angle) * 217, c - Math.cos(angle) * 217);
        ctx.rotate(angle);
        const impossible = count === 13 && i === 0;
        if (mood.wear > 0.6 && random() < (mood.wear - 0.6) * 0.8 && !impossible) { ctx.restore(); continue; }
        ctx.fillStyle = impossible ? '#e02a22' : palette.numeral;
        ctx.fillText(impossible ? 'XIII' : count === 13 ? ROMAN[i % 12 === 0 ? 0 : i] : ROMAN[i], 0, 0, 62);
        ctx.restore();
      }
      for (let i = 0; i < count * 5; i++) {
        const angle = i / (count * 5) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(c + Math.sin(angle) * 186, c - Math.cos(angle) * 186); ctx.lineTo(c + Math.sin(angle) * 194, c - Math.cos(angle) * 194); ctx.stroke();
      }
      if (a.running === 'stopped') {
        ctx.strokeStyle = 'rgba(245,245,240,0.9)'; ctx.lineWidth = 3;
        const ox = c + (random() - 0.5) * 160, oy = c + (random() - 0.5) * 160;
        for (let i = 0; i < 9; i++) {
          let x = ox, y = oy; const angle = i / 9 * Math.PI * 2 + random();
          ctx.beginPath(); ctx.moveTo(x, y);
          for (let k = 0; k < 5; k++) { x += Math.cos(angle + (random() - 0.5)) * 60; y += Math.sin(angle + (random() - 0.5)) * 60; ctx.lineTo(x, y); }
          ctx.stroke();
        }
      }
    });
    const dial = s.mesh(new THREE.CircleGeometry(R, 48), new THREE.MeshStandardMaterial({ map: dialMap, roughness: 0.55 }), [0, dialY, F + 0.035]);
    dial.castShadow = false;
    s.cylinder(R + 0.03, R + 0.03, 0.03, [0, dialY, F + 0.015], dark, 48).rotation.x = Math.PI / 2;
    s.ring(R + 0.02, 0.035, [0, dialY, F + 0.035], gold);

    // Zodiac ring: an eccentric band of twelve signs that drifts around the dial.
    const zodiacMap = painted(256, 256, (ctx) => {
      ctx.fillStyle = a.dial === 'ivory' ? '#2a2622' : '#d9b04a';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = a.dial === 'ivory' ? '#e9dfc4' : '#2a1d12';
      ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 12; i++) {
        const angle = i / 12 * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(128 + Math.cos(angle) * 84, 128 + Math.sin(angle) * 84); ctx.lineTo(128 + Math.cos(angle) * 128, 128 + Math.sin(angle) * 128); ctx.stroke();
        ctx.save();
        ctx.translate(128 + Math.cos(angle + Math.PI / 12) * 106, 128 + Math.sin(angle + Math.PI / 12) * 106);
        ctx.rotate(angle + Math.PI / 12 + Math.PI / 2);
        ctx.beginPath();
        const g = i % 6;
        if (g === 0) { ctx.moveTo(-8, -8); ctx.quadraticCurveTo(0, -2, 0, 9); ctx.quadraticCurveTo(0, -2, 8, -8); }
        else if (g === 1) { ctx.arc(0, 3, 6, 0, Math.PI * 2); ctx.moveTo(-8, -9); ctx.quadraticCurveTo(0, -1, 8, -9); }
        else if (g === 2) { ctx.moveTo(-4, -9); ctx.lineTo(-4, 9); ctx.moveTo(4, -9); ctx.lineTo(4, 9); ctx.moveTo(-8, -9); ctx.lineTo(8, -9); ctx.moveTo(-8, 9); ctx.lineTo(8, 9); }
        else if (g === 3) { ctx.moveTo(-8, 8); ctx.lineTo(8, -8); ctx.moveTo(1, -8); ctx.lineTo(8, -8); ctx.lineTo(8, -1); }
        else if (g === 4) { for (const y of [-4, 4]) { ctx.moveTo(-9, y); ctx.lineTo(-4, y - 4); ctx.lineTo(0, y); ctx.lineTo(4, y - 4); ctx.lineTo(9, y); } }
        else { ctx.arc(-9, 0, 9, -1, 1); ctx.moveTo(9 - 9 * Math.cos(1), -9 * Math.sin(1)); ctx.arc(9, 0, 9, Math.PI - 1, Math.PI + 1); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); }
        ctx.stroke();
        ctx.restore();
      }
    });
    const zodiac = new THREE.Group();
    zodiac.position.set(0, dialY, F + 0.05);
    zodiac.rotation.z = random() * 6;
    s.root.add(zodiac);
    const band = s.mesh(new THREE.RingGeometry(0.27, 0.41, 48), new THREE.MeshStandardMaterial({ map: zodiacMap, roughness: 0.4, metalness: 0.3 }), [0, 0, 0]);
    band.castShadow = false;
    zodiac.add(band);
    band.position.set(0.1, 0, 0);

    // Hands: a short sun hand for the hour, a long pointer for the minute, a moon on its own arm.
    const HOURS = { midnight: [0, 0], 'three-am': [3, 0], dawn: [6, 0], noon: [0, 0], 'five-to': [11.92, 55], thirteen: [0, 0] } as const;
    const [hour, minute] = HOURS[a.hour];
    const hand = (length: number, width: number, z: number, material: THREE.Material) => {
      const group = new THREE.Group();
      group.position.set(0, dialY, F + z);
      s.root.add(group);
      const shape = new THREE.Shape();
      shape.moveTo(-width, -length * 0.16); shape.lineTo(width, -length * 0.16); shape.lineTo(width * 0.55, length * 0.8); shape.lineTo(width * 1.5, length * 0.82); shape.lineTo(0, length); shape.lineTo(-width * 1.5, length * 0.82); shape.lineTo(-width * 0.55, length * 0.8); shape.closePath();
      group.add(s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false }), material));
      return group;
    };
    const hourHand = hand(0.42, 0.03, 0.075, gold);
    const sun = s.mesh(gearGeometry(0.085, 12, 0.014, 0, 0, 0.035), s.material('#f2c234', { emissive: '#f2a51e', emissiveIntensity: mix(0.2, 0.8, mood.cheer), metalness: 0.4, roughness: 0.3 }), [0, 0.3, 0.02]);
    hourHand.add(sun);
    const minuteHand = hand(0.64, 0.018, 0.095, a.dial === 'ivory' ? dark : gold);
    const moonHand = new THREE.Group();
    moonHand.position.set(0, dialY, F + 0.062);
    s.root.add(moonHand);
    moonHand.add(s.rod([0, 0, 0], [0, 0.5, 0], 0.008, dark), s.ball([0.045, 0.045, 0.03], [0, 0.5, 0.01], silver, 12));
    moonHand.rotation.z = random() * 6;
    hourHand.rotation.z = -(hour / 12) * Math.PI * 2;
    minuteHand.rotation.z = a.running === 'stopped' ? Math.PI + (random() - 0.5) * 0.25 : -(minute / 60) * Math.PI * 2;
    s.cylinder(0.05, 0.05, 0.12, [0, dialY, F + 0.06], gold, 16).rotation.x = Math.PI / 2;

    // Exposed going train on the side of the case.
    const spinners: { node: THREE.Object3D; speed: number }[] = [];
    const train: [number, number, number, number, number][] = [[2.75, 0.02, 0.36, 18, 1], [2.2, 0.26, 0.22, 11, -1.64], [2.06, -0.14, 0.14, 8, 2.6]];
    for (const [y, z, r, teeth, rate] of train) {
      const cog = s.mesh(gearGeometry(r, teeth, 0.05, r * 0.14, r > 0.2 ? 5 : 0), gold, [0.84, y, z]);
      cog.rotation.y = Math.PI / 2;
      const holder = new THREE.Group();
      holder.position.copy(cog.position);
      holder.rotation.y = Math.PI / 2;
      cog.position.set(0, 0, 0);
      cog.rotation.set(0, 0, random() * 2);
      holder.add(cog);
      s.root.add(holder);
      spinners.push({ node: cog, speed: rate });
      s.rod([0.8, y, z], [0.9, y, z], 0.03, dark);
    }

    // Lower stage.
    const lowY = 1.13;
    let pendulum: THREE.Group | null = null;
    if (a.lower === 'calendar') {
      const calendar = painted(256, 256, (ctx) => {
        ctx.fillStyle = palette.ring; ctx.beginPath(); ctx.arc(128, 128, 128, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 12; i++) {
          const angle = i / 12 * Math.PI * 2;
          ctx.fillStyle = ['#c9632b', '#2f6fb5', '#5d8a4a', '#d9b04a'][i % 4];
          ctx.beginPath(); ctx.arc(128 + Math.cos(angle) * 92, 128 + Math.sin(angle) * 92, 20, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = palette.numeral; ctx.beginPath(); ctx.arc(128, 128, 54, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = palette.ring; ctx.beginPath(); ctx.arc(128, 128, 30, 0, Math.PI * 2); ctx.fill();
      });
      s.mesh(new THREE.CircleGeometry(0.44, 36), new THREE.MeshStandardMaterial({ map: calendar, roughness: 0.6 }), [0, lowY, F + 0.022]).castShadow = false;
      s.ring(0.45, 0.025, [0, lowY, F + 0.02], gold);
      s.rod([0, lowY, F + 0.04], [0.2, lowY + 0.3, F + 0.04], 0.012, gold, 0.004);
    } else if (a.lower === 'plaque') {
      s.box([1.14, 0.5, 0.03], [0, lowY, F + 0.01], gold);
      s.label(['TEMPUS FUGIT', 'MEMENTO MORI', 'WIND ME DAILY', 'ALL IN GOOD TIME'][Math.floor(random() * 4)], 1.04, 0.4, [0, lowY, F + 0.03], '#e4c15a', '#1d1a17');
    } else {
      s.box([0.74, 0.86, 0.04], [0, lowY, F - 0.005], dark);
      s.box([0.82, 0.06, 0.06], [0, lowY + 0.45, F + 0.01], gold);
      s.box([0.82, 0.06, 0.06], [0, lowY - 0.45, F + 0.01], gold);
      if (a.lower === 'pendulum') {
        pendulum = new THREE.Group();
        pendulum.position.set(0, lowY + 0.42, F + 0.04);
        pendulum.rotation.z = (random() - 0.5) * 0.5;
        s.root.add(pendulum);
        pendulum.add(s.rod([0, 0, 0], [0, -0.62, 0], 0.012, gold));
        const bob = s.cylinder(0.13, 0.13, 0.03, [0, -0.64, 0], gold, 24);
        bob.rotation.x = Math.PI / 2;
        pendulum.add(bob);
      } else {
        for (const [x, drop] of [[-0.2, 0.3 + random() * 0.4], [0.02, 0.2 + random() * 0.5], [0.22, 0.25 + random() * 0.45]] as const) {
          s.rod([x, lowY + 0.42, F + 0.04], [x, lowY + 0.42 - drop, F + 0.04], 0.008, gold);
          s.cylinder(0.06, 0.06, 0.2, [x, lowY + 0.34 - drop, F + 0.04], s.material('#6f7378', { metalness: 0.5, roughness: 0.4 }), 14);
        }
      }
    }

    // The doors and whoever has come out of them.
    const doorY = 3.93, doorZ = 0.35;
    const open = a.figure !== 'none';
    s.box([0.62, 0.56, 0.03], [0, doorY, doorZ], dark);
    s.box([1.1, 0.05, 0.34], [0, doorY - 0.3, doorZ + 0.15], gold);
    const doorPaint = s.material(a.style === 'enamel' ? '#d6aa3c' : a.style === 'baroque' ? '#7a2a22' : '#6b4a33', { roughness: 0.6 });
    for (const side of [-1, 1]) {
      const hinge = new THREE.Group();
      hinge.position.set(side * 0.31, doorY, doorZ + 0.02);
      hinge.rotation.y = open ? side * 1.9 : 0;
      s.root.add(hinge);
      const leaf = s.box([0.3, 0.54, 0.025], [-side * 0.15, 0, 0], doorPaint);
      hinge.add(leaf);
      const knob = s.ball([0.02, 0.02, 0.02], [-side * 0.26, 0, 0.02], gold, 8);
      hinge.add(knob);
    }
    const parade = new THREE.Group();
    parade.position.set(0, doorY - 0.275, doorZ + 0.17);
    s.root.add(parade);
    const pa = <T extends THREE.Object3D>(node: T) => { parade.add(node); return node; };
    const robe = (x: number, colour: string, height = 0.3) => pa(s.cylinder(0.035, 0.1, height, [x, height / 2, 0], s.material(colour), 12));
    const headOf = (x: number, y: number, colour = '#e9cfae') => pa(s.ball([0.055, 0.06, 0.055], [x, y, 0], s.material(colour), 12));
    if (a.figure === 'death') {
      const bone = s.material('#f2efe4', { roughness: 0.5 });
      pa(s.rod([0, 0, 0], [0, 0.3, 0], 0.016, bone));
      for (let i = 0; i < 4; i++) pa(s.ring(0.055 - i * 0.006, 0.008, [0, 0.27 - i * 0.035, 0], bone)).rotation.x = Math.PI / 2;
      for (const side of [-1, 1]) pa(s.rod([side * 0.03, 0.13, 0], [side * 0.05, 0, 0.02], 0.011, bone));
      pa(s.ball([0.06, 0.07, 0.065], [0, 0.38, 0], bone, 12));
      for (const side of [-1, 1]) pa(s.ball([0.016, 0.02, 0.01], [side * 0.024, 0.39, 0.058], dark, 8));
      pa(s.rod([0.06, 0.28, 0], [0.17, 0.2, 0.04], 0.01, bone));
      pa(s.rod([0.17, 0.0, 0.04], [0.17, 0.56, 0.04], 0.009, s.material('#4a3423')));
      pa(s.ring(0.12, 0.012, [0.05, 0.56, 0.04], s.material('#c9ced2', { metalness: 0.6, roughness: 0.3 }), Math.PI * 0.6)).rotation.z = Math.PI * 0.35;
      pa(s.rod([-0.06, 0.28, 0], [-0.15, 0.22, 0.05], 0.01, bone));
      pa(s.cylinder(0.03, 0.006, 0.045, [-0.15, 0.25, 0.05], gold, 10));
      pa(s.cylinder(0.006, 0.03, 0.045, [-0.15, 0.205, 0.05], gold, 10));
    } else if (a.figure === 'rooster') {
      const bright = s.material('#e9b730', { metalness: 0.5, roughness: 0.3 });
      pa(s.rod([0, 0, 0], [0, 0.12, 0], 0.012, bright));
      pa(s.ball([0.07, 0.085, 0.12], [0, 0.2, 0], bright, 14));
      pa(s.ball([0.05, 0.06, 0.05], [0, 0.33, 0.09], bright, 12));
      pa(s.rod([0, 0.33, 0.13], [0, 0.31, 0.19], 0.02, s.material('#d9731f'), 0.002));
      pa(s.mesh(gearGeometry(0.045, 5, 0.012, 0, 0, 0.022), s.material('#d3261f'), [0, 0.385, 0.085])).rotation.y = Math.PI / 2;
      for (let i = 0; i < 4; i++) pa(s.ring(0.1 + i * 0.02, 0.012, [0, 0.2, -0.1 - i * 0.004], bright, Math.PI * 0.55)).rotation.set(0, Math.PI / 2, 0.5 + i * 0.12);
    } else if (a.figure === 'king') {
      robe(0, '#b5261e', 0.34);
      pa(s.ring(0.075, 0.016, [0, 0.12, 0], s.material('#f2efe4'))).rotation.x = Math.PI / 2;
      headOf(0, 0.38);
      pa(s.mesh(gearGeometry(0.06, 7, 0.06, 0.04, 0, 0.02), gold, [0, 0.45, 0])).rotation.x = Math.PI / 2;
      pa(s.rod([0.1, 0.05, 0.05], [0.1, 0.42, 0.05], 0.009, gold));
      pa(s.ball([0.025, 0.025, 0.025], [0.1, 0.43, 0.05], gold, 8));
    } else if (a.figure === 'dancers') {
      robe(-0.1, '#e58aa6', 0.26); headOf(-0.1, 0.3);
      robe(0.1, '#3f79c4', 0.3); headOf(0.1, 0.34);
      pa(s.rod([-0.07, 0.2, 0.03], [0.07, 0.22, 0.03], 0.012, s.material('#e9cfae')));
    } else if (a.figure === 'angel') {
      robe(0, '#f4f1e8', 0.34);
      headOf(0, 0.38);
      pa(s.ring(0.045, 0.007, [0, 0.47, 0], gold)).rotation.x = Math.PI / 2;
      for (const side of [-1, 1]) {
        const wing = pa(s.ball([0.1, 0.16, 0.02], [side * 0.11, 0.3, -0.04], s.material('#f4f1e8'), 12));
        wing.rotation.z = -side * 0.5;
      }
      pa(s.rod([0, 0.37, 0.05], [0.04, 0.4, 0.3], 0.008, gold, 0.03));
    } else if (a.figure === 'apostles') {
      for (let i = -1; i <= 1; i++) {
        const tone = ['#6b4a33', '#7a5a3c', '#54402f'][i + 1];
        robe(i * 0.2, tone, 0.26 + (i === 0 ? 0.04 : 0));
        headOf(i * 0.2, 0.3 + (i === 0 ? 0.04 : 0), tone);
        pa(s.ball([0.03, 0.035, 0.02], [i * 0.2, 0.3 + (i === 0 ? 0.04 : 0), 0.045], s.material('#e9cfae'), 8));
      }
    }

    // Moon globe in the gable, and the crown.
    const moonY = 4.43 + (a.style === 'gothic' ? 0.3 : a.style === 'iron' ? 0.31 : 0.3);
    s.cylinder(0.2, 0.2, 0.04, [0, moonY, 0.36], dark, 24).rotation.x = Math.PI / 2;
    s.ring(0.2, 0.02, [0, moonY, 0.38], gold);
    const moon = new THREE.Group();
    moon.position.set(0, moonY, 0.4);
    s.root.add(moon);
    const lit = s.mesh(new THREE.SphereGeometry(0.15, 24, 14, 0, Math.PI), silver);
    const unlit = s.mesh(new THREE.SphereGeometry(0.15, 24, 14, Math.PI, Math.PI), s.material('#14151b', { roughness: 0.5 }));
    moon.add(lit, unlit);
    // The lit half spans phi 0..π, whose middle faces +z; turning the globe hides it by degrees.
    moon.rotation.y = { new: Math.PI, crescent: Math.PI * 0.72, half: Math.PI / 2, gibbous: Math.PI * 0.28, full: 0 }[a.moon];

    let bell: THREE.Object3D | null = null;
    if (a.top === 'spire') {
      s.cylinder(0, 0.2, 1.1, [0, topY + 0.55, 0], a.style === 'gothic' ? shade : gold, a.style === 'gothic' ? 4 : 12);
      s.ball([0.07, 0.07, 0.07], [0, topY + 1.12, 0], gold, 12);
    } else if (a.top === 'bell') {
      for (const x of [-1, 1]) s.box([0.08, 0.6, 0.3], [x * 0.3, topY + 0.3, 0], shade);
      s.box([0.8, 0.08, 0.4], [0, topY + 0.64, 0], shade);
      s.cylinder(0, 0.3, 0.3, [0, topY + 0.83, 0], shade, 4).rotation.y = Math.PI / 4;
      bell = s.lathe([[0.19, 0], [0.2, 0.03], [0.14, 0.12], [0.1, 0.3], [0.05, 0.36], [0, 0.37]], s.material('#b98b3c', { metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide }), [0, topY + 0.18, 0]);
    } else if (a.top === 'dome') {
      s.lathe([[0.3, 0], [0.34, 0.1], [0.36, 0.25], [0.28, 0.45], [0.12, 0.6], [0.04, 0.72], [0.02, 0.9], [0, 0.92]], a.style === 'enamel' ? body : gold, [0, topY, 0]);
      s.ball([0.05, 0.05, 0.05], [0, topY + 0.94, 0], gold, 10);
    } else {
      s.rod([0, topY, 0], [0, topY + 0.2, 0], 0.04, shade);
      const burst = s.mesh(gearGeometry(0.42, 16, 0.05, 0.12, 0, 0.16), gold, [0, topY + 0.6, 0]);
      spinners.push({ node: burst, speed: 0.4 });
      s.ball([0.14, 0.14, 0.06], [0, topY + 0.6, 0.02], s.material('#f2c234', { emissive: '#f2a51e', emissiveIntensity: mix(0.2, 0.9, mood.cheer) }), 14);
    }

    const rate = { steady: 1, racing: 9, backwards: -1.4, stopped: 0 }[a.running] * mix(0.08, 0.5, mood.energy);
    s.root.scale.setScalar(0.72);
    return s.finish({
      footprint: 0.85,
      update: (dt, time) => {
        minuteHand.rotation.z -= dt * rate;
        hourHand.rotation.z -= dt * rate / 12;
        moonHand.rotation.z -= dt * rate / 5;
        zodiac.rotation.z -= dt * rate / 8;
        for (const spinner of spinners) spinner.node.rotation.z += dt * rate * spinner.speed;
        if (pendulum && rate !== 0) pendulum.rotation.z = Math.sin(time * 2.6) * 0.28;
        if (bell && rate !== 0) bell.rotation.z = Math.sin(time * 2.2) * 0.2 * Math.min(Math.abs(rate) * 4, 1);
        if (open && rate !== 0) parade.rotation.y = Math.sin(time * 0.9) * 0.5;
      },
    });
  },
});
