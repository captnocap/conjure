import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
const canvasTexture = (width: number, height: number, draw: (ctx: Ctx, w: number, h: number) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const TITLES = ['SOFT ROCK SUNSET', 'TRUCK STOP GOLD', 'LOVE SOUNDS 77', 'DISCO DRIVE', 'MELLOW MOODS', 'HOT WAX VOL. 3', 'BACHELOR PAD', 'ROADHOUSE', 'MIDNIGHT CRUISE', 'FUNKY FEVER', 'COUNTRY MILES', 'SMOOTH SAX'];
const BANDS = ['#d8402a', '#e8a02a', '#2a7ab0', '#3a8a4a', '#8a3a9a', '#f0e0a0', '#1c1c1e', '#d86a9a'];

export default defineThing({
  questions: {
    finish: choice('What does the player look like?', {
      walnut: 'Walnut wood-grain veneer with a brushed silver face.',
      black: 'Black and brushed silver, the serious hi-fi look.',
      white: 'Glossy white plastic with orange trim, space-age mod.',
      teak: 'Brushed silver face with teak end cheeks.',
      avocado: 'Avocado green plastic from a department store.',
    }),
    state: choice('What is it doing?', {
      playing: 'Playing: lamps lit, the VU meters jumping, a cartridge pushed in.',
      off: 'Switched off and dark, a cartridge left in the slot.',
      jammed: 'Jammed: the cartridge half out at an angle, nothing moving.',
      eating: 'Eating the tape: loops of brown ribbon spilling from the slot.',
    }),
    tapes: score('How many cartridges are stacked beside it?', ['None at all', 'A couple', 'A leaning stack of eight', 'A toppling tower']),
    speakers: choice('What speakers go with it?', {
      none: 'Just the deck on its own.',
      pair: 'A matching pair of wood-boxed speakers with brown cloth grilles, one each side.',
      builtIn: 'Speakers built into the ends of the deck behind cloth grilles.',
      single: 'One mismatched speaker beside it, the other long lost.',
    }),
    headphones: noul('Is a pair of big padded headphones plugged in, their coiled cord trailing off the edge?'),
    extra: choice('What else sits on or by it?', {
      nothing: 'Nothing else.',
      ashtray: 'A full glass ashtray on top of the deck.',
      beer: 'A can of beer sweating on top.',
      magazine: 'A folded magazine lying on the stack of tapes.',
      joint: 'A rolled cigarette balanced on the edge, a thread of smoke.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * random();
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const on = a.state === 'playing';
    const W = a.speakers === 'builtIn' ? 0.7 : 0.46, H = 0.14, D = 0.28;

    // ---- Materials: veneer painted as grain, plastic, chrome.
    const woodTexture = (base: string, dark: string) => {
      const map = canvasTexture(512, 256, (ctx, w, h) => {
        ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 90; i++) {
          ctx.strokeStyle = dark; ctx.globalAlpha = 0.12 + random() * 0.25; ctx.lineWidth = 1 + random() * 3;
          const y = random() * h, wobble = 4 + random() * 10, f = random() * 0.1;
          ctx.beginPath(); ctx.moveTo(0, y);
          for (let x = 0; x <= w; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.02 + f) * wobble + Math.sin(x * 0.07) * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      });
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      return map;
    };
    const wood = a.finish === 'walnut' ? new THREE.MeshStandardMaterial({ map: woodTexture('#6a3f22', '#2e1a0c'), roughness: 0.45 })
      : a.finish === 'teak' ? new THREE.MeshStandardMaterial({ map: woodTexture('#a8703a', '#5a3818'), roughness: 0.5 })
      : s.material({ black: '#1e1e20', white: '#f1efe8', avocado: '#6f7f3a' }[a.finish as 'black' | 'white' | 'avocado'], { roughness: a.finish === 'white' ? 0.25 : 0.5 });
    const faceColour = { walnut: '#c4c8ca', black: '#b8bcbe', white: '#e8e4dc', teak: '#c0c4c6', avocado: '#2a2c28' }[a.finish];
    const faceMetal = a.finish === 'black' || a.finish === 'teak' || a.finish === 'walnut';
    const face = s.material(faceColour, { metalness: faceMetal ? 0.7 : 0.1, roughness: faceMetal ? 0.3 : 0.55 });
    const chrome = s.material('#dfe3e5', { metalness: 0.9, roughness: 0.2 });
    const trim = s.material(a.finish === 'white' ? '#e8702a' : '#c9a44a', { metalness: 0.6, roughness: 0.35 });
    const black = s.material('#141416', { roughness: 0.6 });
    const cloth = new THREE.MeshStandardMaterial({
      roughness: 1,
      map: (() => {
        const map = canvasTexture(128, 128, (ctx, w, h) => {
          ctx.fillStyle = a.finish === 'white' ? '#3a3a3c' : '#4a3626'; ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = 'rgba(255,230,190,0.18)';
          for (let i = 0; i < w; i += 4) { ctx.fillRect(i, 0, 1, h); ctx.fillRect(0, i, w, 1); }
        });
        map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(6, 3);
        return map;
      })(),
    });

    // ---- The deck: a veneered box with a metal face, feet and a thin top edge.
    const deckY = 0.012;
    s.box([W, H, D], [0, deckY + H / 2, 0], wood);
    s.box([W - 0.02, H - 0.02, 0.012], [0, deckY + H / 2, D / 2 - 0.002], face);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.012, 0.014, deckY, [x * (W / 2 - 0.03), deckY / 2, z * (D / 2 - 0.03)], black, 10);
    if (a.finish === 'white' || a.finish === 'avocado') s.box([W + 0.004, 0.012, D + 0.004], [0, deckY + H - 0.006, 0], trim);
    if (a.speakers === 'builtIn') for (const x of [-1, 1]) s.box([0.11, H - 0.03, 0.004], [x * (W / 2 - 0.07), deckY + H / 2, D / 2 + 0.006], cloth);

    // ---- Front face layout, in the deck's local x: slot left, meters centre, knobs right.
    const fz = D / 2 + 0.006;
    const fx = a.speakers === 'builtIn' ? 0 : 0;
    const slotX = fx - 0.13, slotY = deckY + H * 0.5;
    s.box([0.145, 0.03, 0.02], [slotX, slotY, fz - 0.005], black);
    // VU meters: cream windows with a painted scale and a needle pivoting at the bottom.
    const scale = canvasTexture(128, 80, (ctx, w, h) => {
      ctx.fillStyle = on ? '#f6e9b8' : '#e2d9b6'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#2a2a2c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(w / 2, h * 1.2, h * 0.85, Math.PI * 1.2, Math.PI * 1.62); ctx.stroke();
      ctx.strokeStyle = '#c8302a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(w / 2, h * 1.2, h * 0.85, Math.PI * 1.62, Math.PI * 1.8); ctx.stroke();
      ctx.fillStyle = '#2a2a2c'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('VU', w / 2, h * 0.9);
      for (let i = 0; i < 7; i++) { const t = Math.PI * (1.2 + i * 0.1); ctx.beginPath(); ctx.moveTo(w / 2 + Math.cos(t) * h * 0.78, h * 1.2 + Math.sin(t) * h * 0.78); ctx.lineTo(w / 2 + Math.cos(t) * h * 0.92, h * 1.2 + Math.sin(t) * h * 0.92); ctx.stroke(); }
    });
    const meterMaterial = new THREE.MeshStandardMaterial({ map: scale, roughness: 0.4, emissive: '#ffe9a0', emissiveMap: scale, emissiveIntensity: on ? 0.55 : 0 });
    const needles: THREE.Object3D[] = [];
    for (const x of [fx + 0.01, fx + 0.085]) {
      s.box([0.064, 0.042, 0.004], [x, slotY + 0.012, fz - 0.003], black);
      s.mesh(new THREE.PlaneGeometry(0.058, 0.036), meterMaterial, [x, slotY + 0.012, fz]);
      const pivot = new THREE.Group();
      pivot.position.set(x, slotY - 0.006, fz + 0.001);
      const needle = new THREE.Mesh(new THREE.BoxGeometry(0.0015, 0.03, 0.0008), s.material('#1a1a1c'));
      needle.position.y = 0.015;
      pivot.add(needle);
      pivot.rotation.z = 0.55;
      s.root.add(pivot);
      needles.push(pivot);
    }
    // Program lamps 1-4, one lit while playing; knobs; the program button; the badge.
    const lampOn = Math.floor(random() * 4);
    for (let i = 0; i < 4; i++) {
      const lit = on && i === lampOn;
      s.box([0.012, 0.012, 0.004], [slotX - 0.05 + i * 0.03, slotY + 0.038, fz - 0.002], lit ? new THREE.MeshStandardMaterial({ color: '#ff9a3a', emissive: '#ff8a2a', emissiveIntensity: 1.6 }) : s.material('#5a3a2a', { roughness: 0.4 }));
    }
    for (let i = 0; i < 3; i++) {
      const knob = s.cylinder(0.014, 0.015, 0.014, [fx + 0.16 + (i - 1) * 0.04, slotY + 0.02 - (i % 2) * 0.0, fz + 0.005], chrome, 18);
      knob.rotation.x = Math.PI / 2;
      const mark = s.box([0.002, 0.009, 0.002], [fx + 0.16 + (i - 1) * 0.04, slotY + 0.02 + 0.006, fz + 0.012], black);
      mark.rotation.z = rnd(-1.2, 1.2);
      mark.position.x += Math.sin(-mark.rotation.z) * 0.008; mark.position.y = slotY + 0.02 + Math.cos(mark.rotation.z) * 0.008;
    }
    s.box([0.04, 0.012, 0.01], [fx + 0.16, slotY - 0.028, fz + 0.002], a.finish === 'white' ? trim : chrome);
    s.label('8 TRACK STEREO', 0.11, 0.014, [slotX, slotY - 0.035, fz - 0.003], faceMetal ? '#1a1a1c' : '#d8d4c8', faceMetal ? '#b8bcbe' : faceColour);
    // The headphone jack.
    s.cylinder(0.005, 0.005, 0.006, [slotX - 0.095, slotY - 0.035, fz - 0.003], chrome, 10).rotation.x = Math.PI / 2;

    // ---- Cartridges: one in the slot, the rest stacked.
    const cartridge = (title: string, band: string, at: [number, number, number], turn: number, tilt = 0) => {
      const group = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.025, 0.1), s.material(pick(['#1c1c1e', '#2a2a2c', '#4a4a4c', '#e8e4dc', '#3a2a1a'])));
      shell.castShadow = shell.receiveShadow = true;
      group.add(shell);
      const labelMap = canvasTexture(192, 128, (ctx, w, h) => {
        ctx.fillStyle = '#f0e8d4'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = band; ctx.fillRect(0, 0, w, h * 0.3);
        ctx.fillStyle = '#1a1a1c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 20px sans-serif'; ctx.fillText(title, w / 2, h * 0.52, w * 0.9);
        ctx.font = '12px sans-serif'; ctx.fillText('8 TRACK STEREO CARTRIDGE', w / 2, h * 0.75, w * 0.9);
        ctx.fillStyle = band; ctx.fillRect(w * 0.1, h * 0.86, w * 0.8, 4);
        if (mood.wear > 0.4) { ctx.fillStyle = `rgba(90,60,30,${mood.wear * 0.35})`; ctx.fillRect(random() * w * 0.5, random() * h * 0.5, 40, 30); }
      });
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.07), new THREE.MeshStandardMaterial({ map: labelMap, roughness: 0.8 }));
      label.rotation.x = -Math.PI / 2;
      label.position.set(0, 0.0126, 0.005);
      group.add(label);
      const window = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.006, 0.012), black);
      window.position.set(0, 0, -0.045);
      group.add(window);
      group.position.set(...at);
      group.rotation.set(tilt, turn, 0);
      s.root.add(group);
      return group;
    };
    const titles = TITLES.slice().sort(() => random() - 0.5);
    const bands = BANDS.slice();
    const inSlot = cartridge(titles.pop()!, pick(bands), [slotX, slotY, a.state === 'jammed' ? D / 2 + 0.02 : D / 2 - 0.0], a.state === 'jammed' ? 0.25 : 0, a.state === 'jammed' ? -0.12 : 0);
    inSlot.position.z = a.state === 'jammed' ? D / 2 + 0.01 : D / 2 - 0.005;
    if (a.state === 'eating') {
      const tape = s.material('#3a2414', { roughness: 0.5, side: THREE.DoubleSide });
      const loops = 2 + Math.floor(random() * 3);
      for (let i = 0; i < loops; i++) {
        const points: [number, number, number][] = [[slotX - 0.03 + i * 0.02, slotY - 0.01, fz]];
        for (let k = 1; k <= 5; k++) points.push([slotX - 0.03 + i * 0.02 + Math.sin(k * 1.7 + i) * 0.05, Math.max(0.003, slotY - 0.01 - k * 0.018 + Math.cos(k * 2.1) * 0.008), fz + k * 0.03 + rnd(0, 0.02)]);
        const ribbon = s.tube(points, 0.0012, tape);
        ribbon.scale.x = 4;
      }
    }
    // The stack beside the deck, leaning more the taller it gets.
    const count = Math.round(mix(0, 11, a.tapes));
    const stackX = W / 2 + 0.1, lean = count > 6 ? mix(0.12, 0.3, random()) : rnd(0, 0.08), side = random() < 0.5 ? -1 : 1;
    for (let i = 0; i < count; i++) {
      cartridge(titles[i % titles.length], bands[i % bands.length], [side * stackX + i * lean * 0.012 * side + rnd(-0.006, 0.006), 0.0125 + i * 0.0255, rnd(-0.008, 0.008)], rnd(-0.12, 0.12) + i * 0.015, 0);
    }
    if (count > 8) {
      const z = 0.17;
      cartridge(titles[3], bands[3], [side * stackX + side * 0.06, 0.0125, z], rnd(0.4, 1.2), 0);
      cartridge(titles[4], bands[4], [side * stackX - side * 0.05, 0.0125 + 0.0255, z + 0.05], rnd(-0.3, 0.3), 0);
    }

    // ---- Speakers: boxes with cloth faces.
    const speaker = (x: number, tall: number, width: number) => {
      s.box([width, tall, D * 0.85], [x, 0.012 + tall / 2, -0.02], wood);
      s.box([width - 0.02, tall - 0.02, 0.006], [x, 0.012 + tall / 2, -0.02 + D * 0.425], cloth);
      if (a.finish === 'white' || a.finish === 'avocado') s.box([width + 0.004, 0.01, D * 0.85 + 0.004], [x, 0.012 + tall - 0.005, -0.02], trim);
    };
    const speakerOffset = W / 2 + (count ? 0.28 : 0.12);
    if (a.speakers === 'pair') { speaker(-speakerOffset, 0.3, 0.2); speaker(speakerOffset, 0.3, 0.2); }
    if (a.speakers === 'single') speaker(-speakerOffset, rnd(0.26, 0.36), rnd(0.18, 0.24));

    // ---- Headphones plugged into the jack, lying beside, their coiled cord trailing.
    if (a.headphones) {
      const pad = s.material('#2a2a2c', { roughness: 0.8 });
      const hx = -W / 2 - (a.speakers === 'pair' || a.speakers === 'single' ? 0.5 : 0.17), hz = 0.08;
      s.cylinder(0.045, 0.045, 0.035, [hx, 0.0175, hz], pad, 18);
      s.cylinder(0.045, 0.045, 0.035, [hx + 0.16, 0.0175, hz + 0.03], pad, 18);
      const band = s.ring(0.085, 0.008, [hx + 0.08, 0.02, hz + 0.015], chrome, Math.PI);
      band.rotation.x = -Math.PI / 2; band.rotation.z = 0.2;
      band.scale.set(1, 1, 0.5);
      const cord = s.material('#1c1c1e');
      s.tube([[slotX - 0.095, slotY - 0.035, fz], [slotX - 0.1, slotY - 0.07, fz + 0.03], [slotX - 0.09, 0.01, fz + 0.08], [mix(slotX, hx, 0.5), 0.006, fz + 0.1 + rnd(-0.03, 0.03)], [hx + 0.02, 0.006, hz + 0.06], [hx, 0.03, hz]], 0.003, cord);
    }

    // ---- Something extra on top.
    if (a.extra === 'ashtray') {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#bcd0c0', transparent: true, opacity: 0.45, roughness: 0.15, depthWrite: false });
      s.lathe([[0, 0], [0.045, 0], [0.05, 0.012], [0.04, 0.018], [0.035, 0.006]], glass, [-0.1, deckY + H, -0.05]);
      for (let i = 0; i < 6 + mood.wear * 8; i++) s.cylinder(0.003, 0.003, 0.025, [-0.1 + rnd(-0.03, 0.03), deckY + H + 0.008, -0.05 + rnd(-0.03, 0.03)], s.material(random() < 0.5 ? '#e8e0c8' : '#c9a24a'), 6).rotation.set(rnd(-1.5, 1.5), rnd(0, 3), rnd(-0.3, 0.3));
    } else if (a.extra === 'beer') {
      const can = s.cylinder(0.033, 0.033, 0.12, [-0.12, deckY + H + 0.06, -0.06], s.material(pick(['#c8a24a', '#b8302a', '#2a5ab0']), { metalness: 0.6, roughness: 0.35 }), 20);
      void can;
      s.cylinder(0.03, 0.03, 0.004, [-0.12, deckY + H + 0.122, -0.06], chrome, 20);
    } else if (a.extra === 'magazine' && count > 0) {
      const mag = s.box([0.21, 0.004, 0.14], [side * stackX, 0.0125 + count * 0.0255 + 0.004, 0.02], new THREE.MeshStandardMaterial({ roughness: 0.6, map: canvasTexture(128, 96, (ctx, w, h) => { ctx.fillStyle = pick(['#d8302a', '#2a7ab0', '#e8c43a']); ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#f4f0e0'; ctx.fillRect(10, 10, w - 20, 24); ctx.fillStyle = '#1a1a1c'; ctx.font = 'bold 14px sans-serif'; ctx.fillText('HI-FI WORLD', 16, 28); ctx.fillStyle = '#f0c8a0'; ctx.beginPath(); ctx.ellipse(w * 0.6, h * 0.68, 22, 26, 0, 0, 7); ctx.fill(); }) }));
      mag.rotation.y = rnd(-0.4, 0.4);
    } else if (a.extra === 'joint') {
      const smoke = new THREE.MeshStandardMaterial({ color: '#d8d8d0', transparent: true, opacity: 0.18, depthWrite: false });
      s.cylinder(0.003, 0.0035, 0.06, [W / 2 - 0.04, deckY + H + 0.004, D / 2 - 0.01], s.material('#efe6cc'), 8).rotation.z = Math.PI / 2 - 0.1;
      for (let i = 0; i < 6; i++) s.ball([0.008 + i * 0.004, 0.012 + i * 0.004, 0.008 + i * 0.004], [W / 2 - 0.07 + Math.sin(i) * 0.01, deckY + H + 0.03 + i * 0.025, D / 2 - 0.01], smoke, 10);
    }

    // ---- The meters twitch to the music; the room's energy is the volume.
    const beat = mix(0.4, 1.6, mood.energy);
    const phase = [random() * 6, random() * 6];
    return s.finish({
      update(_dt, time) {
        needles.forEach((pivot, i) => {
          const rest = 0.55;
          pivot.rotation.z = on
            ? rest - (0.3 + 0.35 * Math.abs(Math.sin(time * 2.1 * beat + phase[i]) * Math.sin(time * 5.3 * beat + phase[i] * 1.7)) + 0.12 * Math.sin(time * 11 * beat + phase[i])) * beat * 0.9
            : rest;
        });
      },
    });
  },
});
