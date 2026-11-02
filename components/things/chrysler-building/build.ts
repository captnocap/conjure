import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const canvasTexture = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat = true) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
};

/** A box whose UVs are planar in metres, so one window texture runs continuously across every block. */
const planarBox = (w: number, h: number, d: number, x: number, y: number, z: number, tileW: number, tileH: number) => {
  const g = new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
    let u: number, v: number;
    if (Math.abs(nx) > 0.5) { u = p.getZ(i) * -Math.sign(nx); v = p.getY(i); }
    else if (Math.abs(nz) > 0.5) { u = p.getX(i) * Math.sign(nz); v = p.getY(i); }
    else { u = p.getX(i); v = p.getZ(i); }
    uv.setXY(i, u / tileW, v / tileH);
  }
  return g;
};
const flat = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);

export default defineThing({
  questions: {
    era: choice('When do we see it?', {
      opening: '1930, just finished: the spire newly raised out of the crown, the steel blinding, a flag on the tip.',
      seventies: 'The dim 1970s: grimy brick, few lit offices, the crown left dark by a broke city.',
      today: 'Today: clean brick and the crown traced with its white lights at night.',
    }),
    crownLights: choice('Are the sunburst windows in the crown lit?', {
      chevrons: 'Lit: rows of white triangular lights radiating up the arches, the crown glowing like a jewel.',
      warm: 'A warm gold glow behind the triangles, like the original 1930 lamps.',
      dark: 'Dark: the triangular windows black, the crown only polished steel.',
    }),
    state: choice('What state is it in?', {
      ordinary: 'An ordinary day: the tower simply standing there.',
      scaffold: 'Scaffolding and netting wrapped around the crown for restoration.',
      polished: 'Freshly restored: the eagle gargoyles and steel polished to a mirror gleam.',
    }),
    weather: choice('What weather is on it?', {
      clear: 'Clear: the steel crown sharp against the sky.',
      rain: 'Rain streaking down the steel and brick, everything wet and dark.',
      cloud: 'Low cloud: the spire lost in a drifting bank of cloud.',
      snow: 'Snow on the setbacks and caught on the eagles.',
    }),
    foot: choice('What is visible at its foot?', {
      nothing: 'Nothing: the tower alone on its block.',
      lexington: 'A sliver of Lexington Avenue with yellow taxis and a sidewalk.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const night = Math.min(1, Math.max(0, (lowSun - 0.3) / 0.7));
    const grime = Math.min(1, mood.wear + (a.era === 'seventies' ? 0.35 : 0) - (a.era === 'opening' ? 0.2 : 0));
    const wet = a.weather === 'rain';
    const TW = 24, TH = 28;

    const facade = canvasTexture(384, 448, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 384, 448);
      for (let col = 0; col < 12; col++) for (let row = 0; row < 8; row++) {
        c.fillStyle = '#3d434b'; c.fillRect(col * 32 + 9, row * 56 + 12, 14, 30);
      }
      for (let i = 0; i < Math.round(grime * 80); i++) {
        c.fillStyle = `rgba(60,52,44,${0.05 + random() * 0.15})`;
        c.fillRect(random() * 384, random() * 448, 3 + random() * 12, 40 + random() * 160);
      }
      if (wet) for (let i = 0; i < 120; i++) { c.fillStyle = 'rgba(70,80,95,0.25)'; c.fillRect(random() * 384, random() * 448, 1.5, 30 + random() * 80); }
    });
    const litShare = (a.era === 'seventies' ? 0.08 : 0.2) + mood.density * 0.3;
    const lit = canvasTexture(384, 448, (c) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, 384, 448);
      for (let row = 0; row < 8; row++) {
        let on = random() < litShare;
        for (let col = 0; col < 12; col++) {
          if (random() < 0.3) on = random() < litShare;
          if (on) { c.fillStyle = random() < 0.7 ? '#ffd59a' : '#e8f0ff'; c.fillRect(col * 32 + 9, row * 56 + 12, 14, 30); }
        }
      }
    });
    const brickTone = new THREE.Color('#ece8de').lerp(new THREE.Color('#867e70'), grime * 0.4).lerp(new THREE.Color('#545a66'), night * 0.4 + (wet ? 0.15 : 0));
    const brick = s.material(brickTone, { map: facade, emissive: '#ffd49a', emissiveMap: lit, emissiveIntensity: mix(0.03, 2.3, night), roughness: wet ? 0.45 : 0.9 });
    const band = s.material(new THREE.Color('#4a4d52').lerp(new THREE.Color('#2a2c30'), grime * 0.4), { roughness: 0.8 });
    const polished = a.state === 'polished' || a.era === 'opening';
    const steel = s.material(new THREE.Color('#d9dee3').lerp(new THREE.Color('#8b8f92'), polished ? 0 : grime * 0.5), {
      metalness: polished ? 0.62 : 0.5, roughness: polished ? 0.22 : wet ? 0.25 : 0.38 + grime * 0.25,
    });
    const crownLit = a.era === 'seventies' ? 'dark' : a.crownLights;
    const glassMat = crownLit === 'dark'
      ? s.material('#22262c', { metalness: 0.3, roughness: 0.3 })
      : new THREE.MeshStandardMaterial({ color: crownLit === 'warm' ? '#ffe1a0' : '#f6f8ff', emissive: crownLit === 'warm' ? '#ffb347' : '#f4f6ff', emissiveIntensity: mix(0.7, 2.6, night), roughness: 0.4 });

    const meshes: THREE.Mesh[] = [];
    const add = (geos: THREE.BufferGeometry[], mat: THREE.Material) => {
      if (!geos.length) return null;
      const m = new THREE.Mesh(mergeGeometries(geos.map(flat)), mat);
      m.castShadow = m.receiveShadow = true;
      meshes.push(m);
      return m;
    };

    // Body: base, corner setbacks, the cross-section shaft and the 61st-floor terrace.
    const bodyGeos = [
      planarBox(62, 20, 52, 0, 10, 0, TW, TH),
      planarBox(56, 40, 46, 0, 40, 0, TW, TH),
      planarBox(50, 60, 34, 0, 90, 0, TW, TH), planarBox(36, 60, 44, 0, 90, 0, TW, TH),
      planarBox(40, 112, 28, 0, 176, 0, TW, TH), planarBox(28, 112, 40, 0, 176, 0, TW, TH),
      planarBox(34, 8, 34, 0, 236, 0, TW, TH),
    ];
    add(bodyGeos, brick);
    // Dark grey banding: frieze at the base, the hubcap band at the 31st floor, rings up the shaft, the 61st floor.
    const bands: THREE.BufferGeometry[] = [];
    const ring = (w: number, d: number, y: number, h: number) => bands.push(new THREE.BoxGeometry(w + 0.6, h, d + 0.6).translate(0, y, 0));
    ring(62, 52, 19, 2); ring(56, 46, 58, 3);
    for (const [w, d] of [[50, 34], [36, 44]]) { ring(w, d, 118, 4); ring(w, d, 74, 1.4); }
    for (const [w, d] of [[40, 28], [28, 40]]) ring(w, d, 196, 1.2);
    ring(34, 34, 233, 2.5);
    // Vertical dark piers on the shaft's corners.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      bands.push(new THREE.BoxGeometry(1.4, 112, 1.4).translate(sx * 20, 176, sz * 14), new THREE.BoxGeometry(1.4, 112, 1.4).translate(sx * 14, 176, sz * 20));
    }
    add(bands, band);

    // The crown: seven diminishing tiers of arches on every face, each pierced by a sunburst of triangles.
    const steelGeos: THREE.BufferGeometry[] = [], glassGeos: THREE.BufferGeometry[] = [];
    const TIERS = 7, rect = 4;
    let crownTop = 0;
    for (let i = 0; i < TIERS; i++) {
      const w = 28 - i * 3.4, y = 240 + i * 6.2, R = w / 2;
      crownTop = y + rect + R;
      const arch = new THREE.Shape();
      arch.moveTo(-R, 0); arch.lineTo(R, 0); arch.lineTo(R, rect); arch.absarc(0, rect, R, 0, Math.PI, false); arch.closePath();
      const plate = new THREE.ExtrudeGeometry(arch, { depth: 0.8, bevelEnabled: false, curveSegments: 16 });
      const tris: THREE.BufferGeometry[] = [];
      const rays = i < 4 ? 7 : 5;
      for (let j = 0; j < rays; j++) {
        const th = Math.PI * (j + 0.5) / rays, half = Math.PI / rays * 0.38;
        const t = new THREE.Shape();
        t.moveTo(Math.cos(th) * R * 0.42, rect + Math.sin(th) * R * 0.42);
        t.lineTo(Math.cos(th - half) * R * 0.86, rect + Math.sin(th - half) * R * 0.86);
        t.lineTo(Math.cos(th + half) * R * 0.86, rect + Math.sin(th + half) * R * 0.86);
        t.closePath();
        tris.push(new THREE.ExtrudeGeometry(t, { depth: 0.3, bevelEnabled: false }).translate(0, 0, 0.85));
      }
      for (let k = 0; k < 4; k++) {
        const turn = new THREE.Matrix4().makeRotationY(k * Math.PI / 2).multiply(new THREE.Matrix4().makeTranslation(0, y, R - 0.4));
        steelGeos.push(plate.clone().applyMatrix4(turn));
        for (const t of tris) glassGeos.push(t.clone().applyMatrix4(turn));
      }
      // Core behind the arches.
      steelGeos.push(new THREE.BoxGeometry(w - 1.2, rect + R * 0.9, w - 1.2).translate(0, y + (rect + R * 0.9) / 2, 0));
    }
    // The needle spire.
    steelGeos.push(new THREE.CylinderGeometry(0.15, 2.4, 319 - crownTop + 2, 8).translate(0, (319 + crownTop - 2) / 2, 0));
    steelGeos.push(new THREE.CylinderGeometry(2.9, 2.9, 1, 8).translate(0, crownTop + 0.5, 0));
    steelGeos.push(new THREE.CylinderGeometry(1.7, 1.7, 0.8, 8).translate(0, crownTop + 10, 0));

    // Eagle-head gargoyles jutting from the 61st-floor corners.
    for (let k = 0; k < 4; k++) {
      const an = Math.PI / 4 + k * Math.PI / 2;
      const m = new THREE.Matrix4().makeRotationY(-an + Math.PI / 2);
      const eagle: THREE.BufferGeometry[] = [
        new THREE.BoxGeometry(2.6, 2.8, 9).translate(0, 0, 4.5),
        new THREE.SphereGeometry(2.2, 10, 8).scale(1, 1.1, 1.3).translate(0, 0.6, 9.4),
        new THREE.ConeGeometry(0.9, 3.4, 8).rotateX(Math.PI / 2 + 0.5).translate(0, -0.3, 11.6),
        new THREE.BoxGeometry(1.2, 2.6, 1.6).translate(0, 1.8, 7.4),
      ];
      for (const e of eagle) steelGeos.push(e.applyMatrix4(m).translate(Math.cos(an) * 22, 238.5, Math.sin(an) * 22));
    }
    // Winged radiator caps at the 31st-floor corners.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * 25, z = sz * 17;
      steelGeos.push(new THREE.CylinderGeometry(1.8, 1.8, 3.2, 12).translate(x, 122, z));
      steelGeos.push(new THREE.SphereGeometry(1.4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, 123.6, z));
      for (const side of [-1, 1]) {
        const wing = new THREE.BoxGeometry(7.5, 0.5, 2.2).rotateZ(side * 0.35).translate(side * 4.2, 1.8, 0);
        wing.rotateY(sx * sz > 0 ? Math.PI / 4 : -Math.PI / 4);
        steelGeos.push(wing.translate(x, 121.5, z));
      }
    }
    const crownMesh = add(steelGeos, steel);
    add(glassGeos, glassMat);
    void crownMesh;

    const g = new THREE.Group();
    for (const m of meshes) g.add(m);
    const updates: ((time: number) => void)[] = [];

    // Opening day: a flag on the new spire.
    if (a.era === 'opening') {
      const flag = canvasTexture(96, 56, (c) => {
        for (let i = 0; i < 7; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#c8102e'; c.fillRect(0, i * 8, 96, 8); }
        c.fillStyle = '#1b2a55'; c.fillRect(0, 0, 40, 30);
      }, false);
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(9, 5.2, 8, 1), new THREE.MeshStandardMaterial({ map: flag, side: THREE.DoubleSide, roughness: 0.8 }));
      cloth.position.set(4.6, 314, 0);
      g.add(cloth);
      const pos = cloth.geometry.attributes.position as THREE.BufferAttribute, base = Float32Array.from(pos.array as Float32Array);
      updates.push((time) => {
        for (let i = 0; i < pos.count; i++) { const x = base[i * 3]; pos.setZ(i, Math.sin(x * 0.8 - time * (2 + mood.energy * 5)) * (x + 4.5) * 0.12); }
        pos.needsUpdate = true;
      });
    }

    if (a.state === 'scaffold') {
      const grid = canvasTexture(128, 128, (c) => {
        c.clearRect(0, 0, 128, 128); c.fillStyle = '#ffffff';
        for (let i = 0; i < 4; i++) { c.fillRect(i * 32, 0, 9, 128); c.fillRect(0, i * 32, 128, 8); }
        c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 128); c.lineTo(128, 0); c.stroke();
      });
      grid.generateMipmaps = false; grid.minFilter = THREE.LinearFilter;
      const pipe = s.material('#b4b7b9', { map: grid, alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.5 });
      const net = s.material('#6d7f8e', { transparent: true, opacity: 0.42, side: THREE.DoubleSide });
      const shell = [planarBox(32, 30, 32, 0, 255, 0, 6, 6), planarBox(22, 26, 22, 0, 282, 0, 6, 6), new THREE.CylinderGeometry(4, 4, 18, 8, 1, true).translate(0, 302, 0)];
      const pm = new THREE.Mesh(mergeGeometries(shell.map(flat)), pipe); pm.castShadow = true; g.add(pm);
      const nm = new THREE.Mesh(planarBox(32.4, 18, 32.4, 0, 249, 0, 6, 6), net); g.add(nm);
    }

    if (a.weather === 'snow') {
      const snow = s.material('#f5f7fa', { roughness: 0.95 });
      const caps = [
        new THREE.BoxGeometry(61, 0.8, 51).translate(0, 20.4, 0), new THREE.BoxGeometry(55, 0.8, 45).translate(0, 60.4, 0),
        new THREE.BoxGeometry(49, 0.8, 33).translate(0, 120.4, 0), new THREE.BoxGeometry(35, 0.8, 43).translate(0, 120.4, 0),
        new THREE.BoxGeometry(33, 0.8, 33).translate(0, 240.4, 0),
      ];
      for (let k = 0; k < 4; k++) { const an = Math.PI / 4 + k * Math.PI / 2; caps.push(new THREE.BoxGeometry(2.4, 0.7, 8).rotateY(-an + Math.PI / 2).translate(Math.cos(an) * 26, 240.2, Math.sin(an) * 26)); }
      const m = new THREE.Mesh(mergeGeometries(caps), snow); m.castShadow = true; g.add(m);
    }
    if (a.weather === 'rain') {
      const drops: THREE.Matrix4[] = [];
      for (let i = 0; i < 500; i++) drops.push(new THREE.Matrix4().makeScale(0.25, 9, 0.25).setPosition((random() - 0.5) * 90, random() * 330, (random() - 0.5) * 90));
      const rain = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#9fb0c4', transparent: true, opacity: 0.45, depthWrite: false }), drops.length);
      drops.forEach((m, i) => rain.setMatrixAt(i, m));
      rain.instanceMatrix.needsUpdate = true;
      g.add(rain);
      updates.push((time) => { rain.position.y = -((time * 60 * (0.5 + mood.energy)) % 30); });
    }
    if (a.weather === 'cloud') {
      const puff = new THREE.MeshStandardMaterial({ color: '#eff1f2', transparent: true, opacity: 0.78, depthWrite: false, roughness: 1 });
      const n = 18;
      const cloud = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8).scale(1.5, 0.6, 1), puff, n);
      for (let i = 0; i < n; i++) { const an = random() * Math.PI * 2, r = 4 + random() * 40, sz = 12 + random() * 14; cloud.setMatrixAt(i, new THREE.Matrix4().makeScale(sz, sz, sz).setPosition(Math.cos(an) * r, 296 + (random() - 0.5) * 22, Math.sin(an) * r)); }
      cloud.instanceMatrix.needsUpdate = true;
      g.add(cloud);
      updates.push((time) => { cloud.rotation.y = time * 0.015 * (0.3 + mood.energy); });
    }

    // A sliver of Lexington Avenue along the front, with taxis.
    if (a.foot === 'lexington') {
      const asphalt = s.material(wet ? '#3a3d42' : '#55585c', { roughness: wet ? 0.3 : 0.9 });
      const kerb = s.material('#a8a49b');
      const street = new THREE.Mesh(mergeGeometries([new THREE.BoxGeometry(86, 0.3, 14).translate(0, 0.15, 36)]), asphalt);
      const walk = new THREE.Mesh(new THREE.BoxGeometry(86, 0.45, 4).translate(0, 0.22, 27), kerb);
      street.receiveShadow = walk.receiveShadow = true;
      g.add(street, walk);
      const cabs = 3 + Math.round(mood.density * 5);
      const yellow = s.material('#f2c419', { roughness: 0.45 }), lamp = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ffe9b0', emissiveIntensity: mix(0, 2, night) });
      const cabGeo = mergeGeometries([new THREE.BoxGeometry(5, 1.0, 2).translate(0, 0.8, 0), new THREE.BoxGeometry(2.8, 0.7, 1.8).translate(-0.3, 1.6, 0)]);
      const inst = new THREE.InstancedMesh(cabGeo, yellow, cabs), lights = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.25, 1.6), lamp, cabs);
      for (let i = 0; i < cabs; i++) {
        const x = -38 + (i + random() * 0.6) * (76 / cabs), z = 36 + (random() < 0.5 ? -3.2 : 3.2);
        const dir = z < 36 ? 0 : Math.PI;
        inst.setMatrixAt(i, new THREE.Matrix4().makeRotationY(dir).setPosition(x, 0.3, z));
        lights.setMatrixAt(i, new THREE.Matrix4().makeRotationY(dir).setPosition(x + (dir ? -2.5 : 2.5), 1.0, z));
      }
      inst.instanceMatrix.needsUpdate = lights.instanceMatrix.needsUpdate = true;
      inst.castShadow = true;
      g.add(inst, lights);
    }

    g.rotation.y = 40 * Math.PI / 180;
    s.root.add(g);
    return s.finish({ footprint: 40, update: (_dt, time) => { for (const fn of updates) fn(time); } });
  },
});
