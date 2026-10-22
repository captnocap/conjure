import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

export default defineThing({
  questions: {
    finish: choice('What is the finish of the iron?', {
      polished: 'Polished smooth and pale, a huge ball bearing.',
      hammered: 'Hammered all over in small flat dimples, like a planished bowl.',
      rusted: 'Bloomed with orange-brown rust in spreading patches.',
      meteorite: 'Etched with the crossed silver bands of a cut meteorite.',
      cast: 'Dark rough cast iron, an old cannonball.',
    }),
    shape: choice('Is it dented or perfect?', {
      perfect: 'A perfect sphere.',
      dented: 'One broad shallow dent, as if it was dropped once.',
      battered: 'Battered with many dents of different sizes.',
      cracked: 'Split by one long dark crack.',
    }),
    heat: choice('Is there any faint heat left in it?', {
      cold: 'None. Cold right through.',
      pits: 'A dull red glow deep in a few pits and seams.',
      cheek: 'One side still cherry-warm, like iron just out of the forge.',
      temper: 'No glow, but temper colours: straw, purple and blue bands where it cooled.',
    }),
    clinging: choice('What clings to it?', {
      nothing: 'Nothing.',
      filings: 'Iron filings bristling at two poles like a magnet.',
      flakes: 'A ring of rust flakes it has shed around itself.',
      scrap: 'Bolts, nails and small scrap stuck to it.',
    }),
    rest: choice('How does it sit?', {
      bare: 'Simply resting where it is.',
      cup: 'Cradled in a low brass ring stand, a specimen.',
      crater: 'Pressed into the ground, which has cracked and heaped up around its weight.',
    }),
    stamp: noul('Has a maker struck a mark into it?'),
    seam: noul('Does it carry a casting seam round its middle and a sprue nub on top?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = 1.1;
    const base = { polished: '#aeb3b7', hammered: '#8b8f93', rusted: '#74767a', meteorite: '#9a9da0', cast: '#4d4f52' }[a.finish];
    const pick = () => new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
    const toUv = (d: THREE.Vector3) => [(Math.atan2(d.z, -d.x) / (Math.PI * 2) + 1) % 1 * 1024, Math.acos(THREE.MathUtils.clamp(d.y, -1, 1)) / Math.PI * 512] as const;

    // Dents and hammer marks are pressed into the sphere itself.
    const dents: { dir: THREE.Vector3; cos: number; depth: number; flat: boolean }[] = [];
    const dent = (dir: THREE.Vector3, radius: number, depth: number, flat = false) => dents.push({ dir, cos: Math.cos(radius), depth, flat });
    if (a.finish === 'hammered') for (let i = 0; i < 260; i++) dent(pick(), 0.13 + random() * 0.07, 0.02 + random() * 0.014, true);
    if (a.finish === 'cast') for (let i = 0; i < 70 + mood.wear * 90; i++) dent(pick(), 0.035 + random() * 0.05, 0.02 + random() * 0.02);
    for (let i = 0; i < mood.wear * 40; i++) dent(pick(), 0.03 + random() * 0.05, 0.015 + random() * 0.02);
    const bigDent = new THREE.Vector3(0.45 - random() * 0.3, 0.45, 0.75).normalize();
    if (a.shape === 'dented') dent(bigDent, 0.62, 0.17);
    if (a.shape === 'battered') { dent(bigDent, 0.45, 0.12); for (let i = 0; i < 16; i++) dent(pick(), 0.16 + random() * 0.3, 0.04 + random() * 0.08); }
    const geometry = new THREE.SphereGeometry(R, 128, 80);
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    const p = new THREE.Vector3(), d = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) {
      d.fromBufferAttribute(position, i).normalize();
      let sink = 0;
      for (const mark of dents) {
        const c = d.dot(mark.dir);
        if (c <= mark.cos) continue;
        const k = (c - mark.cos) / (1 - mark.cos);
        sink = Math.max(sink, mark.depth * (mark.flat ? Math.min(1, k * 2.2) : k * k * (3 - 2 * k)));
      }
      p.copy(d).multiplyScalar(R - sink);
      position.setXYZ(i, p.x, p.y, p.z);
    }
    geometry.computeVertexNormals();

    // Paint: colour and a separate glow map.
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
    const hot = document.createElement('canvas'); hot.width = 1024; hot.height = 512;
    const ctx = canvas.getContext('2d')!, glow = hot.getContext('2d')!;
    ctx.fillStyle = base; ctx.fillRect(0, 0, 1024, 512);
    glow.fillStyle = '#000'; glow.fillRect(0, 0, 1024, 512);
    const blot = (c: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, alpha: number) => {
      const stretch = 1 / Math.max(0.25, Math.sin(y / 512 * Math.PI));
      for (const dx of [-1024, 0, 1024]) { const g = c.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, colour); g.addColorStop(1, 'rgba(0,0,0,0)'); c.save(); c.globalAlpha = alpha; c.translate(x + dx, y); c.scale(stretch, 1); c.fillStyle = g; c.fillRect(-r, -r, r * 2, r * 2); c.restore(); }
    };
    for (let i = 0; i < 500; i++) blot(ctx, random() * 1024, random() * 512, 8 + random() * 40, random() < 0.5 ? '#ffffff' : '#000000', 0.05 + random() * 0.07);
    if (a.finish === 'polished') for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(255,255,255,${0.03 + random() * 0.06})`; ctx.fillRect(0, random() * 512, 1024, 1 + random() * 5); }
    if (a.finish === 'meteorite') {
      for (let i = 0; i < 520; i++) {
        const angle = [0.35, 0.35 + Math.PI / 3, 0.35 + Math.PI * 2 / 3, 0.35 + Math.PI / 2][Math.floor(random() * 3.4)];
        const x = random() * 1024, y = random() * 512, len = 30 + random() * 150;
        ctx.strokeStyle = random() < 0.55 ? `rgba(226,230,232,${0.5 + random() * 0.4})` : `rgba(70,74,80,${0.4 + random() * 0.4})`;
        ctx.lineWidth = 1.5 + random() * 6;
        for (const dx of [-1024, 0, 1024]) { ctx.beginPath(); ctx.moveTo(x + dx - Math.cos(angle) * len, y - Math.sin(angle) * len); ctx.lineTo(x + dx + Math.cos(angle) * len, y + Math.sin(angle) * len); ctx.stroke(); }
      }
    }
    const rust = (a.finish === 'rusted' ? 0.5 : a.finish === 'cast' ? 0.12 : 0.02) + mood.wear * 0.3;
    for (let i = 0; i < rust * 380; i++) { const x = random() * 1024, y = random() * 512, r = 14 + random() * 60; blot(ctx, x, y, r, ['#7d4222', '#9a5428', '#5f2f17'][i % 3], 0.75); if (random() < 0.4) blot(ctx, x, y, r * 0.35, '#a8622e', 0.5); }
    for (const mark of dents) if (!mark.flat && mark.cos > 0.99) { const [x, y] = toUv(mark.dir); blot(ctx, x, y, 7, '#111214', 0.8); }
    if (a.heat === 'temper') {
      const bands = ctx.createLinearGradient(0, 0, 0, 512);
      ([[0, '#c9a24a'], [0.2, '#b06a34'], [0.36, '#7a3f78'], [0.52, '#3a4fa0'], [0.68, '#4f8fb8'], [0.85, 'rgba(120,130,140,0)'], [1, 'rgba(120,130,140,0)']] as const).forEach(([at, c]) => bands.addColorStop(at, c));
      ctx.globalAlpha = 0.62; ctx.fillStyle = bands; ctx.fillRect(0, 0, 1024, 512); ctx.globalAlpha = 1;
    }
    if (a.heat === 'cheek') { const [x, y] = toUv(new THREE.Vector3(0.7, -0.15, 0.7).normalize()); blot(glow, x, y, 250, '#ff4a12', 1); blot(glow, x, y, 120, '#ff9a3a', 0.9); blot(ctx, x, y, 230, '#5a1c10', 0.6); }
    if (a.heat === 'pits') for (let i = 0; i < 26; i++) { const dir = i < dents.length && !dents[i].flat ? dents[i].dir : pick(); const [x, y] = toUv(dir); blot(ctx, x, y, 16, '#1a0c08', 0.9); blot(glow, x, y, 6 + random() * 9, '#ff5a1e', 1); }
    if (a.stamp) {
      const [x, y] = toUv(new THREE.Vector3(-0.25, 0.1, 0.96).normalize());
      ctx.save(); ctx.translate(x, y); ctx.rotate((random() - 0.5) * 0.3);
      ctx.strokeStyle = 'rgba(15,16,18,0.85)'; ctx.fillStyle = 'rgba(15,16,18,0.85)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 44, 0, 7); ctx.stroke();
      ctx.font = 'bold 40px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(['Fe', '26', 'Fe⁵⁶', 'N°1'][Math.floor(random() * 4)], 0, 2, 76);
      ctx.restore();
    }
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    const emissiveMap = new THREE.CanvasTexture(hot); emissiveMap.colorSpace = THREE.SRGBColorSpace;
    const heat = mix(0.7, 1.4, mood.warmth);
    const iron = new THREE.MeshStandardMaterial({
      map, emissiveMap, emissive: '#ffffff', emissiveIntensity: a.heat === 'cheek' || a.heat === 'pits' ? heat : 0,
      metalness: { polished: 0.55, hammered: 0.5, rusted: 0.2, meteorite: 0.5, cast: 0.3 }[a.finish],
      roughness: { polished: 0.2, hammered: 0.38, rusted: 0.85, meteorite: 0.35, cast: 0.8 }[a.finish] + mood.wear * 0.12,
    });
    const lift = a.rest === 'cup' ? 0.16 : 0;
    const star = new THREE.Group();
    star.position.y = R + lift;
    s.root.add(star);
    const globe = new THREE.Mesh(geometry, iron);
    globe.castShadow = globe.receiveShadow = true;
    star.add(globe);
    star.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.03, 40, 24), new THREE.MeshBasicMaterial({ color: '#c9d1d8', transparent: true, opacity: 0.13, depthWrite: false, side: THREE.BackSide })));

    const dark = new THREE.MeshStandardMaterial({ color: '#0d0d0f', roughness: 1, emissive: '#ff4a12', emissiveIntensity: a.heat === 'pits' ? 0.9 : 0 });
    if (a.shape === 'cracked') {
      let dir = new THREE.Vector3(-0.5, 0.75, 0.45).normalize();
      const go = new THREE.Vector3(0.5, -0.8, 0.25);
      const line: THREE.Vector3[] = [];
      for (let i = 0; i < 16; i++) { line.push(dir.clone().multiplyScalar(R * 1.001)); go.add(pick().multiplyScalar(0.7)).normalize(); dir = dir.addScaledVector(go, 0.16).normalize(); }
      const crack = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(line), 60, 0.022, 5), dark);
      star.add(crack);
      for (const at of [4, 9]) { const side = [line[at].clone()]; let e = line[at].clone().normalize(); const h = pick(); for (let i = 0; i < 5; i++) { e = e.addScaledVector(h, 0.1).normalize(); side.push(e.clone().multiplyScalar(R * 1.001)); } star.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(side), 20, 0.012, 5), dark)); }
    }
    if (a.seam) {
      const metal = new THREE.MeshStandardMaterial({ color: new THREE.Color(base).multiplyScalar(0.8), roughness: 0.7, metalness: 0.4 });
      const band = new THREE.Mesh(new THREE.TorusGeometry(R * 0.998, 0.022, 6, 96), metal);
      band.rotation.x = Math.PI / 2 + 0.08; band.rotation.y = 0.06;
      const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.12, 12), metal);
      nub.position.set(0.05, R * 0.99, -0.06); nub.castShadow = true;
      star.add(band, nub);
    }

    const up = new THREE.Vector3(0, 1, 0), m = new THREE.Matrix4(), quat = new THREE.Quaternion(), size = new THREE.Vector3(), at = new THREE.Vector3();
    if (a.clinging === 'filings') {
      const axis = new THREE.Vector3(0.45, 0.8, 0.35).normalize();
      const count = 520 + Math.round(mood.density * 300);
      const bristles = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 4), new THREE.MeshStandardMaterial({ color: '#2f3134', roughness: 0.6, metalness: 0.5 }), count);
      for (let i = 0; i < count; i++) {
        let dir = pick();
        while (Math.abs(dir.dot(axis)) < 0.45 + random() * 0.4) dir = pick();
        const cos = dir.dot(axis);
        // A dipole's field at the surface: twice the radial part along the axis, plus the tangent part.
        const field = dir.clone().multiplyScalar(2 * cos).add(dir.clone().multiplyScalar(cos).sub(axis)).multiplyScalar(Math.sign(cos)).normalize();
        const length = (0.1 + random() * 0.3) * Math.abs(cos);
        quat.setFromUnitVectors(up, field);
        bristles.setMatrixAt(i, m.compose(at.copy(dir).multiplyScalar(R * 0.99).addScaledVector(field, length / 2), quat, size.set(0.012, length, 0.012)));
      }
      bristles.castShadow = true;
      star.add(bristles);
    }
    if (a.clinging === 'scrap') {
      const steel = s.material('#9a9da1', { metalness: 0.6, roughness: 0.4 }), brown = s.material('#7b4a2c', { roughness: 0.9 });
      const n = 9 + Math.round(mood.density * 12);
      for (let i = 0; i < n; i++) {
        const dir = new THREE.Vector3(random() - 0.5, random() * 0.9 - 0.25, random() * 0.8 + 0.1).normalize();
        const item = new THREE.Group();
        const kind = i % 3, mat = random() < 0.5 ? steel : brown;
        if (kind === 0) { const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.2, 8), mat); shank.position.y = 0.1; const head = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.035, 6), mat); head.position.y = 0.21; item.add(shank, head); }
        if (kind === 1) { const nut = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.02, 5, 6), mat); nut.rotation.x = Math.PI / 2; nut.position.y = 0.02; item.add(nut); }
        if (kind === 2) { const nail = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.012, 0.3, 6), mat); nail.rotation.z = Math.PI / 2; nail.position.y = 0.014; const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.008, 8), mat); cap.rotation.z = Math.PI / 2; cap.position.set(0.15, 0.014, 0); item.add(nail, cap); }
        item.traverse((node) => { node.castShadow = true; });
        item.position.copy(dir).multiplyScalar(R * 0.995);
        item.quaternion.setFromUnitVectors(up, dir);
        item.rotateY(random() * 6);
        if (kind === 0) item.rotateZ((random() - 0.5) * 1.2);
        item.scale.setScalar(1.3);
        star.add(item);
      }
    }
    if (a.clinging === 'flakes') {
      const count = 150 + Math.round(mood.density * 200);
      const flakes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.12, 0.7), new THREE.MeshStandardMaterial({ roughness: 0.95 }), count);
      const tint = new THREE.Color();
      for (let i = 0; i < count; i++) {
        const t = random() * Math.PI * 2, r = R * (0.75 + random() ** 1.6 * 0.95), w = 0.02 + random() ** 2 * 0.07;
        quat.setFromEuler(new THREE.Euler((random() - 0.5) * 0.5, random() * 6, (random() - 0.5) * 0.5));
        flakes.setMatrixAt(i, m.compose(at.set(Math.cos(t) * r, 0.01, Math.sin(t) * r), quat, size.set(w, w, w)));
        flakes.setColorAt(i, tint.set(['#8f4a24', '#b9652c', '#6d3418', '#55301c'][i % 4]));
      }
      flakes.castShadow = flakes.receiveShadow = true;
      s.root.add(flakes);
    }

    if (a.rest === 'cup') {
      const brass = s.material('#b08a3e', { metalness: 0.6, roughness: 0.35 });
      s.lathe([[0.78, 0], [0.82, 0.03], [0.7, 0.1], [0.66, 0.3], [0.72, 0.36], [0.6, 0.36], [0.56, 0.12], [0.5, 0.06], [0.5, 0]], brass);
    }
    if (a.rest === 'crater') {
      const dirt = s.material('#7f776c', { roughness: 1, flatShading: true, side: THREE.DoubleSide });
      s.lathe([[0.5, 0], [0.62, 0.16], [0.86, 0.3], [1.02, 0.27], [1.35, 0.1], [1.75, 0.02], [1.8, 0]], dirt);
      for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2 + random() * 0.3, r = 1.0 + random() * 0.55; const slab = s.box([0.34 + random() * 0.3, 0.07, 0.26 + random() * 0.25], [Math.cos(t) * r, 0.2 - (r - 1) * 0.25, Math.sin(t) * r], dirt); slab.rotation.set((random() - 0.5) * 0.3, -t, 0.35 + random() * 0.35); }
    }

    star.rotation.y = (random() - 0.5) * 0.3;
    return s.finish({
      footprint: R,
      update(_dt, time) {
        if (a.heat === 'cheek' || a.heat === 'pits') { iron.emissiveIntensity = heat * (1 + Math.sin(time * 0.7) * 0.12 * mix(0.5, 1.5, mood.energy)); if (a.heat === 'pits') dark.emissiveIntensity = 0.9 * (1 + Math.sin(time * 0.7) * 0.2); }
      },
    });
  },
});
