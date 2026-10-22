import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = readonly [number, number, number];

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
    shape: choice('What shape is the planter?', {
      round: 'A big round drum.',
      square: 'A square block with a wide ledge.',
      hex: 'A hexagon, the modular seventies kind.',
      tiered: 'Two stepped round tiers like a wedding cake.',
    }),
    finish: choice('What is it faced with?', {
      aggregate: 'Exposed pebble aggregate, brown and gritty.',
      tile: 'Brown quarry tile with dark grout.',
      painted: 'Concrete painted teal and pink in a late makeover.',
      brick: 'Red brick with a concrete cap.',
    }),
    tree: choice('What is growing in it?', {
      dead: 'A dead ornamental tree, bare grey branches.',
      overgrown: 'A tree gone wild, suckers and weeds spilling over the lip.',
      ficus: 'A tidy lollipop ficus somebody still waters.',
      stump: 'Only a sawn stump and a few shoots.',
      palm: 'A drooping indoor palm, half its fronds brown.',
    }),
    directory: choice('What does the directory post beside it show?', {
      map: 'A faded YOU ARE HERE map of the mall.',
      blank: 'An empty frame, the map long gone.',
      lit: 'A backlit panel still glowing with an old advert.',
      none: 'There is no directory post.',
    }),
    urn: choice('What about the cigarette urn?', {
      full: 'A sand-topped urn bristling with butts.',
      tipped: 'Knocked over, sand spilled across the floor.',
      none: 'No urn.',
    }),
    left: choice('What has been left on the bench lip?', {
      nothing: 'Nothing.',
      cup: 'A paper coffee cup and a folded newspaper.',
      jacket: 'A denim jacket somebody forgot.',
      skateboard: 'A skateboard leaning against it.',
      pigeons: 'A couple of pigeons.',
      bags: 'Two shopping bags from stores that no longer exist.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const segments = { round: 40, square: 4, hex: 6, tiered: 40 }[a.shape];
    const faceted = segments < 10;
    const R = a.shape === 'square' ? 1.75 : 1.45; // circumradius of the seat edge
    const twist = a.shape === 'square' ? Math.PI / 4 : a.shape === 'hex' ? Math.PI / 6 : 0;
    const apothem = faceted ? Math.cos(Math.PI / segments) : 1;

    const baseHex = { aggregate: '#a08a70', tile: '#8a5236', painted: '#3fa3a0', brick: '#9c4f3c' }[a.finish];
    const skin = paint(512, 128, (ctx, w, h) => {
      ctx.fillStyle = baseHex; ctx.fillRect(0, 0, w, h);
      if (a.finish === 'aggregate') {
        const hues = ['#6f5a44', '#c9b79a', '#8a7358', '#ddd0b8', '#5a4838', '#b39b7c'];
        for (let k = 0; k < 5200; k++) { ctx.fillStyle = hues[Math.floor(random() * hues.length)]; ctx.beginPath(); ctx.arc(random() * w, random() * h, mix(1, 2.8, random()), 0, 7); ctx.fill(); }
      } else if (a.finish === 'tile') {
        for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) { ctx.fillStyle = `rgba(${150 + random() * 40},${80 + random() * 30},${50 + random() * 20},0.5)`; ctx.fillRect(x + 1, y + 1, 14, 14); }
        ctx.fillStyle = '#3a2a22'; for (let y = 0; y < h; y += 16) ctx.fillRect(0, y, w, 1.5); for (let x = 0; x < w; x += 16) ctx.fillRect(x, 0, 1.5, h);
      } else if (a.finish === 'painted') {
        ctx.fillStyle = '#ee7fb0'; ctx.fillRect(0, h * 0.62, w, h * 0.14);
        ctx.fillStyle = '#f4efe0'; ctx.fillRect(0, h * 0.8, w, h * 0.05);
        // Paint peeling back to grey concrete.
        for (let k = 0; k < mix(4, 70, wear); k++) { ctx.fillStyle = '#a9a496'; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, mix(3, 22, random()), mix(2, 10, random()), random() * 3, 0, 7); ctx.fill(); }
      } else {
        for (let y = 0; y < h; y += 8) for (let x = (y / 8) % 2 ? -10 : 0; x < w; x += 20) { ctx.fillStyle = `rgba(${140 + random() * 50},${60 + random() * 30},${45 + random() * 20},0.55)`; ctx.fillRect(x + 1, y + 1, 18, 6); }
      }
      // Water stains under the lip and grime at the foot.
      for (let k = 0; k < 40; k++) {
        const len = h * mix(0.2, 0.9, random());
        const g = ctx.createLinearGradient(0, 0, 0, len);
        g.addColorStop(0, `rgba(40,34,26,${mix(0.05, 0.5, wear) * random()})`); g.addColorStop(1, 'rgba(40,34,26,0)');
        ctx.fillStyle = g; ctx.fillRect(random() * w, 0, mix(4, 22, random()), len);
      }
      ctx.strokeStyle = `rgba(30,26,20,${mix(0, 0.8, wear)})`; ctx.lineWidth = 1.5;
      for (let k = 0; k < Math.round(mix(0, 7, wear)); k++) {
        let x = random() * w, y = 0;
        ctx.beginPath(); ctx.moveTo(x, y);
        while (y < h * mix(0.4, 1, random())) { x += (random() - 0.5) * 16; y += 4 + random() * 10; ctx.lineTo(x, y); }
        ctx.stroke();
      }
    });
    skin.wrapS = THREE.RepeatWrapping;
    skin.repeat.set(faceted ? segments : 3, 1);
    const body = new THREE.MeshStandardMaterial({ map: skin, roughness: 0.95, flatShading: faceted });
    const cap = new THREE.MeshStandardMaterial({ color: new THREE.Color('#bdb7a8').lerp(new THREE.Color('#8f887a'), wear * 0.5), roughness: 0.9, flatShading: faceted });
    const wood = new THREE.MeshStandardMaterial({ color: new THREE.Color('#9a6b42').lerp(new THREE.Color('#9b968a'), wear * 0.65), roughness: 0.85, flatShading: faceted });
    const soil = s.material('#4a3c2c', { roughness: 1 });
    const dark = s.material('#202326', { roughness: 0.8 });
    const steel = s.material('#7d8286', { metalness: 0.6, roughness: 0.4 });
    const ring = (profile: readonly (readonly [number, number])[], mat: THREE.Material, y = 0) => {
      const geo = new THREE.LatheGeometry(profile.map(([x, yy]) => new THREE.Vector2(x, yy)), segments);
      const mesh = s.mesh(geo, mat, [0, y, 0]);
      mesh.rotation.y = twist;
      return mesh;
    };

    // Bench plinth, seat slats, inner planter wall, soil.
    const seatH = 0.44, wallH = a.shape === 'tiered' ? 0.62 : 0.86;
    const inner = R - 0.62;
    ring([[0, 0], [R - 0.08, 0], [R - 0.08, 0.04], [R - 0.16, 0.08], [R - 0.14, seatH - 0.06], [R, seatH - 0.06], [R, seatH - 0.02], [inner, seatH - 0.02]], body);
    if (a.finish === 'aggregate' || a.finish === 'painted') {
      ring([[inner + 0.02, seatH - 0.02], [R, seatH - 0.02], [R, seatH + 0.03], [inner + 0.02, seatH + 0.03]], cap);
    } else {
      for (let k = 0; k < 4; k++) {
        const r0 = inner + 0.06 + k * 0.14;
        ring([[r0, seatH - 0.02], [r0 + 0.11, seatH - 0.02], [r0 + 0.11, seatH + 0.035], [r0, seatH + 0.035], [r0, seatH - 0.02]], wood);
      }
    }
    ring([[inner, 0.3], [inner, wallH], [inner - 0.04, wallH + 0.05], [inner - 0.16, wallH + 0.05], [inner - 0.18, wallH - 0.1]], body);
    ring([[inner + 0.02, wallH], [inner + 0.02, wallH + 0.06], [inner - 0.2, wallH + 0.06], [inner - 0.2, wallH]], cap);
    let topY = wallH;
    let soilR = inner - 0.18;
    if (a.shape === 'tiered') {
      const r2 = inner - 0.42;
      ring([[r2, wallH - 0.1], [r2, wallH + 0.5], [r2 - 0.04, wallH + 0.55], [r2 - 0.14, wallH + 0.55], [r2 - 0.16, wallH + 0.4]], body);
      ring([[r2 + 0.02, wallH + 0.5], [r2 + 0.02, wallH + 0.56], [r2 - 0.18, wallH + 0.56], [r2 - 0.18, wallH + 0.5]], cap);
      ring([[r2, wallH - 0.08], [inner - 0.19, wallH - 0.08]], soil);
      topY = wallH + 0.5; soilR = r2 - 0.16;
    }
    ring([[0, topY - 0.06], [soilR * 0.6, topY - 0.02], [soilR + 0.02, topY - 0.1]], soil);

    // --- The tree ---------------------------------------------------------------------
    const barkHex = a.tree === 'dead' ? '#8d877c' : '#5e4a38';
    const bark = s.material(barkHex, { roughness: 1 });
    const tips: THREE.Vector3[] = [];
    const grow = (from: THREE.Vector3, dir: THREE.Vector3, len: number, radius: number, depth: number) => {
      const to = from.clone().addScaledVector(dir, len);
      s.rod(from.toArray() as [number, number, number], to.toArray() as [number, number, number], radius, bark, radius * 0.68);
      if (depth === 0) { tips.push(to); return; }
      const kids = depth > 2 ? 2 + (random() < 0.5 ? 1 : 0) : 2;
      for (let k = 0; k < kids; k++) {
        const next = dir.clone().add(new THREE.Vector3(random() - 0.5, (random() - 0.35) * 0.7, random() - 0.5).multiplyScalar(1.05)).normalize();
        if (next.y < 0.1) next.y = 0.1 + random() * 0.2;
        grow(to, next.normalize(), len * mix(0.62, 0.8, random()), radius * 0.66, depth - 1);
      }
      if (random() < 0.5) tips.push(to);
    };
    const origin = new THREE.Vector3((random() - 0.5) * 0.15, topY - 0.06, (random() - 0.5) * 0.15);
    const lean = new THREE.Vector3((random() - 0.5) * 0.25, 1, (random() - 0.5) * 0.25).normalize();
    const blob = new THREE.IcosahedronGeometry(1, 1);
    const leafGreen = new THREE.Color('#4f7d3e').lerp(new THREE.Color('#8f8a4a'), wear * 0.5);
    const leafMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true });
    let treeTop = topY + 0.4;
    if (a.tree === 'dead') {
      grow(origin, lean, 1.15, 0.085, 4);
      // A last few leaves that will not let go.
      s.scatter(new THREE.TetrahedronGeometry(0.05), s.material('#a8702f', { roughness: 1 }), tips.filter(() => random() < 0.25).map((p) => ({ at: [p.x, p.y - 0.05, p.z] as const, size: 1.2 })));
      treeTop = topY + 3.4;
    } else if (a.tree === 'overgrown') {
      grow(origin, lean, 1.0, 0.1, 3);
      s.scatter(blob, leafMat, tips.flatMap((p) => Array.from({ length: 2 }, () => ({
        at: [p.x + (random() - 0.5) * 0.5, p.y + (random() - 0.3) * 0.5, p.z + (random() - 0.5) * 0.5] as const,
        size: mix(0.28, 0.6, random()),
        color: leafGreen.clone().offsetHSL((random() - 0.5) * 0.06, 0, (random() - 0.5) * 0.14),
      }))));
      // Suckers and weeds pouring over the lip.
      const spill = new THREE.ConeGeometry(0.07, 1, 5); spill.translate(0, 0.5, 0);
      s.scatter(spill, s.material('#7f9a4e', { roughness: 1 }), Array.from({ length: 60 }, () => {
        const t = random() * Math.PI * 2, r = soilR * mix(0.3, 1.25, random());
        return { at: [Math.cos(t) * r, r > soilR ? seatH : topY - 0.1, Math.sin(t) * r] as const, size: mix(0.3, 1.1, random()), color: random() < 0.3 ? '#b7b05c' : '#7f9a4e' };
      }));
      for (let k = 0; k < 5; k++) {
        const t = random() * Math.PI * 2;
        s.tube([[Math.cos(t) * soilR * 0.8, topY, Math.sin(t) * soilR * 0.8], [Math.cos(t) * (inner + 0.1), topY + 0.25, Math.sin(t) * (inner + 0.1)], [Math.cos(t) * (R * 0.95), seatH + 0.15, Math.sin(t) * (R * 0.95)], [Math.cos(t + 0.2) * (R + 0.12), mix(0.05, 0.3, random()), Math.sin(t + 0.2) * (R + 0.12)]], 0.022, s.material('#5f7f3c', { roughness: 1 }));
      }
      treeTop = topY + 3.2;
    } else if (a.tree === 'ficus') {
      const h = 1.5;
      for (let k = 0; k < 3; k++) {
        const pts: P3[] = [];
        for (let j = 0; j <= 10; j++) { const t = j / 10, ang = t * Math.PI * 3 + (k * Math.PI * 2) / 3; pts.push([origin.x + Math.cos(ang) * 0.05, origin.y + t * h, origin.z + Math.sin(ang) * 0.05]); }
        s.tube(pts, 0.035, bark);
      }
      const green = new THREE.Color('#3f7a3c').lerp(new THREE.Color('#7f8a44'), wear * 0.4);
      s.scatter(blob, leafMat, Array.from({ length: 26 }, () => {
        const v = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize().multiplyScalar(0.62 * Math.cbrt(random()));
        return { at: [origin.x + v.x, origin.y + h + 0.5 + v.y * 0.9, origin.z + v.z] as const, size: mix(0.26, 0.42, random()), color: green.clone().offsetHSL(0, 0, (random() - 0.5) * 0.12) };
      }));
      s.rod([origin.x + 0.2, origin.y, origin.z], [origin.x + 0.1, origin.y + h * 0.8, origin.z], 0.012, s.material('#b99a5a'));
      treeTop = topY + h + 1.2;
    } else if (a.tree === 'stump') {
      const rings = paint(128, 128, (ctx, w) => {
        ctx.fillStyle = '#c9a877'; ctx.fillRect(0, 0, w, w);
        ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 1.5;
        for (let r = 6; r < 64; r += 5 + random() * 4) { ctx.beginPath(); ctx.arc(64 + r * 0.06, 64, r, 0, 7); ctx.stroke(); }
      });
      s.cylinder(0.2, 0.26, 0.42, [origin.x, origin.y + 0.2, origin.z], bark, 12);
      const top = s.mesh(new THREE.CircleGeometry(0.2, 16), new THREE.MeshStandardMaterial({ map: rings, roughness: 0.9 }), [origin.x, origin.y + 0.412, origin.z]);
      top.rotation.x = -Math.PI / 2;
      for (let k = 0; k < 6; k++) {
        const t = random() * Math.PI * 2;
        const tip: P3 = [origin.x + Math.cos(t) * 0.5, origin.y + mix(0.5, 1.2, random()), origin.z + Math.sin(t) * 0.5];
        s.rod([origin.x + Math.cos(t) * 0.22, origin.y + 0.1, origin.z + Math.sin(t) * 0.22], tip, 0.014, s.material('#6f8a44'));
        s.ball([0.1, 0.14, 0.1], tip, s.material(leafGreen), 8);
      }
      s.scatter(new THREE.TetrahedronGeometry(0.04), s.material('#d9c39a', { roughness: 1 }), Array.from({ length: 40 }, () => { const t = random() * 7, r = random() * soilR; return { at: [Math.cos(t) * r, topY - 0.03, Math.sin(t) * r] as const, size: mix(0.5, 1.4, random()) }; }));
      treeTop = topY + 1.2;
    } else {
      const h = 2.3, bend = (random() - 0.5) * 0.8;
      const trunk: P3[] = [];
      for (let j = 0; j <= 6; j++) { const t = j / 6; trunk.push([origin.x + bend * t * t, origin.y + t * h, origin.z + 0.1 * Math.sin(t * 3)]); }
      s.tube(trunk, 0.08, s.material('#8a7355', { roughness: 1 }));
      for (let j = 1; j < 9; j++) { const t = j / 9; s.ring(0.085, 0.012, [origin.x + bend * t * t, origin.y + t * h, origin.z + 0.1 * Math.sin(t * 3)], bark).rotation.x = Math.PI / 2; }
      const crown = new THREE.Vector3(...trunk[6]);
      const fronds = 11;
      for (let k = 0; k < fronds; k++) {
        const t = (k / fronds) * Math.PI * 2 + random() * 0.4;
        const brown = random() < mix(0.15, 0.75, wear);
        const droop = brown ? mix(1.0, 1.6, random()) : mix(0.3, 0.9, random());
        const len = mix(1.0, 1.4, random());
        const pts: P3[] = [];
        for (let j = 0; j <= 5; j++) { const u = j / 5; pts.push([crown.x + Math.cos(t) * len * u, crown.y + Math.sin(u * 2.2) * 0.45 - u * u * droop, crown.z + Math.sin(t) * len * u]); }
        // A frond is a tapering ribbon with a sawtooth edge, folded along its midrib.
        const side = new THREE.Vector3(-Math.sin(t), 0, Math.cos(t));
        const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
        const verts: number[] = [], index: number[] = [];
        const steps = 14;
        for (let j = 0; j <= steps; j++) {
          const u = j / steps, c = curve.getPoint(u);
          const half = Math.sin(Math.min(1, u * 1.6 + 0.12) * Math.PI * 0.5) * (1 - u * 0.75) * 0.3 * (j % 2 ? 1 : 0.55);
          verts.push(c.x - side.x * half, c.y - half * 0.45, c.z - side.z * half, c.x, c.y, c.z, c.x + side.x * half, c.y - half * 0.45, c.z + side.z * half);
          if (j < steps) { const o = j * 3; index.push(o, o + 3, o + 1, o + 1, o + 3, o + 4, o + 1, o + 4, o + 2, o + 2, o + 4, o + 5); }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.setIndex(index);
        geo.computeVertexNormals();
        s.mesh(geo, new THREE.MeshStandardMaterial({ color: brown ? '#a08650' : leafGreen, roughness: 0.9, side: THREE.DoubleSide }));
      }
      treeTop = topY + h + 0.6;
    }
    // A few flowers survive at the foot if the mood allows.
    if (mood.cheer > 0.55 && a.tree !== 'dead') {
      const hues = ['#f2c22a', '#ee6fa8', '#f4f1e8', '#e8452e'];
      s.scatter(new THREE.SphereGeometry(0.05, 6, 5), s.material('#ffffff'), Array.from({ length: Math.round(mix(6, 30, mood.cheer)) }, () => { const t = random() * 7, r = mix(0.35, 0.95, random()) * soilR; return { at: [Math.cos(t) * r, topY + 0.04 - (r / soilR) * 0.06, Math.sin(t) * r] as const, size: mix(0.7, 1.3, random()), color: hues[Math.floor(random() * hues.length)] }; }));
    }

    // --- Directory post ---------------------------------------------------------------
    const frontR = R * apothem;
    if (a.directory !== 'none') {
      const dx = R * 0.62 + 0.3, dz = frontR + 0.55;
      const lit = a.directory === 'lit';
      const panel = paint(256, 352, (ctx, w, h) => {
        ctx.fillStyle = a.directory === 'blank' ? '#d9d5c8' : lit ? '#fdf6e4' : '#e9e4d2'; ctx.fillRect(0, 0, w, h);
        if (a.directory === 'map') {
          ctx.fillStyle = '#2f6b6a'; ctx.fillRect(0, 0, w, 46);
          ctx.fillStyle = '#f4efe0'; ctx.font = 'bold 26px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('DIRECTORY', w / 2, 32);
          // A cross-shaped concourse with anchor blocks at the ends.
          ctx.fillStyle = '#c9c2ad'; ctx.fillRect(40, 150, 176, 34); ctx.fillRect(112, 70, 32, 200);
          const hues = ['#d98a8a', '#8ab6d9', '#d9c98a', '#9fd0a8', '#c9a0d0'];
          for (let k = 0; k < 9; k++) { ctx.fillStyle = hues[k % 5]; ctx.fillRect(44 + k * 19, 132, 16, 16); ctx.fillRect(44 + k * 19, 186, 16, 16); }
          for (let k = 0; k < 4; k++) { ctx.fillStyle = hues[(k + 2) % 5]; ctx.fillRect(94, 74 + k * 14, 16, 12); ctx.fillRect(146, 210 + k * 14, 16, 12); }
          ctx.fillStyle = '#7d8a9a'; ctx.fillRect(14, 140, 28, 56); ctx.fillRect(214, 140, 28, 56); ctx.fillRect(100, 52, 56, 20); ctx.fillRect(100, 270, 56, 20);
          ctx.fillStyle = '#d3312b'; ctx.beginPath(); ctx.arc(128, 168, 7, 0, 7); ctx.fill();
          ctx.font = 'bold 13px Arial, sans-serif'; ctx.fillText('YOU ARE HERE', 128, 312);
          ctx.fillStyle = '#555'; for (let k = 0; k < 4; k++) ctx.fillRect(30, 322 + k * 7, 196 - k * 30, 2);
          ctx.fillStyle = `rgba(233,228,214,${mix(0.1, 0.72, wear)})`; ctx.fillRect(0, 0, w, h);
        } else if (lit) {
          const g = ctx.createLinearGradient(0, 0, 0, h);
          g.addColorStop(0, '#ff9ecb'); g.addColorStop(0.55, '#ffd7a0'); g.addColorStop(1, '#7ad0e8');
          ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#ffe98a'; ctx.beginPath(); ctx.arc(128, 190, 62, Math.PI, 0); ctx.fill();
          ctx.fillStyle = '#7ad0e8'; for (let k = 0; k < 5; k++) ctx.fillRect(60, 196 + k * 12, 136, 5);
          ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
          ctx.font = "italic bold 34px Georgia, 'Times New Roman', serif"; ctx.fillText('Summer', 128, 74);
          ctx.font = 'bold 22px Arial, sans-serif'; ctx.fillText('SALE  1989', 128, 300);
        } else {
          ctx.strokeStyle = '#a9a391'; ctx.lineWidth = 4; ctx.strokeRect(14, 14, w - 28, h - 28);
          ctx.fillStyle = '#b9b29c';
          for (const [x, y] of [[22, 22], [w - 34, 22], [22, h - 34], [w - 34, h - 34]]) ctx.fillRect(x, y, 12, 12);
        }
      });
      const panelMat = new THREE.MeshStandardMaterial({ map: panel, roughness: 0.5, emissive: '#ffffff', emissiveMap: panel, emissiveIntensity: lit ? 0.85 : 0 });
      const post = new THREE.Group();
      const part = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], at: P3) => { const m = new THREE.Mesh(geo, mat); m.position.set(...at); m.castShadow = m.receiveShadow = true; post.add(m); };
      part(new THREE.BoxGeometry(0.9, 1.3, 0.14), [dark, dark, dark, dark, panelMat, panelMat], [0, 1.45, 0]);
      part(new THREE.BoxGeometry(0.98, 0.08, 0.18), steel, [0, 2.14, 0]);
      for (const x of [-0.36, 0.36]) part(new THREE.BoxGeometry(0.08, 0.82, 0.08), steel, [x, 0.41, 0]);
      part(new THREE.BoxGeometry(1.0, 0.05, 0.4), steel, [0, 0.025, 0]);
      post.position.set(dx, 0, dz);
      post.rotation.y = -0.35 + (random() - 0.5) * 0.2;
      post.rotation.z = (random() - 0.5) * mix(0, 0.14, wear);
      s.root.add(post);
    }

    // --- Cigarette urn ----------------------------------------------------------------
    if (a.urn !== 'none') {
      const ux = -R * 0.62 - 0.25, uz = frontR + 0.45;
      const urn = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.19, 0], [0.22, 0.05], [0.2, 0.55], [0.24, 0.6], [0.24, 0.66], [0.19, 0.66], [0.19, 0.6], [0, 0.6]].map(([x, y]) => new THREE.Vector2(x, y)), 20), new THREE.MeshStandardMaterial({ map: skin, roughness: 0.95 }));
      const sand = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.02, 20), s.material('#ddd2b4', { roughness: 1 }));
      sand.position.y = 0.63;
      urn.add(shell, sand);
      const butts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 5), s.material('#f1ece0'), Math.round(mix(4, 22, wear)));
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let k = 0; k < butts.count; k++) {
        const t = random() * 7, r = random() * 0.15;
        q.setFromEuler(new THREE.Euler((random() - 0.5) * 1.2, 0, (random() - 0.5) * 1.2));
        butts.setMatrixAt(k, m.compose(new THREE.Vector3(Math.cos(t) * r, 0.655, Math.sin(t) * r), q, new THREE.Vector3(1, 1, 1)));
      }
      urn.add(butts);
      urn.traverse((n) => { n.castShadow = true; n.receiveShadow = true; });
      if (a.urn === 'tipped') {
        urn.rotation.z = Math.PI / 2 - 0.08;
        urn.position.set(ux, 0.23, uz);
        urn.rotation.y = random() * 2;
        const spill = s.cylinder(0.34, 0.4, 0.012, [ux - 0.75 * Math.cos(urn.rotation.y), 0.006, uz + 0.75 * Math.sin(urn.rotation.y)], s.material('#ddd2b4', { roughness: 1 }), 14);
        spill.scale.z = 0.6;
      } else urn.position.set(ux, 0, uz);
      s.root.add(urn);
    }

    // --- What was left on the bench lip ----------------------------------------------
    const seatR = (inner + R) / 2 * apothem;
    const spot = (angle: number, r = seatR): P3 => [Math.sin(angle) * r, seatH + 0.035, Math.cos(angle) * r];
    const at0 = faceted ? 0 : (random() - 0.5) * 0.8;
    if (a.left === 'cup') {
      const [x, y, z] = spot(at0);
      s.cylinder(0.045, 0.035, 0.12, [x, y + 0.06, z], s.material('#f3f0e6'), 14);
      s.cylinder(0.047, 0.047, 0.012, [x, y + 0.125, z], s.material('#5a3a2a'), 14);
      s.box([0.3, 0.025, 0.22], [x + 0.32, y + 0.012, z - 0.02], s.material('#d9d5c8')).rotation.y = 0.3;
    } else if (a.left === 'jacket') {
      const [x, y, z] = spot(at0);
      const denim = s.material('#4a6a94', { roughness: 0.9 });
      const heap = s.ball([0.32, 0.07, 0.2], [x, y + 0.05, z], denim, 10);
      heap.rotation.y = random();
      s.ball([0.1, 0.05, 0.3], [x + 0.2, y + 0.02, z + 0.16], denim, 8).rotation.set(0.5, 0.4, 0);
      s.ball([0.09, 0.04, 0.26], [x - 0.12, y + 0.0, z + 0.22], denim, 8).rotation.set(0.9, -0.2, 0);
    } else if (a.left === 'skateboard') {
      const x = (random() - 0.5) * 0.8, z = frontR + 0.06;
      const deck = s.box([0.2, 0.78, 0.015], [x, 0.4, z + 0.1], s.material(['#d3312b', '#2a63c4', '#1c1c1c', '#3fa3a0'][Math.floor(random() * 4)]));
      deck.rotation.x = 0.26;
      for (const y of [0.2, 0.62]) for (const dx of [-0.09, 0.09]) s.cylinder(0.027, 0.027, 0.03, [x + dx, y, z + 0.17 - y * 0.26 + 0.07], s.material('#f1ece0'), 10).rotation.z = Math.PI / 2;
    } else if (a.left === 'pigeons') {
      const grey = s.material('#7f8a94', { roughness: 0.8 });
      for (let k = 0; k < 2 + Math.floor(random() * 2); k++) {
        const ang = at0 + (k - 1) * mix(0.25, 0.5, random());
        const [x, y, z] = spot(ang, seatR + (random() - 0.5) * 0.15);
        const face = random() * 6;
        s.ball([0.09, 0.07, 0.065], [x, y + 0.09, z], grey, 10).rotation.y = face;
        s.ball([0.04, 0.04, 0.04], [x + Math.cos(face) * 0.08, y + 0.17, z - Math.sin(face) * 0.08], s.material('#5e6a78'), 8);
        s.rod([x + Math.cos(face) * 0.11, y + 0.17, z - Math.sin(face) * 0.11], [x + Math.cos(face) * 0.14, y + 0.16, z - Math.sin(face) * 0.14], 0.008, s.material('#d9a05a'), 0.002);
        s.rod([x, y, z], [x, y + 0.05, z], 0.006, s.material('#c9705a'));
      }
    } else if (a.left === 'bags') {
      const hues = ['#f4efe0', '#ee6fa8', '#2f6b6a', '#27407a'];
      for (let k = 0; k < 2; k++) {
        const [x, y, z] = spot(at0 + k * 0.32);
        const hgt = mix(0.3, 0.4, random());
        const bag = s.box([0.28, hgt, 0.12], [x, y + hgt / 2, z], s.material(hues[Math.floor(random() * hues.length)], { roughness: 0.7 }));
        bag.rotation.y = at0 + k * 0.3 + (random() - 0.5) * 0.5;
        if (k === 1 && random() < 0.5) { bag.rotation.z = Math.PI / 2; bag.position.y = y + 0.07; }
        else s.ring(0.07, 0.006, [x, y + hgt + 0.03, z], dark, Math.PI).rotation.y = bag.rotation.y;
      }
    }

    // Leaf fall around the foot, and on the seat.
    const fallen = Math.round(mix(4, 110, wear) * (a.tree === 'ficus' ? 0.25 : 1) * mix(0.7, 1.2, random()));
    const hues = a.tree === 'dead' || a.tree === 'stump' ? ['#8a5a2b', '#a8702f', '#6e4a26'] : ['#8a5a2b', '#b98a3a', '#7f8a44', '#a8702f'];
    s.scatter(new THREE.TetrahedronGeometry(0.05).scale(1.2, 0.22, 1), s.material('#ffffff', { roughness: 1 }), Array.from({ length: fallen }, () => {
      const t = random() * Math.PI * 2, onSeat = random() < 0.25;
      const r = onSeat ? mix(inner + 0.1, R - 0.1, random()) * apothem : R + random() * random() * 1.0;
      return { at: [Math.cos(t) * r, onSeat ? seatH + 0.045 : 0.012, Math.sin(t) * r] as const, size: mix(0.7, 1.6, random()), color: hues[Math.floor(random() * hues.length)] };
    }));
    void treeTop;

    return s.finish({ footprint: R + 0.5 });
  },
});
