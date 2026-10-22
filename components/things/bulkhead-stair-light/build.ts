import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type V3 = [number, number, number];
const GLASS = {
  clear: 'Clear ribbed glass with the bare bulb visible inside.',
  frosted: 'Frosted white glass, an even milky glow.',
  amber: 'Yellowed amber glass, like light through weak tea.',
  green: 'Sea-green glass from a ship’s passageway.',
  red: 'Red glass: an emergency or darkroom lamp.',
  blue: 'Deep blue glass, a night light in a ward or shelter.',
} as const;
const GLOW: Record<keyof typeof GLASS, string> = { clear: '#fff1c4', frosted: '#fbf0d8', amber: '#ffab3d', green: '#6fe3a2', red: '#ff4630', blue: '#5c9dff' };

export default defineThing({
  questions: {
    mount: choice('What is the lamp fixed to?', {
      wall: 'A short section of two-tone painted wall.',
      post: 'A freestanding steel conduit post bolted to the floor.',
      pillar: 'A square concrete pier at the turn of the stairs, painted to shoulder height.',
    }),
    fitting: choice('What kind of fitting is it?', {
      round: 'A round cast bulkhead with a dome of glass under a cage of bars.',
      oval: 'A long oval bulkhead with a barred cage, ship style.',
      square: 'A square prismatic block behind a wire grid.',
      basket: 'A bare bulb hanging from a bracket inside a wire basket.',
    }),
    glass: choice('What colour is the glass?', GLASS),
    state: choice('What is the light doing right now?', {
      steady: 'Holding steady, a calm even light.',
      buzzing: 'Buzzing and shivering, never quite stable.',
      dying: 'Dying: mostly dark, striking in brief stutters.',
      'clicked-off': 'The timer has just clicked off: a fading filament glow, then dark until someone presses again.',
      smashed: 'Smashed: broken glass, an empty socket, shards on the floor.',
    }),
    switch: choice('How is it switched?', {
      timer: 'A round push-button timer with a small orange pilot light.',
      wedged: 'The timer button is jammed in with a matchstick and tape so it never goes off.',
      rocker: 'A square surface switch with a rocker.',
      cord: 'A pull cord with a bead on the end.',
      none: 'No switch in sight: it is controlled from somewhere else.',
    }),
    wiring: choice('How does the wiring run?', {
      steel: 'Bare galvanised conduit with saddle clips.',
      painted: 'Conduit painted over with the wall, many coats thick.',
      wires: 'Loose twin wires sagging between clips.',
      chased: 'Buried in the wall: only a rough plaster scar shows.',
    }),
    visitors: choice('What has gathered around it?', {
      moths: 'Moths circling the glass.',
      cobweb: 'A dusty cobweb strung from the cage.',
      none: 'Nothing.',
    }),
    marking: choice('If there is wall behind it, what is on the wall?', {
      floor: 'A big stencilled floor number.',
      notice: 'A typed notice taped under the lamp.',
      graffiti: 'Scratched initials and a heart.',
      soot: 'A fan of soot and heat stain above the fitting.',
      none: 'Bare paint.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const white = a.glass === 'clear' || a.glass === 'frosted';
    const glow = new THREE.Color(GLOW[a.glass]);
    if (white) glow.lerp(new THREE.Color(mood.warmth > 0.5 ? '#ffc980' : '#e3eeff'), Math.abs(mood.warmth - 0.5) * 0.9);
    const smashed = a.state === 'smashed';
    const dadoPair = pick([['#7c8a5a', '#e4e0d2'], ['#9fb9c6', '#e8e7df'], ['#c39a45', '#ebe2c6'], ['#6f8f8a', '#deded2'], ['#8a6a55', '#d9d3c4']] as const);
    const low = new THREE.Color(dadoPair[0]), high = new THREE.Color(dadoPair[1]);

    // The mount. lampAt/lampFacing place the fitting; wallZ is the surface the wiring runs on.
    const W = a.mount === 'pillar' ? 0.38 : 0.7;
    const wide = W > 0.5;
    const down = false;
    let lampAt: V3 = [0, 1.03, 0.05], switchAt: V3 = [wide ? 0.2 : 0, wide ? 0.5 : 0.58, 0.05];
    const hasWall = a.mount !== 'post';
    const metal = s.material('#9a9d9c', { metalness: 0.65, roughness: mix(0.35, 0.7, mood.wear) });
    const H = 1.3, dado = 0.8;
    if (hasWall) {
      const thick = wide ? 0.1 : W, zc = 0.05 - thick / 2;
      s.box([W, dado, thick], [0, dado / 2, zc], s.material(low, { roughness: 0.45 }));
      s.box([W, H - dado, thick], [0, dado + (H - dado) / 2, zc], s.material(wide ? high : new THREE.Color('#b5b1a5'), { roughness: 0.95 }));
      s.box([W, 0.022, 0.004], [0, dado, 0.051], s.material(low.clone().multiplyScalar(0.55)));
      s.box([W + (wide ? 0 : 0.02), 0.08, wide ? 0.014 : thick + 0.02], [0, 0.04, wide ? 0.056 : zc], s.material('#4a4640'));
    } else {
      s.cylinder(0.021, 0.021, 1.22, [0, 0.61, 0], metal, 12);
      s.cylinder(0.075, 0.075, 0.012, [0, 0.006, 0], metal, 20);
      for (let k = 0; k < 4; k++) s.cylinder(0.009, 0.009, 0.012, [Math.cos(k * 1.571 + 0.78) * 0.055, 0.016, Math.sin(k * 1.571 + 0.78) * 0.055], s.material('#3a3a3a'), 6);
      s.box([0.36, 0.36, 0.012], [0, 1.08, 0.026], metal);
      s.cylinder(0.026, 0.026, 0.03, [0, 1.235, 0], metal, 12);
      lampAt = [0, 1.08, 0.032]; switchAt = [0, 0.68, 0.022];
    }
    const markX = wide ? -0.17 : 0, markY = wide ? 0.55 : 0.3, markS = wide ? 0.3 : 0.24;

    // Wall markings.
    if (hasWall) {
      if (a.marking === 'floor') {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
        const g = canvas.getContext('2d')!;
        g.fillStyle = 'rgba(40,40,40,0.82)'; g.font = 'bold 230px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(String(1 + Math.floor(random() * 9)), 128, 140);
        g.globalCompositeOperation = 'destination-out'; g.fillRect(0, 100, 256, 9); g.fillRect(0, 170, 256, 9);
        for (let k = 0; k < mood.wear * 40; k++) g.fillRect(random() * 256, random() * 256, 4 + random() * 20, 3 + random() * 8);
        const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
        s.mesh(new THREE.PlaneGeometry(markS, markS), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.3, roughness: 0.9 }), [markX, markY, 0.0515]).castShadow = false;
      } else if (a.marking === 'notice') {
        const note = s.label(pick(['GASIĆ ŚWIATŁO', 'ZHASNI!', 'NIE PALIĆ', 'CISZA PO 22']), 0.24, 0.11, [markX, markY, 0.052], '#222', '#efe9d6');
        note.rotation.z = (random() - 0.5) * 0.14;
        for (const dx of [-0.1, 0.1]) s.box([0.04, 0.02, 0.001], [markX + dx, markY + 0.05, 0.053], s.material('#d9cf9a'));
      } else if (a.marking === 'graffiti') {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
        const g = canvas.getContext('2d')!;
        g.strokeStyle = 'rgba(235,232,220,0.95)'; g.lineWidth = 5; g.lineCap = 'round';
        g.beginPath(); g.moveTo(128, 200); g.bezierCurveTo(20, 120, 80, 40, 128, 100); g.bezierCurveTo(176, 40, 236, 120, 128, 200); g.stroke();
        g.fillStyle = 'rgba(235,232,220,0.95)'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center';
        g.fillText(`${pick(['M', 'K', 'A', 'J', 'P'])} + ${pick(['T', 'O', 'L', 'D', 'E'])}`, 128, 150);
        const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
        s.mesh(new THREE.PlaneGeometry(markS, markS), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.3, roughness: 1 }), [markX, markY, 0.0515]).castShadow = false;
      } else if (a.marking === 'soot' && !down) {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
        const g = canvas.getContext('2d')!;
        const grad = g.createRadialGradient(64, 128, 4, 64, 128, 120);
        grad.addColorStop(0, 'rgba(30,24,18,0.75)'); grad.addColorStop(1, 'rgba(30,24,18,0)');
        g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
        const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
        s.mesh(new THREE.PlaneGeometry(W * 0.75, 0.24), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }), [0, H - 0.12, 0.0512]);
      }
    }

    // The fitting, built facing +z in its own group.
    const lamp = new THREE.Group();
    lamp.position.set(...lampAt);
    const lampScale = 1.3;
    lamp.scale.setScalar(lampScale);
    s.root.add(lamp);
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, at: V3 = [0, 0, 0], parent: THREE.Object3D = lamp) => {
      const mesh = new THREE.Mesh(geo, mat); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    const cast = s.material(pick(['#8b8f8e', '#d9d5c6', '#3d3f40', '#5f7a6a']), { metalness: 0.5, roughness: 0.55 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: a.glass === 'clear' ? '#f4f6f2' : glow.clone().lerp(new THREE.Color('#ffffff'), 0.35), roughness: a.glass === 'frosted' ? 0.7 : 0.15,
      emissive: glow, emissiveIntensity: 1, transparent: a.glass === 'clear', opacity: a.glass === 'clear' ? 0.38 : 1, depthWrite: a.glass !== 'clear', side: THREE.DoubleSide,
    });
    const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff7dc', emissive: glow.clone().lerp(new THREE.Color('#fff2c0'), 0.5), emissiveIntensity: 2, roughness: 0.3 });
    let lensCentre: V3 = [0, 0, 0.06], lensR = 0.1;
    const bar = (R: number, depth: number, angle: number, tube = 0.0045, bend = 0) => {
      const m = add(new THREE.TorusGeometry(R, tube, 6, 20, Math.PI), cast);
      m.rotation.order = 'ZXY'; m.rotation.z = angle; m.rotation.x = Math.PI / 2 + bend; m.scale.y = depth / R;
      return m;
    };
    const breakArc = smashed ? Math.PI * (1.0 + random() * 0.5) : Math.PI * 2;
    if (a.fitting === 'round' || a.fitting === 'oval') {
      const R = 0.105, depth = 0.085;
      const body = new THREE.Group(); lamp.add(body);
      if (a.fitting === 'oval') body.scale.x = 1.5;
      add(new THREE.CylinderGeometry(R + 0.022, R + 0.03, 0.04, 28).rotateX(Math.PI / 2), cast, [0, 0, 0.02], body);
      add(new THREE.TorusGeometry(R + 0.008, 0.01, 8, 32), cast, [0, 0, 0.042], body);
      const dome = new THREE.SphereGeometry(R, 24, 12, random() * 6, breakArc, 0, Math.PI / 2); dome.rotateX(Math.PI / 2); dome.scale(1, 1, depth / R);
      add(dome, glassMat, [0, 0, 0.04], body).castShadow = false;
      add(new THREE.CylinderGeometry(0.018, 0.022, 0.03, 12).rotateX(Math.PI / 2), s.material('#d9d2bd'), [0, 0, 0.05], body);
      if (!smashed) add(new THREE.SphereGeometry(0.03, 14, 10), bulbMat, [0, 0, 0.085], body);
      const bars = a.fitting === 'oval' ? 2 : 3;
      for (let k = 0; k < bars; k++) {
        const m = bar(R + 0.012, depth + 0.018, a.fitting === 'oval' ? (k === 0 ? 0 : Math.PI / 2) : (k / bars) * Math.PI + 0.3, 0.0045, smashed && k === 0 ? 0.35 : 0);
        m.position.z = 0.042; lamp.remove(m); body.add(m);
      }
      if (a.fitting === 'oval') for (const x of [-0.5, 0.5]) { const m = bar((R + 0.012) * 0.86, (depth + 0.018) * 0.86, Math.PI / 2); m.position.set(x * R, 0, 0.042); lamp.remove(m); body.add(m); }
      for (let k = 0; k < 4; k++) add(new THREE.CylinderGeometry(0.007, 0.007, 0.008, 6).rotateX(Math.PI / 2), s.material('#2e2e2e'), [Math.cos(k * 1.571 + 0.78) * (R + 0.02), Math.sin(k * 1.571 + 0.78) * (R + 0.02), 0.043], body);
      lensCentre = [0, 0, 0.09]; lensR = a.fitting === 'oval' ? 0.16 : 0.115;
    } else if (a.fitting === 'square') {
      add(new THREE.BoxGeometry(0.24, 0.24, 0.045), cast, [0, 0, 0.0225]);
      if (!smashed) {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
        const g = canvas.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64);
        g.fillStyle = 'rgba(0,0,0,0.16)'; for (let k = 0; k < 8; k++) { g.fillRect(k * 8, 0, 3, 64); g.fillRect(0, k * 8, 64, 2); }
        const tex = new THREE.CanvasTexture(canvas);
        glassMat.map = tex; glassMat.emissiveMap = tex;
        add(new THREE.BoxGeometry(0.19, 0.19, 0.07), glassMat, [0, 0, 0.08]).castShadow = false;
      } else {
        add(new THREE.BoxGeometry(0.19, 0.06, 0.07), glassMat, [0, -0.065, 0.08]).rotation.z = 0.05;
        add(new THREE.CylinderGeometry(0.018, 0.022, 0.03, 12).rotateX(Math.PI / 2), s.material('#d9d2bd'), [0, 0, 0.06]);
      }
      const wire = s.material('#2f3132', { metalness: 0.6, roughness: 0.5 });
      for (let k = -2; k <= 2; k++) {
        add(new THREE.CylinderGeometry(0.003, 0.003, 0.23, 6), wire, [k * 0.05, 0, 0.128]);
        add(new THREE.CylinderGeometry(0.003, 0.003, 0.23, 6).rotateZ(Math.PI / 2), wire, [0, k * 0.05, 0.131]);
      }
      for (const x of [-1, 1]) for (const y of [-1, 1]) add(new THREE.CylinderGeometry(0.004, 0.004, 0.085, 6).rotateX(Math.PI / 2), wire, [x * 0.108, y * 0.108, 0.087]);
      lensCentre = [0, 0, 0.1]; lensR = 0.14;
    } else {
      const wire = s.material('#3a3c3d', { metalness: 0.6, roughness: 0.5 });
      add(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 20).rotateX(Math.PI / 2), cast, [0, 0.06, 0.01]);
      const arm = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.06, 0.01), new THREE.Vector3(0, 0.075, 0.09), new THREE.Vector3(0, 0.06, 0.13), new THREE.Vector3(0, 0.03, 0.135)]), 16, 0.009, 8);
      add(arm, cast);
      add(new THREE.CylinderGeometry(0.024, 0.02, 0.05, 14), s.material('#e3dcc6', { roughness: 0.4 }), [0, 0.01, 0.135]);
      if (!smashed) {
        add(new THREE.SphereGeometry(0.036, 16, 12), bulbMat, [0, -0.06, 0.135]);
        add(new THREE.CylinderGeometry(0.016, 0.026, 0.035, 12), bulbMat, [0, -0.025, 0.135]);
      } else add(new THREE.CylinderGeometry(0.014, 0.004, 0.03, 6), s.material('#d8e2e0', { roughness: 0.1 }), [0, -0.028, 0.135]);
      for (const [y, r] of [[-0.012, 0.035], [-0.05, 0.058], [-0.095, 0.05]] as const) add(new THREE.TorusGeometry(r, 0.003, 6, 24).rotateX(Math.PI / 2), wire, [0, y, 0.135]);
      const pts: [number, number][] = [[-0.012, 0.035], [-0.05, 0.058], [-0.095, 0.05], [-0.125, 0.0]];
      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2;
        const curve = new THREE.CatmullRomCurve3(pts.map(([y, r]) => new THREE.Vector3(Math.cos(ang) * r, y, 0.135 + Math.sin(ang) * r)));
        add(new THREE.TubeGeometry(curve, 10, 0.0025, 5), wire);
      }
      lensCentre = [0, -0.06, 0.135]; lensR = 0.06;
    }

    // A pool of light on the surface behind: see-through, so it is not measured.
    let halo: THREE.MeshBasicMaterial | null = null;
    if (hasWall && !smashed) {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
      const g = canvas.getContext('2d')!;
      const grad = g.createRadialGradient(64, 64, 6, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)'); grad.addColorStop(0.4, 'rgba(255,255,255,0.35)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
      halo = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), color: glow, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending });
      add(new THREE.PlaneGeometry((W - 0.02) / lampScale, 0.52 / lampScale), halo, [0, 0, 0.004]).castShadow = false;
    }

    // Shards under a smashed lamp.
    if (smashed) {
      const shard = new THREE.BufferGeometry();
      shard.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.02, 0.012, 0, -0.008, -0.01, 0, -0.012], 3));
      shard.computeVertexNormals();
      const points = Array.from({ length: 14 + Math.floor(random() * 14) }, () => ({ at: [(random() - 0.5) * 0.45, 0.004, (hasWall ? 0.2 : 0.12) + (random() - 0.5) * 0.28] as V3, size: 0.6 + random() * 1.6 }));
      const mesh = s.scatter(shard, new THREE.MeshStandardMaterial({ color: glow.clone().lerp(new THREE.Color('#e8f0ee'), 0.6), roughness: 0.1, side: THREE.DoubleSide }), points);
      const m4 = new THREE.Matrix4(), e = new THREE.Euler(), q = new THREE.Quaternion();
      points.forEach((p, i) => { e.set(0, random() * 6.3, (random() - 0.5) * 0.4); q.setFromEuler(e); m4.compose(new THREE.Vector3(...p.at), q, new THREE.Vector3(p.size, p.size, p.size)); mesh.setMatrixAt(i, m4); });
    }

    // Switch.
    const pilot = s.material('#ff8a2a', { emissive: '#ff7a1a', emissiveIntensity: 2.2 });
    let button: THREE.Mesh | null = null;
    const [sx, sy, sz] = switchAt;
    const bake = s.material(pick(['#3b2a20', '#e6e1d0', '#1f1f1f']), { roughness: 0.35 });
    if (a.switch === 'timer' || a.switch === 'wedged') {
      s.cylinder(0.046, 0.05, 0.03, [sx, sy, sz + 0.015], bake, 24).rotation.x = Math.PI / 2;
      button = s.cylinder(0.022, 0.022, 0.03, [sx, sy, sz + 0.035], s.material(pick(['#d8402f', '#e6e1d0', '#2b2b2b']), { roughness: 0.4 }), 18);
      button.rotation.x = Math.PI / 2;
      s.ball([0.006, 0.006, 0.004], [sx + 0.03, sy + 0.022, sz + 0.03], pilot, 8);
      if (a.switch === 'wedged') {
        button.position.z = sz + 0.022;
        s.rod([sx + 0.016, sy - 0.03, sz + 0.03], [sx + 0.02, sy + 0.012, sz + 0.036], 0.0018, s.material('#e2cf9a'));
        s.ball([0.003, 0.003, 0.003], [sx + 0.02, sy + 0.012, sz + 0.036], s.material('#b3261e'), 6);
        const tape = s.material('#d9cf9a', { roughness: 0.9 });
        for (const r of [0.6, -0.6]) s.box([0.12, 0.022, 0.002], [sx, sy, sz + 0.039], tape).rotation.z = r;
      }
    } else if (a.switch === 'rocker') {
      s.box([0.085, 0.085, 0.03], [sx, sy, sz + 0.015], bake);
      s.box([0.03, 0.05, 0.012], [sx, sy, sz + 0.034], s.material('#f1eee4', { roughness: 0.3 })).rotation.x = smashed || a.state === 'clicked-off' ? -0.2 : 0.2;
    } else if (a.switch === 'cord') {
      const cx = hasWall ? W / 2 - 0.05 : 0.14, top = lampAt[1] + (wide ? 0.02 : -0.26), cz = hasWall ? 0.085 : 0.06;
      s.cylinder(0.03, 0.035, 0.03, [cx, top, cz - 0.02], bake, 16).rotation.x = Math.PI / 2;
      const len = 0.4 + random() * 0.15;
      s.rod([cx, top - 0.01, cz], [cx + 0.01, top - len, cz + 0.01], 0.0022, s.material('#e9e3d0'));
      s.ball([0.011, 0.015, 0.011], [cx + 0.01, top - len - 0.012, cz + 0.01], s.material(pick(['#e9e3d0', '#d8402f', '#3d9a6a'])), 10);
    }

    // Wiring from the switch (or the floor) to the fitting.
    const pipe = a.wiring === 'painted' ? s.material(low.clone().multiplyScalar(0.95), { roughness: 0.5 }) : metal;
    if (hasWall) {
      const from: V3 = a.switch === 'none' || a.switch === 'cord' ? [wide ? 0.2 : 0, 0.08, 0.06] : [sx, sy + 0.05, 0.06];
      const turnY = wide ? lampAt[1] : lampAt[1] - 0.16;
      const to: V3 = down ? [from[0], 1.54, 0.06] : [from[0], turnY, 0.06];
      const end: V3 = [wide ? 0.13 : 0, turnY, 0.06];
      if (a.wiring === 'steel' || a.wiring === 'painted') {
        s.rod(from, to, 0.009, pipe); s.rod(to, end, 0.009, pipe);
        if (down) s.rod(end, [0.1, 1.54, 0.38], 0.009, pipe);
        s.ball([0.014, 0.014, 0.014], to, pipe, 10);
        for (const t of [0.25, 0.7]) s.box([0.05, 0.014, 0.012], [from[0], mix(from[1], to[1], t), 0.062], pipe);
      } else if (a.wiring === 'wires') {
        for (const [dx, colour] of [[-0.006, '#b3261e'], [0.006, '#2a2a2a']] as const) {
          const m = s.material(colour, { roughness: 0.6 });
          const midY = mix(from[1], to[1], 0.5);
          s.tube([[from[0] + dx, from[1], 0.058], [from[0] + dx + 0.03 + random() * 0.03, midY, 0.075], [to[0] + dx, to[1] - 0.02, 0.058], [mix(to[0], end[0], 0.5) + dx, end[1] - (down ? 0 : 0.03), mix(to[2], end[2], 0.5) + (down ? 0 : 0.01)], [end[0], end[1] - (down ? 0.03 : 0), end[2]]], 0.0035, m);
        }
        for (const t of [0.05, 0.95]) s.box([0.035, 0.012, 0.01], [from[0], mix(from[1], to[1], t), 0.056], metal);
      } else {
        const scar = s.material(low.clone().lerp(new THREE.Color('#cfcabb'), 0.4), { roughness: 1 });
        s.box([0.05, to[1] - from[1], 0.004], [from[0], (from[1] + to[1]) / 2, 0.051], scar);
        if (!down) s.box([Math.abs(end[0] - from[0]) + 0.05, 0.05, 0.004], [(end[0] + from[0]) / 2, turnY, 0.051], scar);
      }
    }

    // Visitors.
    const moths: { mesh: THREE.Group; r: number; speed: number; phase: number; tilt: number }[] = [];
    const centre = new THREE.Vector3(...lensCentre).multiplyScalar(lampScale).add(lamp.position);
    if (a.visitors === 'moths') {
      const wingMat = s.material(pick(['#c9b99a', '#e6dcc6', '#9a8a72']), { roughness: 1, side: THREE.DoubleSide });
      const count = 2 + Math.round(mix(1, 5, mood.density) * (smashed ? 0.3 : 1));
      for (let k = 0; k < count; k++) {
        const moth = new THREE.Group();
        for (const side of [-1, 1]) {
          const wing = new THREE.Mesh(new THREE.CircleGeometry(0.014, 3), wingMat);
          wing.position.x = side * 0.008; wing.rotation.z = side * -0.5; wing.castShadow = true; wing.name = side < 0 ? 'l' : 'r';
          moth.add(wing);
        }
        const bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.004, 6, 4), wingMat); bodyMesh.scale.y = 2.4; moth.add(bodyMesh);
        s.root.add(moth);
        moths.push({ mesh: moth, r: lensR * lampScale + 0.03 + random() * 0.1, speed: (0.8 + random() * 1.6) * (random() < 0.5 ? -1 : 1), phase: random() * 6.3, tilt: (random() - 0.5) * 1.2 });
      }
    } else if (a.visitors === 'cobweb') {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
      const g = canvas.getContext('2d')!;
      g.strokeStyle = 'rgba(235,235,230,0.9)'; g.lineWidth = 1.4;
      for (let k = 0; k < 7; k++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos((k / 6) * 1.571) * 128, Math.sin((k / 6) * 1.571) * 128); g.stroke(); }
      for (let r = 18; r < 128; r += 15 + random() * 6) { g.beginPath(); for (let k = 0; k < 7; k++) { const ang = (k / 6) * 1.571, rr = r * (0.93 + random() * 0.1); if (k === 0) g.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr); else g.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); } g.stroke(); }
      const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
      const web = s.mesh(new THREE.PlaneGeometry(0.26, 0.26), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }), [centre.x - lensR - 0.06, centre.y + lensR + 0.05, centre.z - 0.03]);
      web.rotation.set(0.3, 0.5, Math.PI);
      web.castShadow = false;
    }

    const base = { glass: a.glass === 'clear' ? 0.5 : mix(0.75, 1.15, mood.cheer), bulb: 2.2, halo: 0.6 };
    const hash = (n: number) => { const v = Math.sin(n * 127.1 + context.seed * 0.0137) * 43758.5453; return v - Math.floor(v); };
    const speed = mix(0.55, 1.6, mood.energy);
    const level = (time: number) => {
      const t = time * speed;
      if (a.state === 'steady') return 0.97 + Math.sin(t * 7) * 0.03;
      if (a.state === 'buzzing') return (0.68 + hash(Math.floor(t * 26)) * 0.32) * (hash(Math.floor(t * 3.3)) > 0.78 ? 0.4 : 1);
      if (a.state === 'dying') { const h = hash(Math.floor(t * 9)); return h > 0.74 ? 0.85 + h * 0.15 : 0.05 + h * 0.08; }
      if (a.state === 'clicked-off') { const c = (t + 0.4) % 9; return c < 6.5 ? 0.3 * Math.exp(-c * 0.8) + 0.015 : 1; }
      return 0;
    };
    const apply = (time: number) => {
      const l = level(time);
      glassMat.emissiveIntensity = base.glass * l;
      bulbMat.emissiveIntensity = base.bulb * l + (a.state === 'clicked-off' ? 0.12 : 0);
      if (halo) halo.opacity = base.halo * l;
      if (button && a.switch === 'timer') {
        const c = a.state === 'clicked-off' ? ((time * speed + 0.4) % 9 < 6.5 ? 1 : ((time * speed + 0.4) % 9 - 6.5) / 2.5) : (time * speed * 0.12) % 1;
        button.position.z = sz + mix(0.022, 0.036, smashed ? 1 : c);
      }
      pilot.emissiveIntensity = 1.8 + Math.sin(time * 40) * 0.25;
      for (const m of moths) {
        const ang = time * m.speed * speed + m.phase, wob = Math.sin(time * 3.1 + m.phase) * 0.03;
        const r = m.r + wob;
        const local = new THREE.Vector3(Math.cos(ang) * r, Math.sin(ang) * r * Math.cos(m.tilt), Math.abs(Math.sin(ang * 0.7 + m.phase)) * 0.09 + 0.02);
        local.applyEuler(lamp.rotation);
        m.mesh.position.copy(centre).add(local);
        m.mesh.rotation.set(m.tilt, ang, ang * 0.5);
        const flap = Math.sin(time * 38 + m.phase) * 0.9;
        m.mesh.children[0].rotation.y = flap; m.mesh.children[1].rotation.y = -flap;
      }
    };
    apply(0);
    return s.finish({ update: (_dt, time) => apply(time) });
  },
});
