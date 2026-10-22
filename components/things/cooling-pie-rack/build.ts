import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
const FILLING = { cherry: '#a3182a', apple: '#d9a548', blueberry: '#3a2452', plum: '#8a2f4f', pumpkin: '#c9702a' } as const;

export default defineThing({
  questions: {
    bake: choice('What has been baked?', {
      buns: 'A tray of round glazed buns or filled dumplings baked shoulder to shoulder.',
      loaf: 'A tall crusty loaf of bread, slashed across the top.',
      pie: 'A lattice-top fruit pie in a dented metal tin.',
      flatbread: 'A stack of blistered flatbreads straight off the griddle.',
    }),
    filling: choice('If it has a filling, what is it?', {
      cherry: 'Sour cherry, glossy dark red.',
      apple: 'Apple and cinnamon, golden.',
      blueberry: 'Blueberry, almost black-purple.',
      plum: 'Plum, deep pink-purple.',
      pumpkin: 'Pumpkin or apricot, warm orange.',
    }),
    eaten: choice('How much of it is left?', {
      whole: 'Whole and untouched: nobody is allowed yet.',
      slice: 'One portion is gone, and sits on a plate beside the rack.',
      half: 'Half of it is gone already.',
      crumbs: 'Only crumbs and a last scrap remain.',
    }),
    fresh: choice('How long has it been out of the oven?', {
      hot: 'Seconds: it is throwing off thick curls of steam.',
      warm: 'A while: one thin wisp still rises.',
      cold: 'Hours: it is cold and set, no steam at all.',
    }),
    towel: choice('Where is the tea towel?', {
      under: 'Spread flat under the rack.',
      draped: 'Draped half over the bake to keep the flies off.',
      folded: 'Folded in a neat square beside the rack.',
      none: 'There is no tea towel.',
    }),
    rack: choice('What kind of rack is it cooling on?', {
      grid: 'A rectangular wire grid on little feet.',
      round: 'A round wire rack of concentric rings.',
      slats: 'A wooden slatted trivet.',
    }),
    where: choice('Where has it been put to cool?', {
      table: 'Just on the table.',
      sill: 'On a painted windowsill with the bottom of an open sash window behind it.',
      board: 'On a big scarred wooden board.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const group = (parent: THREE.Object3D = s.root) => { const g = new THREE.Group(); parent.add(g); return g; };
    const part = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const lathe = (parent: THREE.Object3D, profile: readonly (readonly [number, number])[], material: THREE.Material, x = 0, y = 0, z = 0, start = 0, length = Math.PI * 2) =>
      part(parent, new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), 40, start, length), material, x, y, z);
    const paint = (width: number, height: number, draw: (ctx: Ctx) => void, srgb = true) => {
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      draw(canvas.getContext('2d')!);
      const texture = new THREE.CanvasTexture(canvas);
      if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      return texture;
    };
    const bake = mix(0, 1, mood.wear); // how far past golden the crust has gone
    const crustTone = new THREE.Color('#e0a850').lerp(new THREE.Color('#7a4a1e'), bake * 0.75);
    const crust = new THREE.MeshStandardMaterial({ color: crustTone, roughness: 0.75 });
    const crumb = new THREE.MeshStandardMaterial({ color: '#f1dfb4', roughness: 0.95 });
    const steel = new THREE.MeshStandardMaterial({ color: '#c3c8ca', metalness: 0.85, roughness: 0.28 + mood.wear * 0.3 });
    const china = new THREE.MeshStandardMaterial({ color: '#f4f0e6', roughness: 0.35 });
    const crumbs: { at: [number, number, number]; size: number }[] = [];
    const sprinkle = (count: number, cx: number, y: number, cz: number, spread: number) => {
      for (let i = 0; i < count; i++) { const t = random() * 6.3, r = Math.sqrt(random()) * spread; crumbs.push({ at: [cx + Math.cos(t) * r, y, cz + Math.sin(t) * r], size: 0.0015 + random() * 0.003 }); }
    };

    // ---- where it stands ----------------------------------------------------------------
    let ground = 0;
    if (a.where === 'sill') {
      const paintwork = s.material(mood.cheer > 0.5 ? '#f3efe2' : '#cfd6cf', { roughness: 0.5 });
      part(s.root, new THREE.BoxGeometry(0.72, 0.04, 0.34), paintwork, 0, 0.02, 0);
      part(s.root, new THREE.BoxGeometry(0.76, 0.02, 0.05), paintwork, 0, 0.03, 0.17);
      ground = 0.04;
      const fz = -0.15;
      for (const x of [-1, 1]) part(s.root, new THREE.BoxGeometry(0.045, 0.5, 0.045), paintwork, x * 0.335, 0.29, fz);
      part(s.root, new THREE.BoxGeometry(0.715, 0.04, 0.04), paintwork, 0, 0.36, fz + 0.012); // raised sash rail
      part(s.root, new THREE.BoxGeometry(0.715, 0.045, 0.045), paintwork, 0, 0.535, fz);
      part(s.root, new THREE.BoxGeometry(0.02, 0.16, 0.02), paintwork, 0, 0.45, fz + 0.012);
      const glass = new THREE.MeshStandardMaterial({ color: '#cfe3ee', transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false });
      part(s.root, new THREE.PlaneGeometry(0.63, 0.15), glass, 0, 0.45, fz + 0.012).castShadow = false;
      // a lace café curtain pushed to one side
      const lace = paint(256, 256, (ctx) => {
        ctx.fillStyle = '#fbf7ec'; ctx.fillRect(0, 0, 256, 256);
        ctx.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 10; i++) for (let j = 0; j < 9; j++) { ctx.beginPath(); ctx.arc(i * 26 + (j % 2) * 13 + 8, j * 26 + 12, (i + j) % 3 ? 6 : 9, 0, 7); ctx.fill(); }
        for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(i * 32 + 16, 256, 13, 0, 7); ctx.fill(); }
      });
      const curtain = new THREE.PlaneGeometry(0.2, 0.3, 14, 1);
      const cp = curtain.attributes.position;
      for (let i = 0; i < cp.count; i++) cp.setZ(i, Math.sin(cp.getX(i) * 110) * 0.012);
      curtain.computeVertexNormals();
      const side = random() < 0.5 ? -1 : 1;
      part(s.root, curtain, new THREE.MeshStandardMaterial({ map: lace, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95 }), side * 0.2, 0.2, fz + 0.04).castShadow = false;
      s.rod([-0.31, 0.352, fz + 0.045], [0.31, 0.352, fz + 0.045], 0.004, new THREE.MeshStandardMaterial({ color: '#c9a64e', metalness: 0.8, roughness: 0.3 }));
    } else if (a.where === 'board') {
      const wood = s.material('#b78a55', { roughness: 0.8 });
      part(s.root, new THREE.BoxGeometry(0.6, 0.022, 0.4), wood, 0, 0.011, 0).rotation.y = mix(-0.1, 0.1, random());
      const cuts = Array.from({ length: 30 }, () => ({ at: [(random() - 0.5) * 0.5, 0.0225, (random() - 0.5) * 0.32] as [number, number, number], size: 0.02 + random() * 0.03 }));
      const scars = s.scatter(new THREE.BoxGeometry(1, 0.01, 0.03), s.material('#8a6238', { roughness: 0.9 }), cuts);
      scars.castShadow = false;
      ground = 0.022;
    }

    // ---- tea towel ----------------------------------------------------------------------
    const cloth = paint(256, 256, (ctx) => {
      ctx.fillStyle = '#f4efe0'; ctx.fillRect(0, 0, 256, 256);
      const stripe = mood.cheer > 0.5 ? '#c8382f' : '#3f5f9a';
      ctx.fillStyle = stripe; ctx.globalAlpha = 0.85;
      for (const x of [24, 40, 204, 220]) ctx.fillRect(x, 0, 8, 256);
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < 8; i++) { ctx.fillRect(0, i * 32, 256, 8); ctx.fillRect(i * 32 + 60, 0, 6, 256); }
    });
    const towelMaterial = new THREE.MeshStandardMaterial({ map: cloth, roughness: 0.95, side: THREE.DoubleSide });
    if (a.towel === 'under') {
      const geometry = new THREE.PlaneGeometry(0.56, 0.4, 20, 14);
      const tp = geometry.attributes.position;
      for (let i = 0; i < tp.count; i++) tp.setZ(i, (Math.sin(tp.getX(i) * 38 + 1) * Math.cos(tp.getY(i) * 31) + 1) * 0.0022);
      geometry.computeVertexNormals();
      const towel = part(s.root, geometry, towelMaterial, 0.01, ground + 0.002, 0.02);
      towel.rotation.set(-Math.PI / 2, 0, mix(-0.3, 0.3, random()));
      ground += 0.006;
    }

    // ---- rack ---------------------------------------------------------------------------
    const RW = 0.44, RD = 0.3;
    let top = ground + 0.03;
    if (a.rack === 'grid') {
      const wires: THREE.Mesh[] = [];
      for (const z of [-1, 1]) wires.push(s.rod([-RW / 2, top - 0.004, z * RD / 2], [RW / 2, top - 0.004, z * RD / 2], 0.004, steel));
      for (const x of [-1, 1]) wires.push(s.rod([x * RW / 2, top - 0.004, -RD / 2], [x * RW / 2, top - 0.004, RD / 2], 0.004, steel));
      const bars = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0022, 0.0022, 1, 6), steel, 23 + 3);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let i = 0; i < 23; i++) { q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)); m.compose(new THREE.Vector3(-RW / 2 + ((i + 1) / 24) * RW, top - 0.002, 0), q, new THREE.Vector3(1, RD, 1)); bars.setMatrixAt(i, m); }
      for (let i = 0; i < 3; i++) { q.setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)); m.compose(new THREE.Vector3(0, top - 0.006, (i - 1) * RD * 0.3), q, new THREE.Vector3(1, RW, 1)); bars.setMatrixAt(23 + i, m); }
      bars.castShadow = true; s.root.add(bars);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.tube([[x * RW * 0.38, top - 0.006, z * RD / 2], [x * RW * 0.38, ground + 0.003, z * (RD / 2 + 0.006)], [x * RW * 0.3, ground + 0.003, z * (RD / 2 + 0.006)], [x * RW * 0.3, top - 0.006, z * RD / 2]], 0.003, steel);
    } else if (a.rack === 'round') {
      for (let i = 1; i <= 6; i++) s.ring(i * 0.03, i === 6 ? 0.004 : 0.0022, [0, top - 0.003, 0], steel).rotation.x = Math.PI / 2;
      for (let i = 0; i < 4; i++) { const t = i * Math.PI / 4; s.rod([Math.cos(t) * 0.18, top - 0.006, Math.sin(t) * 0.18], [-Math.cos(t) * 0.18, top - 0.006, -Math.sin(t) * 0.18], 0.0026, steel); }
      for (let i = 0; i < 3; i++) { const t = i * 2.094 + 0.5; s.rod([Math.cos(t) * 0.17, top - 0.006, Math.sin(t) * 0.17], [Math.cos(t) * 0.175, ground, Math.sin(t) * 0.175], 0.004, steel); }
    } else {
      const wood = s.material('#c79a5e', { roughness: 0.75 });
      top = ground + 0.034;
      for (let i = 0; i < 9; i++) part(s.root, new THREE.BoxGeometry(0.032, 0.012, RD), wood, -RW / 2 + 0.024 + i * (RW - 0.048) / 8, top - 0.006, 0);
      for (const z of [-1, 1]) part(s.root, new THREE.BoxGeometry(RW, 0.022, 0.03), wood, 0, top - 0.023, z * RD * 0.32);
    }

    // ---- the bake -----------------------------------------------------------------------
    const food = group();
    food.position.y = top;
    const gone = a.eaten;
    let steamAt: [number, number, number] = [0, top + 0.06, 0];
    let towelPeak = 0.07;
    const fill = FILLING[a.filling];
    const plateX = RW / 2 + 0.13, plateZ = 0.06;
    const plate = () => lathe(s.root, [[0, 0], [0.06, 0.003], [0.1, 0.016], [0.098, 0.019], [0.06, 0.008], [0, 0.006]], china, plateX, a.where === 'sill' ? 0.04 : a.where === 'board' ? 0.022 : 0, plateZ);
    const plateTop = (a.where === 'sill' ? 0.04 : a.where === 'board' ? 0.022 : 0) + 0.008;

    if (a.bake === 'pie') {
      const R = 0.125, tinH = 0.034, bulge = 0.018;
      const dome = (r: number) => tinH + bulge * (1 - (r / R) ** 2) - 0.002;
      const drawPie = (ctx: Ctx, bump: boolean) => {
        ctx.fillStyle = bump ? '#3a3a3a' : fill; ctx.fillRect(0, 0, 512, 512);
        if (!bump) for (let i = 0; i < 120; i++) { ctx.fillStyle = random() < 0.5 ? 'rgba(255,220,200,0.16)' : 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.arc(random() * 512, random() * 512, 3 + random() * 9, 0, 7); ctx.fill(); }
        const base = '#' + crustTone.getHexString(), edge = '#' + crustTone.clone().multiplyScalar(0.62).getHexString();
        const strip = (x: number, y: number, w: number, h: number) => {
          if (bump) { ctx.fillStyle = '#d8d8d8'; ctx.fillRect(x, y, w, h); return; }
          ctx.fillStyle = edge; ctx.fillRect(x, y, w, h);
          ctx.fillStyle = base; if (w > h) ctx.fillRect(x, y + 5, w, h - 10); else ctx.fillRect(x + 5, y, w - 10, h);
        };
        const pitch = 74, wide = 38, first = 256 - pitch * 3 - wide / 2;
        for (let i = 0; i < 7; i++) strip(0, first + i * pitch, 512, wide);
        for (let j = 0; j < 7; j++) strip(first + j * pitch, 0, wide, 512);
        for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) if ((i + j) % 2) strip(first + j * pitch - 8, first + i * pitch, wide + 16, wide);
        if (!bump) {
          for (let i = 0; i < 500; i++) { ctx.fillStyle = `rgba(90,45,10,${0.08 + random() * 0.2 + bake * 0.2})`; ctx.beginPath(); ctx.arc(random() * 512, random() * 512, 1 + random() * 3, 0, 7); ctx.fill(); }
          for (let i = 0; i < 260; i++) { ctx.fillStyle = 'rgba(255,250,235,0.55)'; ctx.fillRect(random() * 512, random() * 512, 2, 2); }
        }
        ctx.strokeStyle = bump ? '#ffffff' : base; ctx.lineWidth = 46; ctx.beginPath(); ctx.arc(256, 256, 244, 0, 7); ctx.stroke();
        if (!bump) { ctx.strokeStyle = edge; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(256, 256, 222, 0, 7); ctx.stroke(); }
      };
      const pieTop = new THREE.MeshStandardMaterial({ map: paint(512, 512, (ctx) => drawPie(ctx, false)), bumpMap: paint(512, 512, (ctx) => drawPie(ctx, true), false), bumpScale: 2.5, roughness: 0.6, side: THREE.DoubleSide });
      const wedge = gone === 'whole' ? 0 : gone === 'slice' ? 0.95 : gone === 'half' ? Math.PI : Math.PI * 1.72;
      const centre = mix(4.6, 5.6, random()); // the cut opens toward the viewer
      const start = centre + wedge / 2, length = Math.PI * 2 - wedge;
      const cap = (thetaStart: number, thetaLength: number) => {
        const geometry = new THREE.RingGeometry(0.0001, R, Math.max(6, Math.round(48 * thetaLength / 6.3)), 6, thetaStart, thetaLength);
        const p = geometry.attributes.position;
        for (let i = 0; i < p.count; i++) p.setZ(i, dome(Math.hypot(p.getX(i), p.getY(i))));
        geometry.rotateX(-Math.PI / 2);
        geometry.computeVertexNormals();
        return geometry;
      };
      const cutFace = (parent: THREE.Object3D, theta: number, floor: number) => {
        const shape = new THREE.Shape();
        shape.moveTo(0, floor); shape.lineTo(R, floor);
        for (let i = 6; i >= 0; i--) shape.lineTo((i / 6) * R, dome((i / 6) * R));
        const face = part(parent, new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: fill, roughness: 0.35, side: THREE.DoubleSide }));
        face.rotation.y = theta;
        const lid = part(parent, new THREE.BoxGeometry(R, 0.005, 0.0015), crust, 0, 0, 0);
        lid.geometry.translate(R / 2, tinH + bulge * 0.55, 0); lid.rotation.y = theta;
      };
      // the tin, dented with use
      const tinGeometry = new THREE.LatheGeometry([[0, 0], [0.092, 0], [0.098, 0.004], [R, tinH - 0.004], [R + 0.012, tinH - 0.002], [R + 0.012, tinH], [R - 0.001, tinH - 0.001], [0.096, 0.006], [0, 0.004]].map(([r, h]) => new THREE.Vector2(r, h)), 48);
      const tp = tinGeometry.attributes.position, v = new THREE.Vector3();
      for (let d = 0; d < Math.round(mood.wear * 5); d++) {
        const t = random() * 6.3, hit = new THREE.Vector3(Math.cos(t) * (R + 0.01), tinH, Math.sin(t) * (R + 0.01));
        for (let i = 0; i < tp.count; i++) { v.fromBufferAttribute(tp, i); const dist = v.distanceTo(hit); if (dist < 0.035) tp.setY(i, v.y - (1 - dist / 0.035) * 0.008); }
      }
      tinGeometry.computeVertexNormals();
      part(food, tinGeometry, steel);
      if (gone !== 'whole') part(food, new THREE.CircleGeometry(0.094, 28), new THREE.MeshStandardMaterial({ color: new THREE.Color(fill).lerp(crustTone, 0.5), roughness: 0.5 }), 0, 0.0065, 0).rotation.x = -Math.PI / 2;
      part(food, cap(start, length), pieTop);
      if (wedge) {
        cutFace(food, start, 0.006); cutFace(food, start + length, 0.006);
        // filling oozing where it was cut
        for (let i = 0; i < 4; i++) { const t = (i < 2 ? start : start + length) + (i < 2 ? -0.1 : 0.1), r = 0.03 + random() * 0.06; part(food, new THREE.SphereGeometry(0.011, 8, 6), new THREE.MeshStandardMaterial({ color: fill, roughness: 0.25 }), Math.cos(t) * r, 0.009, -Math.sin(t) * r).scale.y = 0.4; }
        sprinkle(30, 0, top + 0.008, 0, 0.08);
      }
      // crimped rim
      const crimps: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 40; i++) {
        const t = (i / 40) * Math.PI * 2;
        const inside = ((t - start) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) <= length;
        if (inside) crimps.push({ at: [Math.cos(t) * (R + 0.002), top + tinH + 0.003, -Math.sin(t) * (R + 0.002)], size: 0.0105 });
      }
      s.scatter(new THREE.SphereGeometry(1, 8, 6), crust, crimps);
      if (gone === 'slice') {
        plate();
        const piece = group(); piece.position.set(plateX - 0.02, plateTop - 0.002, plateZ + 0.03); piece.rotation.y = mix(1.4, 2.6, random());
        part(piece, cap(0, 0.95), pieTop); cutFace(piece, 0, 0.004); cutFace(piece, 0.95, 0.004);
        piece.scale.y = 0.9;
        const fork = group(); fork.position.set(plateX + 0.05, plateTop + 0.012, plateZ - 0.02); fork.rotation.y = mix(0.4, 1.1, random());
        part(fork, new THREE.BoxGeometry(0.012, 0.002, 0.13), steel); part(fork, new THREE.BoxGeometry(0.022, 0.002, 0.04), steel, 0, 0, -0.07);
      }
      steamAt = [0, top + tinH + bulge, 0];
      towelPeak = tinH + bulge + 0.008;
    } else if (a.bake === 'loaf') {
      const LW = 0.13, LH = 0.115, LL = gone === 'whole' ? 0.27 : gone === 'slice' ? 0.22 : gone === 'half' ? 0.13 : 0.035;
      const section = new THREE.Shape();
      section.moveTo(-LW * 0.42, 0); section.lineTo(LW * 0.42, 0);
      section.bezierCurveTo(LW * 0.5, 0.002, LW * 0.46, LH * 0.42, LW * 0.5, LH * 0.5);
      section.bezierCurveTo(LW * 0.66, LH * 0.8, LW * 0.3, LH, 0, LH);
      section.bezierCurveTo(-LW * 0.3, LH, -LW * 0.66, LH * 0.8, -LW * 0.5, LH * 0.5);
      section.bezierCurveTo(-LW * 0.46, LH * 0.42, -LW * 0.5, 0.002, -LW * 0.42, 0);
      const loaf = group(food);
      loaf.rotation.y = Math.PI / 2 + mix(-0.2, 0.2, random());
      const whole = gone === 'whole';
      const body = part(loaf, new THREE.ExtrudeGeometry(section, { depth: LL, bevelEnabled: whole, bevelSize: 0.018, bevelThickness: 0.02, bevelSegments: 4, curveSegments: 10 }), whole ? crust : [crumb, crust], 0, 0, -0.135);
      if (!whole) {
        const heel = part(loaf, new THREE.ExtrudeGeometry(section, { depth: 0.004, bevelEnabled: true, bevelSize: 0.018, bevelThickness: 0.02, bevelSegments: 4, curveSegments: 10 }), crust, 0, 0, -0.135);
        heel.scale.set(0.87, 0.87, 1);
        body.scale.set(1, 1, 1);
      }
      // flour-dusted slashes across the top
      const slashes = Math.floor(LL / 0.055);
      for (let i = 0; i < slashes; i++) { const cut = part(loaf, new THREE.BoxGeometry(LW * 0.62, 0.006, 0.012), crumb, 0, LH - 0.001, -0.135 + 0.04 + i * 0.055); cut.rotation.y = 0.5; }
      const slice = (x: number, y: number, z: number, lay: boolean) => {
        const piece = part(s.root, new THREE.ExtrudeGeometry(section, { depth: 0.014, bevelEnabled: false, curveSegments: 10 }), [crumb, crust], x, y, z);
        if (lay) piece.rotation.set(-Math.PI / 2, 0, random() * 3); else piece.rotation.set(-0.5, Math.PI / 2 + random() * 0.3, 0);
        return piece;
      };
      if (gone === 'slice') { plate(); slice(plateX - 0.03, plateTop + 0.014, plateZ + 0.055, true); }
      else if (gone === 'half') { for (let i = 0; i < 3; i++) slice(0.02 + i * 0.03, top + 0.004, 0.03 + (random() - 0.5) * 0.02, false).rotation.x = -0.9 - i * 0.12; }
      if (!whole) sprinkle(gone === 'crumbs' ? 90 : 40, 0.03, top + 0.003, 0, 0.13);
      steamAt = [-0.04, top + LH, 0];
      towelPeak = LH + 0.006;
    } else if (a.bake === 'buns') {
      // a baking sheet of buns pulled apart
      const sheet = s.material('#8f9396', { metalness: 0.7, roughness: 0.5 });
      part(food, new THREE.BoxGeometry(0.38, 0.004, 0.26), sheet, 0, 0.002, 0);
      for (const z of [-1, 1]) part(food, new THREE.BoxGeometry(0.39, 0.016, 0.006), sheet, 0, 0.008, z * 0.132);
      for (const x of [-1, 1]) part(food, new THREE.BoxGeometry(0.006, 0.016, 0.27), sheet, x * 0.192, 0.008, 0);
      part(food, new THREE.BoxGeometry(0.366, 0.001, 0.246), s.material('#e9dfc4', { roughness: 0.95 }), 0, 0.0046, 0);
      const keep = gone === 'whole' ? 12 : gone === 'slice' ? 11 : gone === 'half' ? 6 : 1;
      const order = Array.from({ length: 12 }, (_unused, index) => index).sort((p, q) => (q % 4) + Math.floor(q / 4) * 0.5 - ((p % 4) + Math.floor(p / 4) * 0.5));
      const glaze = new THREE.MeshStandardMaterial({ color: crustTone.clone().lerp(new THREE.Color('#b86a1e'), 0.35), roughness: 0.28 });
      const bun = (parent: THREE.Object3D, x: number, y: number, z: number) => {
        const g = group(parent); g.position.set(x, y, z);
        const dome = part(g, new THREE.SphereGeometry(0.046, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), glaze);
        dome.scale.set(1 + random() * 0.08, 0.86 + random() * 0.2, 1 + random() * 0.08);
        part(g, new THREE.CylinderGeometry(0.047, 0.043, 0.012, 18), crumb, 0, -0.004, 0);
        const jam = part(g, new THREE.SphereGeometry(0.011, 10, 8), new THREE.MeshStandardMaterial({ color: fill, roughness: 0.2 }), 0, 0.037 * dome.scale.y, 0); jam.scale.y = 0.5;
        return g;
      };
      order.slice(12 - keep).forEach((index) => bun(food, -0.135 + (index % 4) * 0.09 + (random() - 0.5) * 0.006, 0.012, -0.083 + Math.floor(index / 4) * 0.083 + (random() - 0.5) * 0.006));
      if (gone !== 'whole') { sprinkle(50, 0.06, top + 0.007, 0.03, 0.11); }
      if (gone === 'slice') {
        plate();
        const torn = bun(s.root, plateX - 0.01, plateTop + 0.01, plateZ + 0.01);
        torn.rotation.z = 0.3;
        part(s.root, new THREE.SphereGeometry(0.02, 10, 8), new THREE.MeshStandardMaterial({ color: fill, roughness: 0.2 }), plateX + 0.03, plateTop + 0.004, plateZ + 0.04).scale.y = 0.25;
      }
      steamAt = [-0.05, top + 0.055, -0.02];
      towelPeak = 0.062;
    } else {
      const blister = paint(256, 256, (ctx) => {
        ctx.fillStyle = '#ecd8a4'; ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 60; i++) {
          const x = random() * 256, y = random() * 256, r = 4 + random() * 16;
          const spot = ctx.createRadialGradient(x, y, 0, x, y, r);
          spot.addColorStop(0, `rgba(${70 - bake * 40},${36 - bake * 20},10,0.9)`); spot.addColorStop(0.6, 'rgba(150,90,30,0.6)'); spot.addColorStop(1, 'rgba(190,140,70,0)');
          ctx.fillStyle = spot; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        }
      });
      const bread = new THREE.MeshStandardMaterial({ map: blister, roughness: 0.9 });
      const full = 5 + Math.round(mood.density * 9);
      const count = gone === 'whole' ? full : gone === 'slice' ? full - 1 : gone === 'half' ? Math.ceil(full / 2) : 1;
      const round = (parent: THREE.Object3D, x: number, y: number, z: number, radius: number) => {
        const geometry = new THREE.CylinderGeometry(radius, radius, 0.007, 28, 1);
        const p = geometry.attributes.position, wob = random() * 6, lump = random() * 6;
        for (let i = 0; i < p.count; i++) {
          const px = p.getX(i), pz = p.getZ(i), t = Math.atan2(pz, px), r = Math.hypot(px, pz) / radius;
          const k = 1 + Math.sin(t * 3 + wob) * 0.05 + Math.sin(t * 5 + lump) * 0.03;
          p.setXYZ(i, px * k, p.getY(i) + Math.sin(t * 2 + lump) * 0.004 * r, pz * k);
        }
        geometry.computeVertexNormals();
        const mesh = part(parent, geometry, bread, x, y, z);
        mesh.rotation.y = random() * 6;
        return mesh;
      };
      for (let i = 0; i < count; i++) round(food, (random() - 0.5) * 0.03, 0.006 + i * 0.0085, (random() - 0.5) * 0.03, 0.115 + random() * 0.012);
      if (gone === 'slice') {
        plate();
        const folded = round(s.root, plateX, plateTop + 0.006, plateZ, 0.085); folded.scale.set(1, 1, 0.55); folded.rotation.z = 0.12;
      } else if (gone === 'crumbs') sprinkle(50, 0, top + 0.004, 0, 0.13);
      steamAt = [0, top + 0.01 + count * 0.0085, 0];
      towelPeak = 0.012 + count * 0.0085;
    }
    if (crumbs.length) s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: crustTone.clone().lerp(new THREE.Color('#f1dfb4'), 0.4), roughness: 0.9 }), crumbs);

    // ---- towel, the other ways ----------------------------------------------------------
    if (a.towel === 'draped') {
      // a sheet that rides over the back half of the bake and slumps to the rack around it
      const geometry = new THREE.PlaneGeometry(0.42, 0.24, 26, 18);
      const p = geometry.attributes.position;
      const cover = gone === 'crumbs' ? 0.3 : 1;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i); // y becomes -z once laid flat
        const r = Math.hypot(x * 0.85, y + 0.13) / 0.15;
        const hump = Math.max(0, 1 - r * r) * towelPeak * cover;
        const hang = Math.max(0, Math.abs(x) - RW / 2 + 0.01) * 1.1 + Math.max(0, y - 0.03) * 1.3;
        p.setZ(i, 0.004 + hump + Math.sin(x * 60 + y * 40) * 0.0025 - Math.min(hang, top - ground - 0.004));
      }
      geometry.computeVertexNormals();
      const towel = part(s.root, geometry, towelMaterial, mix(-0.03, 0.03, random()), top, -0.13);
      towel.rotation.set(-Math.PI / 2, 0, mix(-0.12, 0.12, random()));
    } else if (a.towel === 'folded') {
      const base = a.where === 'sill' ? 0.04 : a.where === 'board' ? 0.022 : 0;
      const stack = group(); stack.position.set(-RW / 2 - 0.11, base, 0.05); stack.rotation.y = mix(-0.3, 0.3, random());
      for (let i = 0; i < 3; i++) part(stack, new THREE.BoxGeometry(0.15 - i * 0.004, 0.006, 0.19 - i * 0.004), towelMaterial, (random() - 0.5) * 0.004, 0.003 + i * 0.0062, (random() - 0.5) * 0.004);
    }

    // ---- steam --------------------------------------------------------------------------
    const curls: { mesh: THREE.Mesh; phase: number; speed: number }[] = [];
    const amount = a.fresh === 'hot' ? 5 : a.fresh === 'warm' ? 1 : 0;
    if (gone !== 'crumbs' || a.fresh === 'hot') {
      const vapour = new THREE.MeshStandardMaterial({ color: '#eef3f5', transparent: true, opacity: a.fresh === 'hot' ? 0.72 : 0.55, depthWrite: false, roughness: 1 });
      for (let i = 0; i < amount; i++) {
        const height = a.fresh === 'hot' ? mix(0.16, 0.26, random()) : 0.13;
        const twist = random() * 6, wide = mix(0.012, 0.024, random());
        const path = new THREE.CatmullRomCurve3(Array.from({ length: 7 }, (_unused, k) => {
          const t = k / 6;
          return new THREE.Vector3(Math.sin(t * 5 + twist) * wide * (0.4 + t), t * height, Math.cos(t * 4 + twist) * wide * (0.4 + t));
        }));
        // fat at the base, thinning to nothing: built as a tapered tube
        const geometry = new THREE.TubeGeometry(path, 28, 0.011, 6);
        const p = geometry.attributes.position, c = new THREE.Vector3();
        for (let ring = 0; ring <= 28; ring++) {
          path.getPointAt(ring / 28, c);
          const k = Math.sin((ring / 28) * Math.PI) ** 0.6 * (1.4 - ring / 28);
          for (let j = 0; j <= 6; j++) { const index = ring * 7 + j; p.setXYZ(index, c.x + (p.getX(index) - c.x) * k, c.y + (p.getY(index) - c.y) * k, c.z + (p.getZ(index) - c.z) * k); }
        }
        const mesh = new THREE.Mesh(geometry, vapour);
        const t = random() * 6.3, r = amount > 1 ? 0.02 + random() * 0.06 : 0;
        mesh.position.set(steamAt[0] + Math.cos(t) * r, steamAt[1] - 0.004, steamAt[2] + Math.sin(t) * r * 0.7);
        s.root.add(mesh);
        curls.push({ mesh, phase: random() * 6.3, speed: mix(0.5, 1.6, random()) });
      }
    }
    const lively = mix(0.3, 1.2, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const curl of curls) {
          curl.mesh.rotation.y = time * curl.speed * lively + curl.phase;
          curl.mesh.scale.y = 1 + Math.sin(time * 0.9 * lively + curl.phase) * 0.16;
        }
      },
    });
  },
});
