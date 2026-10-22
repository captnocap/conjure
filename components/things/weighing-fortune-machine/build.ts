import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const ENAMEL = {
  red: 'Fire-engine red enamel with cream trim, the classic.',
  blue: 'Deep royal blue with silver trim.',
  yellow: 'Canary yellow with black trim, loud as a taxi.',
  green: 'Bottle green with gold trim, old and dignified.',
  cream: 'Cream with red trim, like a sweet-shop counter.',
} as const;
const ENAMEL_HEX: Record<keyof typeof ENAMEL, [string, string]> = {
  red: ['#c8281f', '#f1e6c6'], blue: ['#234a9c', '#d5dadf'], yellow: ['#ecb920', '#1f1d1b'], green: ['#1f5a40', '#d9b24c'], cream: ['#eadfbe', '#c0302a'],
};
const FORTUNES = {
  journey: 'A LONG JOURNEY AWAITS YOU, with a little train as its sign.',
  love: 'SOMEONE IS THINKING OF YOU, with a heart as its sign.',
  money: 'MONEY COMES TO YOU SOON, with a coin as its sign.',
  patience: 'PATIENCE WILL BE REWARDED, with a star as its sign.',
  beware: 'BEWARE A SMILING STRANGER, with a watching eye as its sign.',
  home: 'YOU WILL RETURN HOME, with a little house as its sign.',
} as const;
const FORTUNE_TEXT: Record<keyof typeof FORTUNES, string[]> = {
  journey: ['A LONG', 'JOURNEY', 'AWAITS YOU'], love: ['SOMEONE IS', 'THINKING', 'OF YOU'], money: ['MONEY', 'COMES TO', 'YOU SOON'],
  patience: ['PATIENCE', 'WILL BE', 'REWARDED'], beware: ['BEWARE', 'A SMILING', 'STRANGER'], home: ['YOU WILL', 'RETURN', 'HOME'],
};

export default defineThing({
  questions: {
    form: choice('What shape is the machine?', {
      classic: 'A waisted cabinet with a big round head, like a keyhole.',
      cabinet: 'A tall square-shouldered cabinet with a lit marquee across the top.',
      lollipop: 'A drum head on a slim column, spindly and elegant.',
    }),
    colour: choice('What colour is it?', ENAMEL),
    disc: choice('What is painted on the spinning disc?', {
      spiral: 'A red and white spiral that seems to bore inward.',
      wedges: 'Rainbow wedges like a lottery wheel.',
      rings: 'Black and white hypnotic rings.',
      numbers: 'A ring of weights in kilos round a starburst.',
    }),
    lights: choice('What are the bulbs doing?', {
      running: 'Chasing each other round the dial in a running circle.',
      steady: 'All glowing steadily.',
      dying: 'Half of them blown, the rest stuttering.',
      off: 'All dark; the machine is unplugged or broken.',
    }),
    fortune: choice('What does the fortune say?', FORTUNES),
    card: choice('Where is the printed card?', {
      none: 'No card: nobody has fed it a coin today.',
      slot: 'One card sticking out of the slot, never collected.',
      floor: 'Several cards dropped and scattered at its foot.',
      hand: 'A fresh card lying face up on the step plate.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => mix(lo, hi, random());
    const [bodyHex, trimHex] = ENAMEL_HEX[a.colour];
    const body = s.material(bodyHex, { roughness: 0.38, metalness: 0.15 });
    const trim = s.material(trimHex, { roughness: 0.4, metalness: a.colour === 'blue' || a.colour === 'green' ? 0.6 : 0.1 });
    const chrome = s.material('#d9dddd', { metalness: 0.9, roughness: 0.22 });
    const brass = s.material('#c09a3e', { metalness: 0.8, roughness: 0.3 });
    const black = s.material('#1b1a19', { roughness: 0.8 });
    const glass = new THREE.MeshStandardMaterial({ color: '#eaf6f4', transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false });
    const textures: THREE.Texture[] = [];
    const paint = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, emissive = 0) => {
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
      draw(canvas.getContext('2d')!);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, ...(emissive ? { emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: emissive } : {}) });
    };
    const lit = a.lights !== 'off';
    const power = lit ? mix(0.5, 1, mood.cheer) : 0;

    // ---- dimensions per form -----------------------------------------------
    const headR = a.form === 'lollipop' ? 0.34 : 0.31;
    const headY = a.form === 'cabinet' ? 1.36 : a.form === 'lollipop' ? 1.6 : 1.48;
    const front = a.form === 'cabinet' ? 0.19 : 0.16; // z of the head's front face
    const colZ = -0.12;

    // ---- step plate --------------------------------------------------------
    s.box([0.52, 0.09, 0.66], [0, 0.045, 0.08], body);
    s.box([0.46, 0.012, 0.44], [0, 0.096, 0.17], black);
    for (let i = 0; i < 9; i++) s.box([0.42, 0.008, 0.014], [0, 0.105, -0.02 + i * 0.047], chrome);
    s.box([0.54, 0.02, 0.68], [0, 0.01, 0.08], black);

    // ---- body --------------------------------------------------------------
    if (a.form === 'classic') {
      s.box([0.36, 1.12, 0.3], [0, 0.65, colZ], body);
      s.box([0.4, 0.06, 0.34], [0, 0.12, colZ], trim);
      const head = s.cylinder(headR + 0.07, headR + 0.07, 0.32, [0, headY, colZ + 0.12 - 0.12], body, 40); head.rotation.x = Math.PI / 2;
      s.box([0.5, 0.28, 0.3], [0, headY - headR - 0.02, colZ], body);
      for (const x of [-1, 1]) s.box([0.012, 1.0, 0.012], [x * 0.15, 0.68, colZ + 0.153], trim);
      s.ball([0.06, 0.08, 0.06], [0, headY + headR + 0.11, colZ], trim, 14);
    } else if (a.form === 'cabinet') {
      s.box([0.56, 1.78, 0.38], [0, 0.98, -0.02], body);
      s.box([0.6, 0.06, 0.42], [0, 0.13, -0.02], trim);
      s.box([0.62, 0.22, 0.42], [0, 1.94, -0.02], trim);
      const marquee = paint(256, 80, (ctx) => {
        ctx.fillStyle = bodyHex; ctx.fillRect(0, 0, 256, 80);
        ctx.fillStyle = a.colour === 'yellow' ? '#1f1d1b' : a.colour === 'cream' ? '#c0302a' : '#fff7d6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 30px sans-serif'; ctx.fillText('WEIGHT &', 128, 24); ctx.fillText('FORTUNE', 128, 58);
      }, power * 0.5);
      s.mesh(new THREE.PlaneGeometry(0.56, 0.18), marquee, [0, 1.94, 0.193]);
      for (const x of [-1, 1]) s.box([0.02, 1.7, 0.02], [x * 0.27, 0.98, 0.175], trim);
    } else {
      s.cylinder(0.075, 0.1, 1.2, [0, 0.69, colZ], body, 18);
      s.cylinder(0.16, 0.2, 0.1, [0, 0.14, colZ], trim, 18);
      s.cylinder(0.11, 0.085, 0.07, [0, 1.25, colZ], trim, 18);
      const head = s.cylinder(headR + 0.06, headR + 0.06, 0.3, [0, headY, colZ + 0.13], body, 40); head.rotation.x = Math.PI / 2;
      // A coin box strapped to the column.
      s.box([0.24, 0.34, 0.2], [0, 0.98, colZ + 0.08], body);
      s.ball([0.05, 0.07, 0.05], [0, headY + headR + 0.1, colZ + 0.13], trim, 14);
    }
    const zf = a.form === 'classic' ? colZ + 0.16 : a.form === 'cabinet' ? 0.17 : colZ + 0.28;

    // ---- the dial: bezel, disc, pointer, glass ----------------------------
    const bezel = s.ring(headR, 0.022, [0, headY, zf + 0.005], chrome);
    void bezel;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(headR - 0.015, 48), paint(256, 256, (ctx) => {
      ctx.translate(128, 128);
      if (a.disc === 'spiral') {
        ctx.fillStyle = '#f6f0de'; ctx.fillRect(-128, -128, 256, 256);
        ctx.strokeStyle = '#cf2a20'; ctx.lineWidth = 17; ctx.beginPath();
        for (let t = 0; t < Math.PI * 9; t += 0.05) { const r = t * 4.6; ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r); }
        ctx.stroke();
      } else if (a.disc === 'wedges') {
        const hues = ['#e23b2e', '#f39b1f', '#f4d21f', '#3fae4f', '#2f86d6', '#7a48c0', '#e2559d', '#f6f0de'];
        for (let i = 0; i < 16; i++) { ctx.fillStyle = hues[i % hues.length]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 128, (i / 16) * Math.PI * 2, ((i + 1) / 16) * Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#1b1a19'; ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
      } else if (a.disc === 'rings') {
        for (let i = 9; i >= 0; i--) { ctx.fillStyle = i % 2 ? '#17161a' : '#f6f0de'; ctx.beginPath(); ctx.arc(i * 1.5, 0, 14 + i * 13, 0, Math.PI * 2); ctx.fill(); }
      } else {
        ctx.fillStyle = '#f6f0de'; ctx.fillRect(-128, -128, 256, 256);
        for (let i = 0; i < 24; i++) { ctx.fillStyle = i % 2 ? '#cf2a20' : '#f4d21f'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 74, (i / 24) * Math.PI * 2, ((i + 1) / 24) * Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#17161a'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let i = 0; i < 12; i++) { ctx.save(); ctx.rotate((i / 12) * Math.PI * 2); ctx.fillText(String(i * 10), 0, -100); ctx.fillRect(-1.5, -86, 3, 10); ctx.restore(); }
      }
    }, power * 0.35));
    disc.position.set(0, headY, zf + 0.004);
    s.root.add(disc);
    s.mesh(new THREE.CircleGeometry(headR - 0.01, 40), glass, [0, headY, zf + 0.03]).castShadow = false;
    // A fixed red pointer at twelve o'clock and the hub.
    const pointer = new THREE.Shape(); pointer.moveTo(-0.025, 0.02); pointer.lineTo(0.025, 0.02); pointer.lineTo(0, -0.07); pointer.closePath();
    s.mesh(new THREE.ShapeGeometry(pointer), s.material('#d0241c', { emissive: '#d0241c', emissiveIntensity: 0.3 }), [0, headY + headR - 0.04, zf + 0.012]);
    s.cylinder(0.03, 0.03, 0.02, [0, headY, zf + 0.014], chrome, 14).rotation.x = Math.PI / 2;

    // ---- bulbs: three phase groups that chase ------------------------------
    const bulbColours = ['#ffd23a', '#ff4a36', '#3fd0ff', '#6cf06a'];
    const phases = [0, 1, 2].map((i) => new THREE.MeshStandardMaterial({ color: lit ? bulbColours[i % bulbColours.length] : '#8d8a80', emissive: bulbColours[i % bulbColours.length], emissiveIntensity: lit ? 1.4 : 0, roughness: 0.3 }));
    const blown = new THREE.MeshStandardMaterial({ color: '#6f6a5e', roughness: 0.5 });
    const groups: [number, number, number][][] = [[], [], [], []];
    const addBulb = (i: number, at: [number, number, number]) => {
      const out = a.lights === 'dying' ? random() < 0.5 : random() < mood.wear * 0.25;
      groups[out ? 3 : i % 3].push(at);
    };
    const ringN = 18, ringR = headR + (a.form === 'cabinet' ? 0.04 : 0.045);
    for (let i = 0; i < ringN; i++) { const t = (i / ringN) * Math.PI * 2; addBulb(i, [Math.sin(t) * ringR, headY + Math.cos(t) * ringR, zf + 0.012]); }
    if (a.form === 'cabinet') for (let i = 0; i < 9; i++) for (const x of [-1, 1]) addBulb(i + (x > 0 ? 1 : 0), [x * 0.27, 0.22 + i * 0.085, 0.19]);
    if (a.form === 'classic') for (let i = 0; i < 6; i++) for (const x of [-1, 1]) addBulb(i + (x > 0 ? 1 : 0), [x * 0.15, 0.24 + i * 0.1, colZ + 0.162]);
    const bulbGeo = new THREE.SphereGeometry(0.02, 10, 7);
    groups.forEach((list, i) => { if (list.length) s.scatter(bulbGeo, i === 3 ? blown : phases[i], list.map((at) => ({ at, size: 1 }))); });

    // ---- fortune sign window, coin slot, card slot -------------------------
    const signY = a.form === 'lollipop' ? 1.03 : a.form === 'cabinet' ? 0.82 : 0.9;
    const signZ = a.form === 'lollipop' ? colZ + 0.182 : zf - (a.form === 'cabinet' ? -0.022 : 0.006);
    const signW = a.form === 'lollipop' ? 0.19 : 0.24;
    const sign = paint(128, 128, (ctx) => {
      ctx.fillStyle = lit ? '#fff3c4' : '#b9b199'; ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = bodyHex; ctx.lineWidth = 8; ctx.strokeRect(4, 4, 120, 120);
      const ink = a.colour === 'cream' ? '#c0302a' : bodyHex;
      ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineWidth = 9; ctx.lineJoin = 'round';
      ctx.translate(64, 66);
      if (a.fortune === 'love') { ctx.beginPath(); ctx.moveTo(0, 36); ctx.bezierCurveTo(-58, -6, -30, -50, 0, -18); ctx.bezierCurveTo(30, -50, 58, -6, 0, 36); ctx.fill(); }
      else if (a.fortune === 'money') { ctx.beginPath(); ctx.arc(0, 0, 38, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff3c4'; ctx.font = 'bold 50px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('1', 0, 3); }
      else if (a.fortune === 'patience') { ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 18 : 44, t = (i / 10) * Math.PI * 2 - Math.PI / 2; ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r); } ctx.closePath(); ctx.fill(); }
      else if (a.fortune === 'beware') { ctx.beginPath(); ctx.moveTo(-46, 0); ctx.quadraticCurveTo(0, -44, 46, 0); ctx.quadraticCurveTo(0, 44, -46, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill(); }
      else if (a.fortune === 'home') { ctx.beginPath(); ctx.moveTo(-44, -4); ctx.lineTo(0, -42); ctx.lineTo(44, -4); ctx.closePath(); ctx.fill(); ctx.fillRect(-32, -4, 64, 42); ctx.fillStyle = '#fff3c4'; ctx.fillRect(-9, 12, 18, 26); }
      else { ctx.fillRect(-44, -22, 78, 40); ctx.fillRect(18, -36, 22, 20); ctx.fillRect(-36, -40, 10, 20); for (const x of [-28, 0, 26]) { ctx.beginPath(); ctx.arc(x, 26, 11, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#fff3c4'; for (const x of [-34, -12, 10]) ctx.fillRect(x, -12, 14, 14); }
    }, power * 0.6);
    s.box([signW + 0.03, signW + 0.03, 0.02], [0, signY, signZ - 0.008], chrome);
    s.mesh(new THREE.PlaneGeometry(signW, signW), sign, [0, signY, signZ + 0.003]);

    const slotY = signY - signW / 2 - 0.13;
    s.box([0.2, 0.13, 0.025], [0, slotY, signZ], brass);
    s.box([0.008, 0.045, 0.006], [0.06, slotY + 0.02, signZ + 0.014], black); // coin slot
    s.cylinder(0.018, 0.018, 0.012, [0.06, slotY - 0.035, signZ + 0.016], chrome, 10).rotation.x = Math.PI / 2;
    s.box([0.095, 0.01, 0.006], [-0.04, slotY - 0.02, signZ + 0.014], black); // card slot
    s.box([0.13, 0.012, 0.06], [-0.04, slotY - 0.075, signZ + 0.03], chrome); // tray

    const cardMaterial = paint(128, 200, (ctx) => {
      ctx.fillStyle = '#f5ecd2'; ctx.fillRect(0, 0, 128, 200);
      ctx.strokeStyle = '#b3261c'; ctx.lineWidth = 5; ctx.strokeRect(5, 5, 118, 190);
      ctx.fillStyle = '#b3261c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 46px sans-serif'; ctx.fillText(`${Math.round(rnd(38, 86))}`, 64, 42);
      ctx.font = 'bold 16px sans-serif'; ctx.fillText('KILOGRAMS', 64, 76);
      ctx.fillStyle = '#1b1a19'; ctx.font = 'bold 19px sans-serif';
      FORTUNE_TEXT[a.fortune].forEach((line, i) => ctx.fillText(line, 64, 112 + i * 28, 110));
    });
    cardMaterial.side = THREE.DoubleSide;
    const card = (at: [number, number, number], rot: [number, number, number]) => {
      const mesh = s.mesh(new THREE.PlaneGeometry(0.085, 0.133), cardMaterial, at);
      mesh.rotation.set(...rot);
      return mesh;
    };
    if (a.card === 'slot') card([-0.04, slotY - 0.045, signZ + 0.04], [-1.05, 0, 0.04]);
    else if (a.card === 'hand') card([rnd(-0.1, 0.1), 0.118, 0.2 + rnd(-0.05, 0.08)], [-Math.PI / 2, 0, rnd(-0.6, 0.6)]);
    else if (a.card === 'floor') {
      const n = 3 + Math.floor(mood.density * 5);
      for (let i = 0; i < n; i++) card([rnd(-0.55, 0.55), 0.004 + i * 0.001, 0.5 + rnd(0, 0.35)], [-Math.PI / 2, 0, rnd(0, 6.28)]);
      card([-0.04, slotY - 0.045, signZ + 0.04], [-1.05, 0, -0.1]);
    }
    if (a.card !== 'none' && a.card !== 'slot' && mood.wear > 0.6) card([0.2, 0.004, 0.52], [-Math.PI / 2, 0, 1]);

    // Painted instruction plate above the sign.
    const plate = paint(256, 64, (ctx) => {
      ctx.fillStyle = trimHex; ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = trimHex === '#1f1d1b' ? '#ecb920' : bodyHex === '#eadfbe' ? '#f5ecd2' : bodyHex;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 34px sans-serif';
      ctx.fillText('YOUR WEIGHT', 128, 34, 240);
    });
    if (a.form !== 'lollipop') s.mesh(new THREE.PlaneGeometry(0.28, 0.07), plate, [0, headY - headR - (a.form === 'cabinet' ? 0.12 : 0.1), zf + 0.004]);

    // Wear: rust weeping from the base and a dent of grime.
    if (mood.wear > 0.45) {
      const rust = new THREE.MeshStandardMaterial({ color: '#6b3d22', transparent: true, opacity: mix(0, 0.75, mood.wear), roughness: 1, depthWrite: false });
      for (let i = 0; i < 5; i++) s.box([rnd(0.03, 0.09), rnd(0.08, 0.3), 0.002], [rnd(-0.15, 0.15), rnd(0.2, 0.5), zf + 0.002], rust).castShadow = false;
    }

    const spin = lit ? mix(0.6, 5, mood.energy) : 0;
    const chase = mix(2, 9, mood.energy);
    disc.rotation.z = random() * 6.28;
    const thing = s.finish({
      update: (dt, time) => {
        disc.rotation.z -= dt * spin;
        if (!lit) return;
        phases.forEach((material, i) => {
          if (a.lights === 'running') material.emissiveIntensity = Math.floor(time * chase) % 3 === i ? 1.9 : 0.25;
          else if (a.lights === 'dying') material.emissiveIntensity = Math.sin(time * (17 + i * 7)) * Math.sin(time * (5 + i)) > 0.3 ? 0.2 : 1.3;
        });
      },
    });
    thing.update!(0, 0);
    return { ...thing, dispose: () => { thing.dispose(); for (const t of textures) t.dispose(); for (const m of [...phases, blown, glass]) m.dispose(); } };
  },
});
