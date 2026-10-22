import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const TRADES = {
  general: 'A general store with a stepped false front: dry goods and groceries.',
  bank: 'A narrow bank with pilasters and a little pediment, built to look like stone.',
  hotel: 'A two-storey hotel with a balcony over the boardwalk and a row of upstairs windows.',
  hardware: 'A hardware and implement dealer with a broad flat parapet.',
  post: 'A small post office with a flagpole and a letter box.',
} as const;
const SIGNS: Record<keyof typeof TRADES, [string, string]> = {
  general: ['GENERAL STORE', 'DRY GOODS · GROCERIES'], bank: ['BANK', 'EST. 1908'], hotel: ['HOTEL', 'ROOMS · MEALS'], hardware: ['HARDWARE', 'IMPLEMENTS & TWINE'], post: ['POST OFFICE', ''],
};
const PAINTS = {
  grey: 'Bare boards weathered silver-grey.',
  white: 'White paint peeling in long curls.',
  ochre: 'Faded mustard ochre with brown trim.',
  red: 'Oxblood red gone pink in the sun.',
  teal: 'Pale blue-green, a once-cheerful colour.',
} as const;
const PAINT_TINT: Record<keyof typeof PAINTS, [string, string, string]> = {
  grey: ['#918a7e', '#5f594f', '#e8e1cf'], white: ['#e3ddcd', '#4f5a55', '#2e2a26'], ochre: ['#c79a45', '#5a4026', '#3a2414'], red: ['#96493c', '#e7dfcb', '#f0e8d4'], teal: ['#7fa69b', '#e9e3d2', '#f0e8d4'],
};
type P = readonly [number, number, number];

export default defineThing({
  questions: {
    trade: choice('What was the building?', TRADES),
    paint: choice('What colour is it?', PAINTS),
    legible: score('How legible is the painted sign?', ['Only a shadow of letters', 'Half gone', 'Faded but readable', 'Still crisp']),
    boarded: choice('How boarded up is it?', {
      one: 'One window boarded, the other still glazed.',
      all: 'Both windows and the door nailed over.',
      broken: 'One boarded, the other smashed with shards in the frame.',
    }),
    window: choice('What remains in the unboarded window?', {
      dressform: 'A headless dress form in a dusty frock.',
      bottles: 'A shelf of coloured glass bottles catching the light.',
      card: 'A hand-lettered card: CLOSED.',
      chair: 'A single rocking chair.',
      cat: 'A cat asleep in the sun.',
      empty: 'Nothing but dust.',
    }),
    lamp: choice('Is there any light?', {
      dark: 'None. Every window is dark.',
      window: 'One lamp burning inside the shop window.',
      upstairs: 'One lit window high up, somebody still lives there.',
      porch: 'A lantern hung by the door.',
    }),
    porch: choice('What shelters the boardwalk?', {
      roof: 'A plank porch roof on turned posts.',
      awning: 'The torn remains of a canvas awning.',
      none: 'Nothing: the boardwalk is open to the sky.',
    }),
    street: choice('What is out front?', {
      bench: 'A bench and a couple of barrels, as if trade might resume.',
      drift: 'Dust drifted deep against the door.',
      tumbleweed: 'Tumbleweeds piled on the boardwalk.',
      rail: 'A hitching rail and a dry water trough.',
      nothing: 'Bare boards.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = Math.min(1, mood.wear + (a.boarded === 'all' ? 0.15 : 0));
    const [wallHex, trimHex, inkHex] = PAINT_TINT[a.paint];
    const bank = a.trade === 'bank', hotel = a.trade === 'hotel';
    const wallTint = new THREE.Color(bank && a.paint === 'grey' ? '#a39d92' : wallHex).lerp(new THREE.Color('#8f887b'), wear * 0.42);
    const W = { general: 7.4, bank: 6, hotel: 8, hardware: 8.4, post: 5.2 }[a.trade];
    const Hb = hotel ? 6.3 : bank ? 4.6 : 3.9;
    const Hf = hotel ? 8 : bank ? 5.9 : a.trade === 'post' ? 5.3 : 6.2;
    const Dp = 6.5, zf = Dp / 2;
    const wallHexNow = `#${wallTint.getHexString()}`;

    const clap = (ctx: CanvasRenderingContext2D, w: number, h: number, rows: number) => {
      ctx.fillStyle = wallHexNow;
      ctx.fillRect(0, 0, w, h);
      const step = h / rows;
      for (let i = 0; i < rows; i++) {
        let x = 0;
        while (x < w) {
          const run = w * (0.12 + random() * 0.4), r = random();
          ctx.fillStyle = r < wear * 0.3 ? `rgba(110,100,88,${0.4 + random() * 0.5})` : `rgba(${r > 0.6 ? '255,255,255' : '0,0,0'},${random() * (0.05 + wear * 0.1)})`;
          ctx.fillRect(x, i * step, run, step);
          x += run;
        }
        ctx.fillStyle = 'rgba(0,0,0,0.26)';
        ctx.fillRect(0, (i + 1) * step - 1.5, w, 1.5);
      }
      if (bank) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let i = 0; i < rows; i += 2) for (let x = (i % 4) * 16; x < w; x += 64) ctx.fillRect(x, i * step, 2, step * 2); }
    };
    const siding = (h: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 256;
      clap(canvas.getContext('2d')!, 256, 256, Math.round(h / 0.2));
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map, roughness: 0.92 });
    };
    const trim = s.material(trimHex);
    const dark = s.material('#1c1a18', { roughness: 1 });
    const timber = s.material('#8d8272');
    const lit = (on: boolean, strength = 1) => s.material(on ? '#f0cf8a' : '#2b3136', { emissive: '#ffc661', emissiveIntensity: on ? mix(1.5, 0.7, Math.sin(mood.daylight * Math.PI)) * strength : 0, roughness: on ? 0.9 : 0.25 });

    // Body, roof and the false front that hides it.
    s.box([W, Hb, Dp], [0, Hb / 2, 0], siding(Hb));
    const ridge = Hb + 1.5;
    const gable = new THREE.Shape([new THREE.Vector2(-W / 2 - 0.2, Hb), new THREE.Vector2(W / 2 + 0.2, Hb), new THREE.Vector2(0, ridge)]);
    const roofTint = new THREE.Color('#4d463e').lerp(new THREE.Color('#8a6a4c'), wear * 0.35);
    s.mesh(new THREE.ExtrudeGeometry(gable, { depth: Dp + 0.3, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: roofTint, roughness: 0.9 }), [0, 0, -Dp / 2 - 0.3]);
    s.cylinder(0.11, 0.11, 1.5, [W * 0.25, ridge, -Dp * 0.25], dark, 8);
    const Wf = W + 0.5;
    s.box([Wf, Hf, 0.18], [0, Hf / 2, zf + 0.02], siding(Hf));
    for (const x of [-1, 1]) s.rod([x * W * 0.3, Hf - 0.5, zf - 0.1], [x * W * 0.3, Hb + 0.4, zf - 2.2], 0.05, timber);

    // Painted face: boards plus the sign.
    const [title, sub] = SIGNS[a.trade];
    const signY = hotel ? 7.05 : (3.45 + Hf) / 2 + (bank ? 0.1 : 0);
    {
      const canvas = document.createElement('canvas');
      canvas.width = 768; canvas.height = Math.round(768 * Hf / Wf);
      const ctx = canvas.getContext('2d')!;
      const cw = canvas.width, chh = canvas.height, px = cw / Wf;
      clap(ctx, cw, chh, Math.round(Hf / 0.2));
      const sy = chh - signY * px;
      const bandH = (hotel ? 1.3 : Math.min(1.9, Hf - 3.7)) * px;
      const alpha = mix(0.22, 1, a.legible) * mix(1, 0.7, wear);
      ctx.globalAlpha = alpha * 0.55;
      ctx.fillStyle = a.paint === 'white' || a.paint === 'ochre' ? '#efe6cc' : '#2b2622';
      ctx.fillRect(cw * 0.06, sy - bandH / 2, cw * 0.88, bandH);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = a.paint === 'white' || a.paint === 'ochre' ? inkHex : '#f0e8d4';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `bold ${Math.min(bandH * (sub ? 0.5 : 0.62), (cw * 1.25) / title.length)}px Georgia, "Times New Roman", serif`;
      ctx.fillText(title, cw / 2, sy - (sub ? bandH * 0.14 : 0), cw * 0.82);
      if (sub) { ctx.font = `${bandH * 0.2}px Georgia, serif`; ctx.fillText(sub, cw / 2, sy + bandH * 0.3, cw * 0.8); }
      ctx.lineWidth = 4; ctx.strokeStyle = ctx.fillStyle;
      ctx.strokeRect(cw * 0.075, sy - bandH / 2 + 8, cw * 0.85, bandH - 16);
      // Old boards show through.
      ctx.globalAlpha = mix(0.7, 0.08, a.legible);
      ctx.fillStyle = wallHexNow;
      for (let i = 0; i < 40; i++) ctx.fillRect(random() * cw, sy - bandH / 2 + random() * bandH, cw * (0.05 + random() * 0.3), 5 + random() * 7);
      ctx.globalAlpha = 1;
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 4;
      s.mesh(new THREE.PlaneGeometry(Wf, Hf), new THREE.MeshStandardMaterial({ map, roughness: 0.92 }), [0, Hf / 2, zf + 0.115]);
    }
    const fz = zf + 0.12;

    // Parapet top by trade.
    s.box([Wf + 0.3, 0.22, 0.42], [0, Hf + 0.06, zf + 0.06], trim);
    for (let i = 0; i < Math.round(Wf / 0.8); i++) s.box([0.12, 0.3, 0.2], [-Wf / 2 + 0.4 + i * ((Wf - 0.8) / (Math.round(Wf / 0.8) - 1)), Hf - 0.2, fz + 0.1], trim);
    if (a.trade === 'general') {
      s.box([Wf * 0.42, 0.9, 0.18], [0, Hf + 0.6, zf + 0.02], siding(0.9));
      s.box([Wf * 0.42 + 0.3, 0.18, 0.4], [0, Hf + 1.1, zf + 0.06], trim);
    } else if (bank) {
      const ped = new THREE.Shape([new THREE.Vector2(-Wf / 2 - 0.1, 0), new THREE.Vector2(Wf / 2 + 0.1, 0), new THREE.Vector2(0, 1.2)]);
      s.mesh(new THREE.ExtrudeGeometry(ped, { depth: 0.3, bevelEnabled: false }), trim, [0, Hf + 0.16, zf - 0.1]);
      for (const x of [-1, -0.42, 0.42, 1]) {
        s.box([0.36, Hf - 0.4, 0.2], [x * (Wf / 2 - 0.3), (Hf - 0.4) / 2, fz + 0.08], trim);
        s.box([0.5, 0.18, 0.3], [x * (Wf / 2 - 0.3), Hf - 0.5, fz + 0.1], trim);
        s.box([0.5, 0.3, 0.3], [x * (Wf / 2 - 0.3), 0.45, fz + 0.1], trim);
      }
    } else if (a.trade === 'post') {
      s.rod([Wf / 2 - 0.5, Hf, zf], [Wf / 2 - 0.5, Hf + 3, zf], 0.04, trim);
      const flag = s.box([1.3, 0.75, 0.02], [Wf / 2 - 0.5 + 0.68, Hf + 2.55, zf], s.material(mood.cheer > 0.45 ? '#b3261d' : '#8d8a84'));
      flag.rotation.z = -0.12 - wear * 0.3;
    }

    // Ground floor: door and two display windows.
    const doorW = 1.05, doorH = 2.25, base = 0.38;
    const winW = Math.min(2.1, (W - doorW) / 2 - 0.75), winH = bank ? 1.9 : 1.55, winY = base + (bank ? 1.75 : 1.6);
    const winX = doorW / 2 + 0.45 + winW / 2;
    const allBoarded = a.boarded === 'all';
    s.box([doorW + 0.24, doorH + 0.6, 0.1], [0, base + (doorH + 0.6) / 2, fz], trim);
    s.box([doorW, doorH, 0.1], [0, base + doorH / 2, fz + 0.03], s.material(new THREE.Color(trimHex).lerp(new THREE.Color('#5a4a3a'), 0.5)));
    s.box([doorW - 0.2, 0.36, 0.1], [0, base + doorH + 0.28, fz + 0.035], lit(a.lamp === 'window', 0.6));
    s.box([doorW * 0.6, 0.8, 0.06], [0, base + 1.55, fz + 0.06], dark);
    s.ball([0.045, 0.045, 0.045], [doorW / 2 - 0.14, base + 1.05, fz + 0.1], s.material('#b89a48', { metalness: 0.5 }), 8);
    const plank = (at: P, length: number, tilt: number) => { const b = s.box([length, 0.2, 0.05], at, timber); b.rotation.z = tilt; return b; };
    if (allBoarded) for (const [y, tilt] of [[0.7, 0.1], [1.4, -0.14], [2.0, 0.06]] as const) plank([0, base + y, fz + 0.12], doorW + 0.6, tilt);
    const openSide = random() > 0.5 ? 1 : -1;
    for (const side of [-1, 1]) {
      const x = side * winX;
      const boardedHere = allBoarded || side !== openSide;
      const lamp = a.lamp === 'window' && !boardedHere;
      s.box([winW + 0.24, winH + 0.24, 0.34], [x, winY, fz + 0.1], trim);
      s.box([winW, winH, 0.3], [x, winY, fz + 0.13], lamp ? lit(true) : dark);
      s.box([winW + 0.4, 0.1, 0.46], [x, winY - winH / 2 - 0.1, fz + 0.14], trim);
      const gz = fz + 0.3;
      if (boardedHere) {
        const n = 5 + Math.floor(random() * 2);
        for (let i = 0; i < n; i++) if (random() > wear * 0.25) plank([x + (random() - 0.5) * 0.1, winY - winH / 2 + (i + 0.5) * (winH / n), gz + 0.02], winW + 0.3 + random() * 0.3, (random() - 0.5) * 0.14);
        if (random() > 0.5) plank([x, winY, gz + 0.07], Math.hypot(winW, winH) * 0.95, Math.atan2(winH, winW));
        continue;
      }
      // The display: things stand on the sill in front of the dark interior.
      const floorY = winY - winH / 2, dz = fz + 0.4;
      if (a.window === 'dressform') {
        s.rod([x, floorY, dz], [x, floorY + 0.5, dz], 0.025, dark);
        s.lathe([[0.3, 0], [0.2, 0.3], [0.13, 0.52], [0.19, 0.74], [0.21, 0.9], [0.08, 1.0], [0.06, 1.06], [0, 1.06]], s.material(mood.cheer > 0.5 ? '#b0527a' : '#7c8794'), [x, floorY + 0.36, dz]).scale.z = 0.7;
      } else if (a.window === 'bottles') {
        s.box([winW * 0.85, 0.04, 0.2], [x, floorY + 0.55, dz], timber);
        const tints = ['#2f7d4f', '#8a4a1c', '#3b6ea3', '#b8a12b', '#7d2f5c', '#9fd0c6'];
        for (let row = 0; row < 2; row++) for (let i = 0; i < 7; i++) {
          if (random() < 0.2) continue;
          const tint = tints[Math.floor(random() * tints.length)], h = 0.22 + random() * 0.2;
          const bx = x + (i - 3) * winW * 0.12, by = floorY + row * 0.57;
          const glassy = s.material(tint, { roughness: 0.15, emissive: tint, emissiveIntensity: 0.35 });
          s.cylinder(0.06, 0.06, h, [bx, by + h / 2 + (row ? 0.02 : 0), dz], glassy, 8);
          s.cylinder(0.022, 0.035, 0.12, [bx, by + h + 0.06 + (row ? 0.02 : 0), dz], glassy, 8);
        }
      } else if (a.window === 'card') {
        s.label('CLOSED', winW * 0.62, winH * 0.3, [x, winY + 0.05, dz], '#8c2a20', '#efe6cc').rotation.z = (random() - 0.5) * 0.25;
      } else if (a.window === 'chair') {
        const cane = s.material('#7a5a3a');
        s.box([0.5, 0.05, 0.3], [x, floorY + 0.45, dz], cane);
        s.box([0.5, 0.7, 0.04], [x, floorY + 0.85, dz - 0.12], cane).rotation.x = -0.15;
        for (const sx of [-1, 1]) {
          s.rod([x + sx * 0.23, floorY + 0.05, dz], [x + sx * 0.23, floorY + 0.72, dz], 0.025, cane);
          s.ring(0.5, 0.02, [x + sx * 0.25, floorY + 0.52, dz], cane, 0.9).rotation.set(0, Math.PI / 2, -Math.PI / 2 - 0.45);
        }
      } else if (a.window === 'cat') {
        const fur = s.material(random() > 0.5 ? '#d08a3c' : '#4a4640');
        s.ball([0.3, 0.14, 0.16], [x, floorY + 0.14, dz], fur, 12);
        s.ball([0.11, 0.1, 0.11], [x + 0.27, floorY + 0.14, dz + 0.05], fur, 10);
        for (const e of [-1, 1]) s.mesh(new THREE.ConeGeometry(0.035, 0.08, 4), fur, [x + 0.27 + e * 0.05, floorY + 0.26, dz + 0.05]);
        s.tube([[x - 0.26, floorY + 0.1, dz], [x - 0.36, floorY + 0.06, dz + 0.12], [x - 0.1, floorY + 0.05, dz + 0.18]], 0.03, fur);
      }
      const broken = a.boarded === 'broken';
      for (const mx of [-1 / 6, 1 / 6]) s.box([0.045, winH, 0.05], [x + mx * winW, winY, gz + 0.04], trim);
      if (broken) {
        const shard = new THREE.MeshStandardMaterial({ color: '#cfe2e6', roughness: 0.1, side: THREE.DoubleSide });
        for (let i = 0; i < 7; i++) {
          const edge = Math.floor(random() * 3);
          const tri = new THREE.Shape([new THREE.Vector2(-0.15 - random() * 0.2, 0), new THREE.Vector2(0.15 + random() * 0.2, 0), new THREE.Vector2((random() - 0.5) * 0.3, 0.25 + random() * 0.4)]);
          const m = s.mesh(new THREE.ShapeGeometry(tri), shard, [x + (random() - 0.5) * winW * 0.8, edge === 0 ? floorY : edge === 1 ? winY + winH / 2 : winY + (random() - 0.5) * winH, gz + 0.03]);
          m.rotation.z = edge === 0 ? 0 : edge === 1 ? Math.PI : (random() > 0.5 ? 1 : -1) * Math.PI / 2;
          if (edge === 2) m.position.x = x + (m.rotation.z > 0 ? 1 : -1) * winW / 2;
        }
      } else {
        const pane = new THREE.MeshStandardMaterial({ color: '#d6e6ea', transparent: true, opacity: 0.14, roughness: 0.05, depthWrite: false });
        s.box([winW, winH, 0.02], [x, winY, gz + 0.03], pane).castShadow = false;
      }
    }
    // Upper windows.
    const upper: number[] = hotel ? [-W * 0.3, 0, W * 0.3] : a.lamp === 'upstairs' && !bank ? [0] : [];
    const litIndex = Math.floor(random() * upper.length);
    upper.forEach((ux, index) => {
      const uy = hotel ? 4.95 : Hb - 0.15, uw = hotel ? 0.95 : 0.8, uh = hotel ? 1.5 : 0.8;
      const y = hotel ? uy : Math.min(uy, signY - 1.3 > 3.4 ? uy : uy);
      const on = a.lamp === 'upstairs' && index === litIndex;
      if (!hotel) return void (s.box([uw + 0.16, uh + 0.16, 0.06], [W / 2 + 0.01, y - 0.6, 0.8], trim).rotation.y = Math.PI / 2, s.box([uw, uh, 0.07], [W / 2 + 0.02, y - 0.6, 0.8], lit(on)).rotation.y = Math.PI / 2);
      s.box([uw + 0.2, uh + 0.2, 0.08], [ux, y, fz + 0.02], trim);
      s.box([uw, uh, 0.09], [ux, y, fz + 0.03], lit(on));
      s.box([uw, 0.05, 0.1], [ux, y, fz + 0.04], trim);
      if (!on && random() < 0.3 + wear * 0.5) for (let i = 0; i < 3; i++) plank([ux, y - uh / 2 + 0.3 + i * 0.45, fz + 0.1], uw + 0.4, (random() - 0.5) * 0.2);
    });
    if (a.lamp === 'upstairs' && bank) { s.box([0.9, 0.9, 0.06], [W / 2 + 0.01, 3.2, 0.8], trim).rotation.y = Math.PI / 2; s.box([0.75, 0.75, 0.07], [W / 2 + 0.02, 3.2, 0.8], lit(true)).rotation.y = Math.PI / 2; }

    // Boardwalk.
    const bwD = 1.9, bwW = Wf + 1.2, bz = zf + 0.1 + bwD / 2;
    s.box([bwW, base - 0.08, bwD - 0.1], [0, (base - 0.08) / 2, bz], s.material('#5d554a'));
    const n = Math.round(bwW / 0.34);
    for (let i = 0; i < n; i++) {
      if (random() < wear * 0.1) continue;
      const tone = new THREE.Color('#9d9282').multiplyScalar(0.8 + random() * 0.3);
      const b = s.box([bwW / n - 0.03, 0.07, bwD], [-bwW / 2 + (i + 0.5) * (bwW / n), base - 0.035 + (random() - 0.5) * wear * 0.05, bz + (random() - 0.5) * 0.08], s.material(tone));
      b.rotation.x = (random() - 0.5) * wear * 0.04;
    }
    s.box([2.2, 0.16, 0.4], [0, 0.1, bz + bwD / 2 + 0.2], timber);

    // Shelter.
    const postXs = [-bwW / 2 + 0.2, -bwW / 6, bwW / 6, bwW / 2 - 0.2];
    const frontZ = bz + bwD / 2 - 0.15;
    if (hotel) {
      const by = 3.5;
      s.box([bwW, 0.14, bwD], [0, by, bz], timber);
      for (const x of postXs) s.box([0.14, by - base, 0.14], [x, (by + base) / 2, frontZ], trim);
      s.box([bwW, 0.07, 0.07], [0, by + 0.95, frontZ], trim);
      for (let i = 0; i <= Math.round(bwW / 0.25); i++) if (random() > wear * 0.3) s.box([0.04, 0.9, 0.04], [-bwW / 2 + i * 0.25, by + 0.5, frontZ], trim);
      for (const x of [-1, 1]) { s.box([0.07, 0.07, bwD], [x * (bwW / 2 - 0.04), by + 0.95, bz], trim); s.box([0.1, 1.0, 0.1], [x * (bwW / 2 - 0.05), by + 0.5, frontZ], trim); }
    } else if (a.porch === 'roof') {
      const py = bank ? 3.55 : 3.35;
      const slab = s.box([bwW, 0.08, bwD + 0.35], [0, py - 0.14, bz + 0.1], new THREE.MeshStandardMaterial({ color: roofTint, roughness: 0.9 }));
      slab.rotation.x = 0.16;
      if (wear > 0.6) slab.rotation.z = (random() - 0.5) * 0.06;
      for (const x of postXs) s.cylinder(0.065, 0.08, py - base - 0.3, [x, (py - 0.3 + base) / 2, frontZ], trim, 8);
      s.box([bwW, 0.12, 0.1], [0, py - 0.3, frontZ], trim);
    } else if (a.porch === 'awning') {
      const canvasTint = s.material(mood.cheer > 0.5 ? '#b5483a' : '#7d7a6c', { side: THREE.DoubleSide });
      const py = 3.4;
      for (const x of [-1, 1]) s.rod([x * (W / 2 - 0.3), py, fz], [x * (W / 2 - 0.3), py - 0.5, fz + 1.5], 0.025, dark);
      s.rod([-(W / 2 - 0.3), py - 0.5, fz + 1.5], [W / 2 - 0.3, py - 0.5, fz + 1.5], 0.025, dark);
      const strips = 7;
      for (let i = 0; i < strips; i++) {
        if (random() < 0.3 + wear * 0.3) continue;
        const sw = (W - 0.6) / strips, reach = 0.5 + random() * 1.08;
        const strip = s.box([sw - 0.03, 0.02, reach], [-(W / 2 - 0.3) + (i + 0.5) * sw, py - reach * 0.165, fz + reach / 2], canvasTint);
        strip.rotation.x = 0.33;
      }
    }

    // Lantern, and what is left out front.
    if (a.lamp === 'porch') {
      const lx = doorW / 2 + 0.3;
      s.rod([lx, base + 2.5, fz], [lx, base + 2.5, fz + 0.4], 0.02, dark);
      s.rod([lx, base + 2.5, fz + 0.4], [lx, base + 2.3, fz + 0.4], 0.01, dark);
      s.cylinder(0.09, 0.11, 0.24, [lx, base + 2.17, fz + 0.4], s.material('#ffe2a0', { emissive: '#ffc35a', emissiveIntensity: 2.4 }), 8);
      s.mesh(new THREE.ConeGeometry(0.14, 0.1, 8), dark, [lx, base + 2.33, fz + 0.4]);
    }
    const top = base;
    if (a.street === 'bench') {
      const bx = -winX;
      s.box([1.5, 0.06, 0.4], [bx, top + 0.45, fz + 0.75], timber);
      s.box([1.5, 0.4, 0.05], [bx, top + 0.75, fz + 0.56], timber);
      for (const x of [-0.65, 0.65]) s.box([0.06, 0.45, 0.36], [bx + x, top + 0.22, fz + 0.75], timber);
      for (let i = 0; i < 2; i++) {
        const x = winX + 0.4 + i * 0.75;
        s.lathe([[0.26, 0], [0.33, 0.4], [0.26, 0.8], [0, 0.8]], s.material('#7a5a3a'), [x, top, fz + 0.75 + i * 0.3]);
        for (const y of [0.15, 0.65]) s.ring(0.3, 0.015, [x, top + y, fz + 0.75 + i * 0.3], dark).rotation.x = Math.PI / 2;
      }
    } else if (a.street === 'drift') {
      const sand = s.material('#c9b48a', { roughness: 1 });
      s.ball([2.4, 0.75, 1.1], [0.3, top - 0.05, fz + 0.5], sand, 16);
      s.ball([1.6, 0.5, 0.9], [-winX, top - 0.05, fz + 0.5], sand, 14);
      s.ball([3.2, 0.5, 1.6], [winX * 0.6, -0.05, bz + bwD / 2 + 0.3], sand, 14);
    } else if (a.street === 'tumbleweed') {
      const weed = s.material('#a68c57');
      for (let k = 0; k < 4; k++) {
        const r = 0.35 + random() * 0.35, cx = (random() - 0.5) * (W - 1), cz = fz + 0.4 + random() * 1.1;
        for (let i = 0; i < 7; i++) s.ring(r, 0.016, [cx, top + r, cz], weed).rotation.set(random() * 3.1, random() * 3.1, random() * 3.1);
      }
    } else if (a.street === 'rail') {
      const rz = bz + bwD / 2 + 1.0;
      for (const x of [-1.6, 0, 1.6]) s.cylinder(0.07, 0.08, 1.1, [x - winX * 0.5, 0.55, rz], timber, 8);
      s.rod([-1.9 - winX * 0.5, 1.0, rz], [1.9 - winX * 0.5, 1.0, rz], 0.05, timber);
      s.box([1.8, 0.45, 0.6], [winX * 0.9, 0.24, rz], timber);
      s.box([1.6, 0.3, 0.42], [winX * 0.9, 0.34, rz], dark);
    }
    if (a.trade === 'post') { s.box([0.4, 0.55, 0.3], [-doorW / 2 - 0.45, base + 1.2, fz + 0.2], s.material('#a52a22')); s.box([0.26, 0.03, 0.02], [-doorW / 2 - 0.45, base + 1.32, fz + 0.36], dark); }
    if (wear > 0.5) {
      const blades = Array.from({ length: 90 }, () => { const size = 0.3 + random() * 0.6; const frontSide = random() > 0.5; return { at: [frontSide ? (random() - 0.5) * (bwW + 1) : (random() > 0.5 ? 1 : -1) * (W / 2 + 0.2 + random() * 0.5), 0.5 * size, frontSide ? bz + bwD / 2 + 0.15 + random() * 0.6 : (random() - 0.5) * Dp] as P, size, color: random() > 0.4 ? '#b9a865' : '#8f8a50' }; });
      s.scatter(new THREE.ConeGeometry(0.05, 1.0, 4), new THREE.MeshStandardMaterial({ roughness: 1 }), blades);
    }
    return s.finish();
  },
});
