import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const NAMES = {
  plaza: 'PLAZA',
  galleria: 'GALLERIA',
  square: 'FASHION SQUARE',
  center: 'TOWN CENTER',
  crossing: 'THE CROSSING',
  valley: 'VALLEY MALL',
} as const;
const TENANT = {
  cinema: 'CINEMA 6',
  food: 'FOOD COURT',
  lease: 'FOR LEASE',
  shoes: 'SHOE REPAIR',
  dental: 'DENTAL',
  arcade: 'ARCADE',
} as const;
const BANNER = { closing: 'STORE CLOSING', lease: 'SPACE AVAILABLE', auction: 'AUCTION SAT', soon: 'COMING SOON' } as const;
const GHOSTS = ['RECORDS', 'PORTRAITS', 'PRETZELS', 'OPTICAL', 'CARDS & GIFTS', 'NAILS', 'TUXEDO', 'VIDEO', 'PETS', 'JEWELERS', 'TOYS', 'BOOKS'];
const PALETTE = {
  vapor: { body: '#2f8f95', accent: '#f277b0', ink: '#1d5e77', face: '#f6f1ea' },
  seventies: { body: '#6b4630', accent: '#e8892e', ink: '#6b3a1c', face: '#f3e6c4' },
  burgundy: { body: '#6e2334', accent: '#c9a45a', ink: '#5a1a2a', face: '#f2ece0' },
  corporate: { body: '#27407a', accent: '#d8dde6', ink: '#1e3466', face: '#f4f6f8' },
} as const;

function paint(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    cap: choice('What shape is the logo cap on top?', {
      arch: 'A rounded arch like a rising sun, soft and seventies.',
      wedge: 'A slanted postmodern wedge cut on a diagonal.',
      stepped: 'A stepped ziggurat crown, mock art deco.',
      oval: 'A wide oval lozenge, a friendly corporate badge.',
    }),
    name: choice('What is the mall called on the cap?', {
      plaza: 'PLAZA, plain and municipal.',
      galleria: 'GALLERIA, aspiring to glamour.',
      square: 'FASHION SQUARE, eighties optimism.',
      center: 'TOWN CENTER, pretending to be a downtown.',
      crossing: 'THE CROSSING, a nineties rebrand.',
      valley: 'VALLEY MALL, suburban and teenage.',
    }),
    palette: choice('What are the sign colours?', {
      vapor: 'Teal and hot pink, pure late-eighties vaporwave.',
      seventies: 'Chocolate brown and orange, earth-tone seventies.',
      burgundy: 'Burgundy and brass, upscale department-store.',
      corporate: 'Navy and white, a bland later refit.',
    }),
    state: choice('What state is the lighting in?', {
      lit: 'Every surviving panel still glowing as if the mall were open.',
      half: 'Half lit: some panels glow, others have gone dark.',
      flicker: 'All dark but one panel that flickers on and off.',
      dark: 'Intact but completely unlit, power cut.',
      stripped: 'Stripped: faces gone, bare fluorescent tubes and empty frames.',
    }),
    panels: score('How many tenant panels are stacked on it?', ['Three large panels', 'Five', 'Eight narrow panels']),
    tenant: choice('What does the last surviving tenant panel say?', {
      cinema: 'CINEMA 6, the dollar theatre that outlived everything.',
      food: 'FOOD COURT, one counter still open.',
      lease: 'FOR LEASE, with a phone number.',
      shoes: 'SHOE REPAIR, a stubborn old trade.',
      dental: 'DENTAL, an office moved into a dead store.',
      arcade: 'ARCADE, where the teenagers were.',
    }),
    structure: choice('How does it stand?', {
      twin: 'Two tall square steel posts with the panels slung between.',
      monolith: 'A single thick clad pier with the panels wrapped around it.',
      masonry: 'Two brick piers on a raised planter base.',
    }),
    banner: choice('If a vinyl banner has been lashed across it, what does it say?', {
      none: 'No banner.',
      closing: 'STORE CLOSING, everything must go.',
      lease: 'SPACE AVAILABLE.',
      auction: 'AUCTION SAT, fixtures and all.',
      soon: 'COMING SOON, a promise nobody believes.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pal = PALETTE[a.palette];
    const stripped = a.state === 'stripped';
    const count = 3 + Math.round(a.panels * 5);
    const W = 3.6, D = 0.42;
    const stackH = 6.4;
    const pitch = stackH / count, panelH = pitch - 0.1;
    const clearance = a.structure === 'masonry' ? 2.6 : 3.3;
    const stackTop = clearance + stackH;
    const capH = 2.3;

    const body = s.material(pal.body, { roughness: 0.55, metalness: 0.15 });
    const accent = s.material(pal.accent, { roughness: 0.5 });
    const steel = s.material('#565b60', { metalness: 0.5, roughness: 0.6 });
    const dark = s.material('#1d2023', { roughness: 0.8 });
    const concrete = s.material('#b9b4a6', { roughness: 0.95 });
    const tubeMat = new THREE.MeshStandardMaterial({
      color: '#f1f3ee', roughness: 0.4,
      emissive: '#eef4ff', emissiveIntensity: stripped ? mix(0.05, 0.0, mood.wear) : 0.0,
    });
    const grime = mix(0.0, 0.35, mood.wear);

    // Structure.
    if (a.structure === 'twin') {
      for (const x of [-1, 1]) {
        s.box([0.34, stackTop + capH * 0.35, 0.34], [x * (W / 2 + 0.2), (stackTop + capH * 0.35) / 2, 0], body);
        s.box([0.7, 0.35, 0.7], [x * (W / 2 + 0.2), 0.175, 0], concrete);
      }
      s.box([W + 0.4, 0.18, 0.2], [0, clearance - 0.25, 0], body);
    } else if (a.structure === 'monolith') {
      s.box([1.5, stackTop + capH * 0.3, 0.62], [0, (stackTop + capH * 0.3) / 2, 0], body);
      s.box([1.56, 0.12, 0.68], [0, clearance - 0.5, 0], accent);
      s.box([2.3, 0.4, 1.3], [0, 0.2, 0], concrete);
    } else {
      const brick = s.material('#9a5a44', { roughness: 0.95 });
      for (const x of [-1, 1]) {
        s.box([0.8, stackTop, 0.8], [x * (W / 2 + 0.42), stackTop / 2, 0], brick);
        s.box([0.94, 0.14, 0.94], [x * (W / 2 + 0.42), stackTop + 0.07, 0], concrete);
        for (let y = 0.6; y < stackTop; y += 0.6) s.box([0.82, 0.02, 0.82], [x * (W / 2 + 0.42), y, 0], concrete);
      }
      s.box([W + 2.4, 0.6, 1.9], [0, 0.3, 0], brick);
      s.box([W + 2.5, 0.1, 2.0], [0, 0.65, 0], concrete);
      s.box([W + 2.0, 0.06, 1.5], [0, 0.71, 0], s.material('#5a4a36', { roughness: 1 }));
    }

    // Tenant panels.
    const flickers: THREE.MeshStandardMaterial[] = [];
    const survivor = Math.floor(random() * count);
    const brokenP = mix(0.08, 0.6, mood.wear);
    const emptyTenants = mix(0.75, 0.3, mood.cheer * (1 - mood.wear * 0.5));
    const tubeGeo = new THREE.CylinderGeometry(0.025, 0.025, W - 0.3, 8);
    tubeGeo.rotateZ(Math.PI / 2);
    for (let i = 0; i < count; i++) {
      const y = stackTop - pitch * (i + 0.5);
      const r = random();
      const isSurvivor = i === survivor && !stripped;
      let kind: 'tenant' | 'blank' | 'tubes' | 'empty';
      if (stripped) kind = r < 0.7 ? 'tubes' : 'empty';
      else if (isSurvivor) kind = 'tenant';
      else if (r < brokenP * 0.45) kind = 'tubes';
      else if (r < brokenP * 0.45 + emptyTenants * 0.8) kind = 'blank';
      else kind = 'tenant';

      // Frame.
      s.box([W, 0.06, D], [0, y + panelH / 2, 0], steel);
      s.box([W, 0.06, D], [0, y - panelH / 2, 0], steel);
      for (const x of [-1, 1]) s.box([0.06, panelH, D], [x * (W / 2 - 0.03), y, 0], steel);
      if (kind === 'empty') continue;
      s.box([W - 0.1, panelH - 0.1, 0.05], [0, y, 0], dark);
      if (kind === 'tubes') {
        const tubes = panelH > 1 ? 3 : 2;
        for (const z of [-1, 1])
          for (let t = 0; t < tubes; t++) {
            if (random() < mood.wear * 0.5) continue;
            const tube = s.mesh(tubeGeo, tubeMat, [0, y + (t - (tubes - 1) / 2) * (panelH * 0.3), z * 0.12]);
            if (random() < mood.wear * 0.4) { tube.rotation.z = (random() - 0.5) * 0.25; tube.position.y -= 0.05; }
          }
        // A shard of the old face still hanging in a corner.
        if (random() < 0.6) {
          const shard = s.box([W * mix(0.15, 0.4, random()), panelH * 0.8, 0.02], [(random() < 0.5 ? -1 : 1) * W * 0.3, y, D / 2 - 0.02], s.material(pal.face));
          shard.rotation.z = (random() - 0.5) * 0.2;
        }
        continue;
      }
      const lit = a.state === 'lit' || (a.state === 'half' && random() < 0.5) || (a.state === 'flicker' && isSurvivor);
      const text = kind === 'blank' ? '' : isSurvivor ? TENANT[a.tenant] : GHOSTS[Math.floor(random() * GHOSTS.length)];
      const inkHue = isSurvivor ? pal.ink : ['#b3262b', '#1f5a9c', '#1c6e4a', '#222222', pal.ink][Math.floor(random() * 5)];
      const stain = random();
      const texture = paint(512, Math.max(48, Math.round(512 * panelH / W)), (ctx, w, h) => {
        ctx.fillStyle = pal.face;
        ctx.fillRect(0, 0, w, h);
        if (text) {
          ctx.fillStyle = inkHue;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = `bold ${Math.round(h * 0.62)}px Arial, Helvetica, sans-serif`;
          ctx.fillText(text, w / 2, h * 0.54, w * 0.86);
        } else if (stain < 0.5) {
          // The ghost of a peeled vinyl logo.
          ctx.fillStyle = 'rgba(120,120,110,0.16)';
          ctx.fillRect(w * 0.18, h * 0.25, w * 0.64, h * 0.5);
        }
        // Streaks and grime from the top edge.
        for (let k = 0; k < 14; k++) {
          ctx.fillStyle = `rgba(70,60,45,${grime * (0.2 + 0.5 * ((k * 37 + i * 11) % 10) / 10)})`;
          const x = ((k * 97 + i * 53) % 100) / 100 * w;
          ctx.fillRect(x, 0, 6 + (k % 4) * 6, h * (0.3 + ((k * 13) % 7) / 10));
        }
      });
      const face = new THREE.MeshStandardMaterial({
        map: texture, roughness: 0.5,
        color: lit ? '#ffffff' : '#a9a9a2',
        emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: lit ? 0.85 : 0,
      });
      if (a.state === 'flicker' && isSurvivor) flickers.push(face);
      const front = s.mesh(new THREE.PlaneGeometry(W - 0.12, panelH - 0.12), face, [0, y, D / 2 - 0.02]);
      const back = s.mesh(new THREE.PlaneGeometry(W - 0.12, panelH - 0.12), face, [0, y, -D / 2 + 0.02]);
      back.rotation.y = Math.PI;
      // A cracked face sags out of its frame when things are bad.
      if (!isSurvivor && random() < mood.wear * 0.3) { front.rotation.z = (random() - 0.5) * 0.12; front.position.z += 0.06; }
    }

    // Logo cap.
    const capY = stackTop + 0.12;
    const capW = W + (a.structure === 'monolith' ? 0.6 : 1.0);
    const shape = new THREE.Shape();
    const hw = capW / 2;
    if (a.cap === 'arch') {
      shape.moveTo(-hw, 0); shape.lineTo(hw, 0); shape.lineTo(hw, capH * 0.35);
      shape.absellipse(0, capH * 0.35, hw, capH * 0.65, 0, Math.PI, false, 0);
      shape.lineTo(-hw, 0);
    } else if (a.cap === 'wedge') {
      shape.moveTo(-hw, 0); shape.lineTo(hw, 0); shape.lineTo(hw + 0.5, capH); shape.lineTo(-hw, capH * 0.55); shape.lineTo(-hw, 0);
    } else if (a.cap === 'stepped') {
      shape.moveTo(-hw, 0); shape.lineTo(hw, 0); shape.lineTo(hw, capH * 0.5); shape.lineTo(hw * 0.7, capH * 0.5);
      shape.lineTo(hw * 0.7, capH * 0.75); shape.lineTo(hw * 0.4, capH * 0.75); shape.lineTo(hw * 0.4, capH);
      shape.lineTo(-hw * 0.4, capH); shape.lineTo(-hw * 0.4, capH * 0.75); shape.lineTo(-hw * 0.7, capH * 0.75);
      shape.lineTo(-hw * 0.7, capH * 0.5); shape.lineTo(-hw, capH * 0.5); shape.lineTo(-hw, 0);
    } else {
      shape.absellipse(0, capH / 2, hw * 1.05, capH / 2, 0, Math.PI * 2, false, 0);
    }
    const capDepth = stripped ? 0.1 : D + 0.14;
    const capGeo = new THREE.ExtrudeGeometry(shape, { depth: capDepth, bevelEnabled: false, curveSegments: 28 });
    capGeo.translate(0, 0, -capDepth / 2);
    s.mesh(capGeo, stripped ? dark : body, [0, capY, 0]);
    const capLit = a.state === 'lit' || a.state === 'half';
    if (stripped) {
      for (const z of [-1, 1])
        for (let t = 0; t < 4; t++) {
          if (random() < mood.wear * 0.4) continue;
          const tube = s.mesh(tubeGeo, tubeMat, [0, capY + capH * (0.15 + t * 0.14), z * 0.14]);
          tube.scale.x = 0.9;
        }
      // Loose conduit hanging out of the gutted cap.
      s.tube([[hw * 0.5, capY + 0.2, 0.1], [hw * 0.62, capY - 0.5, 0.2], [hw * 0.55, capY - 1.3 - random(), 0.24]], 0.02, dark);
    } else {
      const logoW = capW * (a.cap === 'oval' ? 0.8 : 0.9), logoH = capH * (a.cap === 'oval' ? 0.6 : 0.46);
      const logoY = capY + (a.cap === 'oval' ? capH / 2 : logoH / 2 + 0.06);
      const halfDead = a.state === 'half';
      const logo = paint(512, Math.round(512 * logoH / logoW), (ctx, w, h) => {
        ctx.fillStyle = pal.body;
        ctx.fillRect(0, 0, w, h);
        // Motif: concentric sunrise arcs behind the name.
        ctx.lineWidth = h * 0.06;
        for (let k = 0; k < 4; k++) {
          ctx.strokeStyle = k % 2 ? pal.face : pal.accent;
          ctx.beginPath();
          ctx.arc(w * 0.13, h * 0.98, h * (0.22 + k * 0.13), Math.PI, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = pal.accent;
        ctx.fillRect(w * 0.28, h * 0.8, w * 0.68, h * 0.05);
        ctx.fillStyle = pal.face;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `italic bold ${Math.round(h * 0.5)}px Georgia, 'Times New Roman', serif`;
        ctx.fillText(NAMES[a.name], w * 0.62, h * 0.45, w * 0.66);
        if (halfDead) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(w * 0.52, 0, w * 0.48, h); }
        ctx.fillStyle = `rgba(60,50,40,${grime})`;
        for (let k = 0; k < 10; k++) ctx.fillRect(((k * 61) % 100) / 100 * w, 0, 10, h * (0.3 + (k % 5) / 8));
      });
      const logoMat = new THREE.MeshStandardMaterial({
        map: logo, roughness: 0.45, color: capLit ? '#ffffff' : '#9d9d98',
        emissive: '#ffffff', emissiveMap: logo, emissiveIntensity: capLit ? 0.8 : 0,
      });
      s.mesh(new THREE.PlaneGeometry(logoW, logoH), logoMat, [0, logoY, capDepth / 2 + 0.012]);
      const rear = s.mesh(new THREE.PlaneGeometry(logoW, logoH), logoMat, [0, logoY, -capDepth / 2 - 0.012]);
      rear.rotation.y = Math.PI;
      // Accent stripe under the cap.
      s.box([capW + 0.06, 0.12, capDepth + 0.06], [0, capY + 0.02, 0], accent);
    }

    // Banner lashed across the lower panels.
    if (a.banner !== 'none') {
      const bw = W + 0.5, bh = 1.15;
      const by = clearance + bh * 0.5 + pitch * 0.2;
      const cloth = paint(512, 160, (ctx, w, h) => {
        ctx.fillStyle = a.banner === 'soon' ? '#f4f0df' : '#f2d21c';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = a.banner === 'soon' ? '#1f5a9c' : '#c8171d';
        ctx.fillRect(0, 0, w, h * 0.1); ctx.fillRect(0, h * 0.9, w, h * 0.1);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `bold ${h * 0.56}px Impact, Arial, sans-serif`;
        ctx.fillText(BANNER[a.banner as keyof typeof BANNER], w / 2, h / 2, w * 0.9);
      });
      const geo = new THREE.PlaneGeometry(bw, bh, 16, 4);
      const pos = geo.attributes.position;
      const sag = mix(0.05, 0.3, mood.wear), corner = random() < mood.wear ? 1 : 0;
      for (let k = 0; k < pos.count; k++) {
        const x = pos.getX(k) / (bw / 2), y = pos.getY(k) / (bh / 2);
        pos.setZ(k, Math.sin(x * 5 + y) * 0.05 + (1 - x * x) * 0.08);
        pos.setY(k, pos.getY(k) - (1 - x * x) * sag * 0.5 - (corner && x > 0.4 && y > 0 ? (x - 0.4) * 1.6 * (y + 0.2) : 0));
      }
      geo.computeVertexNormals();
      const banner = s.mesh(geo, new THREE.MeshStandardMaterial({ map: cloth, roughness: 0.8, side: THREE.DoubleSide }), [0, by, D / 2 + 0.06]);
      banner.rotation.z = (random() - 0.5) * 0.06;
      for (const x of [-1, 1]) s.rod([x * bw / 2, by + bh / 2 - 0.05, D / 2 + 0.06], [x * (bw / 2 + 0.15), by + bh / 2 + 0.3, 0], 0.012, dark);
    }

    // Weeds around the footing as the lot goes feral.
    const weeds = Math.round(mix(0, 26, mood.wear) * mix(0.6, 1.2, random()));
    if (weeds > 0) {
      const blade = new THREE.ConeGeometry(0.06, 1, 5);
      blade.translate(0, 0.5, 0);
      const baseY = a.structure === 'masonry' ? 0.72 : 0;
      s.scatter(blade, s.material('#8fa05a', { roughness: 1 }), Array.from({ length: weeds }, () => ({
        at: [(random() - 0.5) * (W + 1.6), baseY, (random() - 0.5) * 1.2] as const,
        size: mix(0.25, 0.9, random()),
        color: random() < 0.4 ? '#c2b56a' : '#8fa05a',
      })));
    }

    let clock = 0;
    const speed = mix(0.6, 3, mood.energy);
    return s.finish({
      footprint: W / 2 + 0.8,
      update: flickers.length
        ? (dt) => {
            clock += dt * speed;
            const on = Math.sin(clock * 7.3) + Math.sin(clock * 2.9 + 1) + Math.sin(clock * 17.1) > -0.4;
            for (const f of flickers) f.emissiveIntensity = on ? 0.85 : 0.05;
          }
        : undefined,
    });
  },
});
