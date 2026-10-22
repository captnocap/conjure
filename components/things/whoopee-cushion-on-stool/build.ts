import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

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

const SEATS = {
  red: { description: 'Cherry-red vinyl, diner style.', tint: '#b8262e' },
  avocado: { description: 'Avocado green vinyl from a 1970s kitchen.', tint: '#6f7f3a' },
  cream: { description: 'Cream vinyl gone a bit grey.', tint: '#e6dfcc' },
  black: { description: 'Black leatherette.', tint: '#262628' },
  tartan: { description: 'A scratchy tartan wool cover.', tint: '#7a2a2e' },
  mustard: { description: 'Mustard velvet, plush and dusty.', tint: '#c8962c' },
} as const;

export default defineThing({
  questions: {
    stool: choice('What kind of stool is it on?', {
      bar: 'A tall bar stool with chrome tube legs, a foot ring and a round padded seat.',
      vanity: 'A low round vanity stool with a tufted top and a frilly skirt to the floor.',
      piano: 'A rectangular wooden piano stool on turned legs with a padded top.',
      step: 'A 1950s chrome kitchen step stool with a fold-out step and a padded seat.',
      pouffe: 'A fat round pouffe, no legs at all.',
    }),
    seat: choice('What covers the seat?', Object.fromEntries(Object.entries(SEATS).map(([key, value]) => [key, value.description])) as Record<keyof typeof SEATS, string>),
    air: score('How inflated is the whoopee cushion?', ['Flat and spent', 'Half full and sagging', 'Plump and primed']),
    pillow: choice('How well is it hidden?', {
      bare: 'Not hidden at all: pink rubber sitting right there on the seat.',
      half: 'A throw pillow laid half over it, a pink edge and the neck poking out.',
      covered: 'The pillow fully over it, only the flat neck showing underneath.',
    }),
    pillowStyle: choice('What is the throw pillow like?', {
      knitted: 'A granny-square knitted pillow in clashing wool colours.',
      satin: 'A frilled satin pillow, glossy and tacky.',
      patchwork: 'A patchwork pillow of old shirt fabric.',
      velvet: 'A plain velvet pillow with a tassel at each corner.',
      floral: 'A chintzy floral pillow from somebody\'s grandmother.',
    }),
    story: choice('What has happened here?', {
      set: 'The trap is set and waiting; nobody has sat down yet.',
      sprung: 'Somebody just sat: the pillow knocked to the floor, the cushion flat and the prank over.',
      stockpile: 'A joke-shop stockpile: spare cushions scattered on the floor around the stool.',
      forgotten: 'Forgotten for years: dusty, perished rubber, half slid off the seat.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * random();
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const seat = SEATS[a.seat];
    const chrome = s.material('#d6dadc', { metalness: 0.9, roughness: 0.18 });
    const wood = s.material('#6b4324', { roughness: 0.5 });

    // ---- Seat material: vinyl, wool or velvet, painted when it has a pattern.
    let seatMaterial: THREE.Material;
    if (a.seat === 'tartan') {
      const map = canvasTexture(256, 256, (ctx, w, h) => {
        ctx.fillStyle = seat.tint; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(20,40,30,0.55)'; for (let i = 0; i < w; i += 64) { ctx.fillRect(i, 0, 26, h); ctx.fillRect(0, i, w, 26); }
        ctx.fillStyle = 'rgba(240,220,120,0.6)'; for (let i = 44; i < w; i += 64) { ctx.fillRect(i, 0, 4, h); ctx.fillRect(0, i, w, 4); }
      });
      map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(2, 2);
      seatMaterial = new THREE.MeshStandardMaterial({ map, roughness: 1 });
    } else seatMaterial = s.material(seat.tint, a.seat === 'mustard' ? { roughness: 0.95 } : { roughness: 0.38 });

    // ---- The stool. Each returns the height and radius of the seat top.
    let top = 0.45, seatR = 0.18;
    const tuft = (y: number, r: number) => {
      const button = s.material('#2a2320', { roughness: 0.4 });
      for (let i = 0; i < 6; i++) { const t = i / 6 * Math.PI * 2; s.ball([0.008, 0.005, 0.008], [Math.cos(t) * r * 0.55, y, Math.sin(t) * r * 0.55], button, 8); }
      s.ball([0.008, 0.005, 0.008], [0, y, 0], button, 8);
    };
    if (a.stool === 'bar') {
      top = 0.74; seatR = 0.18;
      for (let i = 0; i < 4; i++) {
        const t = i / 4 * Math.PI * 2 + Math.PI / 4;
        s.rod([Math.cos(t) * 0.19, 0, Math.sin(t) * 0.19], [Math.cos(t) * 0.12, top - 0.07, Math.sin(t) * 0.12], 0.011, chrome);
      }
      s.ring(0.165, 0.008, [0, 0.22, 0], chrome).rotation.x = Math.PI / 2;
      s.cylinder(0.17, 0.17, 0.02, [0, top - 0.075, 0], chrome, 24);
      s.cylinder(seatR, seatR * 0.96, 0.065, [0, top - 0.0325, 0], seatMaterial, 32);
      s.ring(seatR * 0.98, 0.006, [0, top - 0.062, 0], chrome).rotation.x = Math.PI / 2;
    } else if (a.stool === 'vanity') {
      top = 0.46; seatR = 0.2;
      const skirt = s.material(a.seat === 'black' ? '#3a3238' : '#efe3d6', { roughness: 0.9, side: THREE.DoubleSide });
      const profile: [number, number][] = [];
      for (let i = 0; i <= 10; i++) profile.push([0.2 + 0.03 * (1 - i / 10) + Math.sin(i * 2.1) * 0.006, i / 10 * (top - 0.05)]);
      s.lathe(profile, skirt, [0, 0.005, 0]);
      s.cylinder(0.2, 0.2, 0.02, [0, top - 0.06, 0], skirt, 32);
      s.ball([seatR, 0.055, seatR], [0, top - 0.05, 0], seatMaterial, 24);
      tuft(top + 0.002, seatR);
      s.ring(seatR * 0.95, 0.012, [0, top - 0.05, 0], s.material('#c9a44a', { metalness: 0.7, roughness: 0.3 })).rotation.x = Math.PI / 2;
    } else if (a.stool === 'piano') {
      top = 0.5; seatR = 0.26;
      const leg: [number, number][] = [[0.02, 0], [0.028, 0.03], [0.018, 0.06], [0.03, 0.12], [0.022, 0.2], [0.032, 0.3], [0.02, 0.38], [0.024, 0.42]];
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.lathe(leg, wood, [x * 0.21, 0, z * 0.13]);
      s.box([0.5, 0.05, 0.32], [0, 0.435, 0], wood);
      s.mesh(new RoundedBoxGeometry(0.52, 0.06, 0.34, 3, 0.02), seatMaterial, [0, top - 0.03, 0]);
      if (a.seat !== 'tartan') tuft(top + 0.001, 0.2);
    } else if (a.stool === 'step') {
      top = 0.6; seatR = 0.17;
      const red = seatMaterial;
      for (const x of [-1, 1]) {
        s.rod([x * 0.17, 0, -0.14], [x * 0.17, top - 0.05, -0.14], 0.012, chrome);
        s.rod([x * 0.17, 0, 0.16], [x * 0.17, top - 0.05, 0.1], 0.012, chrome);
        s.rod([x * 0.17, 0.3, -0.14], [x * 0.17, 0.3, 0.12], 0.009, chrome);
        s.rod([x * 0.19, top + 0.02, -0.14], [x * 0.19, top + 0.3, -0.15], 0.012, chrome);
      }
      s.rod([-0.19, top + 0.3, -0.15], [0.19, top + 0.3, -0.15], 0.012, chrome);
      s.box([0.36, 0.03, 0.1], [0, top + 0.12, -0.15], red);
      s.box([0.3, 0.025, 0.2], [0, 0.3, 0.2], red);
      for (const x of [-1, 1]) s.rod([x * 0.15, 0.3, 0.12], [x * 0.15, 0.3, 0.3], 0.009, chrome);
      s.cylinder(seatR, seatR, 0.055, [0, top - 0.0275, 0], red, 28);
      s.ring(seatR, 0.006, [0, top - 0.05, 0], chrome).rotation.x = Math.PI / 2;
    } else {
      top = 0.4; seatR = 0.27;
      const pouffe = s.lathe([[0, 0.01], [0.2, 0.01], [0.27, 0.08], [0.28, 0.2], [0.26, 0.33], [0.18, 0.4], [0, 0.4]], seatMaterial);
      void pouffe;
      s.ring(0.19, 0.015, [0, 0.39, 0], seatMaterial).rotation.x = Math.PI / 2;
      tuft(top + 0.004, 0.14);
    }

    // ---- The whoopee cushion: an oblate pink bladder with a flat neck, printed on top.
    const rubber = new THREE.Color(a.story === 'forgotten' ? '#c48a92' : '#ee7f9c').lerp(new THREE.Color('#9a7a7c'), mood.wear * 0.3);
    const pink = s.material(rubber, { roughness: 0.55 });
    const pinkDark = s.material(rubber.clone().multiplyScalar(0.8), { roughness: 0.6 });
    const faceTexture = canvasTexture(256, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#' + rubber.getHexString(); ctx.beginPath(); ctx.arc(w / 2, h / 2, 120, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(80,20,40,0.7)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(w / 2, h / 2, 104, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(80,20,40,0.85)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 34px sans-serif'; ctx.fillText('WHOOPEE', w / 2, h * 0.36);
      ctx.font = 'bold 22px sans-serif'; ctx.fillText('CUSHION', w / 2, h * 0.5);
      ctx.font = '16px sans-serif'; ctx.fillText('the ORIGINAL', w / 2, h * 0.63);
      // A little puff of stink lines as the logo.
      ctx.strokeStyle = 'rgba(80,20,40,0.8)'; ctx.lineWidth = 3;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(w / 2 + i * 18, h * 0.84); ctx.quadraticCurveTo(w / 2 + i * 18 - 7, h * 0.78, w / 2 + i * 18, h * 0.72); ctx.stroke(); }
    });
    const face = new THREE.MeshStandardMaterial({ map: faceTexture, alphaTest: 0.5, roughness: 0.5, side: THREE.DoubleSide });
    const cushion = new THREE.Group();
    const R = 0.11;
    const puff = a.story === 'sprung' ? 0.02 : mix(0.012, 0.045, a.air) * (a.story === 'forgotten' ? 0.5 : 1);
    const bladder = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14), pink);
    bladder.scale.set(R, puff, R * 0.92);
    bladder.position.y = puff;
    bladder.castShadow = bladder.receiveShadow = true;
    cushion.add(bladder);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R * 0.98, 0.006, 8, 48), pinkDark);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = puff;
    rim.scale.z = 0.92;
    rim.castShadow = true;
    cushion.add(rim);
    const print = new THREE.Mesh(new THREE.CircleGeometry(R * 0.72, 32), face);
    print.rotation.x = -Math.PI / 2;
    print.position.y = puff * 2 + 0.001;
    cushion.add(print);
    // The neck: a flat tongue with a thin slit mouth.
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.004, 0.09), pinkDark);
    neck.position.set(0, 0.004, R * 0.9 + 0.04);
    neck.castShadow = true;
    cushion.add(neck);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.0045, 0.006), s.material('#5a1c2c'));
    mouth.position.set(0, 0.004, R * 0.9 + 0.084);
    cushion.add(mouth);
    s.root.add(cushion);

    // ---- The throw pillow, laid over it or knocked to the floor.
    const pillowTexture = canvasTexture(256, 256, (ctx, w, h) => {
      if (a.pillowStyle === 'knitted') {
        const wools = ['#d94a3a', '#e9c43a', '#3a8a5a', '#5a4ab0', '#e07aa0', '#f2eadc', '#2a7ab0'];
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
          const x = i * 64, y = j * 64;
          for (let ring = 0; ring < 4; ring++) { ctx.fillStyle = pick(wools); ctx.fillRect(x + ring * 8, y + ring * 8, 64 - ring * 16, 64 - ring * 16); }
          ctx.strokeStyle = 'rgba(20,10,10,0.5)'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, 62, 62);
        }
      } else if (a.pillowStyle === 'satin') {
        const base = pick(['#d8b2c8', '#b8c8e8', '#f0e0c0', '#c8e0d0']);
        const sheen = ctx.createLinearGradient(0, 0, w, h); sheen.addColorStop(0, base); sheen.addColorStop(0.5, '#ffffff'); sheen.addColorStop(1, base);
        ctx.fillStyle = sheen; ctx.fillRect(0, 0, w, h);
      } else if (a.pillowStyle === 'patchwork') {
        const shirts = ['#8aa8c8', '#c89a7a', '#7a9a6a', '#d8d0b0', '#a87a8a', '#5a6a8a'];
        for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
          ctx.fillStyle = pick(shirts); ctx.fillRect(i * 43, j * 43, 43, 43);
          if (random() < 0.5) { ctx.fillStyle = 'rgba(255,255,255,0.3)'; for (let k = 0; k < 43; k += 8) ctx.fillRect(i * 43 + k, j * 43, 3, 43); }
        }
        ctx.strokeStyle = 'rgba(30,20,20,0.5)'; ctx.lineWidth = 1.5; for (let i = 0; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(i * 43, 0); ctx.lineTo(i * 43, h); ctx.moveTo(0, i * 43); ctx.lineTo(w, i * 43); ctx.stroke(); }
      } else if (a.pillowStyle === 'velvet') {
        ctx.fillStyle = pick(['#5a2a4a', '#2a4a3a', '#6a3a1a', '#1a2a5a']); ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 3000; i++) { ctx.fillStyle = `rgba(255,255,255,${random() * 0.06})`; ctx.fillRect(random() * w, random() * h, 2, 2); }
      } else {
        ctx.fillStyle = '#f2ead8'; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 14; i++) {
          const x = random() * w, y = random() * h, r = 14 + random() * 10;
          ctx.fillStyle = pick(['#d0506a', '#e8a0b0', '#c87a3a', '#7a4a8a']);
          for (let p = 0; p < 5; p++) { ctx.beginPath(); ctx.ellipse(x + Math.cos(p * 1.257) * r * 0.6, y + Math.sin(p * 1.257) * r * 0.6, r * 0.5, r * 0.5, 0, 0, 7); ctx.fill(); }
          ctx.fillStyle = '#e8c83a'; ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, 7); ctx.fill();
          ctx.fillStyle = '#5a8a4a'; ctx.beginPath(); ctx.ellipse(x + r, y + r, r * 0.7, r * 0.25, 0.7, 0, 7); ctx.fill();
        }
      }
      for (let i = 0; i < mood.wear * 6; i++) { ctx.fillStyle = `rgba(60,40,20,${0.08 + random() * 0.1})`; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 12 + random() * 30, 8 + random() * 20, random() * 3, 0, 7); ctx.fill(); }
    });
    const pillowMaterial = new THREE.MeshStandardMaterial({ map: pillowTexture, roughness: a.pillowStyle === 'satin' ? 0.25 : 0.95, metalness: a.pillowStyle === 'satin' ? 0.15 : 0 });
    const pillow = new THREE.Group();
    const PW = 0.3, PH = 0.085;
    const slab = new THREE.Mesh(new RoundedBoxGeometry(PW, PH, PW, 4, 0.035), pillowMaterial);
    slab.position.y = PH / 2;
    slab.castShadow = slab.receiveShadow = true;
    pillow.add(slab);
    if (a.pillowStyle === 'satin') {
      // A flat ruffled border round the seam, with a scalloped edge painted by its rounded corners.
      const frill = new THREE.Mesh(new RoundedBoxGeometry(PW + 0.07, 0.006, PW + 0.07, 3, 0.003), pillowMaterial);
      frill.position.y = PH / 2;
      frill.castShadow = true;
      pillow.add(frill);
      for (let i = 0; i < 16; i++) {
        const t = i / 16 * Math.PI * 2;
        const wave = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), pillowMaterial);
        wave.position.set(Math.cos(t) * (PW / 2 + 0.03) * (Math.abs(Math.cos(t)) > 0.7 ? 1 / Math.abs(Math.cos(t)) * 0.75 : 1.05), PH / 2, Math.sin(t) * (PW / 2 + 0.03) * (Math.abs(Math.sin(t)) > 0.7 ? 1 / Math.abs(Math.sin(t)) * 0.75 : 1.05));
        wave.scale.set(1, 0.35, 1);
        pillow.add(wave);
      }
    }
    if (a.pillowStyle === 'velvet') {
      const tassel = s.material('#c9a44a', { roughness: 0.8 });
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        const t = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.035, 8), tassel);
        t.position.set(x * PW * 0.52, PH / 2 - 0.01, z * PW * 0.52);
        t.rotation.z = x * 0.8; t.rotation.x = -z * 0.8;
        t.castShadow = true;
        pillow.add(t);
      }
    }

    // ---- Lay it out: the trap set, sprung, stockpiled or forgotten.
    const place = (object: THREE.Object3D, x: number, y: number, z: number, turn: number) => { object.position.set(x, y, z); object.rotation.y = turn; };
    const seatTop = top + (a.stool === 'vanity' || a.stool === 'pouffe' ? 0.004 : 0.002);
    const spin = random() * Math.PI * 2;
    if (a.story === 'sprung') {
      place(cushion, rnd(-0.03, 0.03), seatTop, rnd(-0.03, 0.03), spin);
      const side = random() < 0.5 ? -1 : 1;
      place(pillow, side * (seatR + 0.22), 0, rnd(-0.1, 0.15), rnd(0, 6));
      pillow.rotation.z = side * 0.35;
      pillow.rotation.x = rnd(-0.2, 0.2);
      s.root.add(pillow);
      pillow.updateMatrixWorld(true);
    } else if (a.story === 'forgotten') {
      place(cushion, seatR * 0.45, seatTop, seatR * 0.4, spin);
      cushion.rotation.x = 0.3;
      cushion.rotation.z = -0.25;
      if (a.pillow !== 'bare') { place(pillow, -seatR * 0.2, seatTop - 0.01, -seatR * 0.15, rnd(-0.5, 0.5)); pillow.rotation.x = -0.1; s.root.add(pillow); }
    } else {
      place(cushion, rnd(-0.02, 0.02), seatTop, rnd(-0.02, 0.02), spin);
      if (a.pillow === 'half') { place(pillow, -0.11 + rnd(-0.02, 0.02), seatTop + puff * 1.4, -0.05 + rnd(-0.02, 0.02), rnd(-0.3, 0.3)); pillow.rotation.z = 0.12; pillow.rotation.x = -0.1; s.root.add(pillow); }
      else if (a.pillow === 'covered') { place(pillow, rnd(-0.02, 0.02), seatTop + puff * 1.6, -0.03, rnd(-0.3, 0.3)); s.root.add(pillow); }
      if (a.story === 'stockpile') {
        const spares = 3 + Math.floor(random() * 4);
        for (let i = 0; i < spares; i++) {
          const t = random() * Math.PI * 2, d = seatR + rnd(0.12, 0.3);
          const spare = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10), pink);
          const air = rnd(0.01, 0.045);
          spare.scale.set(R, air, R * 0.92);
          spare.position.set(Math.cos(t) * d, air, Math.sin(t) * d);
          spare.rotation.y = random() * 6;
          spare.castShadow = spare.receiveShadow = true;
          s.root.add(spare);
          const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.004, 0.09), pinkDark);
          tongue.position.set(Math.cos(t) * d + Math.sin(spare.rotation.y) * R * 1.3, 0.004, Math.sin(t) * d + Math.cos(spare.rotation.y) * R * 1.3);
          tongue.rotation.y = spare.rotation.y;
          s.root.add(tongue);
        }
      }
    }

    return s.finish({ footprint: a.story === 'sprung' || a.story === 'stockpile' ? seatR + 0.3 : undefined });
  },
});
