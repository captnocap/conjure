import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const TIMES = {
  early: '5:58, just before the dawn shift.',
  nine: '9:00 exactly.',
  late: '9:17, late again.',
  noon: '12:00, the lunch whistle.',
  five: '5:00, quitting time.',
  midnight: '11:59, the graveyard shift.',
} as const;
const HM: Record<keyof typeof TIMES, [number, number]> = { early: [5, 58], nine: [9, 0], late: [9, 17], noon: [12, 0], five: [5, 0], midnight: [11, 59] };
const SIGNS = {
  none: 'No sign.',
  punch: 'PUNCH IN',
  pay: 'NO CARD NO PAY',
  docked: 'LATE = DOCKED',
  safe: '0 DAYS SINCE ACCIDENT',
  closing: 'PLANT CLOSING',
  thanks: 'THANK YOU TEAM',
} as const;

export default defineThing({
  questions: {
    era: choice('What era is the clock from?', {
      brass: 'A 1910s oak-cased recorder with a brass dial, a swinging pendulum and a crank lever.',
      steel: 'A 1950s grey-green enamelled steel clock with a big round dial and a punch lever.',
      beige: 'A 1980s beige plastic clock with a plain dial and a slot in the top.',
      digital: 'A grey box with red LED digits and a keypad.',
      scanner: 'A modern black fingerprint terminal with a blue screen; the cards are relics.',
    }),
    time: choice('What time does it show?', TIMES),
    rack: score('How full is the card rack?', ['Empty, everyone gone', 'One or two cards left', 'Half the slots filled', 'Every slot filled']),
    racks: choice('How are the cards racked?', {
      one: 'A single rack beside the clock.',
      inout: 'Two racks flanking the clock, IN on one side and OUT on the other.',
    }),
    mount: choice('What is it mounted on?', {
      post: 'A steel post bolted to the floor, with a backplate.',
      wall: 'A slab of two-tone painted factory wall.',
      board: 'A plywood board on two legs, temporary and moveable.',
      cage: 'A wire-mesh partition by a works gate.',
    }),
    sign: choice('What does the sign above it say?', SIGNS),
    moment: choice('What is the moment?', {
      quiet: 'Nothing. Between shifts.',
      punching: 'A card is standing in the slot, mid-punch, its owner out of frame.',
      walkout: 'Cards are thrown down across the floor: a walkout.',
      left: 'A lunch pail and a hard hat have been left underneath.',
      bell: 'The shift bell above the clock is ringing.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dark = s.material('#26282b');
    const steel = s.material('#7c8488', { metalness: 0.4, roughness: 0.45 });
    const brass = s.material('#c9a24a', { metalness: 0.6, roughness: 0.3 });
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const two = a.racks === 'inout';
    const span = two ? 1.12 : 0.86;
    const midY = 1.42;
    let face = 0; // z of the mounting surface

    // --- Mount.
    if (a.mount === 'post') {
      s.box([0.09, 1.95, 0.09], [0, 0.975, -0.06], steel);
      s.box([0.3, 0.02, 0.3], [0, 0.01, -0.06], steel);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.015, 0.015, 0.02, [x * 0.11, 0.028, -0.06 + z * 0.11], dark, 8);
      s.box([span, 0.92, 0.025], [0, midY, -0.0125], s.material('#56616a', { metalness: 0.2, roughness: 0.55 }));
      s.cylinder(0.06, 0.06, 0.02, [0, 1.96, -0.06], steel, 12);
    } else if (a.mount === 'wall') {
      const top = new THREE.Color('#d9d4bf').lerp(new THREE.Color('#b9ad8a'), mood.wear * 0.5);
      const dado = new THREE.Color(mood.warmth > 0.5 ? '#6f7f5a' : '#5a7183').lerp(new THREE.Color('#5f5a4c'), mood.wear * 0.4);
      s.box([span + 0.5, 1.25, 0.14], [0, 1.675, -0.07], s.material(top, { roughness: 0.95 }));
      s.box([span + 0.5, 1.05, 0.14], [0, 0.525, -0.07], s.material(dado, { roughness: 0.9 }));
      s.box([span + 0.5, 0.03, 0.15], [0, 1.05, -0.07], dark);
      s.box([span + 0.5, 0.1, 0.16], [0, 0.05, -0.07], dark);
    } else if (a.mount === 'board') {
      const ply = s.material('#c79f62', { roughness: 0.9 });
      s.box([span + 0.1, 1.0, 0.03], [0, midY, -0.015], ply);
      const timber = s.material('#a88352', { roughness: 0.9 });
      for (const x of [-1, 1]) {
        s.box([0.07, 1.95, 0.05], [x * (span / 2 - 0.05), 0.975, -0.055], timber);
        s.box([0.07, 0.05, 0.6], [x * (span / 2 - 0.05), 0.025, -0.03], timber);
        s.rod([x * (span / 2 - 0.05), 0.05, -0.3], [x * (span / 2 - 0.05), 0.7, -0.08], 0.018, timber);
      }
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.strokeStyle = '#4b5257'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(0, 64); ctx.lineTo(64, 0); ctx.lineTo(128, 64); ctx.lineTo(64, 128); ctx.closePath(); ctx.stroke();
      const mesh = new THREE.CanvasTexture(canvas);
      mesh.wrapS = mesh.wrapT = THREE.RepeatWrapping;
      const cw = span + 0.6;
      mesh.repeat.set(cw / 0.09, 2.1 / 0.09);
      const wire = new THREE.MeshStandardMaterial({ map: mesh, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.4, roughness: 0.5 });
      s.mesh(new THREE.PlaneGeometry(cw, 2.1), wire, [0, 1.05, -0.04]);
      for (const x of [-1, 0, 1]) s.box([0.05, 2.14, 0.05], [x * cw / 2, 1.07, -0.04], steel);
      for (const y of [0.025, 2.12]) s.box([cw, 0.05, 0.05], [0, y, -0.04], steel);
      s.box([span, 0.92, 0.02], [0, midY, -0.01], s.material('#56616a', { metalness: 0.2, roughness: 0.55 }));
    }

    // --- Clock.
    const clockX = two ? 0 : -0.2;
    const [h12, minute] = HM[a.time];
    const caseHex = { brass: '#5b3a22', steel: '#8fa39a', beige: '#d9cfb4', digital: '#8b9197', scanner: '#2b2e33' }[a.era];
    const shell = s.material(caseHex, { roughness: a.era === 'brass' ? 0.55 : 0.5, metalness: a.era === 'steel' ? 0.25 : 0 });
    const cw = a.era === 'scanner' ? 0.2 : 0.3, ch = a.era === 'scanner' ? 0.3 : a.era === 'brass' ? 0.62 : 0.46, cd = a.era === 'scanner' ? 0.07 : 0.18;
    const clock = new THREE.Group();
    clock.position.set(clockX, midY + (a.era === 'brass' ? -0.03 : 0.04), face);
    s.root.add(clock);
    clock.scale.setScalar(a.era === 'scanner' ? 1.15 : 1.2);
    add(clock, new THREE.BoxGeometry(cw, ch, cd), shell, [0, 0, cd / 2]);
    const front = cd + 0.001;
    let second: THREE.Mesh | null = null;
    let pendulum: THREE.Group | null = null;
    const dial = (radius: number, y: number, paper: string, ink: string, roman: boolean) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = paper; ctx.beginPath(); ctx.arc(128, 128, 126, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineCap = 'round';
      for (let i = 0; i < 60; i++) {
        const t = i / 60 * Math.PI * 2, long = i % 5 === 0;
        ctx.lineWidth = long ? 6 : 2;
        ctx.beginPath(); ctx.moveTo(128 + Math.sin(t) * (long ? 96 : 108), 128 - Math.cos(t) * (long ? 96 : 108)); ctx.lineTo(128 + Math.sin(t) * 116, 128 - Math.cos(t) * 116); ctx.stroke();
      }
      ctx.font = `bold ${roman ? 26 : 30}px ${roman ? 'serif' : 'sans-serif'}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const numerals = roman ? ['XII', 'III', 'VI', 'IX'] : ['12', '3', '6', '9'];
      numerals.forEach((n, i) => ctx.fillText(n, 128 + Math.sin(i * Math.PI / 2) * 76, 128 - Math.cos(i * Math.PI / 2) * 76));
      const hand = (turn: number, length: number, width: number) => { ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(128 - Math.sin(turn) * 14, 128 + Math.cos(turn) * 14); ctx.lineTo(128 + Math.sin(turn) * length, 128 - Math.cos(turn) * length); ctx.stroke(); };
      hand((h12 % 12 + minute / 60) / 12 * Math.PI * 2, 60, 11);
      hand(minute / 60 * Math.PI * 2, 96, 7);
      ctx.beginPath(); ctx.arc(128, 128, 9, 0, Math.PI * 2); ctx.fill();
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const bezel = add(clock, new THREE.CylinderGeometry(radius * 1.12, radius * 1.12, 0.02, 32), a.era === 'brass' ? brass : a.era === 'steel' ? s.material('#d5d9da', { metalness: 0.6, roughness: 0.25 }) : dark, [0, y, front + 0.008]);
      bezel.rotation.x = Math.PI / 2;
      const plate = add(clock, new THREE.CircleGeometry(radius, 40), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.5, emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: mix(0.05, 0.3, 1 - Math.abs(mood.daylight - 0.5) * 2 > 0.5 ? 0 : 1) }), [0, y, front + 0.019]);
      plate.castShadow = false;
      const pivot = new THREE.Group();
      pivot.position.set(0, y, front + 0.022);
      clock.add(pivot);
      second = add(pivot, new THREE.BoxGeometry(0.004, radius * 0.85, 0.002), s.material('#c0271d'), [0, radius * 0.3, 0]);
      second.castShadow = false;
      second = pivot as unknown as THREE.Mesh;
    };
    const slotMat = s.material('#101112');
    let slotAt: [number, number, number] = [clockX, 0, 0];
    if (a.era === 'brass') {
      add(clock, new THREE.BoxGeometry(cw + 0.05, 0.035, cd + 0.03), shell, [0, ch / 2 + 0.017, cd / 2]);
      add(clock, new THREE.BoxGeometry(cw + 0.04, 0.03, cd + 0.02), shell, [0, -ch / 2 - 0.015, cd / 2]);
      dial(0.105, ch / 2 - 0.15, '#efe3c0', '#2b2118', true);
      add(clock, new THREE.BoxGeometry(cw * 0.6, 0.2, 0.004), new THREE.MeshStandardMaterial({ color: '#1c1410', roughness: 0.15 }), [0, -ch / 2 + 0.14, front]);
      pendulum = new THREE.Group();
      pendulum.position.set(0, -ch / 2 + 0.23, front + 0.006);
      add(pendulum, new THREE.BoxGeometry(0.006, 0.14, 0.003), brass, [0, -0.07, 0]);
      add(pendulum, new THREE.CylinderGeometry(0.028, 0.028, 0.006, 16), brass, [0, -0.145, 0]).rotation.x = Math.PI / 2;
      clock.add(pendulum);
      const crank = add(clock, new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), brass, [cw / 2 + 0.05, -0.02, cd * 0.6]);
      crank.rotation.z = -0.9;
      add(clock, new THREE.SphereGeometry(0.024, 10, 8), s.material('#1c1410'), [cw / 2 + 0.115, 0.03, cd * 0.6]);
      add(clock, new THREE.BoxGeometry(0.13, 0.02, 0.012), slotMat, [0, -0.045, front + 0.003]);
      add(clock, new THREE.BoxGeometry(0.17, 0.05, 0.01), brass, [0, -0.045, front]);
      slotAt = [0, -0.045 + 0.08, front + 0.01];
    } else if (a.era === 'steel' || a.era === 'beige') {
      dial(0.105, ch / 2 - 0.14, '#f4f1e4', '#1b1d20', false);
      const hood = add(clock, new THREE.BoxGeometry(cw, 0.12, 0.09), shell, [0, -ch / 2 + 0.09, cd + 0.02]);
      hood.rotation.x = 0.5;
      add(clock, new THREE.BoxGeometry(0.14, 0.014, 0.03), slotMat, [0, -ch / 2 + 0.145, cd + 0.045]);
      slotAt = [0, -ch / 2 + 0.2, cd + 0.045];
      if (a.era === 'steel') {
        const lever = add(clock, new THREE.BoxGeometry(0.02, 0.2, 0.03), s.material('#d5d9da', { metalness: 0.6, roughness: 0.25 }), [cw / 2 + 0.02, -0.07, cd * 0.7]);
        lever.rotation.x = 0.5;
        add(clock, new THREE.SphereGeometry(0.03, 10, 8), s.material('#b3261e'), [cw / 2 + 0.02, 0.02, cd * 0.7 + 0.05]);
        add(clock, new THREE.BoxGeometry(cw * 0.5, 0.03, 0.004), brass, [0, -ch / 2 + 0.025, front]);
      } else {
        add(clock, new THREE.BoxGeometry(0.06, 0.035, 0.012), s.material('#c0271d'), [cw / 2 - 0.05, -ch / 2 + 0.03, front + 0.004]);
        add(clock, new THREE.BoxGeometry(0.1, 0.03, 0.004), dark, [-cw / 2 + 0.07, -ch / 2 + 0.03, front]);
      }
    } else if (a.era === 'digital') {
      const text = `${h12}:${String(minute).padStart(2, '0')}`;
      const led = s.label(text, 0.22, 0.1, [0, 0, 0], '#ff3b2f', '#190606');
      led.removeFromParent(); clock.add(led); led.position.set(0, ch / 2 - 0.09, front + 0.002); led.castShadow = false;
      const ledMat = led.material as THREE.MeshStandardMaterial;
      ledMat.emissive = new THREE.Color('#ffffff'); ledMat.emissiveMap = ledMat.map; ledMat.emissiveIntensity = 0.9;
      add(clock, new THREE.BoxGeometry(0.25, 0.13, 0.006), dark, [0, ch / 2 - 0.09, front - 0.002]);
      const keys = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) keys.push({ at: [-0.075 + c * 0.034, -0.02 - r * 0.034, front + 0.004] as [number, number, number], size: 1 });
      const pad = s.scatter(new THREE.BoxGeometry(0.026, 0.026, 0.008), s.material('#d9dcde'), keys);
      pad.removeFromParent(); clock.add(pad);
      add(clock, new THREE.BoxGeometry(0.014, 0.16, 0.03), slotMat, [cw / 2 - 0.05, -0.07, front]);
      add(clock, new THREE.BoxGeometry(0.02, 0.02, 0.006), new THREE.MeshStandardMaterial({ color: '#45e06b', emissive: '#45e06b', emissiveIntensity: 0.9 }), [cw / 2 - 0.05, 0.05, front + 0.003]);
      slotAt = [cw / 2 - 0.05, -0.07, front + 0.03];
    } else {
      const screen = s.label(`${h12}:${String(minute).padStart(2, '0')}`, 0.15, 0.1, [0, 0, 0], '#eaf6ff', '#1f6fd0');
      screen.removeFromParent(); clock.add(screen); screen.position.set(0, 0.07, front + 0.002); screen.castShadow = false;
      const mat = screen.material as THREE.MeshStandardMaterial;
      mat.emissive = new THREE.Color('#ffffff'); mat.emissiveMap = mat.map; mat.emissiveIntensity = 0.7;
      const padRing = add(clock, new THREE.CylinderGeometry(0.035, 0.035, 0.008, 24), new THREE.MeshStandardMaterial({ color: '#3be08a', emissive: '#3be08a', emissiveIntensity: mix(0.4, 1.4, mood.energy) }), [0, -0.07, front + 0.003]);
      padRing.rotation.x = Math.PI / 2;
      add(clock, new THREE.CylinderGeometry(0.027, 0.027, 0.01, 24), dark, [0, -0.07, front + 0.004]).rotation.x = Math.PI / 2;
      slotAt = [0, -0.2, 0.05];
    }

    // --- Card racks.
    const aged = new THREE.Color('#efe2bd').lerp(new THREE.Color('#c9b07a'), mood.wear * 0.6);
    const stripes = ['#c8382e', '#2f6fb5', '#3f8a55', '#d9a51e'];
    const cardGeo = () => new THREE.BoxGeometry(0.085, 0.19, 0.003);
    const rackAt = two ? [-0.39, 0.39] : [0.22];
    const rows = 12, columns = 2, pitch = 0.058;
    const rackH = rows * pitch + 0.14;
    const taken: [number, number, number][] = [];
    rackAt.forEach((rx, index) => {
      const rackMat = a.era === 'brass' ? s.material('#6b4528', { roughness: 0.6 }) : s.material('#7b858a', { metalness: 0.2, roughness: 0.5 });
      const lipMat = a.era === 'brass' ? s.material('#8a5c38', { roughness: 0.6 }) : s.material('#a3acb0', { metalness: 0.2, roughness: 0.5 });
      const top = midY + rackH / 2 - 0.02;
      s.box([0.25, rackH, 0.02], [rx, midY - 0.02, face + 0.01], rackMat);
      for (const side of [-1, 0, 1]) s.box([0.012, rackH, 0.05], [rx + side * 0.119, midY - 0.02, face + 0.035], rackMat);
      const lips = [], cards = [], bands = [];
      // Each rack fills from its own story: OUT is the complement of IN.
      const share = two ? (index === 0 ? a.rack : 1 - a.rack) * 0.95 : a.rack;
      for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) {
        const x = rx + (c - 0.5) * 0.115, y = top - 0.12 - r * pitch;
        lips.push({ at: [x, y - 0.02, face + 0.032] as [number, number, number], size: 1 });
        const present = share >= 0.999 ? true : share <= 0.001 ? false : random() < share ** 1.3;
        if (!present) continue;
        const lift = random() * 0.012;
        cards.push({ at: [x, y + 0.012 + lift, face + 0.026] as [number, number, number], size: 1 });
        bands.push({ at: [x, y + 0.03 + lift, face + 0.0282] as [number, number, number], size: 1, color: stripes[Math.floor(random() * (mood.cheer > 0.4 ? 4 : 2))] });
        taken.push([x, y, face + 0.034]);
      }
      s.scatter(new THREE.BoxGeometry(0.1, 0.026, 0.024), lipMat, lips);
      if (cards.length) {
        s.scatter(new THREE.BoxGeometry(0.085, 0.05, 0.003), s.material(aged, { roughness: 0.9 }), cards);
        s.scatter(new THREE.BoxGeometry(0.085, 0.014, 0.002), new THREE.MeshStandardMaterial({ roughness: 0.8 }), bands);
      }
      if (two) {
        const tag = s.label(index === 0 ? 'IN' : 'OUT', 0.2, 0.07, [rx, top + 0.03, face + 0.022], '#f4f1e4', index === 0 ? '#2f6b3f' : '#8a2f2f');
        tag.castShadow = false;
      }
    });
    // Hooks left on a scanner's obsolete rack are already told by the empty slots.

    // --- Sign and bell.
    const signY = midY + 0.56 + (a.mount === 'cage' ? 0.02 : 0);
    if (a.sign !== 'none') {
      const grim = a.sign === 'closing' || a.sign === 'docked' || a.sign === 'pay';
      const sign = s.label(SIGNS[a.sign], Math.min(span - 0.1, 0.72), 0.13, [two ? 0 : 0.02, signY + (a.mount === 'wall' ? 0.1 : 0), face + 0.03], grim ? '#f4f1e4' : '#1d2433', grim ? '#a3211b' : a.sign === 'safe' ? '#e9c21b' : '#e9e4d0');
      sign.rotation.z = a.sign === 'closing' ? (random() - 0.5) * 0.12 : 0;
      s.box([Math.min(span - 0.1, 0.72) + 0.03, 0.16, 0.02], [two ? 0 : 0.02, sign.position.y, face + 0.017], dark);
    }
    let bell: THREE.Group | null = null;
    if (a.moment === 'bell') {
      bell = new THREE.Group();
      bell.position.set(clockX, clock.position.y + ch / 2 + 0.1, face + 0.07);
      const dome = add(bell, new THREE.SphereGeometry(0.075, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), s.material('#c0271d', { metalness: 0.4, roughness: 0.3, emissive: '#c0271d', emissiveIntensity: 0.2 }), [0, 0, 0]);
      dome.rotation.x = Math.PI / 2;
      add(bell, new THREE.CylinderGeometry(0.012, 0.012, 0.02, 8), dark, [0, 0, 0.075]).rotation.x = Math.PI / 2;
      add(bell, new THREE.BoxGeometry(0.05, 0.04, 0.05), dark, [0.1, -0.02, -0.03]);
      add(bell, new THREE.SphereGeometry(0.014, 8, 6), steel, [0.08, 0, 0.02]);
      s.root.add(bell);
      // Sound, drawn: short arcs either side.
      const ringMat = new THREE.MeshBasicMaterial({ color: '#c0271d', transparent: true, opacity: 0.55, depthWrite: false });
      for (const side of [-1, 1]) for (const r of [0.13, 0.18]) {
        const arc = add(bell, new THREE.TorusGeometry(r, 0.005, 4, 16, 1.0), ringMat, [0, 0, 0.03]);
        arc.rotation.z = side > 0 ? -0.5 : Math.PI - 0.5; arc.castShadow = false;
      }
    }

    // --- The moment.
    const loose = s.material(aged, { roughness: 0.9 });
    if (a.moment === 'punching' && a.era !== 'scanner') {
      const card = add(clock, cardGeo(), loose, [slotAt[0], slotAt[1], slotAt[2]]);
      if (a.era === 'digital') card.rotation.set(0, Math.PI / 2, Math.PI / 2 - 0.1), card.position.z += 0.07;
      else card.rotation.x = a.era === 'brass' ? 0 : 0.5;
    } else if (a.moment === 'walkout') {
      const n = Math.round(mix(8, 26, mood.density));
      for (let i = 0; i < n; i++) {
        const card = s.mesh(cardGeo(), loose, [mix(-span / 2, span / 2, random()), 0.003 + i * 0.0012, face + mix(0.1, 0.75, random())]);
        card.rotation.set(Math.PI / 2, 0, random() * Math.PI);
      }
    } else if (a.moment === 'left') {
      const tin = s.material(mood.cheer > 0.5 ? '#3f6fb5' : '#5d6a5c', { metalness: 0.4, roughness: 0.4 });
      const lx = two ? -0.2 : -0.25;
      s.box([0.26, 0.12, 0.13], [lx, 0.06, face + 0.25], tin);
      const domeTop = s.cylinder(0.065, 0.065, 0.26, [lx, 0.12, face + 0.25], tin, 16);
      domeTop.rotation.z = Math.PI / 2;
      const grip = s.ring(0.04, 0.006, [lx, 0.185, face + 0.25], dark, Math.PI);
      grip.castShadow = true;
      const hatMat = s.material(mood.cheer > 0.4 ? '#f2c21b' : '#e8e4d6', { roughness: 0.4 });
      const hx = lx + 0.38;
      const crown = s.mesh(new THREE.SphereGeometry(0.11, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), hatMat, [hx, 0.012, face + 0.3]);
      crown.scale.set(1, 1.05, 1.2);
      s.cylinder(0.13, 0.135, 0.012, [hx, 0.008, face + 0.32], hatMat, 20).scale.z = 1.25;
      s.box([0.02, 0.1, 0.24], [hx, 0.08, face + 0.3], hatMat);
    }
    // Rust and grime.
    if (mood.wear > 0.5) {
      const rust = new THREE.MeshStandardMaterial({ color: '#6b4226', roughness: 1, transparent: true, opacity: mix(0, 0.4, mood.wear), depthWrite: false });
      for (let i = 0; i < 5; i++) s.box([mix(0.02, 0.05, random()), mix(0.08, 0.3, random()), 0.002], [mix(-span / 2, span / 2, random()), midY - 0.3 - random() * 0.2, face + 0.001], rust).castShadow = false;
    }

    const pace = mix(0.3, 1.5, mood.energy);
    const hand = second as THREE.Object3D | null;
    return s.finish({
      update: (_dt, time) => {
        if (hand) hand.rotation.z = -Math.floor(time * pace) / 60 * Math.PI * 2;
        if (pendulum) pendulum.rotation.z = Math.sin(time * 3.2) * 0.32;
        if (bell) bell.rotation.z = Math.sin(time * 38) * 0.05 * (0.4 + mood.energy);
      },
    });
  },
});
