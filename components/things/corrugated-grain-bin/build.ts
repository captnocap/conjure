import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const FINISHES = {
  bright: 'New galvanised steel, almost white where the sun hits it.',
  dull: 'Zinc gone flat grey after decades of weather.',
  rusted: 'Brown rust bleeding down from every seam and bolt.',
  white: 'Painted white with a coloured roof, a tidy show farm.',
} as const;
const BRANDS = {
  king: 'HARVEST KING in tall stencilled capitals.',
  bushel: 'GOLDEN BUSHEL, a cheerful dealer brand.',
  number: 'A big painted bin number.',
  coop: 'CO-OP, plain block letters.',
  family: 'OLSON BROS, the farm name, painted by hand.',
  none: 'No lettering at all.',
} as const;
const GRAINS = {
  wheat: 'Wheat, harvest gold.',
  corn: 'Shelled corn, bright yellow-orange.',
  canola: 'Canola, a slippery black-brown seed.',
  barley: 'Barley, pale straw.',
} as const;
const GRAIN_TINT: Record<keyof typeof GRAINS, string> = { wheat: '#d6a23a', corn: '#efae22', canola: '#35312c', barley: '#dcc588' };

export default defineThing({
  questions: {
    size: score('How big is the bin?', ['A small feed bin', 'A family-farm bin', 'A big storage bin', 'A huge commercial bin']),
    base: choice('How does it sit?', {
      pad: 'Flat-bottomed on a round concrete pad.',
      hopper: 'A hopper-bottom bin: a steel cone held up on a ring of legs.',
    }),
    finish: choice('What is the steel like?', FINISHES),
    damage: choice('What has happened to it?', {
      intact: 'Nothing: round and true.',
      dented: 'Dented by hail, trucks and years of knocks.',
      buckled: 'Sucked in at the waist, a great crease where the wall gave way.',
      twisted: 'Tornado-twisted: wrung like a rag, the roof half torn off.',
    }),
    brand: choice('What is stencilled on the wall?', BRANDS),
    door: choice('What is the door doing?', {
      closed: 'Shut and latched.',
      pouring: 'Open, with grain pouring out into a spreading heap.',
      empty: 'Hanging open on a dark, empty inside.',
    }),
    grain: choice('If grain is showing, what kind?', GRAINS),
    company: choice('Does it stand with others?', {
      alone: 'One bin on its own.',
      pair: 'A smaller second bin beside it.',
      row: 'A row of three, stepping down in size.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = Math.min(1, mood.wear + (a.finish === 'rusted' ? 0.45 : 0) + (a.damage === 'twisted' ? 0.15 : 0));
    const steelTint = new THREE.Color({ bright: '#dfe3e2', dull: '#a3a8a6', rusted: '#a89a8c', white: '#eeeae0' }[a.finish]);
    steelTint.lerp(new THREE.Color(mood.warmth > 0.5 ? '#e8c27c' : '#a9bdd0'), Math.abs(mood.warmth - 0.5) * 0.25);
    const metal = a.finish === 'white' ? 0.05 : a.finish === 'bright' ? 0.35 : 0.2;
    const roofTint = a.finish === 'white' ? new THREE.Color(mood.cheer > 0.5 ? '#b6352b' : '#3f5f52') : steelTint.clone().multiplyScalar(0.94);
    const dark = s.material('#1b1b1c', { roughness: 1 });
    const frame = s.material(steelTint.clone().multiplyScalar(0.8), { metalness: 0.3 });
    const concrete = s.material('#aaa598');
    const grainTint = new THREE.Color(GRAIN_TINT[a.grain]);
    const grain = new THREE.MeshStandardMaterial({ color: grainTint, roughness: 0.9, emissive: grainTint, emissiveIntensity: mix(0.02, 0.14, mood.cheer) });
    const spinners: THREE.Object3D[] = [];

    const wallTexture = (radius: number, height: number, brand: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024; canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = `#${steelTint.getHexString()}`;
      ctx.fillRect(0, 0, 1024, 512);
      const rings = Math.max(3, Math.round(height / 0.82));
      const ribs = Math.round(height / 0.21);
      for (let i = 0; i < ribs; i++) {
        const y = (i / ribs) * 512, step = 512 / ribs;
        ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(0, y, 1024, step * 0.35);
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(0, y + step * 0.6, 1024, step * 0.4);
      }
      // Individual sheets weather differently.
      const sheets = Math.max(6, Math.round((radius * 2 * Math.PI) / 2.4));
      for (let r = 0; r < rings; r++) for (let c = 0; c < sheets; c++) {
        ctx.fillStyle = `rgba(${random() > 0.5 ? '255,255,255' : '40,40,45'},${random() * (0.06 + wear * 0.14)})`;
        ctx.fillRect(((c + (r % 2) * 0.5) / sheets) * 1024, (r / rings) * 512, 1024 / sheets, 512 / rings);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(((c + (r % 2) * 0.5) / sheets) * 1024, (r / rings) * 512, 2, 512 / rings);
      }
      for (let r = 1; r < rings; r++) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, (r / rings) * 512 - 1, 1024, 2.5); }
      for (let i = 0; i < wear * 90; i++) {
        const x = random() * 1024, top = Math.floor(random() * rings) / rings * 512, len = 40 + random() * 220;
        const g = ctx.createLinearGradient(0, top, 0, top + len);
        g.addColorStop(0, `rgba(128,66,30,${0.3 + wear * 0.5})`); g.addColorStop(1, 'rgba(128,66,30,0)');
        ctx.fillStyle = g; ctx.fillRect(x, top, 4 + random() * 22, len);
      }
      if (brand) {
        const span = Math.min(0.42, (radius * 1.5) / (radius * 2 * Math.PI)) * 1024;
        ctx.save();
        ctx.translate(512, 512 * 0.3);
        ctx.scale(1, (512 / height) / (1024 / (radius * 2 * Math.PI)));
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = mix(0.95, 0.5, wear);
        ctx.fillStyle = a.brand === 'bushel' ? '#b0791a' : a.brand === 'coop' ? '#2d5a3c' : a.brand === 'family' ? '#8c2a20' : '#22262b';
        const lines = brand.split('|');
        const px = Math.min(span / 3.2, (span * 1.55) / Math.max(...lines.map((line) => line.length)));
        ctx.font = `bold ${a.brand === 'family' ? 'italic ' : ''}${px}px ${a.brand === 'family' ? 'Georgia, serif' : '"Courier New", monospace'}`;
        lines.forEach((line, index) => ctx.fillText(line, 0, (index - (lines.length - 1) / 2) * px * 1.05, span));
        ctx.restore();
      }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 4;
      return map;
    };
    const roofTexture = (segments: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = `#${roofTint.getHexString()}`;
      ctx.fillRect(0, 0, 512, 64);
      for (let i = 0; i < segments; i++) {
        ctx.fillStyle = `rgba(${random() > 0.5 ? '255,255,255' : '30,30,30'},${random() * (0.05 + wear * 0.1)})`;
        ctx.fillRect((i / segments) * 512, 0, 512 / segments, 64);
        ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fillRect((i / segments) * 512, 0, 3, 64);
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect((i / segments) * 512 + 3, 0, 3, 64);
        if (random() < (wear - 0.35) * 0.6) { ctx.fillStyle = `rgba(128,66,30,${0.15 + random() * 0.3})`; ctx.fillRect((i / segments) * 512, 0, 512 / segments, 64); }
      }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return map;
    };

    const bin = (radius: number, wallH: number, cx: number, cz: number, main: boolean, damage: typeof a.damage, brand: string) => {
      const g = new THREE.Group();
      g.position.set(cx, 0, cz);
      s.root.add(g);
      const add = <T extends THREE.Object3D>(node: T) => { g.add(node); return node; };
      const hopper = a.base === 'hopper';
      const coneH = hopper ? radius * 0.85 : 0;
      const legH = hopper ? 0.9 : 0;
      const y0 = hopper ? coneH + legH : 0.25;
      if (!hopper) add(s.cylinder(radius + 0.35, radius + 0.4, 0.25, [0, 0.125, 0], concrete, 40));

      // Wall, deformed in place.
      const wall = new THREE.CylinderGeometry(radius, radius, wallH, 72, 18, true, Math.PI);
      wall.translate(0, wallH / 2, 0);
      const dents = Array.from({ length: damage === 'dented' ? 5 + Math.floor(random() * 5) : 0 }, () => ({ t: random() * Math.PI * 2, h: 0.15 + random() * 0.7, d: radius * (0.08 + random() * 0.14), w: 0.25 + random() * 0.35 }));
      const crease = { t: random() * Math.PI * 2, h: 0.4 + random() * 0.25 };
      const twist = (random() > 0.5 ? 1 : -1) * mix(0.5, 0.9, random());
      const shear = radius * mix(0.25, 0.5, random());
      const crush = random() * Math.PI * 2;
      const warp = (p: THREE.Vector3) => {
        const h = p.y / wallH;
        let theta = Math.atan2(p.x, p.z), r = Math.hypot(p.x, p.z);
        const ring = Math.sin(Math.PI * Math.min(1, h));
        const delta = (t: number) => Math.atan2(Math.sin(theta - t), Math.cos(theta - t));
        for (const dent of dents) r -= dent.d * Math.exp(-((delta(dent.t) / dent.w) ** 2) - (((h - dent.h) * wallH) / (radius * dent.w)) ** 2) * ring;
        if (damage === 'buckled') {
          const fold = Math.exp(-((delta(crease.t) / 1.1) ** 2)) * Math.exp(-(((h - crease.h) / 0.22) ** 2));
          r -= radius * 0.5 * fold;
          r -= radius * 0.08 * Math.exp(-(((h - crease.h) / 0.1) ** 2)) * Math.cos(delta(crease.t) * 5) * ring;
        }
        if (damage === 'twisted') {
          theta += twist * h * h;
          r *= 1 - 0.38 * h * Math.max(0, Math.cos(delta(crush))) - 0.1 * Math.sin(theta * 3 + h * 5) * h;
          p.y -= wallH * 0.14 * h * Math.max(0, Math.cos(delta(crush + 1)));
        }
        p.x = Math.sin(theta) * r + (damage === 'twisted' ? shear * h * h : 0);
        p.z = Math.cos(theta) * r;
      };
      const position = wall.attributes.position;
      const p = new THREE.Vector3();
      for (let i = 0; i < position.count; i++) { p.fromBufferAttribute(position, i); warp(p); position.setXYZ(i, p.x, p.y, p.z); }
      wall.computeVertexNormals();
      const skin = new THREE.MeshStandardMaterial({ map: wallTexture(radius, wallH, brand), roughness: mix(0.4, 0.8, wear), metalness: metal, side: THREE.DoubleSide });
      const shell = add(s.mesh(wall, skin, [0, y0, 0]));
      shell.castShadow = true;

      // Roof.
      const roofH = radius * 0.52;
      const panels = Math.max(12, Math.round(radius * 6));
      const torn = damage === 'twisted';
      const roofGeo = new THREE.ConeGeometry(radius + 0.18, roofH, panels, 1, true, 0, torn ? Math.PI * mix(1.1, 1.5, random()) : Math.PI * 2);
      const roofMat = new THREE.MeshStandardMaterial({ map: roofTexture(panels), roughness: mix(0.45, 0.8, wear), metalness: metal, side: THREE.DoubleSide, flatShading: true });
      const roof = new THREE.Group();
      const cone = new THREE.Mesh(roofGeo, roofMat);
      cone.position.y = roofH / 2;
      cone.castShadow = cone.receiveShadow = true;
      roof.add(cone);
      roof.position.set(torn ? shear : 0, y0 + wallH - (torn ? wallH * 0.08 : 0.02), 0);
      if (torn) { roof.rotation.set(0.22 * (random() - 0.5), random() * 6, 0.3 + random() * 0.2); roof.scale.set(0.92, 0.8, 0.92); }
      add(roof);
      if (!torn) {
        const cap = new THREE.Group();
        cap.position.y = roofH;
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.13, radius * 0.15, 0.35, 16), frame);
        neck.position.y = -0.02;
        const lid = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.22, radius * 0.12 + 0.1, 12), roofMat);
        lid.position.y = 0.26;
        lid.castShadow = neck.castShadow = true;
        cap.add(neck, lid);
        for (let i = 0; i < 6; i++) {
          const fin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, radius * 0.4), frame);
          fin.rotation.y = (i / 6) * Math.PI;
          fin.position.y = 0.2;
          cap.add(fin);
        }
        roof.add(cap);
        spinners.push(cap);
        // Roof hatch and ladder.
        const slope = Math.atan2(roofH, radius);
        const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.7), frame);
        hatch.position.set(Math.sin(0.7) * radius * 0.62, roofH * 0.38 + 0.08, Math.cos(0.7) * radius * 0.62);
        hatch.rotation.set(slope * Math.cos(0.7), 0, -slope * Math.sin(0.7));
        hatch.castShadow = true;
        roof.add(hatch);
      } else if (main) {
        // The rest of the roof lies crumpled on the ground.
        const sheet = new THREE.ConeGeometry(radius, roofH, 9, 1, true, 0, 1.6);
        const wreck = s.mesh(sheet, roofMat, [cx + radius * 1.5 + 1, 0.5, cz + radius * 0.9]);
        wreck.rotation.set(1.3, random() * 3, 1.9);
        for (let i = 0; i < 4; i++) {
          const scrap = s.box([1.2 + random() * 1.8, 0.04, 0.8 + random()], [cx + (random() - 0.5) * radius * 4, 0.05 + random() * 0.2, cz + radius + 0.5 + random() * 2.5], skin);
          scrap.rotation.set((random() - 0.5) * 0.5, random() * 3, (random() - 0.5) * 0.5);
        }
      }

      // Ladder up the right-hand side of the front.
      if (!torn) {
        const la = 0.72;
        const lx = Math.sin(la), lz = Math.cos(la);
        const out = radius + 0.14;
        for (const side of [-1, 1]) {
          const ox = Math.cos(la) * 0.22 * side, oz = -Math.sin(la) * 0.22 * side;
          add(s.rod([lx * out + ox, hopper ? 0.2 : 0.3, lz * out + oz], [lx * out + ox, y0 + wallH + 0.5, lz * out + oz], 0.03, frame));
          add(s.rod([lx * out + ox, y0 + wallH + 0.5, lz * out + oz], [lx * radius * 0.2 + ox, y0 + wallH + roofH * 0.82, lz * radius * 0.2 + oz], 0.025, frame));
        }
        const rungs = Math.floor((y0 + wallH) / 0.45);
        for (let i = 1; i <= rungs; i++) add(s.box([0.46, 0.035, 0.035], [lx * out, i * 0.45, lz * out], frame)).rotation.y = -la + Math.PI / 2 + Math.PI / 2;
        if (wallH > 5) add(s.ring(0.42, 0.02, [lx * (out + 0.36), y0 + wallH * 0.75, lz * (out + 0.36)], frame)).rotation.x = Math.PI / 2;
      }

      if (hopper) {
        const funnel = new THREE.MeshStandardMaterial({ color: steelTint.clone().multiplyScalar(0.85), roughness: 0.6, metalness: metal, side: THREE.DoubleSide });
        add(s.lathe([[0.22, legH], [radius, legH + coneH]], funnel));
        add(s.cylinder(0.24, 0.24, 0.3, [0, legH - 0.1, 0], frame, 12));
        const legs = Math.max(6, Math.round(radius * 3.2));
        for (let i = 0; i < legs; i++) {
          const t = (i / legs) * Math.PI * 2 + 0.2;
          add(s.box([0.14, y0 + 0.2, 0.14], [Math.sin(t) * (radius - 0.02), (y0 + 0.2) / 2, Math.cos(t) * (radius - 0.02)], frame)).rotation.y = t;
          add(s.rod([Math.sin(t) * radius, 0.25, Math.cos(t) * radius], [Math.sin(t + Math.PI * 2 / legs) * radius, y0 * 0.75, Math.cos(t + Math.PI * 2 / legs) * radius], 0.025, frame));
        }
        add(s.ring(radius, 0.07, [0, y0, 0], frame)).rotation.x = Math.PI / 2;
        add(s.ring(radius, 0.05, [0, 0.25, 0], frame)).rotation.x = Math.PI / 2;
        if (main && a.door === 'pouring') {
          add(s.rod([0, legH - 0.2, 0], [0, 0.2, 0], 0.16, grain, 0.3));
          add(s.lathe([[radius * 0.95, 0], [radius * 0.5, legH * 0.42], [radius * 0.15, legH * 0.72], [0, legH * 0.78]], grain));
        }
      } else if (main) {
        // Door hatch facing +z.
        const dw = Math.min(0.95, radius * 0.4), dh = Math.min(1.9, wallH * 0.36);
        const dz = radius + (damage === 'buckled' || torn ? -0.02 : 0.03);
        add(s.box([dw + 0.2, dh + 0.2, 0.1], [0, y0 + 0.5 + dh / 2, dz], frame));
        if (a.door === 'closed') {
          add(s.box([dw, dh, 0.06], [0, y0 + 0.5 + dh / 2, dz + 0.06], new THREE.MeshStandardMaterial({ color: steelTint.clone().multiplyScalar(0.9), roughness: 0.6, metalness: metal })));
          for (let i = 0; i < 3; i++) add(s.box([dw + 0.1, 0.07, 0.05], [0, y0 + 0.5 + dh * (0.2 + i * 0.3), dz + 0.1], frame));
        } else {
          add(s.box([dw, dh, 0.04], [0, y0 + 0.5 + dh / 2, dz + 0.06], dark));
          const leaf = add(s.box([dw, dh, 0.05], [-dw / 2 - dw * 0.42, y0 + 0.5 + dh / 2, dz + 0.4], frame));
          leaf.rotation.y = -1.05;
          if (a.door === 'pouring') {
            const reach = Math.min(radius * 0.9, 2.2 + radius * 0.25);
            add(s.box([dw * 0.92, dh * 0.6, 0.05], [0, y0 + 0.5 + dh * 0.3, dz + 0.09], grain));
            const tongue = add(s.box([dw * 0.9, 0.2, reach * 0.9], [0, (y0 + 0.5) / 2 + 0.25, dz + reach * 0.36], grain));
            tongue.rotation.x = Math.atan2(y0 + 0.5, reach * 0.9) * 0.9;
            const heap = add(s.lathe([[reach, 0], [reach * 0.8, reach * 0.07], [reach * 0.4, reach * 0.3], [reach * 0.12, reach * 0.44], [0, reach * 0.47]], grain, [0, 0.2, dz + reach * 0.55]));
            heap.scale.set(1.15, 1, 1);
          } else {
            add(s.box([dw * 0.9, 0.12, 0.05], [0, y0 + 0.56, dz + 0.09], grain));
          }
        }
        // Unloading auger stub poking out low on the side.
        add(s.rod([-radius * 0.6, 0.45, radius * 0.7], [-radius * 0.95 - 0.5, 0.75, radius * 1.1 + 0.4], 0.1, frame));
      }
      return g;
    };

    const R = mix(1.7, 5.4, a.size) * mix(0.94, 1.06, random());
    const H = R * mix(1.7, 1.25, a.size) + 1.2 + random() * 0.8;
    const number = `No ${1 + Math.floor(random() * 9)}`;
    const brand = { king: 'HARVEST|KING', bushel: 'GOLDEN|BUSHEL', number, coop: 'CO-OP', family: 'OLSON|BROS', none: '' }[a.brand];
    const others = a.company === 'alone' ? 0 : a.company === 'pair' ? 1 : 2;
    bin(R, H, 0, 0, true, a.damage, brand);
    let edge = R;
    for (let i = 0; i < others; i++) {
      const r = R * mix(0.62, 0.8, random()) * (i ? 0.85 : 1);
      const x = edge + 0.9 + random() * 0.6 + r;
      bin(r, H * mix(0.6, 0.85, random()), -x, -random() * 1.5, false, a.damage === 'twisted' ? (random() > 0.5 ? 'dented' : 'buckled') : a.damage === 'buckled' ? 'intact' : a.damage, a.brand === 'number' ? `No ${2 + i + Math.floor(random() * 3)}` : '');
      edge = x + r;
    }
    if (wear > 0.55 || a.damage === 'twisted') {
      const blades = Array.from({ length: 110 }, () => { const t = random() * Math.PI * 2, d = R + 0.4 + random() * 2.2, size = 0.4 + random() * 0.8; return { at: [Math.sin(t) * d, 0.5 * size, Math.cos(t) * d] as const, size, color: random() > 0.4 ? '#b9a865' : '#8f8a50' }; });
      s.scatter(new THREE.ConeGeometry(0.07, 1.1, 4), new THREE.MeshStandardMaterial({ roughness: 1 }), blades);
    }
    const speed = mix(0.2, 5, mood.energy);
    return s.finish({ update: (dt) => { for (const spinner of spinners) spinner.rotation.y += dt * speed; } });
  },
});
