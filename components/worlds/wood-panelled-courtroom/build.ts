import * as THREE from 'three';
import { type Placeable, Sculpture, choice, defineWorld, disposeTree, mix } from '@conjure/kit';

const KINDS = {
  assize: { wood: '#5a321d', plaster: '#e6dfcb', ceiling: '#d8d0bc', accent: '#7c1f2b', metal: '#c9a24a', wains: 3.5 },
  county: { wood: '#b28552', plaster: '#e9e6d9', ceiling: '#eeede6', accent: '#2f4f7a', metal: '#9aa0a4', wains: 2.7 },
  colonial: { wood: '#46301f', plaster: '#f2efe6', ceiling: '#ece8dc', accent: '#2f5a44', metal: '#b88a34', wains: 1.7 },
  tribunal: { wood: '#cfb68b', plaster: '#dfe1e1', ceiling: '#ececea', accent: '#1e2125', metal: '#b9c0c4', wains: 4.6 },
} as const;

export default defineWorld({
  questions: {
    kind: choice('What kind of courtroom is it?', {
      assize: 'A Victorian assize court: dark oak panelling to above head height, a carved canopy over the bench, brass and oxblood leather.',
      county: 'A mid-century county courthouse: honey-coloured veneer, flags either side of the bench, practical and a little tired.',
      colonial: 'A whitewashed colonial courtroom with low dark wainscot, shuttered windows and slow ceiling fans.',
      tribunal: 'A modern tribunal chamber: pale slatted timber up the walls, black stone, very little ornament.',
    }),
    light: choice('What is the light at the windows doing?', {
      shafts: 'Clear sun: hard slanted shafts cut through the dusty air and lay bright window shapes across the floor.',
      overcast: 'Flat grey overcast, even and shadowless, a long ordinary sitting day.',
      lamps: 'Dark outside, rain or evening: the windows are blue and the hanging lamps are lit.',
      glare: 'White fog or snow-glare outside, the windows blazing and the room hazy.',
    }),
    crest: choice('What hangs on the wall above the bench?', {
      arms: 'A painted coat of arms: a shield with a crown.',
      seal: 'A great round seal.',
      scales: 'A gilded pair of scales.',
      clock: 'Only a large clock.',
      removed: 'Nothing now: a pale unfaded patch where a crest was taken down.',
    }),
    session: choice('What is happening in the room?', {
      empty: 'Nothing. It is empty and silent before the day begins.',
      waiting: 'The public gallery is filling up, but the bench and jury box are still empty.',
      sitting: 'The court is sitting: a judge on the bench, counsel on their feet, a full jury and gallery.',
      cleared: 'It has just been cleared in a hurry: papers on the floor, chairs shoved aside.',
      disused: 'It is long disused: dust sheets over the furniture.',
    }),
    floor: choice('What is the floor of the well?', {
      parquet: 'Worn herringbone parquet.',
      carpet: 'Boards with a deep red carpet runner up the middle.',
      chequer: 'Black and white marble chequer.',
      lino: 'Dull green linoleum.',
    }),
    windows: choice('What are the windows like?', {
      arched: 'Three tall round-arched windows down each side.',
      sash: 'Tall rectangular many-paned windows.',
      slits: 'A high row of narrow clerestory slots.',
    }),
    well: choice('Besides the bench, what furnishes the well of the court?', {
      tables: 'Two long counsel tables with chairs.',
      dock: 'A railed dock standing alone at the back of the well.',
      bare: 'Nothing; the floor is open.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const root = s.root;
    const { mood, random } = context;
    const K = KINDS[a.kind];
    const W = 13, H = 8, ZB = -8, ZF = 9.5, GZ = 5.5, GY = 0.7;
    const L = ZF - ZB, zMid = (ZF + ZB) / 2;
    const jit = (n: number) => (random() - 0.5) * n;

    // ---- materials
    const woodCanvas = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d')!;
      const base = new THREE.Color(K.wood).lerp(new THREE.Color('#8b8275'), mood.wear * 0.2);
      const shade = (k: number) => `#${base.clone().multiplyScalar(k).getHexString()}`;
      g.fillStyle = shade(1); g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(0,0,0,${0.03 + random() * 0.05})`; g.fillRect(0, random() * 256, 256, 1 + random() * 2); }
      if (a.kind === 'tribunal') { for (let x = 0; x < 256; x += 32) { g.fillStyle = shade(0.62); g.fillRect(x, 0, 7, 256); g.fillStyle = shade(1.12); g.fillRect(x + 7, 0, 3, 256); } }
      else {
        g.fillStyle = shade(0.6); g.fillRect(26, 26, 204, 204);
        g.fillStyle = shade(1.22); g.fillRect(32, 32, 198, 198);
        g.fillStyle = shade(0.86); g.fillRect(32, 32, 190, 190);
        g.fillStyle = shade(1.1); g.fillRect(52, 52, 150, 150);
        g.fillStyle = shade(0.7); g.fillRect(52, 52, 150, 5); g.fillRect(52, 52, 5, 150);
        g.fillStyle = shade(0.55); g.fillRect(0, 0, 256, 6); g.fillRect(0, 0, 4, 256);
      }
      return c;
    })();
    const panelled = (cols: number, rows: number) => {
      const t = new THREE.CanvasTexture(woodCanvas); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(cols, rows);
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 + mood.wear * 0.25 });
    };
    const wood = s.material(K.wood, { roughness: 0.55 });
    const darkWood = s.material(new THREE.Color(K.wood).multiplyScalar(0.62), { roughness: 0.5 });
    const plaster = s.material(K.plaster, { roughness: 0.95 });
    const ceilingMat = s.material(K.ceiling, { roughness: 0.95 });
    const accent = s.material(K.accent, { roughness: 0.6 });
    const metal = s.material(K.metal, { metalness: 0.75, roughness: 0.3 });
    const black = s.material('#18191c', { roughness: 0.85 });
    const white = s.material('#f1eee4');
    const paper = s.material('#f4f0e2');

    // ---- light
    const sunny = a.light === 'shafts', night = a.light === 'lamps';
    const side = mood.daylight < 0.5 ? -1 : 1; // which wall the sun comes through
    const el = THREE.MathUtils.degToRad(mix(24, 46, 1 - Math.abs(mood.daylight * 2 - 1)));
    const sunColour = new THREE.Color().setHSL(mix(0.6, 0.085, mood.warmth), night ? 0.35 : 0.55, night ? 0.7 : 0.86);
    root.add(new THREE.HemisphereLight(night ? '#c9d2e6' : '#fbf7ee', '#7b7264', night ? 1.0 : a.light === 'overcast' ? 1.9 : 1.5));
    const key = new THREE.DirectionalLight(sunColour, { shafts: 4.2, overcast: 0.9, lamps: 0.5, glare: 2.0 }[a.light]);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.normalBias = 0.04; key.shadow.bias = -0.0004;
    key.shadow.radius = sunny ? 2 : 6;
    const toSun = new THREE.Vector3(side * Math.cos(el), Math.sin(el), 0.12).normalize();
    key.target.position.set(0, 2, -1); key.position.copy(key.target.position).addScaledVector(toSun, 34);
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight(night ? '#ffd9a0' : '#fff6e6', night ? 1.5 : 0.95);
    fill.position.set(-side * 3, 7, 16); root.add(fill);
    const background = new THREE.Color(K.plaster).lerp(new THREE.Color(night ? '#8f9ab0' : '#f3efe4'), 0.5);

    // ---- floor
    const floorCanvas = document.createElement('canvas'); floorCanvas.width = floorCanvas.height = 256;
    {
      const g = floorCanvas.getContext('2d')!;
      if (a.floor === 'chequer') { for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? '#e9e6dc' : '#3a3b3e'; g.fillRect(x * 128, y * 128, 128, 128); } }
      else if (a.floor === 'lino') { g.fillStyle = '#6f8a72'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 700; i++) { g.fillStyle = random() > 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'; g.fillRect(random() * 256, random() * 256, 3, 3); } }
      else {
        g.fillStyle = '#a2794c'; g.fillRect(0, 0, 256, 256);
        for (let y = -1; y < 9; y++) for (let x = 0; x < 4; x++) {
          g.fillStyle = ['#9a7146', '#ad8454', '#8f673e', '#b58c5b'][Math.floor(random() * 4)];
          g.save(); g.translate(x * 64 + 32, y * 32 + (x % 2) * 16); g.rotate(x % 2 ? 0.785 : -0.785); g.fillRect(-42, -10, 84, 20); g.strokeStyle = 'rgba(40,20,5,0.5)'; g.strokeRect(-42, -10, 84, 20); g.restore();
        }
      }
    }
    const floorTex = new THREE.CanvasTexture(floorCanvas); floorTex.colorSpace = THREE.SRGBColorSpace; floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(a.floor === 'chequer' ? W / 1.6 : W / 2.4, a.floor === 'chequer' ? L / 1.6 : L / 2.4);
    const floor = s.box([W + 1, 0.3, L + 1], [0, -0.15, zMid], new THREE.MeshStandardMaterial({ map: floorTex, roughness: a.floor === 'chequer' ? 0.35 : 0.7 }));
    if (a.floor === 'carpet') { s.box([2.6, 0.03, GZ - ZB - 2.7], [0, 0.015, (GZ + ZB + 2.7) / 2], s.material(mood.cheer > 0.5 ? '#9c2331' : '#6d1c27', { roughness: 1 })); for (const x of [-1.22, 1.22]) s.box([0.08, 0.034, GZ - ZB - 2.7], [x, 0.016, (GZ + ZB + 2.7) / 2], metal); }

    // ---- walls
    const wains = K.wains;
    s.box([W, wains, 0.3], [0, wains / 2, ZB - 0.15], panelled(Math.round(W / 1.1), Math.max(1, Math.round(wains / 1.2))));
    s.box([W, H - wains, 0.3], [0, (H + wains) / 2, ZB - 0.15], plaster);
    s.box([W, 0.14, 0.12], [0, wains + 0.02, ZB + 0.05], darkWood);
    const spec = a.windows === 'slits'
      ? { zs: [-6.2, -4.2, -2.2, -0.2, 1.8, 3.8], w: 0.8, sill: Math.max(wains + 0.5, 5.0), top: 7.1, arch: false }
      : { zs: [-5.4, -1.6, 2.2], w: 2.0, sill: Math.max(wains + 0.45, 3.2), top: a.windows === 'arched' ? 6.2 : 7.0, arch: a.windows === 'arched' };
    const skyGlow = new THREE.MeshStandardMaterial({
      color: night ? '#3b4a6b' : a.light === 'overcast' ? '#cfd3d6' : '#fdfbf2',
      emissive: night ? '#32446e' : a.light === 'overcast' ? '#c3c8cc' : '#fff8e0',
      emissiveIntensity: night ? 0.55 : a.light === 'glare' ? 1.5 : 1.0, roughness: 1,
    });
    for (const sx of [-1, 1]) {
      const shape = new THREE.Shape();
      const u0 = -ZF, u1 = -ZB;
      shape.moveTo(u0, wains); shape.lineTo(u1, wains); shape.lineTo(u1, H); shape.lineTo(u0, H); shape.closePath();
      for (const zc of spec.zs) {
        const hole = new THREE.Path(); const u = -zc;
        hole.moveTo(u - spec.w / 2, spec.sill); hole.lineTo(u + spec.w / 2, spec.sill); hole.lineTo(u + spec.w / 2, spec.top);
        if (spec.arch) hole.absarc(u, spec.top, spec.w / 2, 0, Math.PI, false); else hole.lineTo(u - spec.w / 2, spec.top);
        hole.closePath(); shape.holes.push(hole);
      }
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false, curveSegments: 10 });
      geometry.rotateY(Math.PI / 2);
      s.mesh(geometry, plaster, [sx > 0 ? W / 2 : -W / 2 - 0.3, 0, 0]);
      s.box([0.3, wains, L], [sx * (W / 2 + 0.15), wains / 2, zMid], panelled(Math.round(L / 1.1), Math.max(1, Math.round(wains / 1.2))));
      s.box([0.12, 0.14, L], [sx * (W / 2 - 0.05), wains + 0.02, zMid], darkWood);
      for (const zc of spec.zs) {
        const top = spec.top + (spec.arch ? spec.w / 2 : 0), x = sx * (W / 2 + 0.15);
        const sky = s.box([0.02, top - spec.sill + 0.2, spec.w + 0.2], [sx * (W / 2 + 0.34), (top + spec.sill) / 2, zc], skyGlow); sky.castShadow = false;
        const boarded = a.session === 'disused' && random() < 0.3;
        if (boarded) { for (let i = 0; i < 4; i++) s.box([0.05, 0.5, spec.w + 0.3], [sx * (W / 2 + 0.02), spec.sill + 0.4 + i * (top - spec.sill) / 4.4, zc], wood).rotation.x = jit(0.12); continue; }
        const bars = a.windows === 'slits' ? 0 : 2, rows = Math.round((top - spec.sill) / 0.9);
        for (let i = 1; i <= bars; i++) s.box([0.07, top - spec.sill, 0.07], [x, (top + spec.sill) / 2, zc - spec.w / 2 + i * spec.w / (bars + 1)], white);
        for (let i = 1; i < rows; i++) s.box([0.07, 0.07, spec.w], [x, spec.sill + i * (top - spec.sill) / rows, zc], white);
        s.box([0.42, 0.08, spec.w + 0.3], [sx * (W / 2 - 0.06), spec.sill - 0.04, zc], a.kind === 'colonial' ? darkWood : white);
        if (a.kind === 'colonial') for (const e of [-1, 1]) { const sh = s.box([0.05, top - spec.sill, spec.w * 0.42], [sx * (W / 2 - 0.12), (top + spec.sill) / 2, zc + e * spec.w * 0.7], accent); sh.rotation.y = sx * e * 0.25; }
      }
    }
    // Ceiling with beams.
    s.box([W + 0.6, 0.3, L], [0, H + 0.15, zMid], ceilingMat);
    for (let i = 0; i < 6; i++) s.box([W, 0.32, 0.36], [0, H - 0.16, ZB + 0.5 + i * (L - 1) / 5], a.kind === 'assize' || a.kind === 'colonial' ? darkWood : ceilingMat);
    for (const x of [-W / 4, W / 4]) s.box([0.3, 0.26, L], [x, H - 0.13, zMid], a.kind === 'assize' || a.kind === 'colonial' ? darkWood : ceilingMat);
    s.box([W, 0.3, 0.2], [0, H - 0.45, ZB + 0.1], plaster);

    // Sun shafts and dust.
    const dust = new THREE.Group(); root.add(dust);
    if (sunny || a.light === 'glare') {
      const d = new THREE.Vector3(-side * Math.cos(el), -Math.sin(el), 0);
      const beam = new THREE.MeshBasicMaterial({ color: sunColour.clone().lerp(new THREE.Color('#ffffff'), 0.45), transparent: true, opacity: sunny ? mix(0.09, 0.16, mood.wear) : 0.06, depthWrite: false, side: THREE.DoubleSide });
      const motes: { at: [number, number, number]; size: number }[] = [];
      for (const zc of spec.zs) {
        const top = spec.top + (spec.arch ? spec.w * 0.35 : 0);
        const x0 = side * W / 2;
        const corners = [[spec.sill, zc - spec.w / 2], [spec.sill, zc + spec.w / 2], [top, zc + spec.w / 2], [top, zc - spec.w / 2]];
        const pts: number[] = [];
        for (const [y, z] of corners) pts.push(x0, y, z);
        for (const [y, z] of corners) { const t = Math.min(y / Math.sin(el), (W - 0.1) / Math.cos(el)); pts.push(x0 + d.x * t, y + d.y * t, z); }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        geometry.setIndex([0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7]);
        const shaft = new THREE.Mesh(geometry, beam); shaft.frustumCulled = false; root.add(shaft);
        for (let i = 0; i < 46; i++) {
          const y = mix(spec.sill, top, random()), t = random() * Math.min(y / Math.sin(el), W / Math.cos(el));
          motes.push({ at: [x0 + d.x * t, y + d.y * t, zc + jit(spec.w)], size: mix(0.018, 0.04, random()) });
        }
      }
      const speck = new THREE.MeshStandardMaterial({ color: '#fffaf0', emissive: '#fff3d0', emissiveIntensity: 1.4, transparent: true, opacity: 0.85, depthWrite: false });
      const cloud = s.scatter(new THREE.SphereGeometry(1, 5, 4), speck, motes); cloud.castShadow = cloud.receiveShadow = false;
      dust.add(cloud);
    }

    // ---- people
    const cloth = mood.cheer > 0.55 ? ['#2f4f7a', '#8d3b3b', '#4c7a5a', '#c9a24a', '#6a4f86', '#b0683c', '#3a3d42', '#d9cfc0'] : ['#2b2e33', '#3a3d42', '#4a4640', '#33403f', '#463a3a', '#5a5852', '#6b6558'];
    const skins = ['#d9b596', '#b98a68', '#7a5238', '#e6c8ae', '#9a6b4a'];
    const hairs = ['#2a211c', '#5a4634', '#b9b3a8', '#8a5a33', '#17181b', '#d8d4c8'];
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const person = (x: number, y: number, z: number, turn: number, o: { robe?: THREE.Material; wig?: boolean; stand?: boolean; arm?: boolean } = {}) => {
      const g = new THREE.Group();
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, p: [number, number, number]) => { const m = new THREE.Mesh(geometry, material); m.position.set(...p); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
      const robe = o.robe ?? s.material(pick(cloth), { roughness: 0.9 });
      const h = o.stand ? mix(1.36, 1.52, random()) : mix(0.56, 0.68, random());
      add(new THREE.LatheGeometry((o.stand ? [[0.26, 0], [0.22, h * 0.45], [0.24, h * 0.8], [0.2, h * 0.95], [0.07, h], [0, h + 0.01]] : [[0.2, 0], [0.23, h * 0.5], [0.19, h * 0.9], [0.07, h], [0, h + 0.01]]).map(([r, yy]) => new THREE.Vector2(r, yy)), 12), robe, [0, 0, 0]);
      const head = add(new THREE.SphereGeometry(0.115, 14, 10), s.material(pick(skins)), [0, h + 0.12, 0.01]); head.scale.y = 1.15;
      if (o.wig) { add(new THREE.SphereGeometry(0.135, 12, 8), white, [0, h + 0.17, -0.03]); for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.07, 0.24, 0.14), white, [sx * 0.12, h + 0.04, -0.03]); }
      else { const hair = add(new THREE.SphereGeometry(0.122, 12, 8), s.material(pick(hairs)), [0, h + 0.15, -0.03]); hair.scale.set(1, 0.95, 1.05); }
      if (o.arm) { const arm = add(new THREE.CylinderGeometry(0.045, 0.06, 0.7, 8), robe, [0.38, h * 0.9, 0.22]); arm.rotation.set(1.1, 0, -0.7); }
      g.position.set(x, y, z); g.rotation.y = turn; root.add(g);
    };
    const sitting = a.session === 'sitting', disused = a.session === 'disused', cleared = a.session === 'cleared';
    const sheet = s.material('#e9e6dc', { roughness: 1 });
    const chair = (x: number, y: number, z: number, turn: number, tipped = false) => {
      const g = new THREE.Group();
      const add = (size: [number, number, number], p: [number, number, number], m: THREE.Material) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), m); mesh.position.set(...p); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); };
      add([0.48, 0.07, 0.46], [0, 0.46, 0], accent);
      add([0.48, 0.55, 0.06], [0, 0.78, -0.22], wood);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) add([0.05, 0.44, 0.05], [sx * 0.2, 0.22, sz * 0.19], wood);
      g.position.set(x, y, z); g.rotation.y = turn;
      if (tipped) { g.rotation.z = Math.PI / 2 * (random() > 0.5 ? 1 : -1); g.position.y += 0.24; }
      root.add(g);
    };

    // ---- the bench, under its crest
    const BW = 7.2, DY = 1.0, BZ = ZB + 2.3;
    s.box([BW + 1.6, DY, 2.3], [0, DY / 2, ZB + 1.15], panelled(8, 1));
    for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) s.box([0.9, DY - (i + 1) * 0.25, 1.0], [sx * (BW / 2 + 1.25 + i * 0.0), (DY - (i + 1) * 0.25) / 2, ZB + 0.6 + (i + 1) * 0.55], wood);
    s.box([BW, 1.25, 0.16], [0, DY + 0.625, BZ - 0.1], panelled(8, 1));
    s.box([BW + 0.3, 0.1, 0.9], [0, DY + 1.3, BZ - 0.42], darkWood);
    s.box([BW + 0.2, 0.14, 0.24], [0, DY + 0.07, BZ - 0.06], darkWood);
    for (const sx of [-1, 1]) s.box([0.16, 1.25, 0.9], [sx * (BW / 2 - 0.08), DY + 0.625, BZ - 0.5], wood);
    // Canopy panelling and judge's chair.
    const CH = Math.max(wains + 1.2, 5.2);
    s.box([4.2, CH, 0.25], [0, CH / 2, ZB + 0.12], panelled(4, Math.round(CH / 1.3)));
    if (a.kind === 'assize' || a.kind === 'colonial') {
      for (const sx of [-1, 1]) s.cylinder(0.14, 0.16, CH - DY, [sx * 2.1, DY + (CH - DY) / 2, ZB + 0.34], darkWood, 14);
      s.box([4.9, 0.22, 0.6], [0, CH + 0.1, ZB + 0.3], darkWood);
      const ped = new THREE.Shape(); ped.moveTo(-2.5, 0); ped.lineTo(2.5, 0); ped.lineTo(0, 0.95); ped.closePath();
      s.mesh(new THREE.ExtrudeGeometry(ped, { depth: 0.4, bevelEnabled: false }), wood, [0, CH + 0.2, ZB + 0.05]);
    } else s.box([4.5, 0.16, 0.4], [0, CH + 0.08, ZB + 0.2], darkWood);
    const judgeSeats = a.kind === 'tribunal' ? [-1.5, 0, 1.5] : [0];
    for (const x of judgeSeats) {
      s.box([0.8, 1.9, 0.12], [x, DY + 0.5 + 0.95, ZB + 0.75], disused ? sheet : darkWood);
      s.box([0.6, 1.5, 0.06], [x, DY + 0.55 + 0.95, ZB + 0.83], disused ? sheet : accent);
      s.box([0.74, 0.12, 0.6], [x, DY + 0.56, ZB + 1.1], disused ? sheet : accent);
      if (sitting) person(x, DY + 0.6, ZB + 1.15, 0, { robe: x === 0 && a.kind !== 'tribunal' ? s.material('#8d1f2a') : black, wig: a.kind === 'assize' || a.kind === 'colonial' });
    }
    // Bench-top furniture.
    const deskY = DY + 1.35;
    if (!disused) {
      s.cylinder(0.09, 0.1, 0.04, [0.75, deskY + 0.02, BZ - 0.3], wood, 14);
      const gav = s.cylinder(0.05, 0.05, 0.17, [0.75, deskY + 0.09, BZ - 0.3], darkWood, 12); gav.rotation.z = Math.PI / 2;
      s.rod([0.75, deskY + 0.09, BZ - 0.3], [0.95, deskY + 0.06, BZ - 0.62], 0.014, darkWood);
      for (let i = 0; i < 4 + Math.round(mood.density * 5); i++) { const hh = 0.05 + random() * 0.2; s.box([0.26, hh, 0.34], [mix(-BW / 2 + 0.5, BW / 2 - 0.5, random()), deskY + hh / 2, BZ - 0.3 + jit(0.2)], random() > 0.4 ? paper : s.material(pick(['#8d1f2a', '#22386b', '#d8c9a0']))).rotation.y = jit(0.5); }
      const shade = s.cylinder(0.07, 0.07, 0.34, [-1.1, deskY + 0.32, BZ - 0.3], s.material('#1f6b45', { emissive: '#3fae6d', emissiveIntensity: night ? 1.0 : 0.3 }), 12); shade.rotation.z = Math.PI / 2;
      s.rod([-1.1, deskY, BZ - 0.36], [-1.1, deskY + 0.3, BZ - 0.36], 0.014, metal);
    }
    // Clerk's desk below the bench.
    s.box([3.4, 0.95, 0.75], [0, 0.475, BZ + 0.6], panelled(4, 1));
    s.box([3.6, 0.07, 0.9], [0, 0.98, BZ + 0.6], darkWood);
    if (disused) s.box([3.9, 0.5, 1.2], [0, 0.82, BZ + 0.6], sheet);
    else { for (let i = 0; i < 3; i++) s.box([0.3, 0.05 + random() * 0.1, 0.24], [-1.2 + i * 1.1 + jit(0.3), 1.05, BZ + 0.6], paper).rotation.y = jit(0.6); if (sitting) person(0.4, 0.5, BZ + 0.2, 0, { robe: black }); }

    // Crest.
    const cy = Math.min(CH - 0.9, 4.6), cz = ZB + 0.27;
    if (a.crest === 'arms') {
      const sh = new THREE.Shape(); sh.moveTo(-0.55, 0.6); sh.lineTo(0.55, 0.6); sh.lineTo(0.55, 0); sh.quadraticCurveTo(0.5, -0.55, 0, -0.78); sh.quadraticCurveTo(-0.5, -0.55, -0.55, 0); sh.closePath();
      s.mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false }), metal, [0, cy, cz]);
      s.box([0.5, 0.56, 0.02], [-0.26, cy + 0.3, cz + 0.11], s.material('#b3222e')); s.box([0.5, 0.56, 0.02], [0.26, cy + 0.3, cz + 0.11], s.material('#22386b'));
      s.box([0.6, 0.4, 0.02], [0, cy - 0.2, cz + 0.11], s.material('#e9d9a0'));
      for (let i = 0; i < 5; i++) s.box([0.12, 0.26 + (i % 2 ? 0 : 0.1), 0.08], [-0.36 + i * 0.18, cy + 0.82, cz + 0.04], metal);
      s.box([0.9, 0.1, 0.08], [0, cy + 0.68, cz + 0.04], metal);
      for (const sx of [-1, 1]) { const sup = s.ball([0.26, 0.6, 0.06], [sx * 0.9, cy, cz + 0.05], metal, 12); sup.rotation.z = sx * -0.25; }
    } else if (a.crest === 'seal') {
      s.cylinder(0.85, 0.85, 0.1, [0, cy, cz + 0.05], metal, 40).rotation.x = Math.PI / 2;
      s.cylinder(0.66, 0.66, 0.12, [0, cy, cz + 0.05], accent, 40).rotation.x = Math.PI / 2;
      for (let i = 0; i < 5; i++) s.rod([0, cy, cz + 0.12], [Math.sin(i * 1.2566) * 0.52, cy + Math.cos(i * 1.2566) * 0.52, cz + 0.12], 0.09, metal, 0.01);
    } else if (a.crest === 'scales') {
      s.rod([0, cy - 0.7, cz + 0.06], [0, cy + 0.75, cz + 0.06], 0.045, metal); s.rod([-0.9, cy + 0.6, cz + 0.06], [0.9, cy + 0.6, cz + 0.06], 0.035, metal);
      for (const sx of [-1, 1]) { s.rod([sx * 0.9, cy + 0.6, cz + 0.06], [sx * 0.9 - 0.28, cy - 0.2, cz + 0.06], 0.012, metal); s.rod([sx * 0.9, cy + 0.6, cz + 0.06], [sx * 0.9 + 0.28, cy - 0.2, cz + 0.06], 0.012, metal); s.cylinder(0.34, 0.12, 0.12, [sx * 0.9, cy - 0.25, cz + 0.08], metal, 20); }
      s.box([0.7, 0.1, 0.1], [0, cy - 0.72, cz + 0.06], metal);
    } else if (a.crest === 'clock') {
      s.cylinder(0.8, 0.8, 0.1, [0, cy, cz + 0.05], darkWood, 40).rotation.x = Math.PI / 2;
      s.cylinder(0.68, 0.68, 0.12, [0, cy, cz + 0.05], white, 40).rotation.x = Math.PI / 2;
      for (let i = 0; i < 12; i++) s.box([0.04, 0.12, 0.02], [Math.sin(i * Math.PI / 6) * 0.58, cy + Math.cos(i * Math.PI / 6) * 0.58, cz + 0.12], black).rotation.z = -i * Math.PI / 6;
      const h1 = random() * 6.28, h2 = random() * 6.28;
      s.rod([0, cy, cz + 0.13], [Math.sin(h1) * 0.5, cy + Math.cos(h1) * 0.5, cz + 0.13], 0.02, black); s.rod([0, cy, cz + 0.13], [Math.sin(h2) * 0.33, cy + Math.cos(h2) * 0.33, cz + 0.13], 0.03, black);
    } else {
      s.box([1.5, 1.7, 0.02], [0, cy, cz], s.material(new THREE.Color(K.wood).multiplyScalar(1.35), { roughness: 0.8 }));
      for (const [x, y] of [[-0.6, 0.7], [0.6, 0.7], [-0.6, -0.7], [0.6, -0.7]]) s.cylinder(0.025, 0.025, 0.05, [x, cy + y, cz + 0.02], black, 6).rotation.x = Math.PI / 2;
    }
    if (a.kind === 'county') for (const sx of [-1, 1]) {
      s.cylinder(0.03, 0.03, 3.4, [sx * 2.9, DY + 1.7, ZB + 0.6], metal, 8); s.ball([0.07, 0.07, 0.07], [sx * 2.9, DY + 3.45, ZB + 0.6], metal, 8);
      const flag = s.box([0.06, 1.5, 0.8], [sx * 2.9, DY + 2.55, ZB + 0.95], s.material(sx < 0 ? (mood.cheer > 0.4 ? '#2b4a8c' : '#4b5563') : (mood.cheer > 0.4 ? '#a12a2a' : '#6b5b4b'), { roughness: 1 })); flag.rotation.y = sx * 0.5; flag.rotation.x = 0.06;
    }

    // ---- witness box (left of the bench) and jury box (right wall)
    const wx = -4.9, wz = BZ + 0.9;
    s.box([1.6, 0.3, 1.5], [wx, 0.15, wz], wood);
    s.box([1.5, 1.0, 0.1], [wx, 0.8, wz + 0.7], panelled(2, 1));
    for (const sx of [-1, 1]) s.box([0.1, 1.0, 1.4], [wx + sx * 0.72, 0.8, wz], panelled(2, 1));
    s.box([1.6, 0.07, 0.3], [wx, 1.33, wz + 0.64], darkWood);
    if (disused) s.box([1.8, 0.6, 1.7], [wx, 1.25, wz], sheet);
    else { s.rod([wx + 0.3, 1.36, wz + 0.64], [wx + 0.3, 1.62, wz + 0.5], 0.012, black); s.ball([0.03, 0.03, 0.04], [wx + 0.3, 1.63, wz + 0.48], black, 8); s.box([0.24, 0.06, 0.18], [wx - 0.3, 1.39, wz + 0.64], black); if (sitting) person(wx, 0.3, wz - 0.1, 0.3, { stand: true }); else chair(wx, 0.3, wz - 0.15, 0.2); }

    const jx = W / 2 - 1.5, jz0 = -4.6, jz1 = 1.6, jl = jz1 - jz0;
    s.box([2.9, 0.25, jl + 0.3], [jx, 0.125, (jz0 + jz1) / 2], wood);
    s.box([1.3, 0.38, jl + 0.3], [jx + 0.8, 0.44, (jz0 + jz1) / 2], wood);
    s.box([0.12, 0.95, jl + 0.3], [jx - 1.42, 0.72, (jz0 + jz1) / 2], panelled(6, 1));
    s.box([0.3, 0.07, jl + 0.4], [jx - 1.42, 1.22, (jz0 + jz1) / 2], darkWood);
    for (const z of [jz0 - 0.1, jz1 + 0.1]) s.box([1.5, 0.95, 0.12], [jx - 0.7, 0.72, z], panelled(1, 1));
    for (let t = 0; t < 2; t++) {
      const bx = jx - 0.55 + t * 1.25, by = 0.25 + t * 0.38;
      s.box([0.5, 0.08, jl - 0.2], [bx, by + 0.46, (jz0 + jz1) / 2], disused ? sheet : accent);
      s.box([0.1, 0.75, jl - 0.2], [bx + 0.3, by + 0.75, (jz0 + jz1) / 2], disused ? sheet : wood);
      for (let i = 0; i < 6; i++) {
        const z = jz0 + 0.55 + i * (jl - 1.1) / 5;
        if (sitting) person(bx, by + 0.5, z, -Math.PI / 2 + jit(0.3));
        else if (cleared && random() < 0.5) s.box([0.2, 0.02, 0.28], [bx - 0.05, by + 0.51, z], random() > 0.4 ? s.material('#f2d94e') : paper).rotation.y = jit(1.5);
      }
    }
    if (disused) s.box([3.0, 0.3, jl + 0.5], [jx + 0.1, 1.5, (jz0 + jz1) / 2], sheet).rotation.z = 0.25;

    // ---- the well
    if (a.well === 'tables') for (const sx of [-1, 1]) {
      const tx = sx * 2.5, tz = 3.3;
      s.box([2.6, 0.07, 0.95], [tx, 0.8, tz], darkWood);
      s.box([2.4, 0.5, 0.06], [tx, 0.5, tz - 0.4], panelled(3, 1));
      for (const ex of [-1, 1]) s.box([0.08, 0.78, 0.8], [tx + ex * 1.2, 0.39, tz], wood);
      if (disused) s.box([2.9, 0.5, 1.3], [tx, 0.62, tz], sheet);
      else {
        for (let i = 0; i < 2 + Math.round(mood.density * 4); i++) { const hh = 0.04 + random() * 0.14; s.box([0.26, hh, 0.34], [tx + jit(2.0), 0.835 + hh / 2, tz + jit(0.4)], random() > 0.5 ? paper : s.material(pick(['#8d1f2a', '#22386b', '#1f5a3c', '#d8c9a0']))).rotation.y = jit(0.8); }
        for (const ex of [-0.6, 0.6]) {
          if (sitting && ex * sx < 0) person(tx + ex, 0, tz + 0.75, Math.PI + jit(0.4), { stand: true, robe: black, wig: a.kind === 'assize' || a.kind === 'colonial', arm: sx < 0 });
          else if (sitting) person(tx + ex, 0.48, tz + 0.75, Math.PI + jit(0.3), { robe: black });
          if (!(sitting && ex * sx < 0)) chair(tx + ex + (cleared ? jit(0.6) : 0), 0, tz + 0.8 + (cleared ? random() * 0.5 : 0), Math.PI + jit(cleared ? 2 : 0.2), cleared && random() < 0.35);
        }
      }
    } else if (a.well === 'dock') {
      const dx = -3.9, dz = 1.3;
      s.box([2.4, 0.25, 1.5], [dx, 0.125, dz], wood);
      s.box([2.4, 1.0, 0.1], [dx, 0.75, dz - 0.7], panelled(3, 1));
      for (const sx of [-1, 1]) s.box([0.1, 1.0, 1.5], [dx + sx * 1.15, 0.75, dz], panelled(2, 1));
      for (let i = 0; i < 13; i++) { s.cylinder(0.018, 0.018, 0.5, [dx - 1.1 + i * 0.183, 1.5, dz - 0.7], black, 6); s.mesh(new THREE.ConeGeometry(0.04, 0.12, 6), black, [dx - 1.1 + i * 0.183, 1.8, dz - 0.7]); }
      for (const sx of [-1, 1]) for (let i = 0; i < 8; i++) { s.cylinder(0.018, 0.018, 0.5, [dx + sx * 1.15, 1.5, dz - 0.7 + i * 0.2], black, 6); s.mesh(new THREE.ConeGeometry(0.04, 0.12, 6), black, [dx + sx * 1.15, 1.8, dz - 0.7 + i * 0.2]); }
      s.box([2.4, 0.03, 0.04], [dx, 1.6, dz - 0.7], black);
      if (disused) s.box([2.7, 0.3, 1.8], [dx, 1.25, dz], sheet);
      else if (sitting) { person(dx - 0.3, 0.25, dz, Math.PI + 0.5, { stand: true }); person(dx + 0.6, 0.25, dz + 0.2, Math.PI + 0.3, { stand: true, robe: s.material('#22386b') }); }
    }
    if (cleared || mood.wear > 0.6) for (let i = 0; i < (cleared ? 26 : 8); i++) { const p = s.box([0.21, 0.006, 0.3], [jit(8), 0.006, mix(-4.5, 1.8, random())], paper); p.rotation.y = random() * 3; }
    if (disused) for (let i = 0; i < 5; i++) s.cylinder(0.3 + random() * 0.5, 0.3, 0.01, [jit(8), 0.005, mix(-4.5, 1.5, random())], s.material('#cfc8b6', { roughness: 1 }), 12);

    // ---- public gallery (foreground)
    s.box([W, GY, ZF - GZ], [0, GY / 2, (ZF + GZ) / 2], wood);
    s.box([W, 0.5, ZF - GZ - 1.6], [0, GY + 0.25, (ZF + GZ) / 2 + 0.8], wood);
    s.box([W, GY + 0.95, 0.14], [0, (GY + 0.95) / 2, GZ], panelled(12, 1));
    const bar = s.cylinder(0.05, 0.05, W, [0, GY + 1.03, GZ], metal, 10); bar.rotation.z = Math.PI / 2;
    for (let i = 0; i <= 8; i++) s.cylinder(0.035, 0.035, 0.12, [-W / 2 + 0.2 + i * (W - 0.4) / 8, GY + 0.99, GZ], metal, 8);
    const crowd = { empty: 0, waiting: 0.55, sitting: 0.92, cleared: 0, disused: 0 }[a.session] * mix(0.7, 1.1, mood.density);
    for (let r = 0; r < 2; r++) {
      const bz = GZ + 1.25 + r * 1.35, by = GY + r * 0.5;
      for (const sx of [-1, 1]) {
        const cx = sx * (W / 4 + 0.55), bw = W / 2 - 1.5;
        s.box([bw, 0.08, 0.5], [cx, by + 0.46, bz], darkWood);
        s.box([bw, 0.6, 0.08], [cx, by + 0.75, bz + 0.28], panelled(4, 1));
        for (const e of [-1, 1]) s.box([0.08, 0.9, 0.6], [cx + e * bw / 2, by + 0.45, bz + 0.02], wood);
        for (let i = 0; i < 6; i++) if (random() < crowd) person(cx - bw / 2 + 0.45 + i * (bw - 0.9) / 5 + jit(0.15), by + 0.5, bz, Math.PI + jit(0.5));
        if (cleared && random() < 0.7) s.box([0.5, 0.2, 0.3], [cx + jit(2), by + 0.6, bz], s.material(pick(cloth)));
      }
    }

    // ---- lamps, fans
    const fans: THREE.Object3D[] = [];
    const glow = s.material('#fff3cf', { emissive: '#ffd58a', emissiveIntensity: night ? 2.2 : mix(0.15, 0.6, 1 - Math.abs(mood.daylight - 0.5) * 2 < 0.3 ? 1 : 0), roughness: 0.4 });
    for (const x of [-3.3, 3.3]) for (const z of [-3.6, 1.6]) {
      if (a.kind === 'colonial') {
        s.cylinder(0.03, 0.03, 1.4, [x, H - 0.7, z], metal, 8);
        const fan = new THREE.Group(); fan.position.set(x, H - 1.45, z);
        for (let i = 0; i < 4; i++) { const blade = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.03, 0.26), darkWood); blade.position.set(Math.cos(i * Math.PI / 2) * 0.85, 0, Math.sin(i * Math.PI / 2) * 0.85); blade.rotation.y = -i * Math.PI / 2; blade.castShadow = true; fan.add(blade); }
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.16, 12), metal); fan.add(hub);
        fan.rotation.y = random() * 3; root.add(fan); fans.push(fan);
      } else if (a.kind === 'tribunal' || a.kind === 'county') {
        s.box([2.4, 0.08, 0.5], [x, H - 0.75, z], glow);
        for (const e of [-1, 1]) s.cylinder(0.012, 0.012, 0.75, [x + e * 1.0, H - 0.37, z], metal, 6);
      } else {
        s.cylinder(0.02, 0.02, 2.2, [x, H - 1.1, z], metal, 6);
        s.ball([0.34, 0.34, 0.34], [x, H - 2.35, z], glow, 16);
        s.cylinder(0.14, 0.2, 0.14, [x, H - 2.02, z], metal, 12);
      }
    }
    if (night) { const lamp = new THREE.PointLight('#ffd9a0', 260, 40, 1.8); lamp.position.set(0, H - 2.4, -1.5); root.add(lamp); }
    if (mood.wear > 0.55) for (let i = 0; i < Math.round((mood.wear - 0.45) * 12); i++) {
      const st = s.box([0.6 + random() * 1.2, 0.8 + random() * 1.6, 0.01], [jit(W - 2), mix(wains + 1, H - 1, random()), ZB + 0.012], s.material('#b9ae93', { roughness: 1, transparent: true, opacity: 0.5 })); st.castShadow = false;
    }

    // ---- hero table (shown only when the hero is small) and placement
    const table = new THREE.Group();
    {
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 1.2), darkWood); top.position.y = 0.78;
      const apron = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.14, 1.0), wood); apron.position.y = 0.68;
      table.add(top, apron);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.74, 10), wood); leg.position.set(sx * 0.95, 0.37, sz * 0.48); table.add(leg); }
      table.traverse((n) => { n.castShadow = n.receiveShadow = true; });
      table.visible = false; root.add(table);
    }
    const SLOTS: readonly [number, number, number][] = a.well === 'dock' ? [[0, -0.9, 0], [-3.1, -2.7, 0.45], [3.0, -2.7, -0.45]] : [[0, -0.9, 0], [-3.1, -2.7, 0.45], [3.0, -2.7, -0.45], [-4.7, 0.6, 0.7]];

    const camera = new THREE.PerspectiveCamera(42, 1, 0.3, 120);
    camera.position.set(0, 6.3, 15.2);
    camera.lookAt(0, 2.75, -6);
    camera.updateMatrixWorld(true);
    const shadow = key.shadow.camera;
    shadow.left = -14; shadow.right = 14; shadow.bottom = -12; shadow.top = 12; shadow.near = 1; shadow.far = 80; shadow.updateProjectionMatrix();

    const drift = mix(0.02, 0.25, mood.energy), spin = mix(0.4, 5, mood.energy);
    return {
      object: root, camera, background, capacity: SLOTS.length, ground: floor, keyLight: key,
      place(items: readonly Placeable[]) {
        table.visible = false;
        items.forEach((item, index) => {
          const [x, z, turn] = SLOTS[index % SLOTS.length];
          const h = Math.max(item.height, 0.05), r = Math.max(item.radius, 0.05);
          let lift = 0, scale: number;
          if (index === 0 && h < 0.95 && r < 0.95) { table.visible = true; table.position.set(x, 0, z); lift = 0.82; scale = Math.min(1.8 / h, 0.9 / r, 3.5); }
          else if (index === 0) scale = Math.min(3.7 / h, 2.1 / r, 1.8);
          else scale = Math.min(2.7 / h, 1.3 / r, 2.4);
          item.holder.scale.setScalar(scale);
          item.holder.position.set(x, lift, z);
          item.holder.rotation.y = turn + (context.random() - 0.5) * 0.2;
          item.holder.updateMatrixWorld(true);
        });
        camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
      },
      update(_dt: number, time: number) {
        dust.position.y = Math.sin(time * 0.4) * drift; dust.position.z = Math.cos(time * 0.27) * drift;
        for (const fan of fans) fan.rotation.y = time * spin;
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
