import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const METAL = {
  brass: { color: '#c9a04a', metalness: 0.85, roughness: 0.3 },
  chrome: { color: '#d4d9dc', metalness: 0.9, roughness: 0.2 },
  bronze: { color: '#5a4630', metalness: 0.6, roughness: 0.45 },
  white: { color: '#ecebe4', metalness: 0.1, roughness: 0.6 },
} as const;
const BANNER = {
  closing: ['STORE CLOSING', 'EVERYTHING MUST GO'],
  thanks: ['THANK YOU', 'FOR 34 WONDERFUL YEARS'],
  lease: ['FOR LEASE', 'ENTIRE PROPERTY  555-0142'],
  moved: ["WE'VE MOVED", 'VISIT US ONLINE'],
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
    atrium: choice('What shape is the glass atrium above the doors?', {
      barrel: 'A barrel-vaulted glass arcade roof, the classic eighties galleria.',
      pyramid: 'A glass pyramid skylight on a square drum.',
      gable: 'A steep greenhouse gable like a conservatory.',
      flat: 'A low boxy clerestory with a sloped glass front, seventies and plain.',
    }),
    metal: choice('What are the frames and door hardware made of?', {
      brass: 'Polished brass, gone dull.',
      chrome: 'Bright chrome and mirror trim.',
      bronze: 'Dark bronze anodised aluminium.',
      white: 'White painted steel, a nineties refit.',
    }),
    canopy: choice('What kind of canopy hangs over the doors?', {
      awning: 'A scalloped striped fabric awning, sun-faded.',
      marquee: 'A flat cantilevered marquee with a row of bulbs and the word MALL.',
      spaceframe: 'A teal tubular space-frame with a clear roof, very 1987.',
      gone: 'None: torn away, leaving only the brackets.',
    }),
    sealed: choice('How are the doors sealed?', {
      chained: 'Heavy chains and padlocks looped through the door pulls.',
      plywood: 'Sheets of plywood screwed over the doors.',
      papered: 'Brown paper and taped notices on the inside of the glass.',
      ajar: 'Not sealed any more: one door forced open and a pane smashed.',
    }),
    banner: choice('If a banner hangs on it, what does it say?', {
      none: 'No banner.',
      closing: 'STORE CLOSING, EVERYTHING MUST GO, in red on yellow.',
      thanks: 'THANK YOU FOR 34 WONDERFUL YEARS.',
      lease: 'FOR LEASE, entire property.',
      moved: "WE'VE MOVED, VISIT US ONLINE.",
    }),
    glow: choice('What light is left on inside?', {
      skylight: 'Only dim daylight falling through the skylight onto an empty concourse.',
      emergency: 'A single red EXIT sign deep inside.',
      security: 'Cold fluorescent night lights left burning for nobody.',
      neon: 'One pink neon from a store that forgot to switch off.',
      dark: 'Nothing. Black glass.',
    }),
    flank: choice('What still stands beside the doors?', {
      nothing: 'Nothing.',
      planters: 'Two round planters with dead shrubs.',
      bench: 'A slatted bench and an ashtray urn.',
      boxes: 'A row of empty newspaper boxes.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const metalSpec = METAL[a.metal];
    const metal = s.material(new THREE.Color(metalSpec.color).lerp(new THREE.Color('#6b6455'), wear * 0.35), { metalness: metalSpec.metalness, roughness: metalSpec.roughness + wear * 0.3 });
    const wallMat = s.material('#c9b697', { roughness: 0.95 });
    const wallDark = s.material('#a8926f', { roughness: 0.95 });
    const concrete = s.material('#bdb8aa', { roughness: 0.95 });
    const dark = s.material('#1b1d20', { roughness: 0.85 });
    const glassTint = new THREE.Color('#9fc0c2').lerp(new THREE.Color('#a59a80'), wear * 0.6);
    const glass = new THREE.MeshPhysicalMaterial({ color: glassTint, transparent: true, opacity: mix(0.22, 0.42, wear), roughness: 0.08, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide });
    const pane = (size: readonly [number, number, number], at: readonly [number, number, number]) => { const m = s.box(size, at, glass); m.castShadow = false; return m; };

    const W = 13, H = 5.0, VW = 7.6, VH = 3.4, zWall = -2.0, zFront = 0.4;
    const vDepth = zFront - zWall, zMid = (zFront + zWall) / 2;

    // The mall wall this entrance is cut into.
    const wallTex = paint(512, 256, (ctx, w, h) => {
      ctx.fillStyle = '#c9b697'; ctx.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 10) { ctx.fillStyle = 'rgba(70,55,35,0.16)'; ctx.fillRect(x, 0, 4, h); }
      ctx.fillStyle = '#8d6f52'; ctx.fillRect(0, h * 0.14, w, h * 0.06);
      for (let k = 0; k < 60; k++) {
        const g = ctx.createLinearGradient(0, 0, 0, h * mix(0.2, 0.9, random()));
        g.addColorStop(0, `rgba(50,42,30,${mix(0.08, 0.5, wear) * random()})`); g.addColorStop(1, 'rgba(50,42,30,0)');
        ctx.fillStyle = g; ctx.fillRect(random() * w, 0, mix(4, 26, random()), h);
      }
    });
    s.box([W, H, 0.6], [0, H / 2, zWall - 0.3], wallMat);
    for (const x of [-1, 1]) {
      const wing = (W - VW) / 2;
      s.mesh(new THREE.PlaneGeometry(wing, H), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 }), [x * (VW / 2 + wing / 2), H / 2, zWall + 0.006]);
    }
    s.box([W + 0.2, 0.16, 0.8], [0, H + 0.08, zWall - 0.3], concrete);
    // Portal piers either side of the glass.
    for (const x of [-1, 1]) s.box([0.7, VH + 0.5, vDepth + 0.3], [x * (VW / 2 + 0.35), (VH + 0.5) / 2, zMid + 0.1], wallDark);
    s.box([VW + 1.4, 0.5, vDepth + 0.3], [0, VH + 0.25, zMid + 0.1], wallDark);

    // Interior: a dark concourse and whatever light is left.
    s.box([VW, VH, 0.05], [0, VH / 2, zWall - 0.02], dark);
    s.box([VW, 0.04, vDepth], [0, 0.02, zMid], s.material('#6f6253', { roughness: 0.4 }));
    const day = 1 - Math.abs(mood.daylight - 0.5) * 1.2;
    const lights: THREE.MeshStandardMaterial[] = [];
    if (a.glow !== 'dark') {
      const glowTex = paint(256, 128, (ctx, w, h) => {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
        if (a.glow === 'skylight') {
          const g = ctx.createLinearGradient(0, 0, w * 0.2, h);
          g.addColorStop(0, 'rgba(225,235,225,0.95)'); g.addColorStop(1, 'rgba(225,235,225,0.1)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.moveTo(w * 0.36, 0); ctx.lineTo(w * 0.64, 0); ctx.lineTo(w * 0.86, h); ctx.lineTo(w * 0.3, h); ctx.fill();
          ctx.fillStyle = 'rgba(210,220,210,0.25)'; ctx.fillRect(0, h * 0.82, w, h * 0.18);
        } else if (a.glow === 'emergency') {
          const g = ctx.createRadialGradient(w * 0.7, h * 0.3, 2, w * 0.7, h * 0.3, w * 0.45);
          g.addColorStop(0, 'rgba(255,50,40,0.9)'); g.addColorStop(1, 'rgba(255,40,30,0)');
          ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#ff5a48'; ctx.fillRect(w * 0.64, h * 0.24, w * 0.12, h * 0.12);
          ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.fillText('EXIT', w * 0.65, h * 0.335);
        } else if (a.glow === 'security') {
          ctx.fillStyle = 'rgba(190,220,235,0.3)'; ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#eaf6ff';
          for (let k = 0; k < 5; k++) ctx.fillRect(w * (0.08 + k * 0.19), h * (0.12 + (k % 2) * 0.06), w * 0.1, 4);
          const g = ctx.createLinearGradient(0, h * 0.6, 0, h);
          g.addColorStop(0, 'rgba(200,225,240,0)'); g.addColorStop(1, 'rgba(200,225,240,0.5)');
          ctx.fillStyle = g; ctx.fillRect(0, h * 0.6, w, h * 0.4);
        } else {
          const g = ctx.createRadialGradient(w * 0.3, h * 0.45, 2, w * 0.3, h * 0.45, w * 0.5);
          g.addColorStop(0, 'rgba(255,70,170,0.85)'); g.addColorStop(1, 'rgba(255,70,170,0)');
          ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#ffd0ea'; ctx.lineWidth = 3; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(w * 0.2, h * 0.5); ctx.bezierCurveTo(w * 0.24, h * 0.2, w * 0.3, h * 0.7, w * 0.34, h * 0.4); ctx.bezierCurveTo(w * 0.36, h * 0.3, w * 0.4, h * 0.6, w * 0.42, h * 0.42); ctx.stroke();
        }
      });
      const strength = a.glow === 'skylight' ? mix(0.35, 0.9, Math.max(0, day)) : 1.1;
      const glowMat = new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#ffffff', emissiveMap: glowTex, emissiveIntensity: strength, roughness: 1 });
      if (a.glow !== 'skylight') lights.push(glowMat);
      s.mesh(new THREE.PlaneGeometry(VW, VH), glowMat, [0, VH / 2, zWall + 0.02]).castShadow = false;
    }

    // Vestibule glazing: posts, transom rail, side lights.
    const pairs = 4, pairW = VW / pairs, doorH = 2.3;
    for (let i = 0; i <= pairs; i++) s.box([0.09, VH, 0.12], [-VW / 2 + i * pairW, VH / 2, zFront], metal);
    s.box([VW, 0.1, 0.12], [0, doorH + 0.05, zFront], metal);
    s.box([VW, 0.12, 0.14], [0, VH - 0.06, zFront], metal);
    pane([VW, VH - doorH - 0.1, 0.02], [0, (VH + doorH + 0.1) / 2, zFront]);
    // Etched entrance number on the transom.
    s.label(`ENTRANCE ${1 + Math.floor(random() * 6)}`, 1.5, 0.3, [0, doorH + 0.5, zFront + 0.03], '#f2efe6', '#3d4a4c');

    // Doors.
    const forced = a.sealed === 'ajar' ? Math.floor(random() * pairs) : -1;
    const smashed = a.sealed === 'ajar' ? (forced + 1 + Math.floor(random() * (pairs - 1))) % pairs : -1;
    const boarded = a.sealed === 'plywood' ? Math.max(2, Math.round(mix(2, pairs, wear) + random() * 0.8)) : 0;
    const ply = s.material('#b98f55', { roughness: 0.9 });
    const chainMat = s.material('#7d8286', { metalness: 0.7, roughness: 0.4 });
    for (let i = 0; i < pairs; i++) {
      const cx = -VW / 2 + (i + 0.5) * pairW;
      for (const side of [-1, 1]) {
        const leafW = pairW / 2 - 0.07;
        const leaf = new THREE.Group();
        const hingeX = cx + side * (pairW / 2 - 0.05);
        leaf.position.set(hingeX, 0, zFront);
        const add = (size: readonly [number, number, number], at: readonly [number, number, number], mat: THREE.Material, shadow = true) => {
          const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
          m.position.set(...at);
          m.castShadow = shadow; m.receiveShadow = true;
          leaf.add(m);
          return m;
        };
        const mx = -side * leafW / 2;
        add([leafW, 0.08, 0.05], [mx, doorH - 0.04, 0], metal);
        add([leafW, 0.22, 0.05], [mx, 0.11, 0], metal);
        add([0.06, doorH, 0.05], [-side * 0.03, doorH / 2, 0], metal);
        add([0.06, doorH, 0.05], [-side * (leafW - 0.03), doorH / 2, 0], metal);
        const broken = i === smashed && side === 1;
        if (!broken) add([leafW - 0.1, doorH - 0.3, 0.015], [mx, doorH / 2 + 0.07, 0], glass, false);
        // Push bar and pull handle.
        add([leafW - 0.2, 0.05, 0.04], [mx, 1.05, 0.06], metal);
        add([0.03, 0.4, 0.03], [-side * (leafW - 0.12), 1.15, 0.09], metal);
        if (a.sealed === 'papered') {
          const sheet = add([leafW - 0.12, mix(1.2, 1.9, random()), 0.01], [mx, 0.25 + 0.8, -0.03], s.material(random() < 0.5 ? '#b89868' : '#c4a877', { roughness: 0.9 }), false);
          sheet.position.y = 0.25 + (sheet.geometry as THREE.BoxGeometry).parameters.height / 2;
          if (random() < 0.6) { const note = add([0.22, 0.28, 0.01], [mx + (random() - 0.5) * 0.2, 1.5 + random() * 0.3, 0.035], s.material('#f4f2ea'), false); note.rotation.z = (random() - 0.5) * 0.2; }
        }
        if (i === forced && side === -1) leaf.rotation.y = -mix(0.7, 1.4, random());
        if (broken) {
          // Shards left in the frame and glittering on the apron.
          for (let k = 0; k < 4; k++) { const shard = add([0.16 + random() * 0.2, 0.2 + random() * 0.4, 0.012], [mx + (random() - 0.5) * (leafW - 0.3), 0.3 + random() * 0.3, 0], glass, false); shard.rotation.z = (random() - 0.5) * 1.2; }
        }
        s.root.add(leaf);
      }
      if (i === smashed) {
        s.scatter(new THREE.TetrahedronGeometry(0.05), new THREE.MeshStandardMaterial({ color: '#cfe6e4', roughness: 0.1, metalness: 0.3 }),
          Array.from({ length: 34 }, () => ({ at: [cx + pairW / 4 + (random() - 0.5) * 1.2, 0.02, zFront + 0.1 + random() * 1.3] as const, size: mix(0.4, 1.3, random()) })));
      }
      if (i < boarded) {
        const order = [1, 2, 0, 3][i];
        const bx = -VW / 2 + (order + 0.5) * pairW;
        for (const side of [-1, 1]) {
          const sheet = s.box([pairW / 2 - 0.04, 2.3, 0.03], [bx + side * pairW / 4, 1.16 + (random() - 0.5) * 0.05, zFront + 0.13], ply);
          sheet.rotation.z = (random() - 0.5) * 0.03;
        }
        if (wear > 0.5 && random() < 0.7) s.label(['NO ENTRY', 'KEEP OUT', 'CLOSED'][Math.floor(random() * 3)], 1.0, 0.3, [bx, 1.5, zFront + 0.15], '#d5281f', '#b98f55').rotation.z = (random() - 0.5) * 0.15;
      } else if ((a.sealed === 'chained' || a.sealed === 'plywood') && i !== forced) {
        // A chain swagged between the two pulls, with a padlock.
        const x0 = cx - 0.19, x1 = cx + 0.19, sag = 0.22 + random() * 0.1;
        const links: { at: readonly [number, number, number]; size: number }[] = [];
        for (let k = 0; k <= 14; k++) {
          const t = k / 14;
          links.push({ at: [mix(x0, x1, t), 1.2 - Math.sin(t * Math.PI) * sag, zFront + 0.12 + (k % 2) * 0.012] as const, size: 1 });
        }
        s.scatter(new THREE.TorusGeometry(0.03, 0.01, 5, 8), chainMat, links);
        s.box([0.09, 0.1, 0.04], [cx, 1.2 - sag - 0.07, zFront + 0.13], s.material('#c9a04a', { metalness: 0.8, roughness: 0.3 }));
      }
    }

    // Glass side walls of the vestibule sit inside the piers; the atrium rises above.
    const baseY = VH + 0.5;
    const AW = VW, AD = vDepth + 1.4, az = zMid - 0.5;
    const ribs: [number, number, number][][] = [];
    if (a.atrium === 'barrel') {
      const rise = 2.3;
      const geo = new THREE.CylinderGeometry(1, 1, AD, 24, 1, false, -Math.PI / 2, Math.PI);
      geo.rotateX(Math.PI / 2);
      geo.scale(AW / 2, rise, 1);
      s.mesh(geo, glass, [0, baseY, az]).castShadow = false;
      for (let k = 0; k <= 4; k++) {
        const z = az - AD / 2 + (k * AD) / 4;
        const pts: [number, number, number][] = [];
        for (let j = 0; j <= 12; j++) { const t = (j / 12) * Math.PI; pts.push([-Math.cos(t) * AW / 2, baseY + Math.sin(t) * rise, z]); }
        ribs.push(pts);
      }
      for (const t of [0.5, 0.25, 0.75].map((v) => v * Math.PI)) ribs.push([[-Math.cos(t) * AW / 2, baseY + Math.sin(t) * rise, az - AD / 2], [-Math.cos(t) * AW / 2, baseY + Math.sin(t) * rise, az + AD / 2]]);
      // Fan mullions in the front lunette.
      for (let j = 1; j < 6; j++) { const t = (j / 6) * Math.PI; s.rod([0, baseY, az + AD / 2], [-Math.cos(t) * AW / 2, baseY + Math.sin(t) * rise, az + AD / 2], 0.03, metal); }
    } else if (a.atrium === 'pyramid') {
      s.box([AW * 0.8, 0.7, AD], [0, baseY + 0.35, az], wallDark);
      const geo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1, true);
      geo.rotateY(Math.PI / 4);
      geo.scale(AW * 0.8, 2.6, AD);
      geo.translate(0, 1.3, 0);
      s.mesh(geo, glass, [0, baseY + 0.7, az]).castShadow = false;
      const top: [number, number, number] = [0, baseY + 3.3, az];
      for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) ribs.push([[x * AW * 0.4, baseY + 0.7, az + z * AD / 2], top]);
      for (const f of [0.35, 0.68]) {
        const y = baseY + 0.7 + 2.6 * f, k = 1 - f;
        ribs.push([[-AW * 0.4 * k, y, az + AD / 2 * k], [AW * 0.4 * k, y, az + AD / 2 * k]]);
        ribs.push([[AW * 0.4 * k, y, az + AD / 2 * k], [AW * 0.4 * k, y, az - AD / 2 * k]]);
        ribs.push([[-AW * 0.4 * k, y, az + AD / 2 * k], [-AW * 0.4 * k, y, az - AD / 2 * k]]);
      }
    } else if (a.atrium === 'gable') {
      const rise = 2.8;
      const shape = new THREE.Shape();
      shape.moveTo(-AW / 2, 0); shape.lineTo(AW / 2, 0); shape.lineTo(AW / 2, 0.6); shape.lineTo(0, rise); shape.lineTo(-AW / 2, 0.6); shape.lineTo(-AW / 2, 0);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: AD, bevelEnabled: false });
      geo.translate(0, 0, -AD / 2);
      s.mesh(geo, glass, [0, baseY, az]).castShadow = false;
      for (let k = 0; k <= 3; k++) {
        const z = az - AD / 2 + (k * AD) / 3;
        ribs.push([[-AW / 2, baseY, z], [-AW / 2, baseY + 0.6, z]], [[-AW / 2, baseY + 0.6, z], [0, baseY + rise, z]], [[0, baseY + rise, z], [AW / 2, baseY + 0.6, z]], [[AW / 2, baseY + 0.6, z], [AW / 2, baseY, z]]);
      }
      ribs.push([[0, baseY + rise, az - AD / 2], [0, baseY + rise, az + AD / 2]]);
      for (const x of [-1, 1]) ribs.push([[x * AW / 2, baseY + 0.6, az - AD / 2], [x * AW / 2, baseY + 0.6, az + AD / 2]], [[x * AW / 4, baseY, az + AD / 2], [x * AW / 4, baseY + 0.6 + (rise - 0.6) / 2, az + AD / 2]]);
      ribs.push([[0, baseY, az + AD / 2], [0, baseY + rise, az + AD / 2]]);
    } else {
      const shape = new THREE.Shape();
      shape.moveTo(-AD / 2, 0); shape.lineTo(AD / 2, 0); shape.lineTo(AD / 2 - 0.9, 1.5); shape.lineTo(-AD / 2, 1.5); shape.lineTo(-AD / 2, 0);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: AW, bevelEnabled: false });
      geo.translate(0, 0, -AW / 2);
      geo.rotateY(-Math.PI / 2);
      s.mesh(geo, glass, [0, baseY, az]).castShadow = false;
      for (let k = 0; k <= 6; k++) {
        const x = -AW / 2 + (k * AW) / 6;
        ribs.push([[x, baseY, az + AD / 2], [x, baseY + 1.5, az + AD / 2 - 0.9]], [[x, baseY + 1.5, az + AD / 2 - 0.9], [x, baseY + 1.5, az - AD / 2]]);
      }
      s.box([AW + 0.2, 0.14, AD - 0.7], [0, baseY + 1.57, az - 0.45], wallDark);
    }
    for (const pts of ribs) {
      if (pts.length === 2) s.rod(pts[0], pts[1], 0.04, metal);
      else s.tube(pts, 0.04, metal);
    }
    s.box([AW + 0.1, 0.12, AD + 0.1], [0, baseY + 0.02, az], metal);
    // A few panes have gone opaque with plywood or grime as things decline.
    if (a.glow === 'skylight') {
      const beam = s.mesh(new THREE.PlaneGeometry(AW * 0.7, 1.2), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#e6efe4', emissiveIntensity: mix(0.25, 0.7, Math.max(0, day)), transparent: true, opacity: 0.5, depthWrite: false }), [0, baseY + 0.75, az + 0.2]);
      beam.castShadow = false;
    }

    // Canopy.
    const cY = 2.95, cD = 2.3, cW = VW + 0.5;
    if (a.canopy === 'awning') {
      const stripes = paint(256, 64, (ctx, w, h) => {
        const hue = ['#a3423a', '#2d6b6a', '#3a4f86', '#8a6a2a'][Math.floor(random() * 4)];
        for (let k = 0; k < 16; k++) { ctx.fillStyle = k % 2 ? '#e9e2d0' : hue; ctx.fillRect(k * 16, 0, 16, h); }
        ctx.fillStyle = `rgba(225,215,195,${mix(0.15, 0.6, wear)})`; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = `rgba(80,70,50,${mix(0.05, 0.4, wear)})`; for (let k = 0; k < 14; k++) ctx.fillRect(random() * w, random() * h, 20, 5);
      });
      const cloth = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.9, side: THREE.DoubleSide });
      const geo = new THREE.PlaneGeometry(cW, 2.7, 24, 6);
      const p = geo.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const v = p.getY(k) / 2.7 + 0.5; // 1 at the wall
        const x = p.getX(k);
        const sagging = Math.sin((x / cW + 0.5) * Math.PI * 8) * 0.04 * (1 - v) - mix(0, 0.25, wear) * Math.sin(v * Math.PI) * (0.6 + 0.4 * Math.sin(x * 1.7));
        p.setXYZ(k, x, cY - 0.55 + v * 1.15 + sagging, zFront + 0.1 + (1 - v) * cD);
      }
      geo.computeVertexNormals();
      s.mesh(geo, cloth);
      // Scalloped valance.
      const val = new THREE.PlaneGeometry(cW, 0.34, 48, 1);
      const vp = val.attributes.position;
      for (let k = 0; k < vp.count; k++) if (vp.getY(k) < 0) vp.setY(k, vp.getY(k) - Math.abs(Math.sin((vp.getX(k) / cW + 0.5) * Math.PI * 12)) * 0.12);
      s.mesh(val, cloth, [0, cY - 0.72, zFront + 0.1 + cD]);
      for (const x of [-1, 1]) { s.rod([x * cW / 2, cY - 0.55, zFront + 0.1 + cD], [x * cW / 2, cY + 0.6, zFront + 0.1], 0.025, metal); s.rod([x * cW / 2, cY - 0.55, zFront + 0.1 + cD], [x * cW / 2, cY - 0.55, zFront + 0.1], 0.025, metal); }
    } else if (a.canopy === 'marquee') {
      s.box([cW, 0.5, cD], [0, cY + 0.25, zFront + cD / 2], s.material('#e8e3d4', { roughness: 0.6 }));
      s.box([cW + 0.06, 0.1, cD + 0.06], [0, cY + 0.02, zFront + cD / 2], metal);
      s.box([cW + 0.06, 0.1, cD + 0.06], [0, cY + 0.5, zFront + cD / 2], metal);
      s.label('M A L L', 3.4, 0.36, [0, cY + 0.26, zFront + cD + 0.012], metalSpec.color === '#ecebe4' ? '#2d6b6a' : '#8a6a2a', '#e8e3d4');
      const bulbOn = new THREE.MeshStandardMaterial({ color: '#fff3c9', emissive: '#ffdf8a', emissiveIntensity: 1 });
      const bulbOff = s.material('#8d8a7d');
      lights.push(bulbOn);
      const on: { at: readonly [number, number, number]; size: number }[] = [], off: typeof on = [];
      for (let k = 0; k < 26; k++) (random() < mix(0.9, 0.15, wear) ? on : off).push({ at: [-cW / 2 + 0.15 + (k * (cW - 0.3)) / 25, cY - 0.03, zFront + cD - 0.12] as const, size: 1 });
      const bulb = new THREE.SphereGeometry(0.055, 8, 6);
      if (on.length) s.scatter(bulb, bulbOn, on);
      if (off.length) s.scatter(bulb, bulbOff, off);
      for (const x of [-1, 1]) s.rod([x * (cW / 2 - 0.4), cY + 0.5, zFront + cD - 0.3], [x * (cW / 2 - 0.4), VH + 0.4, zFront + 0.1], 0.025, metal);
    } else if (a.canopy === 'spaceframe') {
      const teal = s.material('#2f9a98', { roughness: 0.45, metalness: 0.2 });
      const nx = 6, nz = 2, dx = cW / nx, dz = cD / nz;
      for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
        const x = -cW / 2 + i * dx, z = zFront + j * dz;
        if (i < nx) s.rod([x, cY, z], [x + dx, cY, z], 0.03, teal);
        if (j < nz) s.rod([x, cY, z], [x, cY, z + dz], 0.03, teal);
        if (i < nx && j < nz) {
          const apex: [number, number, number] = [x + dx / 2, cY + 0.5, z + dz / 2];
          for (const [ox, oz] of [[0, 0], [dx, 0], [0, dz], [dx, dz]]) s.rod([x + ox, cY, z + oz], apex, 0.02, teal);
          if (i < nx - 1) s.rod(apex, [apex[0] + dx, apex[1], apex[2]], 0.03, teal);
        }
      }
      const roof = pane([cW, 0.02, cD], [0, cY + 0.54, zFront + cD / 2]);
      roof.castShadow = false;
      for (const x of [-1, 1]) s.cylinder(0.09, 0.09, cY, [x * (cW / 2 - 0.1), cY / 2, zFront + cD - 0.1], teal, 12);
    } else {
      for (let k = 0; k < 5; k++) {
        const x = -cW / 2 + 0.4 + (k * (cW - 0.8)) / 4;
        s.rod([x, cY + 0.3, zFront + 0.05], [x, cY + 0.1 - random() * 0.3, zFront + 0.5 + random() * 0.5], 0.03, metal);
        s.box([0.16, 0.22, 0.03], [x, cY + 0.3, zFront + 0.08], metal);
      }
      // The clean rectangle where it used to shade the wall.
      s.box([cW, 0.06, 0.02], [0, cY + 0.45, zFront + 0.07], s.material('#e5dac4'));
    }

    // Banner.
    if (a.banner !== 'none') {
      const [big, small] = BANNER[a.banner];
      const yellow = a.banner === 'closing';
      const bw = 5.2, bh = 1.15;
      const cloth = paint(768, 170, (ctx, w, h) => {
        ctx.fillStyle = yellow ? '#f5d313' : a.banner === 'lease' ? '#f4f2ea' : '#f1ead7'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = yellow ? '#c8171d' : a.banner === 'lease' ? '#1c2f5c' : '#7a2334';
        ctx.fillRect(0, 0, w, 10); ctx.fillRect(0, h - 10, w, 10);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `bold ${h * 0.5}px Impact, Arial Black, sans-serif`; ctx.fillText(big, w / 2, h * 0.38, w * 0.92);
        ctx.font = `bold ${h * 0.2}px Arial, sans-serif`; ctx.fillText(small, w / 2, h * 0.78, w * 0.92);
      });
      const geo = new THREE.PlaneGeometry(bw, bh, 16, 4);
      const p = geo.attributes.position;
      const fallen = random() < wear * 0.7;
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k) / (bw / 2), y = p.getY(k) / (bh / 2);
        p.setZ(k, Math.sin(x * 6 + y * 1.5) * 0.04);
        p.setY(k, p.getY(k) - (1 - x * x) * mix(0.03, 0.2, wear) - (fallen && x < -0.3 && y > -0.6 ? (-x - 0.3) * (y + 0.6) * 0.9 : 0));
      }
      geo.computeVertexNormals();
      const banner = s.mesh(geo, new THREE.MeshStandardMaterial({ map: cloth, roughness: 0.8, side: THREE.DoubleSide }),
        [(random() - 0.5) * 0.8, VH + 0.28, zMid + 0.1 + (vDepth + 0.3) / 2 + 0.05]);
      banner.rotation.z = (random() - 0.5) * 0.04;
    }

    // Apron, mat and whatever is left by the doors.
    s.box([W + 0.6, 0.14, 6.6], [0, -0.07, 0.9], concrete);
    for (let k = 0; k < 5; k++) s.box([0.02, 0.004, 6.6], [-W / 2 + 1 + k * (W - 2) / 4, 0.002, 0.9], s.material('#8f8a7c'));
    s.box([VW - 0.4, 0.02, 1.2], [0, 0.01, zFront + 0.8], s.material('#3a3d3f', { roughness: 1 }));
    const fx = VW / 2 + 1.6;
    if (a.flank === 'planters') {
      for (const x of [-fx, fx]) {
        s.lathe([[0, 0], [0.55, 0], [0.7, 0.55], [0.62, 0.6], [0, 0.6]], concrete, [x, 0, 1.0]);
        s.cylinder(0.58, 0.58, 0.04, [x, 0.58, 1.0], s.material('#4f4232', { roughness: 1 }), 18);
        const twig = s.material(wear > 0.45 ? '#6d5a3e' : '#4f7a44', { roughness: 1 });
        for (let k = 0; k < 9; k++) s.rod([x, 0.58, 1.0], [x + (random() - 0.5) * 0.9, 1.0 + random() * 0.6, 1.0 + (random() - 0.5) * 0.9], 0.02, twig, 0.006);
        if (wear <= 0.45) s.ball([0.5, 0.42, 0.5], [x, 1.15, 1.0], twig, 10);
      }
    } else if (a.flank === 'bench') {
      const wood = s.material('#8a6a48', { roughness: 0.85 });
      for (let k = 0; k < 4; k++) s.box([1.8, 0.04, 0.09], [-fx, 0.45, 0.6 + k * 0.12], wood);
      for (let k = 0; k < 3; k++) s.box([1.8, 0.09, 0.04], [-fx, 0.6 + k * 0.13, 0.5], wood);
      for (const x of [-0.8, 0.8]) { s.box([0.06, 0.45, 0.5], [-fx + x, 0.225, 0.78], dark); s.box([0.06, 0.5, 0.05], [-fx + x, 0.7, 0.5], dark); }
      s.cylinder(0.2, 0.17, 0.7, [fx, 0.35, 0.8], concrete, 14);
      s.cylinder(0.21, 0.21, 0.04, [fx, 0.72, 0.8], s.material('#d9d2bd'), 14);
    } else if (a.flank === 'boxes') {
      const hues = ['#2a5ea8', '#c7382b', '#e3c21f', '#2f8a4a', '#444'];
      for (let k = 0; k < 4; k++) {
        const x = fx - 0.9 + k * 0.6, tilt = random() < wear * 0.5;
        const box = s.box([0.5, 1.05, 0.45], [x, 0.53, 0.3], s.material(hues[Math.floor(random() * hues.length)], { roughness: 0.6 }));
        s.box([0.38, 0.4, 0.02], [x, 0.72, 0.54], dark);
        if (tilt) { box.rotation.z = Math.PI / 2; box.position.set(x, 0.25, 1.2 + random()); }
      }
    }
    // Litter and weeds in the apron joints.
    const weeds = Math.round(mix(0, 36, wear) * mix(0.6, 1.2, random()));
    if (weeds) {
      const blade = new THREE.ConeGeometry(0.05, 1, 5);
      blade.translate(0, 0.5, 0);
      s.scatter(blade, s.material('#8fa05a', { roughness: 1 }), Array.from({ length: weeds }, () => ({
        at: [random() < 0.5 ? (random() - 0.5) * W : -W / 2 + 1 + Math.floor(random() * 5) * (W - 2) / 4, 0, random() < 0.4 ? zFront + 0.1 + random() * 0.1 : mix(-1.6, 4, random())] as const,
        size: mix(0.15, 0.7, random()), color: random() < 0.4 ? '#c2b56a' : '#8fa05a',
      })));
    }

    let clock = 0;
    const speed = mix(0.3, 2.5, mood.energy);
    const base = lights.map((m) => m.emissiveIntensity);
    return s.finish({
      footprint: W / 2,
      update: lights.length
        ? (dt) => {
            clock += dt * speed;
            const dip = Math.sin(clock * 9.1) + Math.sin(clock * 3.7) > 1.55 ? 0.35 : 1;
            lights.forEach((m, i) => { m.emissiveIntensity = base[i] * dip; });
          }
        : undefined,
    });
  },
});
