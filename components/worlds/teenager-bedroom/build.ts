import * as THREE from 'three';
import { type Placeable, choice, clamp01, defineWorld, diorama, mix } from '@conjure/kit';

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

const ERAS = {
  eighties: {
    inks: ['#ff3ea0', '#27d8cc', '#ffe23a', '#7a3aff', '#1c1c3a', '#ff7a2a'], wall: '#e8d8e4', stripe: '#d8bcd4', carpet: '#8a6a9a',
    furniture: '#f0ece2', accent: '#e8344a', cloth: ['#ff5ab0', '#27d8cc', '#ffe23a', '#f4f4f0', '#3a4ac8', '#8a3aff'], names: ['NEON HEARTS', 'TURBO', 'LAZER', 'MIAMI NITE', 'SYNTH CITY', 'RAD'],
  },
  nineties: {
    inks: ['#2a2a2c', '#8a2a2a', '#d8a03a', '#3a5a4a', '#c8c2b2', '#4a3a6a'], wall: '#cfc8b4', stripe: '#c4bca6', carpet: '#8a8068',
    furniture: '#c99a5e', accent: '#3a5a4a', cloth: ['#6a3a2a', '#4a5a3a', '#3a4a6a', '#c8b89a', '#2a2a2c', '#8a2a2a'], names: ['STATIC', 'THE DREGS', 'MUDHONEYED', 'VOID', 'SLACKER', 'NUMB'],
  },
  noughties: {
    inks: ['#ff5ab0', '#3ab8ff', '#a8f03a', '#ffffff', '#b8b8c8', '#ff9a2a'], wall: '#c8e89a', stripe: '#b8dc86', carpet: '#5a7ab0',
    furniture: '#d8d8dc', accent: '#ff5ab0', cloth: ['#ff5ab0', '#3ab8ff', '#f4f4f0', '#2a2a2c', '#a8f03a', '#ff9a2a'], names: ['POP PRINCESS', 'BLINK', 'EMO NITE', 'XTREME', 'BOYZ', 'GLITTER'],
  },
  now: {
    inks: ['#d8c8b8', '#a8b8a0', '#e8a8a0', '#2a2a2c', '#f4f0e8', '#8a9ab8'], wall: '#eceae4', stripe: '#e4e2da', carpet: '#b0aca4',
    furniture: '#f4f2ee', accent: '#a8b8a0', cloth: ['#d8c8b8', '#8a9a80', '#2a2a2c', '#f4f0e8', '#c88a80', '#6a7a9a'], names: ['softcore', 'ERA', 'girl in red-ish', 'LO-FI', 'no thoughts', 'MOON'],
  },
} as const;

export default defineWorld({
  questions: {
    decade: choice('What decade is it?', {
      eighties: 'The 1980s: neon and pastel, a portable TV, cassettes, striped wallpaper.',
      nineties: 'The 1990s: dark grunge posters, pine furniture, a beige computer, CDs.',
      noughties: 'The 2000s: lime paint and hot pink, glossy pop posters, a chunky silver PC.',
      now: 'Now: pale walls, a curated grid of prints, a laptop, LED glow, plants.',
    }),
    obsession: choice('What are the walls obsessed with?', {
      bands: 'Bands: stage silhouettes, tour posters, logos.',
      idols: 'Heart-throbs and pop idols: huge faces torn from magazines.',
      sport: 'Sport: players mid-leap, team colours, numbers.',
      films: 'Films and horror: moons, monsters, block titles.',
      cars: 'Cars and motorbikes against sunsets.',
      space: 'Space and science fiction: planets, rockets, star charts.',
      skate: 'Skate, surf and graffiti logos.',
      games: 'Video games and cartoons: pixel characters and enormous eyes.',
    }),
    lights: choice('What lights the room besides the window?', {
      fairy: 'A string of fairy lights sagging along the tops of the walls.',
      blacklight: 'A blacklight tube that makes the posters glow violet.',
      strip: 'A colour-changing LED strip run round the ceiling line.',
      lamp: 'One warm bedside lamp.',
      none: 'Nothing: only the window and the screen.',
    }),
    screen: choice('What is on the screen?', {
      game: 'A game left paused.',
      chat: 'A conversation that has gone quiet.',
      homework: 'Homework, barely started, cursor blinking.',
      music: 'A music video or visualiser.',
      static: 'Static, the tape or signal run out.',
      off: 'Nothing: it is switched off and dark.',
    }),
    state: choice('What state is the room in?', {
      mess: 'Lived in: bed unmade, clothes drifting across the floor.',
      tidied: 'Tidied by a parent while its owner was out, too neat and faintly violated.',
      grounded: 'Under siege: curtains shut for days, plates and cans accumulating.',
      packing: 'Being packed up to leave home: boxes, a stripped bed, pale patches where posters hung.',
    }),
    window: choice('What is at the window?', {
      curtains: 'Curtains pulled half across.',
      blind: 'A venetian blind with bent slats.',
      sheet: 'A sheet or flag pinned up instead of curtains.',
      bare: 'Nothing: bare glass and the sky.',
    }),
    floor: choice('What is the floor?', {
      carpet: 'Fitted carpet in the colour of its decade.',
      boards: 'Bare floorboards with a rug.',
      shag: 'Deep shag pile that swallows small things.',
      lino: 'Checked vinyl, cold underfoot.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const era = ERAS[a.decade];
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const WX = 4.4, WZ = 4.0, WALL = 2.5, X0 = -WX / 2, Z0 = -WZ / 2;
    const dusk = Math.abs(mood.daylight - 0.5) * 2; // 0 noon, 1 dawn or dusk
    const shut = a.state === 'grounded';
    const background = new THREE.Color('#dedad2').lerp(new THREE.Color(mood.daylight > 0.5 ? '#c9b8c4' : '#c4ccd8'), dusk * 0.7);
    const { art: s, world } = diorama(context, {
      background: `#${background.getHexString()}`, floor: era.carpet, width: WX, depth: WZ, maxHeight: 1.2, radius: 0.6, pitch: 27, yaw: 41,
      slots: [[0.25, 0.45], [1.35, 1.15, 0, 0.85], [-0.95, 1.35, 0, 0.85], [1.5, -1.62, 0.77, 0.42], [-0.72, -1.68, 0.54, 0.4], [-1.68, -0.5, 0.6, 0.5]],
    });
    const root = s.root;
    const plain = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => s.material(color, options);
    const glowing = (color: string, intensity: number) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.6 });

    // ---- Light: a dim room, a window, a screen.
    for (const child of root.children) {
      const light = child as THREE.HemisphereLight;
      if (light.isHemisphereLight) { light.intensity = shut ? 0.95 : 1.15; if (a.lights === 'blacklight') { light.color.set('#d8c8ff'); light.groundColor.set('#5a4a8a'); } }
    }
    if (world.keyLight) world.keyLight.intensity = shut ? 1.3 : mix(2.3, 1.7, dusk);

    // ---- Floor.
    const floorMesh = world.ground as THREE.Mesh;
    const carpetTint = a.floor === 'boards' ? '#b98a56' : a.floor === 'lino' ? '#e4dfd0' : era.carpet;
    const floorTexture = canvasTexture(512, 512, (ctx, w, h) => {
      ctx.fillStyle = carpetTint; ctx.fillRect(0, 0, w, h);
      if (a.floor === 'boards') {
        for (let i = 0; i < 12; i++) { ctx.fillStyle = `rgba(60,35,10,${0.05 + random() * 0.14})`; ctx.fillRect(i * w / 12, 0, w / 12 - 2, h); ctx.fillStyle = 'rgba(40,20,5,0.5)'; ctx.fillRect(i * w / 12 - 1, 0, 2, h); ctx.fillRect(i * w / 12, random() * h, w / 12, 2); }
      } else if (a.floor === 'lino') {
        const n = 16; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if ((i + j) % 2) { ctx.fillStyle = a.decade === 'eighties' ? '#3a3a4a' : '#7a8a8a'; ctx.fillRect(i * w / n, j * h / n, w / n, h / n); }
      } else {
        const fibres = a.floor === 'shag' ? 16000 : 7000;
        for (let i = 0; i < fibres; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '0,0,0'},${random() * (a.floor === 'shag' ? 0.2 : 0.09)})`; ctx.fillRect(random() * w, random() * h, a.floor === 'shag' ? 3 : 2, a.floor === 'shag' ? 5 : 2); }
      }
      for (let i = 0; i < mood.wear * 10; i++) { ctx.fillStyle = `rgba(60,40,20,${0.08 + random() * 0.12})`; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 10 + random() * 40, 8 + random() * 26, random() * 3, 0, 7); ctx.fill(); }
    });
    (floorMesh.material as THREE.Material).dispose();
    floorMesh.material = new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 1 });

    // ---- Posters.
    const inks: readonly string[] = era.inks;
    const figure = (ctx: Ctx, cx: number, base: number, size: number, tint: string) => {
      ctx.fillStyle = tint;
      ctx.beginPath(); ctx.arc(cx, base - size * 0.86, size * 0.12, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx - size * 0.16, base); ctx.lineTo(cx - size * 0.2, base - size * 0.7); ctx.lineTo(cx + size * 0.2, base - size * 0.7); ctx.lineTo(cx + size * 0.16, base); ctx.fill();
    };
    const title = (ctx: Ctx, text: string, w: number, y: number, size: number, tint: string, face = 'monospace') => {
      ctx.fillStyle = tint; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold ${size}px ${face}`; ctx.fillText(text, w / 2, y, w * 0.9);
    };
    type Motif = 'bands' | 'idols' | 'sport' | 'films' | 'cars' | 'space' | 'skate' | 'games';
    const MOTIFS: Motif[] = ['bands', 'idols', 'sport', 'films', 'cars', 'space', 'skate', 'games'];
    const poster = (ctx: Ctx, w: number, h: number, motif: Motif) => {
      const [c0, c1, c2] = [pick(inks), pick(inks), pick(inks)];
      const darkInk = a.decade === 'now' ? '#3a3a3c' : '#14141c';
      if (motif === 'bands') {
        ctx.fillStyle = darkInk; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 3; i++) { ctx.fillStyle = pick(inks); ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(w * (0.2 + i * 0.3), 0); ctx.lineTo(w * (0.02 + i * 0.3), h * 0.8); ctx.lineTo(w * (0.38 + i * 0.3), h * 0.8); ctx.fill(); }
        ctx.globalAlpha = 1;
        const members = 3 + Math.floor(random() * 3);
        for (let i = 0; i < members; i++) figure(ctx, w * (i + 0.5) / members, h * 0.8, h * mix(0.36, 0.46, random()), '#08080c');
        title(ctx, pick(era.names), w, h * 0.9, h * 0.11, c0 === darkInk ? '#f4f4f0' : c0);
      } else if (motif === 'idols') {
        ctx.fillStyle = c0; ctx.fillRect(0, 0, w, h);
        const skin = pick(['#f1c9a5', '#e0ac82', '#c68a5e', '#8d5a3a', '#f6d8bc']), hair = pick(['#2a1c14', '#5a3a1c', '#d8b04a', '#111', '#c83a2a', '#e8e0d0']);
        ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.44, w * 0.38, h * 0.36, 0, 0, 7); ctx.fill();
        ctx.fillStyle = c1; ctx.fillRect(w * 0.14, h * 0.74, w * 0.72, h * 0.3);
        ctx.fillStyle = skin; ctx.fillRect(w * 0.42, h * 0.6, w * 0.16, h * 0.18); ctx.beginPath(); ctx.ellipse(w / 2, h * 0.48, w * 0.26, h * 0.25, 0, 0, 7); ctx.fill();
        ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.3, w * 0.3, h * 0.12, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#1c1410'; ctx.beginPath(); ctx.ellipse(w * 0.4, h * 0.48, w * 0.04, h * 0.018, 0, 0, 7); ctx.ellipse(w * 0.6, h * 0.48, w * 0.04, h * 0.018, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = '#a83a4a'; ctx.lineWidth = Math.max(1.5, w * 0.025); ctx.beginPath(); ctx.arc(w / 2, h * 0.56, w * 0.09, 0.3, 2.84); ctx.stroke();
        title(ctx, pick(['Jesse', 'RIVER', 'Dean', 'Kayla', 'LEO', 'Mika', 'Tyler']), w, h * 0.92, h * 0.1, '#ffffff', 'cursive');
      } else if (motif === 'sport') {
        for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? c0 : c1; ctx.fillRect(0, i * h / 6, w, h / 6 + 1); }
        ctx.save(); ctx.translate(w / 2, h * 0.5); ctx.rotate(-0.3); figure(ctx, 0, h * 0.26, h * 0.6, '#101014'); ctx.restore();
        ctx.fillStyle = '#f4f4f0'; ctx.beginPath(); ctx.arc(w * 0.76, h * 0.2, w * 0.09, 0, 7); ctx.fill();
        title(ctx, `${1 + Math.floor(random() * 30)}`, w * 0.5, h * 0.86, h * 0.2, '#ffffff');
      } else if (motif === 'films') {
        const night = ctx.createLinearGradient(0, 0, 0, h); night.addColorStop(0, '#10101c'); night.addColorStop(1, c0);
        ctx.fillStyle = night; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f4ecc8'; ctx.beginPath(); ctx.arc(w * 0.66, h * 0.26, w * 0.2, 0, 7); ctx.fill();
        ctx.fillStyle = '#060608'; ctx.beginPath(); ctx.moveTo(0, h * 0.72); ctx.lineTo(w * 0.2, h * 0.5); ctx.lineTo(w * 0.34, h * 0.62); ctx.lineTo(w * 0.34, h * 0.4); ctx.lineTo(w * 0.5, h * 0.3); ctx.lineTo(w * 0.62, h * 0.44); ctx.lineTo(w * 0.62, h * 0.66); ctx.lineTo(w, h * 0.72); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
        ctx.fillStyle = '#ffd84a'; ctx.fillRect(w * 0.42, h * 0.46, w * 0.06, h * 0.05);
        title(ctx, pick(['MIDNIGHT', 'INVADERS', 'THE HOUSE', 'SCREAMER II', 'LAST SUMMER', 'ZOMBI']), w, h * 0.87, h * 0.12, '#e8343a');
      } else if (motif === 'cars') {
        const sunset = ctx.createLinearGradient(0, 0, 0, h * 0.7); sunset.addColorStop(0, c0); sunset.addColorStop(1, '#ffb04a');
        ctx.fillStyle = sunset; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffe89a'; ctx.beginPath(); ctx.arc(w / 2, h * 0.48, w * 0.2, 0, 7); ctx.fill();
        ctx.fillStyle = '#1c1c22'; ctx.fillRect(0, h * 0.62, w, h * 0.4);
        ctx.fillStyle = c1 === '#1c1c3a' ? '#e8343a' : c1; ctx.beginPath(); ctx.moveTo(w * 0.06, h * 0.72); ctx.lineTo(w * 0.2, h * 0.66); ctx.lineTo(w * 0.36, h * 0.56); ctx.lineTo(w * 0.62, h * 0.56); ctx.lineTo(w * 0.78, h * 0.66); ctx.lineTo(w * 0.95, h * 0.69); ctx.lineTo(w * 0.95, h * 0.76); ctx.lineTo(w * 0.06, h * 0.76); ctx.fill();
        ctx.fillStyle = '#060608'; ctx.beginPath(); ctx.arc(w * 0.26, h * 0.77, w * 0.07, 0, 7); ctx.arc(w * 0.76, h * 0.77, w * 0.07, 0, 7); ctx.fill();
        title(ctx, pick(['TURBO', 'GT', 'V12', 'TESTA', 'DRIFT']), w, h * 0.92, h * 0.1, '#ffffff');
      } else if (motif === 'space') {
        ctx.fillStyle = '#0c0c20'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffffff'; for (let i = 0; i < 40; i++) ctx.fillRect(random() * w, random() * h, 1.5, 1.5);
        ctx.fillStyle = c0 === '#1c1c3a' ? '#ff7a2a' : c0; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.42, w * 0.26, 0, 7); ctx.fill();
        ctx.strokeStyle = c2; ctx.lineWidth = Math.max(2, w * 0.035); ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.42, w * 0.42, h * 0.07, -0.3, 0, 7); ctx.stroke();
        ctx.fillStyle = '#e8e8ee'; ctx.beginPath(); ctx.moveTo(w * 0.2, h * 0.9); ctx.lineTo(w * 0.26, h * 0.68); ctx.lineTo(w * 0.32, h * 0.9); ctx.fill();
        title(ctx, pick(['COSMOS', 'APOLLO', 'SECTOR 7', 'THE TRUTH', 'ORBIT']), w * 1.2, h * 0.93, h * 0.08, '#ffffff');
      } else if (motif === 'skate') {
        ctx.fillStyle = c0; ctx.fillRect(0, 0, w, h);
        const n = 6; for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2) { ctx.fillStyle = '#111'; ctx.fillRect(i * w / n, h - (j + 1) * w / n, w / n, w / n); }
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(w / 2, h * 0.38, w * 0.34, 0, 7); ctx.fill();
        ctx.fillStyle = c1 === c0 ? '#f4f4f0' : c1; ctx.beginPath(); const points = pick([4, 5, 8]);
        for (let i = 0; i < points * 2; i++) { const r = (i % 2 ? 0.13 : 0.3) * w, t = i / (points * 2) * 6.283 - 1.571; ctx.lineTo(w / 2 + Math.cos(t) * r, h * 0.38 + Math.sin(t) * r); } ctx.fill();
      } else {
        ctx.fillStyle = c0; ctx.fillRect(0, 0, w, h);
        if (random() < 0.5) {
          const px = w / 10; const sprite = ['..xxxx..', '.xxxxxx.', 'xx.xx.xx', 'xxxxxxxx', '.xx..xx.', 'xx.xx.xx', 'x......x'];
          ctx.fillStyle = c1 === c0 ? '#111' : c1; sprite.forEach((row, j) => [...row].forEach((cell, i) => { if (cell === 'x') ctx.fillRect(px + i * px, h * 0.18 + j * px, px, px); }));
          title(ctx, pick(['PLAYER 2', 'HI-SCORE', 'GAME OVER', 'LEVEL 99', 'INSERT COIN']), w, h * 0.88, h * 0.09, '#ffffff');
        } else {
          ctx.fillStyle = '#f6e6d8'; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.5, w * 0.4, h * 0.34, 0, 0, 7); ctx.fill();
          ctx.fillStyle = c1 === c0 ? '#3a2a6a' : c1; ctx.beginPath(); ctx.moveTo(w * 0.05, h * 0.5); ctx.lineTo(w * 0.2, h * 0.08); ctx.lineTo(w * 0.4, h * 0.3); ctx.lineTo(w * 0.55, h * 0.06); ctx.lineTo(w * 0.72, h * 0.3); ctx.lineTo(w * 0.9, h * 0.1); ctx.lineTo(w * 0.95, h * 0.5); ctx.lineTo(w * 0.7, h * 0.34); ctx.lineTo(w * 0.3, h * 0.34); ctx.fill();
          for (const ex of [0.34, 0.66]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(w * ex, h * 0.52, w * 0.11, h * 0.1, 0, 0, 7); ctx.fill(); ctx.fillStyle = c2; ctx.beginPath(); ctx.ellipse(w * ex, h * 0.53, w * 0.075, h * 0.085, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(w * ex, h * 0.54, w * 0.04, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(w * ex + w * 0.03, h * 0.5, w * 0.02, 0, 7); ctx.fill(); }
        }
      }
    };
    const coverage = a.state === 'packing' ? 0.45 : mix(0.82, 1, mood.density);
    const wallTexture = (pixels: number, metres: number) => canvasTexture(pixels, 640, (ctx, w, h) => {
      ctx.fillStyle = era.wall; ctx.fillRect(0, 0, w, h);
      if (a.decade === 'eighties') { ctx.fillStyle = era.stripe; for (let x = 0; x < w; x += 28) ctx.fillRect(x, 0, 10, h); }
      else if (a.decade === 'nineties') { ctx.fillStyle = era.stripe; ctx.fillRect(0, h * 0.62, w, h * 0.38); ctx.fillStyle = '#8a6a4a'; ctx.fillRect(0, h * 0.61, w, 8); }
      const scale = w / metres; // pixels per metre
      const place = (x: number, y: number, pw: number, ph: number, turn: number, draw: () => void, taped: boolean) => {
        ctx.save(); ctx.translate(x + pw / 2, y + ph / 2); ctx.rotate(turn); ctx.translate(-pw / 2, -ph / 2);
        ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(3, 4, pw, ph);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, pw, ph); ctx.clip(); draw(); ctx.restore();
        if (mood.wear > 0.5 && random() < mood.wear - 0.3) { ctx.fillStyle = era.wall; ctx.beginPath(); ctx.moveTo(pw, 0); ctx.lineTo(pw - pw * 0.22, 0); ctx.lineTo(pw, ph * 0.16); ctx.fill(); }
        if (taped) { ctx.fillStyle = 'rgba(245,235,200,0.8)'; for (const [tx, ty] of [[0, 0], [pw, 0]]) { ctx.save(); ctx.translate(tx, ty); ctx.rotate(tx ? -0.7 : 0.7); ctx.fillRect(-11, -4, 22, 8); ctx.restore(); } }
        else { ctx.fillStyle = '#e8e8f0'; for (const [tx, ty] of [[6, 6], [pw - 6, 6], [6, ph - 6], [pw - 6, ph - 6]]) { ctx.beginPath(); ctx.arc(tx, ty, 2.5, 0, 7); ctx.fill(); } }
        ctx.restore();
      };
      const neat = a.decade === 'now' || a.state === 'tidied';
      let y = 6;
      while (y < h - 40) {
        const rowH = Math.min(h - y - 4, scale * mix(0.5, 0.85, random()));
        let x = -random() * 30;
        while (x < w - 20) {
          const wide = random() < 0.25;
          const pw = rowH * (wide ? mix(1.2, 1.45, random()) : mix(0.66, 0.78, random())), ph = rowH * (wide ? 0.72 : 1) * mix(0.9, 1, random());
          const motif: Motif = random() < 0.72 ? a.obsession : pick(MOTIFS);
          if (random() < coverage) place(x + (neat ? 6 : 0), y + random() * (rowH - ph), pw - (neat ? 12 : 0), ph - (neat ? 12 : 0), (random() - 0.5) * (neat ? 0.015 : 0.09), () => poster(ctx, pw - (neat ? 12 : 0), ph - (neat ? 12 : 0), motif), false);
          else if (a.state === 'packing') { ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x + 4, y + 4, pw - 8, ph - 8); ctx.fillStyle = '#7ab0e8'; for (const [tx, ty] of [[10, 10], [pw - 10, 10], [10, ph - 10], [pw - 10, ph - 10]]) { ctx.beginPath(); ctx.arc(x + tx, y + ty, 3, 0, 7); ctx.fill(); } }
          x += pw + (neat ? 4 : -random() * 12);
        }
        y += rowH - (neat ? -4 : random() * 14);
      }
      // Magazine tear-outs and scraps over the joins.
      if (a.state !== 'packing') for (let i = 0; i < mix(8, 30, mood.density) * (neat ? 0.4 : 1); i++) {
        const pw = scale * mix(0.16, 0.26, random()), ph = pw * mix(1.1, 1.4, random());
        place(random() * (w - pw), random() * (h - ph), pw, ph, (random() - 0.5) * 0.5, () => {
          const kind = random();
          if (kind < 0.5) poster(ctx, pw, ph, random() < 0.6 ? 'idols' : a.obsession);
          else { ctx.fillStyle = pick(['#f6f0e0', '#fff48a', '#ffd0e0', '#f6f0e0']); ctx.fillRect(0, 0, pw, ph); ctx.fillStyle = 'rgba(40,40,60,0.6)'; for (let l = 0; l < 7; l++) ctx.fillRect(pw * 0.1, ph * (0.14 + l * 0.11), pw * mix(0.4, 0.8, random()), 2.5); }
        }, true);
      }
    });
    const lit = a.lights === 'blacklight';
    const wallMaterial = (texture: THREE.Texture) => new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, emissive: lit ? '#b08aff' : '#ffffff', emissiveMap: texture, emissiveIntensity: lit ? 0.42 : 0.06 });
    const shell = plain(era.wall, { roughness: 0.95 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(WX + 0.12, WALL, 0.12), [shell, shell, shell, shell, wallMaterial(wallTexture(1126, WX)), shell]);
    backWall.position.set(-0.06, WALL / 2, Z0 - 0.06);
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, WALL, WZ), [wallMaterial(wallTexture(1024, WZ)), shell, shell, shell, shell, shell]);
    leftWall.position.set(X0 - 0.06, WALL / 2, 0);
    for (const wall of [backWall, leftWall]) { wall.receiveShadow = true; wall.castShadow = true; root.add(wall); }
    s.box([WX, 0.09, 0.03], [0, 0.045, Z0 + 0.015], plain(a.decade === 'nineties' ? '#8a6a4a' : '#f0ece4'));
    s.box([0.03, 0.09, WZ], [X0 + 0.015, 0.045, 0], plain(a.decade === 'nineties' ? '#8a6a4a' : '#f0ece4'));

    // ---- Window on the back wall.
    const winX = 1.5, winY = 1.62, winW = 1.05, winH = 1.05, wz = Z0 + 0.01;
    const sky = new THREE.Color(mood.daylight < 0.5 ? '#ffd8c4' : '#ffb070').lerp(new THREE.Color('#e4f2ff'), 1 - dusk);
    const paneMaterial = new THREE.MeshStandardMaterial({ color: sky, emissive: sky, emissiveIntensity: shut ? 0.35 : 0.95, roughness: 0.2 });
    s.box([winW, winH, 0.02], [winX, winY, wz], paneMaterial).castShadow = false;
    const frame = plain('#f2efe8', { roughness: 0.5 });
    for (const side of [-1, 1]) { s.box([0.06, winH + 0.12, 0.06], [winX + side * (winW / 2 + 0.03), winY, wz + 0.02], frame); s.box([winW + 0.12, 0.06, 0.06], [winX, winY + side * (winH / 2 + 0.03), wz + 0.02], frame); }
    s.box([0.035, winH, 0.04], [winX, winY, wz + 0.02], frame); s.box([winW, 0.035, 0.04], [winX, winY, wz + 0.02], frame);
    s.box([winW + 0.24, 0.04, 0.16], [winX, winY - winH / 2 - 0.06, wz + 0.08], frame);
    const drape = (x: number, width: number, drop: number, tint: THREE.ColorRepresentation, map?: THREE.Texture) => {
      const g = new THREE.PlaneGeometry(width, drop, 16, 4);
      const at = g.attributes.position as THREE.BufferAttribute;
      const f = random() * 6;
      for (let i = 0; i < at.count; i++) at.setZ(i, Math.sin(at.getX(i) * 26 + f) * 0.03);
      g.computeVertexNormals();
      const material = new THREE.MeshStandardMaterial({ color: tint, map: map ?? null, roughness: 1, side: THREE.DoubleSide, emissive: sky, emissiveIntensity: shut ? 0.12 : 0.22 });
      return s.mesh(g, material, [x, winY + winH / 2 + 0.1 - drop / 2, wz + 0.09]);
    };
    const curtainTint = pick(era.cloth);
    if (a.window === 'curtains' || (shut && a.window === 'bare')) {
      const gap = shut ? 0.03 : mix(0.2, 0.45, random());
      s.rod([winX - winW / 2 - 0.2, winY + winH / 2 + 0.12, wz + 0.09], [winX + winW / 2 + 0.2, winY + winH / 2 + 0.12, wz + 0.09], 0.012, plain('#8a6a4a'));
      const leftWidth = (winW + 0.3) * (1 - gap) * mix(0.35, 0.65, random()), rightWidth = (winW + 0.3) * (1 - gap) - leftWidth;
      drape(winX - winW / 2 - 0.15 + leftWidth / 2, leftWidth, winH + 0.35, curtainTint);
      drape(winX + winW / 2 + 0.15 - rightWidth / 2, rightWidth, winH + 0.35, curtainTint);
    } else if (a.window === 'blind') {
      const lowered = shut ? 1 : mix(0.45, 0.85, random());
      const slats = Math.round(lowered * winH / 0.05);
      const slatMaterial = plain(a.decade === 'eighties' ? '#f4a8c8' : '#e8e4d8', { roughness: 0.5 });
      for (let i = 0; i < slats; i++) { const slat = s.box([winW + 0.04, 0.008, 0.045], [winX, winY + winH / 2 - 0.03 - i * 0.05, wz + 0.07], slatMaterial); slat.rotation.x = 0.5 + (mood.wear > 0.5 && random() < 0.15 ? 0.6 : 0); if (mood.wear > 0.5 && random() < 0.12) slat.rotation.z = (random() - 0.5) * 0.12; }
      s.box([winW + 0.08, 0.05, 0.06], [winX, winY + winH / 2 + 0.04, wz + 0.07], slatMaterial);
    } else if (a.window === 'sheet') {
      const flag = canvasTexture(128, 128, (ctx, w, h) => {
        ctx.fillStyle = pick(era.cloth); ctx.fillRect(0, 0, w, h);
        const kind = Math.floor(random() * 3);
        if (kind === 0) for (let i = 0; i < 12; i++) { ctx.strokeStyle = pick(era.inks); ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(w / 2, h / 2, i * 9, 0, 7); ctx.stroke(); }
        else if (kind === 1) { ctx.fillStyle = pick(era.inks); for (let i = 0; i < 8; i += 2) ctx.fillRect(0, i * h / 8, w, h / 8); }
        else { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.3, 0, 7); ctx.fill(); ctx.fillStyle = '#f4f4f0'; ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.2, 0, 7); ctx.fill(); }
      });
      const hung = drape(winX, winW + 0.3, winH + 0.25, '#ffffff', flag);
      hung.rotation.z = (random() - 0.5) * 0.06;
    }
    // Window light falling across the floor.
    if (!shut) {
      const shaft = new THREE.Mesh(new THREE.PlaneGeometry(winW * 0.9, 1.7), new THREE.MeshBasicMaterial({ color: sky, transparent: true, opacity: mix(0.3, 0.16, dusk) * (a.window === 'bare' ? 1 : 0.6), depthWrite: false }));
      shaft.rotation.x = -Math.PI / 2;
      shaft.rotation.z = mix(-0.5, 0.5, mood.daylight);
      shaft.position.set(winX - 0.5 + mood.daylight * 0.5, 0.012, Z0 + 1.75);
      root.add(shaft);
    }

    // ---- Bed in the back-left corner, head to the back wall.
    const bedW = 0.98, bedL = 2.02, bx = X0 + 0.04 + bedW / 2, bz = Z0 + 0.06 + bedL / 2, topY = 0.5;
    const frameMaterial = a.decade === 'noughties' ? plain('#2a2a30', { metalness: 0.7, roughness: 0.4 }) : plain(a.decade === 'now' ? '#d8c8a8' : era.furniture, { roughness: 0.6 });
    if (a.decade === 'noughties') {
      for (const x of [-1, 1]) { s.rod([bx + x * bedW / 2, 0, Z0 + 0.06], [bx + x * bedW / 2, 1.05, Z0 + 0.06], 0.02, frameMaterial); s.rod([bx + x * bedW / 2, 0, Z0 + 0.06 + bedL], [bx + x * bedW / 2, 0.7, Z0 + 0.06 + bedL], 0.02, frameMaterial); }
      s.rod([bx - bedW / 2, 1.05, Z0 + 0.06], [bx + bedW / 2, 1.05, Z0 + 0.06], 0.02, frameMaterial); s.rod([bx - bedW / 2, 0.7, Z0 + 0.06 + bedL], [bx + bedW / 2, 0.7, Z0 + 0.06 + bedL], 0.02, frameMaterial);
      for (let i = 1; i < 6; i++) { s.rod([bx - bedW / 2 + i * bedW / 6, 0.4, Z0 + 0.06], [bx - bedW / 2 + i * bedW / 6, 1.05, Z0 + 0.06], 0.008, frameMaterial); s.rod([bx - bedW / 2 + i * bedW / 6, 0.3, Z0 + 0.06 + bedL], [bx - bedW / 2 + i * bedW / 6, 0.7, Z0 + 0.06 + bedL], 0.008, frameMaterial); }
      s.box([bedW, 0.06, bedL], [bx, 0.28, bz], frameMaterial);
    } else {
      s.box([bedW + 0.06, a.decade === 'now' ? 0.5 : 0.95, 0.05], [bx, a.decade === 'now' ? 0.25 : 0.475, Z0 + 0.045], frameMaterial);
      s.box([bedW + 0.06, a.decade === 'now' ? 0.22 : 0.3, bedL], [bx, a.decade === 'now' ? 0.11 : 0.19, bz], frameMaterial);
      if (a.decade === 'eighties') s.box([bedW + 0.07, 0.04, 0.055], [bx, 0.93, Z0 + 0.045], plain(era.accent));
      if (a.decade !== 'now') s.box([bedW + 0.06, 0.55, 0.05], [bx, 0.275, Z0 + 0.06 + bedL], frameMaterial);
    }
    const ticking = canvasTexture(64, 64, (ctx, w, h) => { ctx.fillStyle = '#f0ece0'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#8a9ab8'; for (let x = 4; x < w; x += 12) ctx.fillRect(x, 0, 3, h); });
    ticking.wrapS = ticking.wrapT = THREE.RepeatWrapping; ticking.repeat.set(3, 6);
    s.box([bedW - 0.02, 0.2, bedL - 0.04], [bx, topY - 0.1, bz], new THREE.MeshStandardMaterial({ map: ticking, roughness: 1 }));
    const beddingTexture = canvasTexture(256, 256, (ctx, w, h) => {
      const [c0, c1, c2] = [pick(era.cloth), pick(era.cloth), pick(era.cloth)];
      ctx.fillStyle = c0; ctx.fillRect(0, 0, w, h);
      if (a.decade === 'eighties') for (let i = 0; i < 40; i++) { ctx.fillStyle = ctx.strokeStyle = pick(era.inks); ctx.lineWidth = 5; const x = random() * w, y = random() * h, k = Math.floor(random() * 3); ctx.beginPath(); if (k === 0) { ctx.moveTo(x, y); ctx.lineTo(x + 26, y + 8); ctx.lineTo(x + 8, y + 26); ctx.fill(); } else if (k === 1) { ctx.moveTo(x, y); for (let q = 1; q < 5; q++) ctx.lineTo(x + q * 9, y + (q % 2 ? 10 : 0)); ctx.stroke(); } else { ctx.arc(x, y, 9, 0, 7); ctx.fill(); } }
      else if (a.decade === 'nineties') { ctx.globalAlpha = 0.55; ctx.fillStyle = c1; for (let i = 0; i < w; i += 64) { ctx.fillRect(i, 0, 26, h); ctx.fillRect(0, i, w, 26); } ctx.fillStyle = '#f4f0e0'; for (let i = 44; i < w; i += 64) { ctx.fillRect(i, 0, 3, h); ctx.fillRect(0, i, w, 3); } ctx.globalAlpha = 1; }
      else if (a.decade === 'noughties') { ctx.fillStyle = c1; for (let i = 0; i < 26; i++) { const x = random() * w, y = random() * h, r = 10 + random() * 12; ctx.beginPath(); for (let q = 0; q < 10; q++) { const rr = q % 2 ? r * 0.42 : r, t = q / 10 * 6.283; ctx.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); } ctx.fill(); } }
      else { ctx.fillStyle = c2; ctx.globalAlpha = 0.25; for (let i = 0; i < h; i += 8) ctx.fillRect(0, i, w, 2); ctx.globalAlpha = 1; }
    });
    const bedding = new THREE.MeshStandardMaterial({ map: beddingTexture, roughness: 1, side: THREE.DoubleSide });
    const messy = a.state === 'mess' || a.state === 'grounded';
    const lumps = Array.from({ length: 5 }, () => ({ x: bx + (random() - 0.5) * bedW * 0.8, z: bz + (random() - 0.3) * bedL * 0.6, h: messy ? mix(0.06, 0.2, random()) : 0.015, r: mix(0.14, 0.26, random()) }));
    const bedTop = (x: number, z: number) => {
      const out = Math.hypot(Math.max(0, Math.abs(x - bx) - bedW / 2), Math.max(0, Math.abs(z - bz) - bedL / 2));
      let y = topY;
      for (const lump of lumps) y += lump.h * Math.exp(-((x - lump.x) ** 2 + (z - lump.z) ** 2) / (2 * lump.r * lump.r));
      return Math.max(0.012, y - out * 3.2);
    };
    const lay = (cx: number, cz: number, w: number, d: number, turn: number, material: THREE.Material, folds: number, lift = 0.012) => {
      const g = new THREE.PlaneGeometry(w, d, 22, 30);
      const at = g.attributes.position as THREE.BufferAttribute;
      const f1 = random() * 6, f2 = random() * 6, cos = Math.cos(turn), sin = Math.sin(turn);
      for (let i = 0; i < at.count; i++) {
        const lx = at.getX(i), lz = at.getY(i);
        const x = cx + lx * cos + lz * sin, z = cz - lx * sin + lz * cos;
        at.setXYZ(i, Math.max(x, X0 + 0.02), bedTop(x, z) + lift + Math.abs(Math.sin(x * 15 + z * 8 + f1)) * Math.abs(Math.sin(z * 13 - x * 6 + f2)) * folds, Math.max(z, Z0 + 0.02));
      }
      g.computeVertexNormals();
      return s.mesh(g, material);
    };
    if (a.state === 'packing') {
      s.box([bedW * 0.8, 0.22, 0.5], [bx, topY + 0.11, bz + 0.6], bedding);
      s.box([0.6, 0.12, 0.38], [bx, topY + 0.06, Z0 + 0.4], plain('#f0ece0', { roughness: 1 }));
    } else {
      const pillow = s.ball([0.33, 0.09, 0.2], [bx + (messy ? (random() - 0.5) * 0.2 : 0), topY + 0.08, Z0 + 0.32], plain('#f4f0e8', { roughness: 1 }), 18);
      pillow.rotation.y = messy ? (random() - 0.5) * 0.7 : 0;
      if (messy) lay(bx + mix(0.1, 0.32, random()), bz + mix(0.25, 0.45, random()), bedW + 0.5, bedL * 0.72, mix(-0.35, 0.35, random()), bedding, 0.05);
      else lay(bx + 0.04, bz + 0.26, bedW + 0.3, bedL * 0.74, 0, bedding, 0.008);
    }

    // ---- Desk and screen on the back wall.
    const dx = 1.0, dw = 1.75, dd = 0.62, dz = Z0 + 0.04 + dd / 2, deskY = 0.74;
    const deskMaterial = plain(era.furniture, { roughness: 0.55 });
    s.box([dw, 0.035, dd], [dx, deskY - 0.0175, dz], deskMaterial);
    if (a.decade === 'now') for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([dx + x * (dw / 2 - 0.05), deskY - 0.03, dz + z * (dd / 2 - 0.05)], [dx + x * (dw / 2 - 0.12), 0, dz + z * (dd / 2 - 0.08)], 0.012, plain('#2a2a2c', { metalness: 0.7 }));
    else { for (const x of [-1, 1]) s.box([0.035, deskY - 0.035, dd - 0.04], [dx + x * (dw / 2 - 0.02), (deskY - 0.035) / 2, dz], deskMaterial); s.box([0.42, 0.5, dd - 0.06], [dx - dw / 2 + 0.25, deskY - 0.29, dz], deskMaterial); for (let i = 0; i < 3; i++) s.box([0.12, 0.014, 0.02], [dx - dw / 2 + 0.25, deskY - 0.13 - i * 0.16, dz + dd / 2 - 0.02], plain(a.decade === 'eighties' ? era.accent : '#6a6a6a')); }
    const on = a.screen !== 'off';
    const screenTexture = canvasTexture(256, 192, (ctx, w, h) => {
      ctx.fillStyle = on ? '#0c1024' : '#16181c'; ctx.fillRect(0, 0, w, h);
      if (a.screen === 'game') {
        ctx.fillStyle = '#3a8ae8'; ctx.fillRect(0, 0, w, h * 0.6); ctx.fillStyle = '#4ac83a'; ctx.fillRect(0, h * 0.6, w, h * 0.4);
        ctx.fillStyle = '#8a5a2a'; for (let i = 0; i < 5; i++) ctx.fillRect(i * 60 + 10, h * (0.5 - (i % 2) * 0.12), 40, 14);
        ctx.fillStyle = '#e8343a'; ctx.fillRect(w * 0.3, h * 0.46, 18, 24); ctx.fillStyle = '#ffe23a'; for (let i = 0; i < 4; i++) ctx.fillRect(w * 0.5 + i * 22, h * 0.3, 9, 9);
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(w * 0.2, h * 0.36, w * 0.6, h * 0.24); ctx.fillStyle = '#fff'; ctx.font = 'bold 30px monospace'; ctx.textAlign = 'center'; ctx.fillText('PAUSED', w / 2, h * 0.53);
      } else if (a.screen === 'chat') {
        ctx.fillStyle = a.decade === 'now' ? '#f4f4f6' : '#e8e4f4'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = a.decade === 'now' ? '#2a2a30' : '#5a4ac8'; ctx.fillRect(0, 0, w, 22);
        for (let i = 0; i < 5; i++) { const mine = i % 2 === 1; ctx.fillStyle = mine ? '#3a8af0' : '#c8c8d0'; const bw = 60 + random() * 100; ctx.fillRect(mine ? w - bw - 12 : 12, 32 + i * 30, bw, 20); }
        ctx.fillStyle = '#9a9aa0'; ctx.font = '14px monospace'; ctx.fillText('seen 23:41', w - 96, h - 8);
      } else if (a.screen === 'homework') {
        ctx.fillStyle = '#f6f6f2'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#3a5ab0'; ctx.fillRect(0, 0, w, 20);
        ctx.fillStyle = '#2a2a2a'; ctx.fillRect(30, 42, 150, 8); ctx.fillStyle = '#6a6a6a'; ctx.fillRect(30, 66, 190, 4); ctx.fillRect(30, 78, 120, 4); ctx.fillStyle = '#111'; ctx.fillRect(154, 74, 2, 12);
      } else if (a.screen === 'music') {
        const sweep = ctx.createLinearGradient(0, 0, w, h); sweep.addColorStop(0, '#ff3ea0'); sweep.addColorStop(0.5, '#7a3aff'); sweep.addColorStop(1, '#27d8cc'); ctx.fillStyle = sweep; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.75)'; for (let i = 0; i < 16; i++) { const bar = h * mix(0.15, 0.9, random()); ctx.fillRect(i * 16 + 2, 0, 12, h - bar); }
      } else if (a.screen === 'static') {
        for (let i = 0; i < 5000; i++) { const v = Math.floor(random() * 255); ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(random() * w, random() * h, 3, 2); }
      }
    });
    const screenMaterial = new THREE.MeshStandardMaterial({ map: screenTexture, emissive: '#ffffff', emissiveMap: screenTexture, emissiveIntensity: on ? 1.1 : 0, roughness: 0.25 });
    const sx = 0.62, sz = dz - 0.06;
    const casing = plain({ eighties: '#3a3a3e', nineties: '#d8d0b8', noughties: '#c0c4cc', now: '#2a2a2e' }[a.decade], { roughness: 0.5 });
    let screenCentre: [number, number, number];
    if (a.decade === 'eighties') {
      s.box([0.42, 0.36, 0.38], [sx, deskY + 0.18, sz], plain('#6a4a2e'));
      s.box([0.34, 0.27, 0.02], [sx - 0.02, deskY + 0.19, sz + 0.19], casing);
      s.mesh(new THREE.PlaneGeometry(0.28, 0.21), screenMaterial, [sx - 0.03, deskY + 0.19, sz + 0.202]).castShadow = false;
      for (const side of [-1, 1]) s.rod([sx, deskY + 0.36, sz], [sx + side * 0.2, deskY + 0.72, sz - 0.03], 0.004, plain('#c9cdd0', { metalness: 0.9 }));
      s.box([0.26, 0.05, 0.18], [sx + 0.38, deskY + 0.025, sz + 0.1], plain('#2a2a2e')); s.box([0.1, 0.016, 0.07], [sx + 0.38, deskY + 0.058, sz + 0.1], plain(era.accent));
      s.rod([sx + 0.6, deskY + 0.02, sz + 0.16], [sx + 0.6, deskY + 0.1, sz + 0.16], 0.006, plain('#111')); s.box([0.09, 0.03, 0.09], [sx + 0.6, deskY + 0.015, sz + 0.16], plain('#2a2a2e'));
      screenCentre = [sx - 0.03, deskY + 0.19, sz + 0.25];
    } else if (a.decade === 'now') {
      s.box([0.34, 0.012, 0.23], [sx, deskY + 0.006, sz + 0.1], casing);
      const lid = s.box([0.34, 0.22, 0.01], [sx, deskY + 0.115, sz - 0.03], casing); lid.rotation.x = -0.22;
      const face = s.mesh(new THREE.PlaneGeometry(0.31, 0.19), screenMaterial, [sx, deskY + 0.116, sz - 0.023]); face.rotation.x = -0.22; face.castShadow = false;
      s.cylinder(0.11, 0.11, 0.012, [sx + 0.5, deskY + 0.24, sz], plain('#f4f4f4', { emissive: '#fff4e0', emissiveIntensity: on ? 0.8 : 0 }), 24).rotation.x = Math.PI / 2;
      s.rod([sx + 0.5, deskY, sz], [sx + 0.5, deskY + 0.13, sz], 0.006, casing);
      screenCentre = [sx, deskY + 0.12, sz + 0.05];
    } else {
      const flat = a.decade === 'noughties';
      if (flat) { s.box([0.4, 0.31, 0.04], [sx, deskY + 0.26, sz], casing); s.box([0.06, 0.1, 0.04], [sx, deskY + 0.06, sz - 0.01], casing); s.box([0.2, 0.015, 0.14], [sx, deskY + 0.008, sz], casing); }
      else { s.box([0.4, 0.34, 0.4], [sx, deskY + 0.27, sz - 0.02], casing); s.box([0.42, 0.1, 0.4], [sx, deskY + 0.05, sz - 0.02], casing); }
      s.mesh(new THREE.PlaneGeometry(0.33, 0.25), screenMaterial, [sx, deskY + 0.27, sz + (flat ? 0.021 : 0.182)]).castShadow = false;
      s.box([0.38, 0.02, 0.13], [sx, deskY + 0.01, sz + 0.3], casing);
      s.box([0.18, 0.42, 0.4], [sx - 0.36, deskY + 0.21, sz - 0.02], casing);
      s.box([0.02, 0.008, 0.004], [sx - 0.36, deskY + 0.34, sz + 0.181], glowing(flat ? '#3a8aff' : '#4aff5a', on ? 1.5 : 0.1));
      screenCentre = [sx, deskY + 0.27, sz + 0.25];
    }
    let screenLight: THREE.PointLight | null = null;
    if (on) {
      screenLight = new THREE.PointLight(a.screen === 'music' ? '#d86aff' : a.screen === 'game' ? '#8ad0ff' : '#cfe0ff', 2.2, 3.2, 1.6);
      screenLight.position.set(...screenCentre);
      root.add(screenLight);
      const spill = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.4), new THREE.MeshBasicMaterial({ color: screenLight.color, transparent: true, opacity: 0.28, depthWrite: false }));
      spill.rotation.x = -Math.PI / 2; spill.position.set(sx, deskY + 0.004, sz + 0.28); root.add(spill);
    }

    // ---- Nightstand and shelf.
    const nx = -0.72, nz = Z0 + 0.3;
    if (a.decade === 'nineties' || a.decade === 'now') { s.box([0.42, 0.5, 0.36], [nx, 0.25, nz], plain(a.decade === 'now' ? '#f0ece4' : '#3a5a8a', { roughness: 0.7 })); for (let i = 0; i < 3; i++) s.box([0.36, 0.012, 0.012], [nx, 0.12 + i * 0.14, nz + 0.181], plain('#1c1c20')); }
    else s.box([0.42, 0.5, 0.36], [nx, 0.25, nz], deskMaterial);
    s.box([0.44, 0.03, 0.38], [nx, 0.515, nz], deskMaterial);
    s.box([0.14, 0.07, 0.07], [nx - 0.12, 0.565, nz + 0.1], plain('#1c1c20'));
    s.box([0.1, 0.035, 0.004], [nx - 0.12, 0.568, nz + 0.137], glowing(a.decade === 'now' ? '#f4f4f4' : '#ff3a2a', 1.4)).castShadow = false;
    const lampOn = a.lights === 'lamp';
    if (lampOn || a.decade === 'eighties') {
      s.cylinder(0.05, 0.07, 0.02, [nx + 0.12, 0.54, nz - 0.08], plain(era.accent), 14);
      s.rod([nx + 0.12, 0.54, nz - 0.08], [nx + 0.12, 0.74, nz - 0.08], 0.008, plain('#c9cdd0', { metalness: 0.8 }));
      s.cylinder(0.06, 0.11, 0.14, [nx + 0.12, 0.8, nz - 0.08], new THREE.MeshStandardMaterial({ color: '#ffe8c0', emissive: '#ffc070', emissiveIntensity: lampOn ? 1.3 : 0.05, roughness: 0.8 }), 18);
      if (lampOn) { const bulb = new THREE.PointLight('#ffc888', 2.4, 3.5, 1.5); bulb.position.set(nx + 0.12, 0.85, nz); root.add(bulb); }
    }
    const shelfY = 1.42, shelfZ = -0.55;
    s.box([0.2, 0.025, 1.3], [X0 + 0.1, shelfY, shelfZ], deskMaterial);
    for (const z of [-0.5, 0.5]) s.box([0.16, 0.12, 0.02], [X0 + 0.08, shelfY - 0.07, shelfZ + z], deskMaterial);
    let run = shelfZ - 0.6;
    while (run < shelfZ + 0.56) {
      const kind = random();
      if (kind < 0.55) { const thick = mix(0.018, 0.045, random()), height = mix(0.13, 0.24, random()); s.box([0.14, height, thick], [X0 + 0.1, shelfY + 0.0125 + height / 2, run + thick / 2], plain(pick([...era.cloth, ...era.inks]), { roughness: 0.7 })).rotation.x = random() < 0.12 ? 0.2 : 0; run += thick + 0.003; }
      else if (kind < 0.7) { const gold = plain('#d8a83a', { metalness: 0.9, roughness: 0.3 }); s.lathe([[0.001, 0], [0.035, 0], [0.035, 0.015], [0.008, 0.03], [0.008, 0.08], [0.04, 0.12], [0.045, 0.17], [0.04, 0.17], [0.001, 0.12]], gold, [X0 + 0.1, shelfY + 0.0125, run + 0.05]); run += 0.11; }
      else if (kind < 0.85) { const tint = pick(era.inks); s.ball([0.035, 0.04, 0.035], [X0 + 0.1, shelfY + 0.14, run + 0.04], plain(tint), 10); s.cylinder(0.03, 0.035, 0.1, [X0 + 0.1, shelfY + 0.0625, run + 0.04], plain(pick(era.cloth)), 10); run += 0.09; }
      else run += 0.08 + random() * 0.1;
    }

    // ---- Rug, laundry, media and the rest of the floor.
    if (a.floor === 'boards' || a.decade === 'now' || random() < 0.4) {
      const rug = canvasTexture(128, 128, (ctx, w, h) => { ctx.fillStyle = pick(era.cloth); ctx.fillRect(0, 0, w, h); ctx.strokeStyle = pick(era.inks); ctx.lineWidth = 8; ctx.strokeRect(10, 10, w - 20, h - 20); ctx.strokeStyle = pick(era.inks); ctx.lineWidth = 4; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(w / 2, h / 2, 8 + i * 9, 0, 7); ctx.stroke(); } });
      const mat = s.box([1.7, 0.016, 1.25], [0.25, 0.008, 0.5], new THREE.MeshStandardMaterial({ map: rug, roughness: 1 }));
      mat.rotation.y = (random() - 0.5) * 0.25; mat.castShadow = false;
    }
    const slotsXZ: [number, number][] = [[0.25, 0.45], [1.35, 1.15], [-0.95, 1.35]];
    const clear = (x: number, z: number) => slotsXZ.every(([px, pz]) => Math.hypot(x - px, z - pz) > 0.72) && !(x < bx + bedW / 2 + 0.05 && z < Z0 + bedL + 0.1) && !(x > dx - dw / 2 - 0.05 && z < dz + dd / 2 + 0.05);
    const somewhere = (): [number, number] => { for (let i = 0; i < 30; i++) { const x = mix(X0 + 0.2, WX / 2 - 0.25, random()), z = mix(Z0 + 0.3, WZ / 2 - 0.3, random()); if (clear(x, z)) return [x, z]; } return [1.8, -0.6]; };
    const heapGeometry = new THREE.SphereGeometry(1, 14, 10);
    const garments = a.state === 'tidied' ? 1 : a.state === 'packing' ? 3 : Math.round(mix(5, 17, mood.density));
    for (let i = 0; i < garments; i++) {
      const [x, z] = somewhere();
      const heap = s.mesh(heapGeometry.clone(), plain(pick(era.cloth), { roughness: 1 }), [x, 0.03, z]);
      const at = heap.geometry.attributes.position as THREE.BufferAttribute, f = random() * 6;
      for (let k = 0; k < at.count; k++) { const q = 1 + 0.28 * Math.sin(at.getX(k) * 5 + f) * Math.cos(at.getZ(k) * 4 + f * 2); at.setXYZ(k, at.getX(k) * q, Math.max(-0.2, at.getY(k)) * (1 + 0.3 * Math.sin(at.getX(k) * 7 + at.getZ(k) * 6 + f)), at.getZ(k) * q); }
      heap.geometry.computeVertexNormals();
      heap.scale.set(mix(0.18, 0.34, random()), mix(0.05, 0.12, random()), mix(0.16, 0.3, random()));
      heap.rotation.y = random() * 3;
    }
    // Clothes that made it as far as the furniture.
    if (a.state !== 'tidied' && a.state !== 'packing') {
      for (let i = 0; i < 2 + Math.round(mood.density * 3); i++) lay(bx + (random() - 0.2) * bedW * 0.9, bz + (random() - 0.5) * bedL * 0.8, mix(0.4, 0.6, random()), mix(0.4, 0.7, random()), random() * 6.28, plain(pick(era.cloth), { roughness: 1, side: THREE.DoubleSide }), 0.03, 0.03 + i * 0.012);
      const slung = s.ball([0.3, 0.035, 0.22], [dx + 0.55, deskY + 0.03, dz + 0.16], plain(pick(era.cloth), { roughness: 1 }), 12); slung.rotation.y = random();
      const hung = s.box([0.34, 0.5, 0.03], [dx + dw / 2 + 0.03, deskY - 0.24, dz + 0.1], plain(pick(era.cloth), { roughness: 1 })); hung.rotation.z = 0.06;
    } else if (a.state === 'tidied') {
      for (let i = 0; i < 5; i++) s.box([0.36, 0.04, 0.28], [bx + 0.05, topY + 0.05 + i * 0.042, bz + 0.55], plain(pick(era.cloth), { roughness: 1 })).rotation.y = (random() - 0.5) * 0.06;
    }
    // Laundry basket or packing boxes by the desk.
    const cornerX = WX / 2 - 0.5, cornerZ = -0.7;
    if (a.state === 'packing') {
      const card = plain('#b98a56', { roughness: 0.95 });
      const boxes: [number, number, number, number][] = [[cornerX, 0, cornerZ, 0.5], [cornerX - 0.05, 0.42, cornerZ + 0.03, 0.42], [cornerX - 0.62, 0, cornerZ + 0.25, 0.44], [-0.2, 0, -1.2, 0.46]];
      for (const [x, y, z, size] of boxes) {
        const box = s.box([size, size * 0.84, size * 0.9], [x, y + size * 0.42, z], card); box.rotation.y = (random() - 0.5) * 0.4;
        s.box([size * 1.01, 0.004, 0.06], [x, y + size * 0.842, z], plain('#d8c89a')).rotation.y = box.rotation.y;
        if (random() < 0.6) { const flap = s.box([size, 0.008, size * 0.44], [x, y + size * 0.84 + size * 0.16, z - size * 0.56], card); flap.rotation.set(0.9, box.rotation.y, 0, 'YXZ'); }
      }
    } else {
      s.mesh(new THREE.CylinderGeometry(0.24, 0.19, 0.5, 18, 1, true), plain(a.decade === 'now' ? '#d8c8a8' : pick(era.inks), { side: THREE.DoubleSide, roughness: 0.8 }), [cornerX, 0.25, cornerZ]);
      if (a.state !== 'tidied') for (let i = 0; i < 4; i++) s.ball([0.16, 0.09, 0.15], [cornerX + (random() - 0.5) * 0.2, 0.46 + i * 0.05, cornerZ + (random() - 0.5) * 0.2], plain(pick(era.cloth), { roughness: 1 }), 10);
    }
    // Small media: tapes, discs, magazines, by the dozen.
    const media = [];
    const mediaCount = a.state === 'tidied' ? 6 : Math.round(mix(10, 46, mood.density));
    for (let i = 0; i < mediaCount; i++) {
      const onDesk = random() < 0.3;
      const [x, z] = onDesk ? [dx + mix(-0.1, dw / 2 - 0.1, random()), dz + mix(-0.2, 0.25, random())] : somewhere();
      media.push({ at: [x, (onDesk ? deskY : 0) + 0.012 + (random() < 0.3 ? 0.022 : 0), z] as const, size: mix(0.1, 0.16, random()), color: pick([...era.inks, ...era.cloth]) });
    }
    s.scatter(new THREE.BoxGeometry(1, 0.14, 0.8), new THREE.MeshStandardMaterial({ roughness: 0.5 }), media);
    if (a.state === 'grounded') {
      const china = plain('#f0ece4', { roughness: 0.4 });
      for (let i = 0; i < 9; i++) {
        const onDesk = i < 3; const [x, z] = onDesk ? [dx + mix(0, dw / 2 - 0.12, random()), dz + mix(-0.1, 0.22, random())] : i < 5 ? [nx + (random() - 0.5) * 0.2, nz + 0.05] : somewhere();
        const y = onDesk ? deskY : i < 5 ? 0.53 : 0;
        const kind = random();
        if (kind < 0.4) { s.cylinder(0.11, 0.07, 0.016, [x, y + 0.008 + (i < 5 ? 0 : 0), z], china, 18); if (random() < 0.6) s.cylinder(0.105, 0.07, 0.016, [x + 0.01, y + 0.026, z], china, 18); }
        else if (kind < 0.75) { const can = s.cylinder(0.033, 0.033, 0.12, [x, y + (random() < 0.5 ? 0.06 : 0.033), z], plain(pick(['#d8202c', '#2c6fd0', '#3aa870', '#e8e4da']), { metalness: 0.6, roughness: 0.3 }), 12); if (can.position.y - y < 0.05) can.rotation.set(Math.PI / 2, 0, random() * 3); }
        else { s.cylinder(0.042, 0.036, 0.09, [x, y + 0.045, z], plain(pick(era.inks)), 14); }
      }
    }

    // ---- The extra light.
    const twinkle: THREE.MeshStandardMaterial[] = [];
    if (a.lights === 'fairy') {
      const warm = a.decade === 'now' || a.decade === 'noughties';
      const tints = warm ? ['#ffe0a0', '#ffd890', '#fff0c8'] : ['#ff4a4a', '#4aff6a', '#4a8aff', '#ffe04a', '#ff6ad8'];
      const groups = tints.map((tint) => ({ material: new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: 1.5 }), points: [] as { at: readonly [number, number, number]; size: number }[] }));
      const wire: [number, number, number][] = [];
      const string = (from: [number, number, number], to: [number, number, number], swags: number) => {
        const n = swags * 7;
        for (let i = 0; i <= n; i++) {
          const t = i / n, sag = Math.abs(Math.sin(t * Math.PI * swags)) * mix(0.1, 0.2, mood.wear * 0.5 + 0.3);
          const point: [number, number, number] = [mix(from[0], to[0], t), mix(from[1], to[1], t) - sag, mix(from[2], to[2], t)];
          wire.push(point);
          pick(groups).points.push({ at: [point[0] + (from[0] === to[0] ? 0.03 : 0), point[1] - 0.03, point[2] + (from[0] === to[0] ? 0 : 0.03)], size: 0.036 });
        }
      };
      string([X0 + 0.04, 2.36, WZ / 2 - 0.1], [X0 + 0.04, 2.36, Z0 + 0.05], 4);
      string([X0 + 0.05, 2.36, Z0 + 0.04], [WX / 2 - 0.1, 2.36, Z0 + 0.04], 4);
      s.tube(wire, 0.008, plain('#2a3a2a')).castShadow = false;
      for (const group of groups) { s.scatter(new THREE.SphereGeometry(1, 8, 6), group.material, group.points).castShadow = false; twinkle.push(group.material); }
    } else if (a.lights === 'blacklight') {
      s.box([0.06, 0.07, 1.25], [X0 + 0.04, 2.05, shelfZ], plain('#2a2a30'));
      const tube = glowing('#a070ff', 2.2);
      s.cylinder(0.02, 0.02, 1.15, [X0 + 0.09, 2.05, shelfZ], tube, 10).rotation.x = Math.PI / 2;
      twinkle.push(tube);
      const violet = new THREE.PointLight('#8a5aff', 3.2, 4.5, 1.4); violet.position.set(X0 + 0.5, 2.0, shelfZ); root.add(violet);
    } else if (a.lights === 'strip') {
      const tint = new THREE.Color().setHSL(mix(0.78, 0.92, mood.cheer) - mood.warmth * 0.1 + (mood.cheer < 0.3 ? -0.25 : 0), 1, 0.6);
      const strip = new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: 2 });
      s.box([WX, 0.03, 0.02], [0, WALL - 0.04, Z0 + 0.012], strip).castShadow = false;
      s.box([0.02, 0.03, WZ], [X0 + 0.012, WALL - 0.04, 0], strip).castShadow = false;
      s.box([dw, 0.02, 0.02], [dx, deskY + 0.02, Z0 + 0.03], strip).castShadow = false;
      twinkle.push(strip);
      const wash = new THREE.PointLight(tint, 3, 5, 1.3); wash.position.set(-0.6, 2.2, -0.8); root.add(wash);
    }
    if (a.decade === 'nineties' || (a.decade === 'noughties' && random() < 0.5)) {
      // Glow-in-the-dark stars someone stood on the bed to stick up.
      const stars = [];
      for (let i = 0; i < 26; i++) stars.push({ at: [X0 + 0.008, mix(1.7, 2.4, random()), mix(Z0 + 0.2, 0.6, random())] as const, size: mix(0.018, 0.035, random()) });
      s.scatter(new THREE.OctahedronGeometry(1, 0), glowing('#d8ffb0', 0.9), stars).castShadow = false;
    }

    // ---- Keep the cast near life size: small things are enlarged, but only so far.
    const basePlace = world.place.bind(world);
    world.place = (items: readonly Placeable[]) => {
      basePlace(items);
      for (const item of items) {
        const limit = item.hero ? 2.4 : 2;
        if (item.holder.scale.x > limit) { item.holder.scale.setScalar(limit); item.holder.updateMatrixWorld(true); }
      }
    };
    const baseScreen = on ? 1.1 : 0, speed = mix(0.3, 2.2, mood.energy);
    world.update = (_dt: number, time: number) => {
      twinkle.forEach((material, index) => { material.emissiveIntensity = (a.lights === 'fairy' ? 1.2 : 1.9) + Math.sin(time * speed * (1 + index * 0.37) + index * 2) * 0.45; });
      if (on) {
        const flicker = a.screen === 'static' ? 0.3 * Math.sin(time * 31) * Math.sin(time * 17) : a.screen === 'music' ? 0.3 * Math.abs(Math.sin(time * speed * 2.4)) : 0.05 * Math.sin(time * 3);
        screenMaterial.emissiveIntensity = baseScreen + flicker;
        if (screenLight) screenLight.intensity = 2.2 * (1 + flicker);
      }
    };
    return world;
  },
});
