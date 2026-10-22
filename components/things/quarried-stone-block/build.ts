import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const STONES = {
  white: 'Pure white statuary marble, almost unveined, sugar-bright in the sun.',
  veined: 'White marble run through with bold grey and gold veins.',
  granite: 'Speckled pink-grey granite, hard and coarse.',
  sandstone: 'Warm ochre sandstone with soft horizontal bedding bands.',
  slate: 'Dark blue-grey slate with fine cleavage lines.',
  travertine: 'Honey-cream travertine, pitted and banded like old Rome.',
} as const;
type Stone = keyof typeof STONES;
const TONE: Record<Stone, { base: string; dark: string; vein: string; ink: string }> = {
  white: { base: '#eeece4', dark: '#c9c8c0', vein: '#b9bcc0', ink: '#b8261c' },
  veined: { base: '#e6e4dc', dark: '#bfbeb8', vein: '#6f757c', ink: '#b8261c' },
  granite: { base: '#b9a6a0', dark: '#8e7f7b', vein: '#3c3836', ink: '#f2e9c8' },
  sandstone: { base: '#cfa468', dark: '#a37a45', vein: '#9a6a36', ink: '#27303a' },
  slate: { base: '#4d5863', dark: '#343c45', vein: '#2a3037', ink: '#f0e7c6' },
  travertine: { base: '#d9c49a', dark: '#b09a70', vein: '#a58a5c', ink: '#8c2218' },
};

const DESTINATIONS = {
  rome: 'ROMA: bound for a monument in the capital.',
  studio: 'A sculptor has reserved it: a name and STUDIO.',
  export: 'EXPORT NEW YORK, stencilled for the docks.',
  cathedral: 'DUOMO: stone for a cathedral that has been building for centuries.',
  slabs: 'LASTRE: to be sliced into kitchen worktops and hotel lobbies.',
  rejected: 'SCARTO: rejected, crossed out, going nowhere.',
  none: 'No destination at all, only the lot number.',
} as const;
const DEST_TEXT: Record<keyof typeof DESTINATIONS, string> = {
  rome: 'ROMA', studio: 'STUDIO R.', export: 'NEW YORK', cathedral: 'DUOMO', slabs: 'LASTRE', rejected: 'SCARTO', none: '',
};

export default defineThing({
  questions: {
    stone: choice('What stone is it?', STONES),
    size: score('How big is the block?', ['A squat cube the size of a small car', 'The size of a van', 'A long monolith the size of a bus']),
    marking: choice('How is the lot number marked on it?', {
      brush: 'Dripping red numerals slapped on with a brush.',
      stencil: 'Neat stencilled letters and a quarry monogram in a box.',
      crayon: 'A quick scrawl in blue wax crayon with an arrow.',
      chiselled: 'Initials and a number chiselled in and blackened, the old way.',
      bare: 'No markings at all, anonymous stone.',
    }),
    destination: choice('Where is it going?', DESTINATIONS),
    soundness: choice('Is the block sound?', {
      sound: 'Perfectly sound, sharp arrises, a prize block.',
      hairline: 'A dark hairline crack wanders across one face and over the top.',
      spalled: 'One corner has spalled off and lies beside it.',
      split: 'It has split clean in two along a hidden flaw and the halves have settled apart.',
    }),
    resting: choice('What is happening to it right now?', {
      chocks: 'Waiting on timber sleepers with wedges knocked in.',
      slung: 'Wire rope slings are round it and gathered to a ring, ready to lift.',
      sledge: 'Lashed to a wooden sledge on soaped log rollers, the old way down the mountain.',
      splitting: 'A row of steel wedges is driven along the top to split it, a sledgehammer left leaning.',
      forgotten: 'Forgotten for decades: sunk at one end, grass and moss creeping up it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tone = TONE[a.stone];
    const L = mix(2.0, 4.6, a.size) * mix(0.94, 1.06, random());
    const H = mix(1.75, 1.55, a.size) * mix(0.92, 1.08, random());
    const D = mix(1.7, 1.5, a.size) * mix(0.92, 1.08, random());
    const forgotten = a.resting === 'forgotten';
    const grime = Math.min(1, mood.wear + (forgotten ? 0.45 : 0));
    const lot = `${'ABCDFGLMPRS'[Math.floor(random() * 11)]} ${100 + Math.floor(random() * 899)}`;
    const textures: THREE.Texture[] = [];

    const paint = (w: number, h: number, extra?: (ctx: CanvasRenderingContext2D, cw: number, ch: number) => void, rough = false) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = Math.max(96, Math.min(512, Math.round(512 * h / w)));
      const ctx = canvas.getContext('2d')!;
      const cw = canvas.width, ch = canvas.height;
      ctx.fillStyle = rough ? tone.dark : tone.base;
      ctx.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 60; i++) {
        ctx.globalAlpha = 0.05 + random() * 0.07;
        ctx.fillStyle = random() < 0.5 ? tone.dark : '#ffffff';
        ctx.beginPath();
        ctx.ellipse(random() * cw, random() * ch, 20 + random() * 70, 8 + random() * 30, random() * 3, 0, 7);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (a.stone === 'granite') {
        for (let i = 0; i < 2600; i++) {
          ctx.fillStyle = ['#3c3836', '#e8ddd6', '#7d6a66', '#c98f86'][Math.floor(random() * 4)];
          ctx.globalAlpha = 0.75;
          ctx.fillRect(random() * cw, random() * ch, 1.5 + random() * 3, 1.5 + random() * 3);
        }
      } else if (a.stone === 'sandstone' || a.stone === 'slate' || a.stone === 'travertine') {
        const bands = a.stone === 'slate' ? 26 : 12;
        for (let i = 0; i < bands; i++) {
          const y = random() * ch;
          ctx.globalAlpha = a.stone === 'slate' ? 0.5 : 0.35;
          ctx.strokeStyle = random() < 0.7 ? tone.vein : '#fff4d8';
          ctx.lineWidth = a.stone === 'slate' ? 1 + random() * 1.5 : 2 + random() * 9;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.bezierCurveTo(cw * 0.3, y + (random() - 0.5) * 16, cw * 0.7, y + (random() - 0.5) * 16, cw, y + (random() - 0.5) * 10);
          ctx.stroke();
        }
        if (a.stone === 'travertine')
          for (let i = 0; i < 160; i++) {
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = '#7d6843';
            ctx.beginPath();
            ctx.ellipse(random() * cw, random() * ch, 2 + random() * 7, 1 + random() * 2, 0, 0, 7);
            ctx.fill();
          }
      } else {
        const veins = a.stone === 'veined' ? 9 : 3;
        for (let i = 0; i < veins; i++) {
          let x = random() * cw, y = random() < 0.5 ? 0 : random() * ch;
          const dir = 0.4 + random() * 0.9;
          ctx.globalAlpha = a.stone === 'veined' ? 0.5 + random() * 0.4 : 0.3;
          ctx.strokeStyle = a.stone === 'veined' && random() < 0.25 ? '#b08a48' : tone.vein;
          ctx.lineWidth = a.stone === 'veined' ? 1.5 + random() * 5 : 1.5;
          ctx.beginPath();
          ctx.moveTo(x, y);
          for (let k = 0; k < 14; k++) {
            x += (random() - 0.35) * 70;
            y += dir * 30 * (0.4 + random());
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
      // Rain streaks and lichen in proportion to wear.
      for (let i = 0; i < grime * 26; i++) {
        const x = random() * cw;
        const gradient = ctx.createLinearGradient(0, 0, 0, ch * (0.3 + random() * 0.7));
        gradient.addColorStop(0, random() < 0.3 ? '#6c5a2c' : '#4a4a44');
        gradient.addColorStop(1, 'rgba(70,70,60,0)');
        ctx.globalAlpha = 0.16 + grime * 0.22;
        ctx.fillStyle = gradient;
        ctx.fillRect(x, 0, 5 + random() * 22, ch);
      }
      ctx.globalAlpha = 1;
      extra?.(ctx, cw, ch);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      textures.push(texture);
      return new THREE.MeshStandardMaterial({ map: texture, roughness: mix(0.55, 0.92, grime) });
    };

    const markings = (ctx: CanvasRenderingContext2D, cw: number, ch: number) => {
      const dest = DEST_TEXT[a.destination];
      if (a.marking === 'bare' && !dest) return;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const big = Math.min(ch * 0.4, cw * 0.2);
      ctx.globalAlpha = mix(0.95, 0.6, grime);
      if (a.marking === 'brush') {
        ctx.fillStyle = tone.ink;
        ctx.font = `bold ${big}px sans-serif`;
        ctx.save();
        ctx.translate(cw * 0.5, ch * 0.52);
        ctx.rotate((random() - 0.5) * 0.12);
        ctx.fillText(lot, 0, 0, cw * 0.8);
        ctx.restore();
        for (let i = 0; i < 9; i++) ctx.fillRect(cw * (0.2 + random() * 0.6), ch * 0.6, 3 + random() * 3, ch * (0.1 + random() * 0.25));
      } else if (a.marking === 'stencil') {
        ctx.fillStyle = ctx.strokeStyle = a.stone === 'slate' || a.stone === 'granite' ? tone.ink : '#1f2a33';
        ctx.font = `bold ${big * 0.8}px monospace`;
        ctx.fillText(lot, cw * 0.56, ch * 0.5, cw * 0.6);
        ctx.lineWidth = 6;
        ctx.strokeRect(cw * 0.08, ch * 0.34, ch * 0.32, ch * 0.32);
        ctx.font = `bold ${ch * 0.2}px monospace`;
        ctx.fillText('CM', cw * 0.08 + ch * 0.16, ch * 0.51);
      } else if (a.marking === 'crayon') {
        ctx.strokeStyle = ctx.fillStyle = a.stone === 'slate' ? '#bfe0ff' : '#2456b8';
        ctx.font = `italic ${big * 0.8}px serif`;
        ctx.save();
        ctx.translate(cw * 0.45, ch * 0.5);
        ctx.rotate(-0.1);
        ctx.fillText(lot, 0, 0, cw * 0.6);
        ctx.restore();
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(cw * 0.72, ch * 0.62); ctx.lineTo(cw * 0.9, ch * 0.3);
        ctx.lineTo(cw * 0.82, ch * 0.34); ctx.moveTo(cw * 0.9, ch * 0.3); ctx.lineTo(cw * 0.9, ch * 0.44);
        ctx.stroke();
      } else if (a.marking === 'chiselled') {
        ctx.fillStyle = '#22211f';
        ctx.font = `${big * 0.75}px serif`;
        ctx.fillText(lot.replace(' ', ' · '), cw * 0.5, ch * 0.5, cw * 0.7);
        ctx.fillRect(cw * 0.25, ch * 0.68, cw * 0.5, 4);
      }
      if (dest) {
        ctx.fillStyle = a.destination === 'rejected' ? '#b8261c' : a.stone === 'slate' || a.stone === 'granite' ? '#f2e9c8' : '#1f2a33';
        ctx.font = `bold ${big * 0.5}px monospace`;
        ctx.fillText(dest, cw * 0.5, ch * (a.marking === 'bare' ? 0.5 : 0.84), cw * 0.7);
        if (a.destination === 'rejected') {
          ctx.strokeStyle = '#b8261c';
          ctx.lineWidth = 16;
          ctx.beginPath();
          ctx.moveTo(cw * 0.12, ch * 0.14); ctx.lineTo(cw * 0.88, ch * 0.88);
          ctx.moveTo(cw * 0.88, ch * 0.14); ctx.lineTo(cw * 0.12, ch * 0.88);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };

    const fluteMat = s.material(tone.base, { roughness: 0.9 });
    const roughMat = s.material(tone.dark, { roughness: 1 });
    /** A strip of half-round drill flutes, standing height h, outward face toward +z. */
    const flutes = (length: number, h: number) => {
      const t = 0.07, r = 0.055, pitch = 0.17;
      const n = Math.max(2, Math.floor(length / pitch));
      const shape = new THREE.Shape();
      shape.moveTo(-length / 2, 0);
      shape.lineTo(length / 2, 0);
      shape.lineTo(length / 2, t);
      for (let i = n - 1; i >= 0; i--) {
        const cx = (i - (n - 1) / 2) * (length / n);
        shape.lineTo(cx + r, t);
        shape.absarc(cx, t, r, 0, -Math.PI, true);
      }
      shape.lineTo(-length / 2, t);
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 5 });
      geometry.rotateX(-Math.PI / 2);
      geometry.rotateY(Math.PI);
      return geometry;
    };

    const piece = (len: number, leftEnd: boolean, rightEnd: boolean, marked: boolean) => {
      const group = new THREE.Group();
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], x: number, y: number, z: number, ry = 0) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.rotation.y = ry;
        mesh.castShadow = mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
      };
      const side = paint(D, H);
      const body = [
        rightEnd ? side : roughMat, leftEnd ? side : roughMat,
        paint(len, D), roughMat,
        paint(len, H, marked ? markings : undefined), paint(len, H),
      ];
      add(new THREE.BoxGeometry(len, H, D), body, 0, H / 2, 0);
      // Line-drilled faces: the back, the true ends, and a band along the top of the sawn front.
      add(flutes(len, H), fluteMat, 0, 0, -D / 2, Math.PI);
      add(flutes(len, 0.26), fluteMat, 0, H - 0.26, D / 2);
      if (rightEnd) add(flutes(D, H), fluteMat, len / 2, 0, 0, Math.PI / 2);
      if (leftEnd) add(flutes(D, H), fluteMat, -len / 2, 0, 0, -Math.PI / 2);
      s.root.add(group);
      return group;
    };

    const lift = a.resting === 'sledge' ? 0.5 : forgotten ? 0.06 : 0.24;
    const pieces: THREE.Group[] = [];
    if (a.soundness === 'split') {
      const cut = mix(0.42, 0.6, random());
      const left = piece(L * cut, true, false, true), right = piece(L * (1 - cut), false, true, false);
      left.position.set(-L / 2 + (L * cut) / 2 - 0.07, lift, 0);
      right.position.set(L / 2 - (L * (1 - cut)) / 2 + 0.09, lift - 0.03, 0.06);
      right.rotation.set(0.02, -0.05, -0.045);
      pieces.push(left, right);
    } else {
      const whole = piece(L, true, true, true);
      whole.position.y = lift;
      pieces.push(whole);
    }
    if (forgotten) for (const p of pieces) { p.rotation.z += 0.06; p.position.y -= 0.02; }

    const crackMat = new THREE.MeshStandardMaterial({ color: '#1d1c1a', roughness: 1 });
    if (a.soundness === 'hairline' || a.soundness === 'spalled') {
      // The crack runs up the front face and over the top.
      const x0 = a.soundness === 'spalled' ? L / 2 - 0.75 : (random() - 0.5) * L * 0.5;
      let x = x0, y = lift + 0.05;
      const points: [number, number, number][] = [];
      while (y < lift + H) { points.push([x, y, D / 2 + 0.012]); x += (random() - 0.45) * 0.16; y += 0.12 + random() * 0.12; }
      points.push([x, lift + H + 0.012, D / 2]);
      for (let z = D / 2 - 0.15; z > -D / 2; z -= 0.2) { x += (random() - 0.45) * 0.14; points.push([x, lift + H + 0.012, z]); }
      for (let i = 1; i < points.length; i++) s.rod(points[i - 1], points[i], 0.014, crackMat);
    }
    if (a.soundness === 'spalled') {
      const notch = s.mesh(new THREE.DodecahedronGeometry(0.42, 0), roughMat, [L / 2 - 0.05, lift + H - 0.05, D / 2 - 0.05]);
      notch.scale.set(1, 0.8, 1);
      const chunk = s.mesh(new THREE.DodecahedronGeometry(0.4, 0), s.material(tone.base, { roughness: 0.95, flatShading: true }), [L / 2 + 0.55, 0.2, D / 2 + 0.3]);
      chunk.rotation.set(random() * 3, random() * 3, random() * 3);
      chunk.scale.set(1.1, 0.6, 0.8);
      for (let i = 0; i < 5; i++) s.mesh(new THREE.DodecahedronGeometry(0.07 + random() * 0.08, 0), roughMat, [L / 2 + 0.2 + random() * 0.8, 0.05, D / 2 + random() * 0.7]);
    }

    const timber = s.material('#8a623c', { roughness: 0.9 });
    const timberDark = s.material('#5d4127', { roughness: 0.95 });
    const steel = s.material('#4c5257', { metalness: 0.6, roughness: 0.45 });
    if (a.resting === 'sledge') {
      // The lizza: two runners, cross ties, soaped rollers ahead and hemp lashings.
      for (const z of [-D / 2 + 0.15, D / 2 - 0.15]) s.box([L + 1.1, 0.2, 0.22], [0, 0.4, z], timber);
      for (let i = 0; i < 4; i++) s.box([0.16, 0.12, D + 0.2], [(i - 1.5) * (L / 3.4), 0.34, 0], timberDark);
      for (let i = 0; i < 4; i++) s.cylinder(0.14, 0.14, D + 0.9, [-L / 2 - 0.2 + i * (L + 1.6) / 3 + (random() - 0.5) * 0.3, 0.14, 0], s.material('#b89a66'), 12).rotation.x = Math.PI / 2;
      const rope = s.material('#b7a070', { roughness: 1 });
      for (const x of [-L * 0.28, L * 0.28]) {
        s.box([0.06, H + 0.04, 0.03], [x, lift + H / 2, D / 2 + 0.02], rope);
        s.box([0.06, H + 0.04, 0.03], [x, lift + H / 2, -D / 2 - 0.09], rope);
        s.box([0.06, 0.03, D + 0.12], [x, lift + H + 0.015, -0.03], rope);
      }
    } else if (!forgotten) {
      const n = a.soundness === 'split' ? 4 : L > 3.4 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * (L * 0.8 / Math.max(1, n - 1)) + (random() - 0.5) * 0.12;
        const sleeper = s.box([0.26, 0.24, D + 0.5 + random() * 0.3], [x, 0.12, (random() - 0.5) * 0.15], i % 2 ? timber : timberDark);
        sleeper.rotation.y = (random() - 0.5) * 0.12;
        // Wedges knocked in at the front.
        const wedge = s.mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.22, 3), timber, [x + 0.3, 0.09, D / 2 + 0.02]);
        wedge.rotation.set(Math.PI / 2, 0, 0.5);
        wedge.scale.set(1, 1, 0.7);
      }
    } else {
      const moss = s.material('#5f7a3a', { roughness: 1 });
      const tufts: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 46; i++) {
        const side = random() < 0.5;
        const x = side ? (random() - 0.5) * (L + 0.5) : (random() < 0.5 ? -1 : 1) * (L / 2 + 0.1 + random() * 0.2);
        const z = side ? (random() < 0.5 ? -1 : 1) * (D / 2 + 0.08 + random() * 0.2) : (random() - 0.5) * (D + 0.4);
        tufts.push({ at: [x, 0.02, z], size: 0.12 + random() * 0.3, color: ['#6f8a3c', '#8a9a48', '#55702f', '#a39f52'][Math.floor(random() * 4)] });
      }
      const blade = new THREE.ConeGeometry(0.35, 1, 5);
      blade.translate(0, 0.5, 0);
      s.scatter(blade, s.material('#ffffff', { roughness: 1 }), tufts);
      for (let i = 0; i < 9; i++) s.ball([0.18 + random() * 0.3, 0.035, 0.14 + random() * 0.25], [(random() - 0.5) * L * 0.85, lift + H + 0.02 + (random() - 0.5) * 0.0, (random() - 0.5) * D * 0.8], moss, 10).rotation.z = 0.06;
      s.box([0.24, 0.2, D + 0.4], [L * 0.3, 0.03, 0], timberDark).rotation.z = 0.2;
    }

    if (a.resting === 'slung') {
      const wire = s.material('#3a3f44', { metalness: 0.7, roughness: 0.4 });
      const top = lift + H, apex: [number, number, number] = [0, top + mix(1.0, 1.5, a.size), 0];
      for (const x of [-L * 0.3, L * 0.3]) {
        for (const z of [-1, 1]) {
          s.rod([x, lift - 0.03, z * (D / 2 + 0.03)], [x, top + 0.02, z * (D / 2 + 0.03)], 0.022, wire);
          s.rod([x, top + 0.02, z * (D / 2 + 0.03)], apex, 0.022, wire);
          s.box([0.2, 0.05, 0.2], [x, top - 0.01, z * (D / 2 - 0.06)], timber);
        }
        s.rod([x, lift - 0.03, -D / 2 - 0.03], [x, lift - 0.03, D / 2 + 0.03], 0.022, wire);
      }
      const ring = s.ring(0.16, 0.035, [apex[0], apex[1] + 0.14, apex[2]], steel);
      ring.rotation.y = Math.PI / 2;
      // The crane's hook block comes down to meet the ring.
      s.box([0.34, 0.5, 0.2], [0, apex[1] + 0.72, 0], s.material('#d0a21e', { metalness: 0.3 }));
      s.ring(0.14, 0.04, [0, apex[1] + 0.38, 0], steel, Math.PI * 1.4).rotation.z = -Math.PI * 0.7;
      s.rod([0, apex[1] + 0.97, 0], [0, apex[1] + 1.7, 0], 0.03, wire);
    }
    if (a.resting === 'splitting') {
      const n = Math.floor(L / 0.3);
      const x0 = (random() - 0.5) * 0.2;
      for (let i = 0; i < n; i++) {
        const z = D / 2 - 0.2 - i * ((D - 0.4) / Math.max(1, n - 1));
        const wedge = s.box([0.07, 0.16 + random() * 0.08, 0.05], [x0, lift + H + 0.05, z], steel);
        wedge.rotation.y = (random() - 0.5) * 0.3;
      }
      s.box([0.02, 0.006, D], [x0, lift + H + 0.004, 0], crackMat);
      const hammer = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.0, 8), timber);
      shaft.position.y = 0.5;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.11, 0.11), steel);
      head.position.y = 0.06;
      hammer.add(shaft, head);
      hammer.traverse((node) => { node.castShadow = true; });
      hammer.position.set(-L * 0.25, 0, D / 2 + 0.36);
      hammer.rotation.x = -0.32;
      s.root.add(hammer);
    }

    // Offcuts and chips gather around a block in a busy yard.
    const chips = Math.round(mix(0, 16, mood.density) + grime * 5);
    const chipPoints: { at: [number, number, number]; size: number }[] = [];
    for (let i = 0; i < chips; i++) {
      const angle = random() * Math.PI * 2;
      chipPoints.push({ at: [Math.cos(angle) * (L / 2 + 0.3 + random() * 0.5), 0.04, Math.sin(angle) * (D / 2 + 0.3 + random() * 0.5)], size: 0.06 + random() * 0.14 });
    }
    if (chipPoints.length) s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material(tone.base, { roughness: 1, flatShading: true }), chipPoints);

    const thing = s.finish();
    const dispose = thing.dispose;
    return { ...thing, dispose: () => { textures.forEach((texture) => texture.dispose()); dispose(); } };
  },
});
