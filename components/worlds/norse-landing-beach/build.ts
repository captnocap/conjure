import * as THREE from 'three';
import { type Placeable, choice, defineWorld, diorama, mix, score, visibleBounds } from '@conjure/kit';

type P3 = [number, number, number];
const smooth = (from: number, to: number, value: number) => { const t = Math.min(1, Math.max(0, (value - from) / (to - from))); return t * t * (3 - 2 * t); };

export default defineWorld({
  questions: {
    occasion: choice('What is happening on the beach?', {
      homecoming: 'A homecoming: fires lit along the shingle, the shed doors thrown open and spilling light, smoke rising.',
      departure: 'The morning of sailing: barrels, chests and bundled oars stacked at the waterline, rollers laid to the sea.',
      aftermath: 'After a raid: the shed burned to black rafters, smoke still rising, broken shields and arrows in the stones.',
      funeral: 'A funeral: an avenue of torches running down to the water and a fresh cairn above the tideline.',
      empty: 'Nothing at all: nets drying on poles, nobody about, only the cold.',
    }),
    fog: score('How much fog lies on the water?', ['Clear cold air', 'Thin wisps on the sea', 'Banks hiding the far water', 'A white wall at the tideline, the cliffs half swallowed']),
    tide: choice('Where is the tide?', {
      high: 'High: a narrow strip of dry shingle under the bank.',
      mid: 'Half tide: a broad even beach.',
      low: 'Low: a wide wet flat of dark stones and weed below the shingle.',
    }),
    season: choice('What season is it?', {
      winter: 'Late winter: snow on the cliff tops, the turf roof and the bank.',
      spring: 'Thaw: yellow-brown turf just greening, meltwater everywhere.',
      summer: 'High summer: deep green turf to the edge of the stones.',
      autumn: 'Autumn: rust and ochre grass, heather on the cliffs.',
    }),
    cliffs: choice('What are the cliffs behind like?', {
      sheer: 'One sheer black wall, banded and unbroken.',
      waterfall: 'Stepped terraces with a white thread of waterfall coming down.',
      cleft: 'A wall split by a deep cleft where a path comes down to the beach.',
    }),
    shed: choice('What is the boat shed like?', {
      great: 'A long chieftain\'s boat house with stone side walls, a tall plank gable and crossed carved gable boards.',
      small: 'A small crooked turf hut barely big enough for one boat.',
      hull: 'Low stone walls roofed with an old upturned boat.',
    }),
    shore: choice('What lies along the tideline?', {
      wrack: 'A dark line of seaweed and bleached driftwood logs.',
      jetty: 'A rough stone jetty and mooring posts with rope.',
      boat: 'A small rowing boat pulled up and turned over.',
      grooves: 'Keel grooves ploughed through the shingle and scattered log rollers.',
      bare: 'Nothing but stones.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const beachY = 0.25;
    const zc = { high: 3.6, mid: 5.6, low: 8.2 }[a.tide];
    const zf = zc - 4.3, zb = Math.max(zf - 6.3, -6.2);
    const background = new THREE.Color('#cfd8dd').lerp(new THREE.Color('#ecdccd'), mood.warmth * 0.8).lerp(new THREE.Color('#aeb6ba'), (1 - mood.cheer) * 0.35);
    const { art: s, world } = diorama(context, {
      background: `#${background.getHexString()}`, floor: null, floorY: beachY, width: 32, depth: 24, pitch: 25, yaw: 27, maxHeight: 7, radius: 4.3,
      slots: [[0, zf], [-9, zf + 0.6, 0, 0.9], [8.2, zf + 1.2, 0, 0.85], [-5, zb, 0, 0.8], [2.8, zb, 0, 0.75]],
    });
    const root = s.root;
    const matt = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.92, ...options });
    const snowy = a.season === 'winter';
    const turfColour = new THREE.Color({ winter: '#7c7a68', spring: '#868652', summer: '#5f7d40', autumn: '#8c7242' }[a.season]);
    const snow = new THREE.Color('#f3f6f8');
    const hazeTo = (colour: THREE.ColorRepresentation, amount: number) => new THREE.Color(colour).lerp(background, amount);

    // Beach: shingle shelving into the sea in front, rising to a turf bank behind.
    const wob = (x: number) => Math.sin(x * 0.33 + 1) * 0.7 + Math.sin(x * 0.9) * 0.22;
    const heightAt = (x: number, z: number) => {
      const shore = smooth(zc - 2.4, zc + 2.4, z - wob(x));
      const bank = smooth(-8, -10.6, z);
      return beachY - shore * 0.5 + bank * 2.3 + (shore > 0 || bank > 0 ? Math.sin(x * 1.7 + z * 2.3) * 0.03 : 0);
    };
    const terrain = new THREE.PlaneGeometry(34, 24, 68, 48);
    terrain.rotateX(-Math.PI / 2);
    const tp = terrain.attributes.position;
    const tc = new Float32Array(tp.count * 3);
    const wetWidth = { high: 1.1, mid: 1.7, low: 4.2 }[a.tide];
    const dry = new THREE.Color('#8c8e8a'), wet = new THREE.Color('#4b5053'), weed = new THREE.Color('#4a4a32');
    const tone = new THREE.Color();
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i), z = tp.getZ(i), zw = z - wob(x);
      tp.setY(i, heightAt(x, z));
      const bank = smooth(-8.2, -9.2, z);
      tone.copy(dry).lerp(wet, smooth(zc - wetWidth - 0.6, zc - wetWidth + 0.4, zw));
      if (Math.abs(zw - (zc - wetWidth - 0.5)) < 0.35 && a.shore === 'wrack') tone.lerp(weed, 0.7);
      tone.lerp(snowy ? snow : turfColour, bank);
      tone.offsetHSL(0, 0, (random() - 0.5) * 0.05);
      tc.set([tone.r, tone.g, tone.b], i * 3);
    }
    terrain.setAttribute('color', new THREE.BufferAttribute(tc, 3));
    terrain.computeVertexNormals();
    const ground = s.mesh(terrain, matt('#ffffff', { vertexColors: true }), [0, 0, 0]);
    ground.castShadow = false;
    world.ground = ground;

    // The fjord.
    const water = s.mesh(new THREE.PlaneGeometry(34, 24), matt(new THREE.Color('#465c66').lerp(background, 0.2), { roughness: 0.3, metalness: 0.25 }), [0, 0, 0]);
    water.rotation.x = -Math.PI / 2;
    water.castShadow = false;
    const foam: number[] = [];
    for (let i = 0; i < 68; i++) {
      const x0 = -17 + i * 0.5, x1 = x0 + 0.5, w0 = 0.1 + Math.abs(Math.sin(i * 0.7)) * 0.16, w1 = 0.1 + Math.abs(Math.sin((i + 1) * 0.7)) * 0.16;
      const z0 = zc + wob(x0) + 0.02, z1 = zc + wob(x1) + 0.02;
      foam.push(x0, 0.015, z0 - w0, x0, 0.015, z0 + w0, x1, 0.015, z1 + w1, x0, 0.015, z0 - w0, x1, 0.015, z1 + w1, x1, 0.015, z1 - w1);
    }
    const foamGeometry = new THREE.BufferGeometry();
    foamGeometry.setAttribute('position', new THREE.Float32BufferAttribute(foam, 3));
    foamGeometry.computeVertexNormals();
    const foamLine = s.mesh(foamGeometry, matt('#eef3f4', { roughness: 1 }));
    foamLine.castShadow = false;

    // Shingle: pebbles everywhere, a few boulders.
    const dryZ = () => mix(-7.6, zc - 0.3, random());
    const pebbles = Array.from({ length: Math.round(mix(260, 520, mood.density)) }, () => { const x = (random() - 0.5) * 32, z = dryZ(); return { at: [x, heightAt(x, z) + 0.01, z] as P3, size: 0.06 + random() * 0.11, color: pick(['#7b7d7c', '#a5a298', '#5f6263', '#938a7c', '#b3b3ac']) }; });
    const pebble = new THREE.IcosahedronGeometry(1, 0);
    pebble.scale(1.2, 0.55, 1);
    s.scatter(pebble, matt('#ffffff', { flatShading: true }), pebbles);
    for (let i = 0; i < 9; i++) {
      const x = (random() < 0.5 ? -1 : 1) * (11.5 + random() * 5), z = mix(-7, zc + 1.5, random()), r = 0.35 + random() * 0.6;
      const rock = s.mesh(new THREE.IcosahedronGeometry(1, 1), matt(pick(['#6f7273', '#7d8082', '#5d6062']), { flatShading: true }), [x, heightAt(x, z) + r * 0.2, z]);
      rock.scale.set(r * 1.4, r * 0.8, r);
      rock.rotation.y = random() * 3;
    }

    // Cliffs: a banded wall behind and a headland running out on the left.
    const cliffTop = (u: number) => {
      const rough = 0.82 + 0.18 * Math.sin(u * 19 + 2) * Math.sin(u * 7.3);
      if (a.cliffs === 'sheer') return 9.2 * rough;
      if (a.cliffs === 'waterfall') return (5.2 + 3.2 * Math.round(Math.abs(Math.sin(u * 5.2 + 0.6)) * 1.4)) * (0.92 + 0.08 * rough);
      return 9 * rough * (1 - 0.86 * Math.exp(-(((u - 0.4) / 0.06) ** 2)));
    };
    const rockDark = new THREE.Color('#2c3035'), rockBand = new THREE.Color('#454a50');
    if (a.season === 'autumn') rockBand.lerp(new THREE.Color('#7a5a4a'), 0.35);
    const cliff = (length: number, top: (u: number) => number, haze: number) => {
      const nx = 30, ny = 7, positions: number[] = [], colours: number[] = [], grid: THREE.Vector3[][] = [], tones: THREE.Color[][] = [];
      for (let i = 0; i <= nx; i++) {
        const u = i / nx, column: THREE.Vector3[] = [], tcol: THREE.Color[] = [], h = Math.max(1.2, top(u));
        for (let j = 0; j <= ny + 1; j++) {
          const v = Math.min(1, j / ny), cap = j > ny;
          column.push(new THREE.Vector3((u - 0.5) * length + (random() - 0.5) * 0.3, cap ? h + 0.5 + random() * 0.4 : v * h, cap ? -3.2 : (1 - v) * 1.5 + (random() - 0.5) * 0.7 + Math.sin(i * 1.3) * 0.6));
          const band = (j + Math.floor(Math.sin(i * 0.25) * 1.5)) % 3 === 0;
          const c = (band ? rockBand : rockDark).clone().offsetHSL(0, 0, (random() - 0.5) * 0.05);
          if (cap || j === ny) c.copy(snowy ? snow : turfColour.clone().lerp(rockDark, 0.35));
          else if (snowy && random() < 0.12 * v) c.lerp(snow, 0.8);
          tcol.push(c.lerp(background, haze));
        }
        grid.push(column); tones.push(tcol);
      }
      for (let i = 0; i < nx; i++) for (let j = 0; j <= ny; j++) {
        const quad = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j], grid[i + 1][j + 1], grid[i][j + 1]];
        const c = tones[i][j + (j === ny ? 1 : 0)];
        for (const p of quad) { positions.push(p.x, p.y, p.z); colours.push(c.r, c.g, c.b); }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
      geometry.computeVertexNormals();
      return new THREE.Mesh(geometry, matt('#ffffff', { vertexColors: true, flatShading: true, side: THREE.DoubleSide }));
    };
    const back = cliff(34, cliffTop, 0.1);
    back.position.set(0, 1.6, -11.4);
    back.castShadow = back.receiveShadow = true;
    root.add(back);
    const headland = cliff(19, (u) => mix(1.6, 7.5, Math.pow(u, 0.7)) * (0.85 + 0.15 * Math.sin(u * 23)), 0.05);
    headland.rotation.y = Math.PI / 2;
    headland.position.set(-15.6, 0, -2.5);
    headland.castShadow = headland.receiveShadow = true;
    root.add(headland);
    if (a.cliffs === 'waterfall') {
      const fx = 3.5;
      const top = 1.6 + cliffTop((fx + 17) / 34);
      const white = matt('#f4f8fa', { emissive: '#cfd8dc', emissiveIntensity: 0.3 });
      const fall = s.tube([[fx - 0.2, top + 0.3, -12.4], [fx, top - 0.6, -11.0], [fx + 0.25, top * 0.55, -10.2], [fx + 0.1, 2.6, -9.9], [fx + 0.2, heightAt(fx, -9.2) + 0.1, -9.2]], 0.2, white);
      fall.castShadow = false;
      const mist = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: '#f4f7f8', transparent: true, opacity: 0.4, depthWrite: false }));
      mist.position.set(fx + 0.2, heightAt(fx, -9.2) + 0.5, -9); mist.scale.set(1.1, 0.7, 0.8);
      root.add(mist);
      const stream = s.tube([[fx + 0.2, heightAt(fx, -9.2) + 0.03, -9.2], [fx + 0.7, heightAt(fx, -8) + 0.02, -8], [fx + 0.4, beachY + 0.02, -5], [fx + 1.1, beachY + 0.02, -1], [fx + 0.8, beachY + 0.02, zc - 2.4]], 0.16, matt('#5d737d', { roughness: 0.3 }));
      stream.scale.y = 0.2;
      stream.position.y = beachY * 0.8;
      stream.castShadow = false;
    }
    if (a.cliffs === 'cleft') {
      const px = (0.4 - 0.5) * 34;
      for (let i = 0; i < 9; i++) s.box([1.3, 0.12, 0.6], [px + Math.sin(i * 0.9) * 0.5, beachY + 0.1 + i * 0.26, -7.6 - i * 0.42], matt('#8a8672'));
    }
    // Far mountains, almost lost in the air.
    const yaw = 27 * Math.PI / 180;
    // A ragged ridge whose foot dissolves into the air, so no edge shows.
    const ridge: number[] = [], ridgeColours: number[] = [];
    const farColour = hazeTo('#7f8c96', mix(0.55, 0.88, a.fog));
    const peak = (i: number) => 3.5 + Math.abs(Math.sin(i * 1.7 + (context.seed % 7))) * 4.5 + (i % 2) * 1.3;
    for (let i = 0; i < 40; i++) {
      const x0 = -60 + i * 3, x1 = x0 + 3, y0 = peak(i), y1 = peak(i + 1);
      for (const [x, y, top] of [[x0, -9, 0], [x1, -9, 0], [x1, y1, 1], [x0, -9, 0], [x1, y1, 1], [x0, y0, 1]] as const) {
        ridge.push(x, y, 0);
        const c = top ? farColour : background;
        ridgeColours.push(c.r, c.g, c.b);
      }
    }
    const ridgeGeometry = new THREE.BufferGeometry();
    ridgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(ridge, 3));
    ridgeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(ridgeColours, 3));
    const far = new THREE.Mesh(ridgeGeometry, new THREE.MeshBasicMaterial({ vertexColors: true, depthWrite: false }));
    far.position.set(-Math.sin(yaw) * 26, 0, -Math.cos(yaw) * 26);
    far.rotation.y = yaw;
    far.renderOrder = -2;
    root.add(far);

    // Boat shed with its log slip.
    const sx = 10.6, sLen = a.shed === 'great' ? 8.5 : 5.2, sW = a.shed === 'great' ? 5.2 : 3.6, sFront = -3.6, sz = sFront - sLen / 2;
    const wallH = a.shed === 'great' ? 1.5 : 1.2, ridgeH = a.shed === 'great' ? 4.3 : 3.0;
    const burnt = a.occasion === 'aftermath';
    const stone = matt('#74777a', { flatShading: true });
    const timber = matt(burnt ? '#1f1b18' : '#5a4433');
    for (const side of [-1, 1]) {
      s.box([0.75, wallH, sLen], [sx + side * (sW / 2), beachY + wallH / 2, sz], stone);
      for (let i = 0; i < 7; i++) {
        const r = 0.28 + random() * 0.2, rock = s.mesh(new THREE.IcosahedronGeometry(1, 0), stone, [sx + side * (sW / 2 + 0.3), beachY + r * 0.5, sFront - 0.3 - (i / 6) * (sLen - 0.6)]);
        rock.scale.set(r, r * 0.8, r * 1.3);
      }
    }
    s.box([sW, wallH + 0.4, 0.7], [sx, beachY + (wallH + 0.4) / 2, sFront - sLen], stone);
    const doorW = sW * 0.52, doorH = a.shed === 'great' ? 2.5 : 1.7;
    const glowing = a.occasion === 'homecoming';
    s.box([sW - 0.8, a.shed === 'hull' ? 1.3 : ridgeH - 0.6, 0.1], [sx, beachY + (a.shed === 'hull' ? 0.65 : (ridgeH - 0.6) / 2), sFront - 1.2], glowing ? matt('#ffbe6e', { emissive: '#ff9a3a', emissiveIntensity: mix(0.5, 1.1, mood.cheer) }) : matt('#191614')).castShadow = false;
    const pitch = Math.atan2(ridgeH - wallH, sW / 2), slopeLen = Math.hypot(sW / 2, ridgeH - wallH) + 0.7;
    if (a.shed !== 'hull') {
      const gable = new THREE.Shape([[-sW / 2, 0], [-doorW / 2, 0], [-doorW / 2, doorH], [doorW / 2, doorH], [doorW / 2, 0], [sW / 2, 0], [sW / 2, wallH], [0, ridgeH], [-sW / 2, wallH]].map(([x, y]) => new THREE.Vector2(x, y)));
      const plankCanvas = document.createElement('canvas'); plankCanvas.width = plankCanvas.height = 128;
      const pctx = plankCanvas.getContext('2d')!; pctx.fillStyle = burnt ? '#2a2420' : '#6f5640'; pctx.fillRect(0, 0, 128, 128);
      for (let x = 0; x < 128; x += 13) { pctx.fillStyle = `rgba(20,14,8,${0.35 + random() * 0.3})`; pctx.fillRect(x, 0, 2, 128); pctx.fillStyle = `rgba(255,230,190,${random() * 0.12})`; pctx.fillRect(x + 2, 0, 11, 128); }
      const planks = new THREE.CanvasTexture(plankCanvas); planks.colorSpace = THREE.SRGBColorSpace; planks.wrapS = planks.wrapT = THREE.RepeatWrapping; planks.repeat.set(0.45, 0.45);
      if (!burnt) s.mesh(new THREE.ExtrudeGeometry(gable, { depth: 0.14, bevelEnabled: false }), new THREE.MeshStandardMaterial({ map: planks, roughness: 0.9 }), [sx, beachY, sFront - 0.14]);
      // Doors.
      const leaf = (side: number, swing: number) => {
        const hinge = new THREE.Group();
        hinge.position.set(sx + side * doorW / 2, beachY, sFront + 0.02);
        const door = new THREE.Mesh(new THREE.BoxGeometry(doorW / 2, doorH, 0.09), new THREE.MeshStandardMaterial({ map: planks, color: '#c9b8a0', roughness: 0.9 }));
        door.position.set(-side * doorW / 4, doorH / 2, 0);
        door.castShadow = true;
        hinge.add(door);
        hinge.rotation.y = side * swing;
        root.add(hinge);
      };
      if (!burnt) { const open = a.occasion === 'homecoming' || a.occasion === 'departure'; leaf(-1, open ? -2.0 : a.occasion === 'funeral' ? -0.5 : 0); leaf(1, open ? -1.8 : 0); }
      // Turf roof on birch bark, or what the fire left of it.
      if (!burnt) {
        for (const side of [-1, 1]) {
          const slab = s.box([slopeLen, 0.42, sLen + 0.9], [sx + side * (Math.cos(pitch) * slopeLen / 2 - 0.12), beachY + wallH + Math.sin(pitch) * slopeLen / 2 + 0.05, sz], matt(snowy ? snow : turfColour.clone().offsetHSL(0, 0, -0.03)));
          slab.rotation.z = -side * pitch;
          const edge = s.box([slopeLen + 0.05, 0.1, sLen + 1.0], [slab.position.x, slab.position.y - 0.24, sz], matt('#d8ccb0'));
          edge.rotation.z = -side * pitch;
        }
        const tuft = new THREE.ConeGeometry(0.05, 0.4, 4); tuft.translate(0, 0.2, 0);
        s.scatter(tuft, matt('#ffffff'), Array.from({ length: snowy ? 12 : 70 }, () => { const side = random() < 0.5 ? -1 : 1, d = random() * (slopeLen - 0.5); return { at: [sx + side * (sW / 2 + 0.25 - Math.cos(pitch) * d), beachY + wallH + 0.2 + Math.sin(pitch) * ((slopeLen - 0.7) - d) * 1 + 0.02, sz + (random() - 0.5) * sLen] as P3, size: 0.6 + random() * 0.8, color: pick(['#8a9258', '#a3a46a', '#6c7a48', '#b0a878']) }; }));
      }
      const rafters = burnt ? Math.round(sLen / 1.3) : 1;
      for (let r = 0; r < rafters; r++) for (const side of [-1, 1]) {
        if (burnt && random() < 0.3) continue;
        const z = burnt ? sFront - 0.2 - (r / Math.max(1, rafters - 1)) * (sLen - 0.6) : sFront + 0.12, over = burnt ? 0.2 : a.shed === 'great' ? 1.0 : 0.5;
        const rod = s.rod([sx + side * (sW / 2 + 0.5), beachY + wallH - 0.25, z], [sx - side * over * Math.cos(pitch), beachY + ridgeH + over * Math.sin(pitch), z], 0.09, timber);
        if (burnt) rod.rotation.z += (random() - 0.5) * 0.25;
        else if (a.shed === 'great') s.ball([0.16, 0.24, 0.12], [sx - side * (over + 0.1) * Math.cos(pitch), beachY + ridgeH + (over + 0.15) * Math.sin(pitch), z], timber, 8);
      }
      if (burnt) for (let i = 0; i < 12; i++) { const x = sx + (random() - 0.5) * sW * 0.8, z = sz + (random() - 0.5) * sLen * 0.8, angle = random() * 3; s.rod([x, beachY + 0.1, z], [x + Math.cos(angle) * 1.6, beachY + 0.15 + random() * 0.6, z + Math.sin(angle) * 1.6], 0.08, timber); }
    } else {
      // An old boat, keel up, for a roof.
      const hull = s.mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), matt(burnt ? '#1f1b18' : '#4a3a2c', { side: THREE.DoubleSide }), [sx, beachY + wallH, sz]);
      hull.scale.set(sW / 2 + 0.55, 1.7, sLen / 2 + 0.9);
      s.box([0.14, 0.14, sLen + 1.2], [sx, beachY + wallH + 1.72, sz], timber);
      for (let i = 1; i < 5; i++) { const ring = s.ring(1, 0.035, [sx, beachY + wallH + 0.02, sz + (i / 5 - 0.5) * sLen * 1.5], matt('#6b5540'), Math.PI); ring.scale.set((sW / 2 + 0.58) * Math.sqrt(1 - ((i / 5 - 0.5) * 1.5 / 1.1) ** 2), 1.72 * Math.sqrt(1 - ((i / 5 - 0.5) * 1.5 / 1.1) ** 2), 1); }
      s.box([sW, wallH, 0.5], [sx - doorW * 0.75, beachY + wallH / 2, sFront], stone).scale.x = 0.3;
      s.box([sW, wallH, 0.5], [sx + doorW * 0.75, beachY + wallH / 2, sFront], stone).scale.x = 0.3;
    }
    // Slip: logs laid across the way down to the water.
    const slipEnd = zc + wob(sx) + 0.8;
    for (let z = sFront + 0.9; z < slipEnd; z += 1.15) {
      const log = s.cylinder(0.13, 0.15, sW * 0.8, [sx + (random() - 0.5) * 0.3, heightAt(sx, z) + 0.1, z], matt(pick(['#8f7a5c', '#7a664b', '#a08a69'])), 8);
      log.rotation.set(0, (random() - 0.5) * 0.15, Math.PI / 2);
    }

    // Fire, torch and smoke helpers.
    const flames: { mesh: THREE.Mesh; phase: number; tall: number }[] = [];
    const flameShape = new THREE.LatheGeometry([[0, 0], [0.5, 0.12], [0.62, 0.3], [0.45, 0.6], [0.18, 0.86], [0, 1]].map(([x, y]) => new THREE.Vector2(x, y)), 8);
    const flameMaterials = ['#f2641b', '#ff8a1c', '#ffc02e'].map((colour) => new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 0.6, roughness: 1 }));
    const flame = (at: P3, width: number, tall: number, layer: number) => {
      const mesh = new THREE.Mesh(flameShape, flameMaterials[layer % 3]);
      mesh.position.set(...at); mesh.scale.set(width, tall, width);
      root.add(mesh);
      flames.push({ mesh, phase: random() * 6.3, tall });
    };
    const puffs: THREE.Mesh[] = [];
    const smokeMaterial = new THREE.MeshStandardMaterial({ color: '#7d7d7c', transparent: true, opacity: 0.3, depthWrite: false, roughness: 1 });
    const smoke = (at: P3, height: number, size: number) => {
      const drift = (random() - 0.5) * 0.5 + 0.5;
      for (let i = 0; i < 9; i++) {
        const t = i / 8, puff = new THREE.Mesh(new THREE.SphereGeometry(1, 9, 7), smokeMaterial);
        puff.position.set(at[0] + drift * t * height * 0.5, at[1] + t * height, at[2] - t * 0.5);
        puff.scale.setScalar(mix(0.25, 1, t) * size);
        root.add(puff); puffs.push(puff);
      }
    };
    const bonfire = (x: number, z: number, size: number) => {
      const y = heightAt(x, z);
      for (let i = 0; i < 8; i++) { const angle = (i / 8) * 6.283; const rock = s.mesh(new THREE.IcosahedronGeometry(1, 0), stone, [x + Math.cos(angle) * size * 0.75, y + 0.08, z + Math.sin(angle) * size * 0.75]); rock.scale.set(0.2, 0.14, 0.17); }
      for (let i = 0; i < 9; i++) { const angle = (i / 9) * 6.283 + random() * 0.4; s.rod([x + Math.cos(angle) * size * 0.6, y, z + Math.sin(angle) * size * 0.6], [x - Math.cos(angle) * 0.1, y + size * 1.3, z - Math.sin(angle) * 0.1], 0.06, matt(pick(['#cfc9bb', '#8f7a5c', '#4f4136']))); }
      const blaze = mix(0.8, 1.4, mood.energy);
      flame([x, y + 0.1, z], size * 0.55, size * 2.3 * blaze, 0);
      flame([x + 0.15, y + 0.15, z + 0.1], size * 0.36, size * 1.7 * blaze, 1);
      flame([x - 0.12, y + 0.2, z + 0.15], size * 0.24, size * 1.2 * blaze, 2);
    };
    const torch = (x: number, z: number, lit: boolean) => {
      const y = heightAt(x, z);
      s.rod([x, y - 0.2, z], [x + (random() - 0.5) * 0.15, y + 1.7, z], 0.05, matt('#4f3f2e'));
      s.cylinder(0.1, 0.06, 0.26, [x, y + 1.78, z], matt('#1f1b18'), 7);
      if (lit) flame([x, y + 1.85, z], 0.16, 0.6 * mix(0.8, 1.4, mood.energy), flames.length);
    };
    const between = [-4.6, 4.3];

    if (a.occasion === 'homecoming') {
      const fires = 2 + Math.round(mood.cheer * 2);
      const spots: [number, number][] = [[between[1], zf + 1.4], [between[0], zf + 1.8], [-12.5, zf - 2.5], [6.6, zb - 0.4]];
      spots.slice(0, fires).forEach(([x, z], i) => bonfire(x, z, 0.75 + (i === 0 ? 0.25 : 0)));
      for (const side of [-1, 1]) torch(sx + side * (sW / 2 + 0.9), sFront + 0.9, true);
      smoke([sx, beachY + ridgeH + 0.4, sz], 5, 0.9);
      // Benches and an ale barrel by the big fire.
      for (const dz of [-1.6, 1.6]) { const z = spots[0][1] + dz; if (z < zc - 1) s.cylinder(0.17, 0.19, 1.9, [spots[0][0], heightAt(spots[0][0], z) + 0.18, z], matt('#6b5540'), 9).rotation.z = Math.PI / 2; }
    }
    if (a.occasion === 'departure') {
      const gx = between[1], gz = zf + 2.2;
      const barrelMat = matt('#7a5d3c');
      for (let i = 0; i < 3 + Math.round(mood.density * 3); i++) {
        const x = gx + (i % 3 - 1) * 0.75 + (random() - 0.5) * 0.1, z = gz + Math.floor(i / 3) * 0.75;
        s.lathe([[0, 0], [0.24, 0], [0.31, 0.25], [0.31, 0.55], [0.24, 0.8], [0, 0.8]], barrelMat, [x, heightAt(x, z), z]);
        for (const y of [0.1, 0.4, 0.7]) s.ring(0.275 + (y === 0.4 ? 0.04 : 0), 0.015, [x, heightAt(x, z) + y, z], matt('#3a2c20')).rotation.x = Math.PI / 2;
      }
      for (let i = 0; i < 4; i++) { const x = between[0] + (i % 2) * 1.2 - 0.6, z = zf + 2 + Math.floor(i / 2) * 0.8; const chest = s.box([0.95, 0.5, 0.5], [x, heightAt(x, z) + 0.25, z], matt(pick(['#8a6844', '#6b4f36', '#94352b']))); chest.rotation.y = (random() - 0.5) * 0.4; s.box([0.99, 0.08, 0.54], [x, heightAt(x, z) + 0.5, z], matt('#3a3b3e')).rotation.y = chest.rotation.y; }
      for (let i = 0; i < 12; i++) { const x = between[0] - 1.6 + (i % 4) * 0.09, y = heightAt(between[0], zf + 3) + 0.06 + Math.floor(i / 4) * 0.09; s.rod([x, y, zf + 0.3], [x + 0.2, y, zf + 4.4], 0.04, matt('#b79a6d')); }
      for (const side of [-1, 1]) torch(sx + side * (sW / 2 + 0.9), sFront + 0.9, mood.daylight < 0.3 || mood.daylight > 0.8);
    }
    if (a.occasion === 'aftermath') {
      smoke([sx, beachY + 1.5, sz], 7, 1.5);
      smoke([sx - 1, beachY + 1, sz + 2], 4, 0.9);
      if (mood.energy > 0.5) { flame([sx + 0.8, beachY + 0.4, sz + 1], 0.5, 1.4, 0); flame([sx - 1, beachY + 0.3, sz - 1.5], 0.35, 0.9, 1); }
      const scorch = s.cylinder(1, 1, 0.03, [sx, beachY + 0.02, sz], matt('#26221f'), 18);
      scorch.scale.set(sW * 0.75, 1, sLen * 0.65); scorch.castShadow = false;
      const colours = ['#b3312a', '#2f5d8c', '#d9b441', '#e6dcc0'];
      for (let i = 0; i < 5 + Math.round(mood.density * 6); i++) {
        const x = (random() - 0.5) * 26, z = mix(-6.5, zc - 0.8, random()), y = heightAt(x, z);
        if (i % 2) { const disc = s.cylinder(0.45, 0.45, 0.04, [x, y + 0.06, z], matt(pick(colours)), 16, ); disc.rotation.set((random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5); s.ball([0.09, 0.07, 0.09], [x, y + 0.1, z], matt('#55585c', { metalness: 0.5 }), 8); }
        else { s.rod([x, y, z], [x + (random() - 0.5) * 0.4, y + 0.7, z + (random() - 0.5) * 0.4], 0.016, matt('#b79a6d')); }
      }
    }
    if (a.occasion === 'funeral') {
      const lit = mood.energy > 0.25;
      for (let i = 0; i < 5; i++) { const z = sFront + 2 + i * ((zc - 1.2 - sFront - 2) / 4); for (const side of [-1, 1]) torch(between[1] + side * 1.1 + (z - zf) * 0.02, z, lit); }
      const cx = between[0], cz = zb + 2.6, cy = heightAt(cx, cz);
      const cairnStones = Array.from({ length: 90 }, () => { const angle = random() * 6.3, r = Math.sqrt(random()); return { at: [cx + Math.cos(angle) * r * 1.5, cy + 0.08 + (1 - r) * 0.85, cz + Math.sin(angle) * r * 1.0] as P3, size: 0.14 + random() * 0.12, color: pick(['#8b8d8c', '#7b7e80', '#9a9b97', '#6f7273']) }; });
      s.scatter(new THREE.IcosahedronGeometry(1, 0), matt('#ffffff', { flatShading: true }), cairnStones);
      const marker = s.mesh(new THREE.IcosahedronGeometry(1, 1), stone, [cx + 1.7, cy + 0.8, cz]);
      marker.scale.set(0.3, 1.0, 0.2);
    }
    if (a.occasion === 'empty') {
      const nx = between[0], nz = zb + 2.4;
      for (const x of [nx - 2.2, nx, nx + 2.2]) s.rod([x, heightAt(x, nz) - 0.2, nz], [x, heightAt(x, nz) + 2.1, nz], 0.05, matt('#8f8a7f'));
      s.rod([nx - 2.4, beachY + 2.0, nz], [nx + 2.4, beachY + 2.0, nz], 0.04, matt('#8f8a7f'));
      const netCanvas = document.createElement('canvas'); netCanvas.width = netCanvas.height = 128;
      const nctx = netCanvas.getContext('2d')!; nctx.strokeStyle = '#4f4a3e'; nctx.lineWidth = 2;
      for (let i = -128; i < 256; i += 12) { nctx.beginPath(); nctx.moveTo(i, 0); nctx.lineTo(i + 128, 128); nctx.stroke(); nctx.beginPath(); nctx.moveTo(i + 128, 0); nctx.lineTo(i, 128); nctx.stroke(); }
      const netTexture = new THREE.CanvasTexture(netCanvas); netTexture.wrapS = netTexture.wrapT = THREE.RepeatWrapping; netTexture.repeat.set(3, 1.4);
      const net = s.mesh(new THREE.PlaneGeometry(4.4, 1.7, 12, 4), new THREE.MeshStandardMaterial({ map: netTexture, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1 }), [nx, beachY + 1.15, nz]);
      const np = net.geometry.attributes.position;
      for (let i = 0; i < np.count; i++) np.setZ(i, Math.sin(np.getX(i) * 2.2) * 0.12 * (0.85 - np.getY(i)));
      net.castShadow = false;
    }

    // Along the tideline.
    if (a.shore === 'wrack') {
      for (let i = 0; i < 26; i++) { const x = -15 + i * 1.2 + random() * 0.6, z = zc - wetWidth - 0.5 + wob(x) + (random() - 0.5) * 0.3; s.ball([0.5 + random() * 0.5, 0.06, 0.22 + random() * 0.15], [x, heightAt(x, z) + 0.02, z], matt(pick(['#3f3f2a', '#4d4a30', '#35382a'])), 8).rotation.y = (random() - 0.5) * 0.6; }
      for (let i = 0; i < 6; i++) { const x = (random() - 0.5) * 28, z = zc - wetWidth - 0.9 + wob(x) - random() * 1.2, len = 1.2 + random() * 2.2, angle = (random() - 0.5) * 0.8; s.rod([x - Math.cos(angle) * len / 2, heightAt(x, z) + 0.1, z - Math.sin(angle) * len / 2], [x + Math.cos(angle) * len / 2, heightAt(x, z) + 0.12, z + Math.sin(angle) * len / 2], 0.1 + random() * 0.06, matt(pick(['#cfc9bb', '#bdb7a8', '#dcd7ca'])), 0.05); }
    }
    if (a.shore === 'jetty') {
      const jx = -13.2;
      for (let i = 0; i < 26; i++) { const z = zc - 2.5 + (i / 25) * 7.5, r = 0.4 + random() * 0.3; const rock = s.mesh(new THREE.IcosahedronGeometry(1, 1), stone, [jx + (random() - 0.5) * 1.3, Math.max(0, heightAt(jx, z)) + 0.15 + random() * 0.2, z]); rock.scale.set(r * 1.3, r * 0.8, r); rock.rotation.y = random() * 3; }
      for (const [x, z] of [[-4.5, zc - 1.6], [4.4, zc - 1.5], [-11.6, zc + 1]] as const) { s.cylinder(0.11, 0.14, 1.5, [x, heightAt(x, z) + 0.55, z], matt('#5a4a3a'), 8); s.ring(0.17, 0.045, [x, heightAt(x, z) + 0.75, z], matt('#b9a47c')).rotation.x = Math.PI / 2; s.ring(0.3, 0.05, [x + 0.5, heightAt(x, z) + 0.06, z + 0.2], matt('#b9a47c')).rotation.x = Math.PI / 2; }
    }
    if (a.shore === 'boat') {
      const bx = -12.6, bz = zb + 1.5, by = heightAt(bx, bz);
      const hull = s.mesh(new THREE.SphereGeometry(1, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), matt('#4a3a2c'), [bx, by, bz]);
      hull.scale.set(0.85, 0.75, 2.6); hull.rotation.y = 0.5;
      const keel = s.box([0.08, 0.08, 5.3], [bx, by + 0.76, bz], matt('#3a2c20')); keel.rotation.y = 0.5;
      for (let i = 0; i < 2; i++) s.rod([bx + 1.2 + i * 0.15, by + 0.06, bz - 1.6], [bx + 1.9 + i * 0.15, by + 0.06, bz + 1.6], 0.035, matt('#b79a6d'));
    }
    if (a.shore === 'grooves') {
      for (const x of [0, -9, 8.2]) { const groove = s.box([0.5, 0.03, 4.4], [x, beachY + 0.012, zf + 2.6], matt('#62666a')); groove.castShadow = false; }
      for (let i = 0; i < 7; i++) { const x = (random() - 0.5) * 24, z = zf + 2.4 + random() * 1.4, angle = random() * 3; s.rod([x - Math.cos(angle), heightAt(x, z) + 0.13, z - Math.sin(angle) * 0.6], [x + Math.cos(angle), heightAt(x, z) + 0.13, z + Math.sin(angle) * 0.6], 0.13, matt(pick(['#8f7a5c', '#7a664b', '#a08a69']))); }
    }

    // Fog: low banks on the water, and at its thickest a wall that takes the cliffs.
    const banks: THREE.Mesh[] = [];
    const fogMaterial = (opacity: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color('#f4f7f8').lerp(background, 0.25), transparent: true, opacity, depthWrite: false });
    const thin = fogMaterial(mix(0.1, 0.3, a.fog)), thick = fogMaterial(mix(0.12, 0.42, a.fog));
    const bankGeometry = new THREE.SphereGeometry(1, 16, 10);
    const bank = (at: P3, size: P3, material: THREE.Material) => { const mesh = new THREE.Mesh(bankGeometry, material); mesh.position.set(...at); mesh.scale.set(...size); mesh.renderOrder = 5; root.add(mesh); banks.push(mesh); };
    const fogCount = Math.round(a.fog * 14) + (a.fog > 0.08 ? 3 : 0);
    for (let i = 0; i < fogCount; i++) bank([(random() - 0.5) * 30, 0.35 + random() * 0.5, mix(zc + 2.2, 11.5, random())], [4 + random() * 6, 0.35 + random() * 0.45 * (1 + a.fog), 1.2 + random() * 1.6], thin);
    if (a.fog > 0.4) for (let i = 0; i < Math.round(a.fog * 9); i++) bank([(random() - 0.5) * 30, 2.2 + random() * 3.5 * a.fog, -9.4 + random() * 1.6], [5 + random() * 6, 0.8 + random() * 1.3, 1.6], thick);
    if (a.fog > 0.7) for (let i = 0; i < 5; i++) bank([-15 + (random() - 0.5) * 3, 1 + random() * 3, -6 + i * 3], [2.4, 1 + random() * 1.4, 3.5], thick);

    if (world.keyLight) world.keyLight.intensity = mix(2.9, 1.9, a.fog) * mix(0.85, 1, mood.cheer);

    const flicker = mix(0.5, 1.6, mood.energy), wind = mix(0.05, 0.5, mood.energy);
    const foamBase = foamLine.position.z;
    world.update = (dt, time) => {
      for (const f of flames) { f.mesh.scale.y = f.tall * (1 + Math.sin(time * 7 * flicker + f.phase) * 0.15 + Math.sin(time * 13 * flicker + f.phase * 2) * 0.07); f.mesh.rotation.z = Math.sin(time * 3 * flicker + f.phase) * 0.12; }
      banks.forEach((mesh, i) => { mesh.position.x += dt * wind * (0.3 + (i % 3) * 0.2); if (mesh.position.x > 16) mesh.position.x = -16; });
      puffs.forEach((puff, i) => { puff.position.x += Math.sin(time * 0.7 + i) * 0.001; });
      foamLine.position.z = foamBase + Math.sin(time * 0.8) * 0.12;
    };
    // Frame the beach itself rather than the loose box around cliffs and sea.
    const basePlace = world.place.bind(world);
    world.place = (items: readonly Placeable[]) => {
      basePlace(items);
      const camera = world.camera as THREE.OrthographicCamera;
      camera.updateMatrixWorld(true);
      const points: THREE.Vector3[] = [];
      for (const x of [-16.5, 16.5]) points.push(new THREE.Vector3(x, 0, 11.5), new THREE.Vector3(x, 9.6, -11.5), new THREE.Vector3(x, 0, -11.5));
      for (const item of items) {
        const box = visibleBounds(item.holder);
        if (box.isEmpty()) continue;
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) points.push(new THREE.Vector3(x, y, z));
      }
      const frame = new THREE.Box2();
      for (const point of points) { point.applyMatrix4(camera.matrixWorldInverse); frame.expandByPoint(new THREE.Vector2(point.x, point.y)); }
      const middle = frame.getCenter(new THREE.Vector2()), size = frame.getSize(new THREE.Vector2());
      const extent = Math.max(size.x, size.y) * 0.5;
      camera.translateX(middle.x); camera.translateY(middle.y);
      camera.left = camera.bottom = -extent; camera.right = camera.top = extent;
      camera.updateProjectionMatrix();
    };
    return world;
  },
});
