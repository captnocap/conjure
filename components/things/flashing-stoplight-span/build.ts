import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = readonly [number, number, number];

function paint(width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const BANNERS = { welcome: 'WELCOME HOME', festival: 'FALL FESTIVAL · SAT', team: 'GO WILDCATS', sale: 'SIDEWALK SALE' } as const;

/**
 * Bake every static mesh that shares a surface (texture, gloss, glow) into one draw call, carrying
 * its colour as vertex colour. Anything marked userData.live, or instanced, is left to move freely.
 */
function fuse(root: THREE.Object3D) {
  root.updateWorldMatrix(true, true);
  const groups = new Map<string, { material: THREE.MeshStandardMaterial; parts: THREE.BufferGeometry[]; meshes: THREE.Mesh[] }>();
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || (mesh as unknown as THREE.InstancedMesh).isInstancedMesh) return;
    for (let up: THREE.Object3D | null = mesh; up && up !== root; up = up.parent) if (up.userData.live) return;
    const m = mesh.material as THREE.MeshStandardMaterial;
    if (Array.isArray(m) || m.type !== 'MeshStandardMaterial' || m.userData.live || m.transparent) return;
    const key = [m.map?.uuid, m.emissiveMap?.uuid, Math.round(m.roughness * 8), Math.round(m.metalness * 5), m.emissive.getHex(), m.emissiveIntensity.toFixed(2), m.side, m.alphaTest].join('|');
    const group = groups.get(key) ?? { material: m, parts: [], meshes: [] };
    groups.set(key, group);
    const part = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    part.applyMatrix4(mesh.matrixWorld);
    for (const name of Object.keys(part.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') part.deleteAttribute(name);
    const count = part.attributes.position.count;
    if (!part.attributes.normal) part.computeVertexNormals();
    if (!part.attributes.uv) part.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    const colours = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) colours.set([m.color.r, m.color.g, m.color.b], i * 3);
    part.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    group.parts.push(part);
    group.meshes.push(mesh);
  });
  for (const { material, parts, meshes } of groups.values()) {
    const merged = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    if (!merged) continue;
    const surface = material.clone();
    surface.color.set('#ffffff');
    surface.vertexColors = true;
    const mesh = new THREE.Mesh(merged, surface);
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
    const spent = new Set<THREE.Material>();
    for (const old of meshes) {
      old.removeFromParent();
      old.geometry.dispose();
      spent.add(old.material as THREE.Material);
    }
    // Textures stay alive on the fused clone; only the per-mesh material shells go.
    for (const old of spent) old.dispose();
  }
}

export default defineThing({
  questions: {
    head: choice('What kind of signal hangs at the centre?', {
      beacon: 'A boxy four-way beacon with one big lens on each face.',
      double: 'A four-way head with two lenses stacked on each face.',
      full: 'A full four-way cluster of three-lens red-yellow-green heads, set to flash.',
    }),
    flash: choice('What is it doing right now?', {
      red: 'Blinking red in all four directions: a four-way stop.',
      amber: 'Blinking amber for the main road and red for the cross street.',
      dark: 'Dark: the power is out, or nobody pays the bill any more.',
      half: 'Half-dead: one direction still blinks red, the other lenses are burnt out or smashed.',
      green: 'Stuck on steady green one way, as if waiting for traffic that never comes.',
    }),
    body: choice('What colour is the signal housing?', {
      yellow: 'Highway yellow.',
      green: 'Dark park-bench green, older than the highway code.',
      black: 'Black with long visors.',
      silver: 'Bare weathered aluminium.',
    }),
    poles: choice('What are the two poles like?', {
      plain: 'Two plain creosoted timber poles.',
      power: 'Timber poles carrying a crossarm of insulators and a grey transformer can.',
      lamp: 'Timber poles, one with a cobra-head streetlight on an arm.',
      mismatched: 'One old timber pole and one newer galvanised steel replacement.',
    }),
    hung: choice('What else hangs on the span?', {
      nothing: 'Nothing but the signal.',
      names: 'Green street-name blades beside the signal.',
      banner: 'A cloth banner strung across the street below the cable.',
      sneakers: 'A pair of sneakers thrown over the wire by their laces.',
      garland: 'A tinsel garland and a wire star, Christmas decorations nobody took down.',
      birds: 'A row of small birds sitting on the wire.',
    }),
    banner: choice('If a banner hangs across the street, what does it say?', {
      welcome: 'WELCOME HOME',
      festival: 'FALL FESTIVAL · SAT',
      team: 'GO WILDCATS',
      sale: 'SIDEWALK SALE',
    }),
    road: choice('What lies underneath?', {
      asphalt: 'A crossing of two asphalt streets with stop bars and a yellow centre line.',
      brick: 'A crossing of old red brick streets.',
      gravel: 'Two pale gravel roads meeting, no markings.',
      bare: 'Nothing: just the poles and the span.',
    }),
    lean: score('How far do the poles lean?', ['Plumb and true', 'A little toward the load', 'Pulled well over by years of weight']),
    sag: score('How much does the cable sag?', ['Drum tight', 'A gentle belly', 'A deep tired sag']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const hex = (colour: THREE.Color) => `#${colour.getHexString()}`;
    const blank = paint(2, 2, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 2, 2); });
    const mat = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => s.material(colour, { map: blank, ...options });
    const sheet = (map: THREE.Texture, colour: THREE.ColorRepresentation = '#ffffff') => new THREE.MeshStandardMaterial({ map, color: colour, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });

    const c = 2.55, half = 2.0, poleH = 5.7;
    // Street surface: two crossing roads, so the corners stay the world's own ground.
    const roadKind = a.road;
    if (roadKind !== 'bare') {
      const surface = paint(256, 256, (g, w, h) => {
        const tone = new THREE.Color({ asphalt: '#4a4b4d', brick: '#8a4a3c', gravel: '#c5bca6' }[roadKind]).lerp(new THREE.Color('#8f8a80'), wear * 0.3);
        g.fillStyle = hex(tone);
        g.fillRect(0, 0, w, h);
        if (a.road === 'brick') {
          for (let row = 0; row < 16; row++)
            for (let column = 0; column < 8; column++) {
              g.fillStyle = hex(tone.clone().offsetHSL((random() - 0.5) * 0.02, 0, (random() - 0.5) * 0.12));
              g.fillRect(((column + (row % 2) * 0.5) % 8) * 32 + 1, row * 16 + 1, 30, 14);
            }
        } else
          for (let i = 0; i < 1800; i++) {
            g.fillStyle = hex(tone.clone().offsetHSL(0, 0, (random() - 0.5) * 0.14));
            g.fillRect(random() * w, random() * h, 2 + random() * 2, 2 + random() * 2);
          }
        if (a.road !== 'gravel') {
          g.strokeStyle = '#26272a';
          g.lineWidth = 1.5;
          for (let i = 0; i < 2 + wear * 14; i++) {
            let x = random() * w, y = random() * h;
            g.beginPath();
            g.moveTo(x, y);
            for (let k = 0; k < 6; k++) g.lineTo((x += (random() - 0.5) * 50), (y += (random() - 0.5) * 50));
            g.stroke();
          }
        }
      });
      surface.wrapS = surface.wrapT = THREE.RepeatWrapping;
      const road = new THREE.MeshStandardMaterial({ map: surface, roughness: 0.95 });
      s.box([half * 2, 0.05, 8.4], [0, 0.025, 0], road);
      s.box([8.4, 0.049, half * 2], [0, 0.0245, 0], road);
      if (a.road === 'asphalt') {
        const white = mat(new THREE.Color('#e9e6dc').lerp(new THREE.Color('#6a6a68'), wear * 0.7));
        const yellow = mat(new THREE.Color('#e3b21c').lerp(new THREE.Color('#6a6a68'), wear * 0.7));
        for (const side of [-1, 1]) {
          s.box([half - 0.15, 0.012, 0.3], [side * (half / 2), 0.052, side * (half + 0.45)], white);
          s.box([0.3, 0.012, half - 0.15], [-side * (half + 0.45), 0.052, side * (half / 2)], white);
          for (const offset of [-0.07, 0.07]) {
            s.box([0.07, 0.012, 1.45], [offset, 0.052, side * (half + 1.45)], yellow);
            s.box([1.45, 0.012, 0.07], [side * (half + 1.45), 0.052, offset], yellow);
          }
        }
      } else if (a.road === 'gravel') {
        const rut = mat('#a89f8a', { roughness: 1 });
        for (const x of [-0.75, 0.75]) s.box([0.35, 0.012, 8.2], [x, 0.05, 0], rut), s.box([8.2, 0.012, 0.35], [0, 0.05, x], rut);
      }
    }

    // Poles on opposite corners, leaning in toward the load.
    const lean = mix(0.01, 0.13, a.lean) + wear * 0.03;
    const timber = mat(new THREE.Color('#4a3526').lerp(new THREE.Color('#857a6c'), wear * 0.5), { roughness: 0.95 });
    const steel = mat('#aeb4b5', { metalness: 0.7, roughness: 0.4 });
    const wire = mat('#26272a', { roughness: 0.7 });
    const tops: THREE.Vector3[] = [];
    for (const side of [-1, 1]) {
      const metalPole = a.poles === 'mismatched' && side === 1;
      const foot = new THREE.Vector3(side * c, 0, side * c);
      const inward = new THREE.Vector3(-side, 0, -side).normalize();
      const myLean = metalPole ? 0.01 : lean * (0.8 + random() * 0.4);
      const top = foot.clone().addScaledVector(inward, Math.sin(myLean) * poleH).setY(Math.cos(myLean) * poleH);
      s.rod([foot.x, -0.3, foot.z], top.toArray() as [number, number, number], metalPole ? 0.11 : 0.15, metalPole ? steel : timber, metalPole ? 0.07 : 0.1);
      const at = (t: number) => foot.clone().lerp(top, t);
      const attach = at(0.93);
      tops.push(attach);
      if (metalPole) s.cylinder(0.2, 0.2, 0.05, [foot.x, 0.03, foot.z], steel, 12);
      else {
        // Guy wire and its yellow guard.
        const anchor = foot.clone().addScaledVector(inward, -1.5);
        s.rod(attach.toArray() as [number, number, number], [anchor.x, 0, anchor.z], 0.012, wire);
        const g0 = anchor.clone().lerp(attach, 0.02), g1 = anchor.clone().lerp(attach, 0.32);
        s.rod([g0.x, g0.y, g0.z], [g1.x, g1.y, g1.z], 0.03, mat('#e3b21c'));
      }
      if (a.poles === 'power' && !metalPole) {
        const arm = at(0.985);
        const beam = s.box([1.7, 0.1, 0.1], [arm.x, arm.y, arm.z], timber);
        beam.rotation.y = Math.PI / 4 + (side > 0 ? 0 : 0.1);
        for (const offset of [-0.7, 0, 0.7]) {
          const x = arm.x + Math.cos(-beam.rotation.y) * offset, z = arm.z + Math.sin(-beam.rotation.y) * offset;
          s.cylinder(0.035, 0.05, 0.14, [x, arm.y + 0.12, z], mat('#8fb7b0', { roughness: 0.3 }), 8);
        }
        if (side === -1) {
          const can = at(0.78);
          s.cylinder(0.24, 0.24, 0.6, [can.x - 0.28, can.y, can.z + 0.28], mat('#8b9092', { metalness: 0.4 }), 16);
          s.cylinder(0.26, 0.26, 0.04, [can.x - 0.28, can.y + 0.32, can.z + 0.28], mat('#6f7476'), 16);
          for (const dx of [-0.1, 0.1]) s.cylinder(0.025, 0.035, 0.16, [can.x - 0.28 + dx, can.y + 0.42, can.z + 0.28], mat('#7a4a34'), 8);
        }
      }
      if (a.poles === 'lamp' && side === -1) {
        const from = at(0.98), reach = from.clone().addScaledVector(inward, 1.5).setY(from.y + 0.35);
        s.tube([from.toArray() as [number, number, number], [from.x + inward.x * 0.7, from.y + 0.4, from.z + inward.z * 0.7], reach.toArray() as [number, number, number]], 0.035, steel);
        s.ball([0.34, 0.09, 0.17], [reach.x, reach.y - 0.03, reach.z], steel, 14).rotation.y = Math.PI / 4;
        const glow = Math.abs(mood.daylight - 0.5) * 2;
        s.ball([0.2, 0.05, 0.1], [reach.x, reach.y - 0.09, reach.z], mat('#fff0c0', { emissive: new THREE.Color('#ffc46a').lerp(new THREE.Color('#e9f1ff'), 1 - mood.warmth), emissiveIntensity: 0.3 + glow * 1.4 }), 12).rotation.y = Math.PI / 4;
      }
      // A stop sign on the timber pole for the cross street.
      if (side === 1 && !metalPole && a.flash !== 'amber') {
        const p = at(0.36);
        const face = paint(128, 128, (g, w) => {
          g.clearRect(0, 0, w, w);
          g.fillStyle = hex(new THREE.Color('#b3242c').lerp(new THREE.Color('#c9a9a0'), wear * 0.6));
          g.beginPath();
          for (let i = 0; i < 8; i++) g.lineTo(64 + Math.cos(Math.PI / 8 + (i * Math.PI) / 4) * 62, 64 + Math.sin(Math.PI / 8 + (i * Math.PI) / 4) * 62);
          g.fill();
          g.fillStyle = '#f4f0e6';
          g.font = 'bold 40px sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText('STOP', 64, 66);
        });
        const sign = s.mesh(new THREE.PlaneGeometry(0.75, 0.75), sheet(face), [p.x - 0.14, p.y, p.z + 0.14]);
        sign.rotation.set(0, -Math.PI / 4 + 0.5, (random() - 0.5) * (0.05 + wear * 0.4), 'YXZ');
      }
    }

    // The span: a main catenary and a lighter tether below it.
    const [from, to] = tops;
    const sag = mix(0.12, 0.95, a.sag);
    const along = (t: number, drop: number, lower = 0): P3 => [mix(from.x, to.x, t), mix(from.y, to.y, t) - lower - drop * 4 * t * (1 - t), mix(from.z, to.z, t)];
    const curve = (drop: number, lower: number) => Array.from({ length: 13 }, (_unused, i) => along(i / 12, drop, lower));
    s.tube(curve(sag, 0), 0.014, wire);
    s.tube(curve(sag * 0.75, 0.9), 0.008, wire);
    const hang = new THREE.Vector3(...along(0.5, sag));

    // Signal head, hung from a pivot so it can swing.
    const swing = new THREE.Group();
    swing.position.copy(hang);
    s.root.add(swing);
    const add = <T extends THREE.Object3D>(node: T) => { swing.attach(node); return node; };
    const housing = mat({ yellow: '#e0a916', green: '#2c4a3a', black: '#1d1e20', silver: '#aab0b1' }[a.body], { metalness: a.body === 'silver' ? 0.6 : 0.1, roughness: 0.5 });
    const visor = sheet(blank, a.body === 'yellow' ? '#1d1e20' : { green: '#2c4a3a', black: '#1d1e20', silver: '#8f9596' }[a.body as 'green' | 'black' | 'silver']);
    const lenses = a.head === 'beacon' ? 1 : a.head === 'double' ? 2 : 3;
    const lensR = a.head === 'beacon' ? 0.17 : 0.125;
    const bodyH = lenses * (lensR * 2 + 0.09) + 0.06;
    const bodyW = lensR * 2 + 0.12;
    const out = a.head === 'full' ? bodyW * 0.75 : bodyW / 2;
    const topY = hang.y - 0.28;
    add(s.rod([hang.x, hang.y + 0.03, hang.z], [hang.x, topY, hang.z], 0.022, steel));
    add(s.box([0.1, 0.07, 0.1], [hang.x, hang.y, hang.z], steel));
    if (a.head === 'full') {
      add(s.cylinder(out * 0.9, out * 0.9, 0.05, [hang.x, topY, hang.z], housing, 4)).rotation.y = Math.PI / 4;
      add(s.cylinder(out * 0.9, out * 0.9, 0.05, [hang.x, topY - bodyH, hang.z], housing, 4)).rotation.y = Math.PI / 4;
    } else {
      add(s.box([bodyW, bodyH, bodyW], [hang.x, topY - bodyH / 2, hang.z], housing));
      add(s.cylinder(0.02, bodyW * 0.55, 0.1, [hang.x, topY + 0.03, hang.z], housing, 4)).rotation.y = Math.PI / 4;
    }
    add(s.rod([hang.x, topY - bodyH, hang.z], [hang.x, hang.y - 0.9 - sag * 0.75 + 0.02, hang.z], 0.012, steel));

    type Lamp = { material: THREE.MeshStandardMaterial; group: 'main' | 'cross'; row: number; alive: boolean };
    const lamps: Lamp[] = [];
    const RED = '#ff2a1a', AMBER = '#ffab1a', GREEN = '#2fe08a';
    const dirs = [[0, 1, 'main'], [0, -1, 'main'], [1, 0, 'cross'], [-1, 0, 'cross']] as const;
    for (const [dx, dz, group] of dirs) {
      const yaw = Math.atan2(dx, dz);
      if (a.head === 'full') add(s.box([bodyW, bodyH, 0.2], [hang.x + dx * (out - 0.1), topY - bodyH / 2, hang.z + dz * (out - 0.1)], housing)).rotation.y = yaw;
      for (let row = 0; row < lenses; row++) {
        const y = topY - 0.075 - lensR - row * (lensR * 2 + 0.09);
        const colour = lenses === 3 ? [RED, AMBER, GREEN][row] : a.flash === 'amber' && group === 'main' ? AMBER : a.flash === 'green' && group === 'main' && row === lenses - 1 ? GREEN : RED;
        const alive = a.flash === 'half' ? group === 'main' && dz === 1 : a.flash !== 'dark';
        const smashed = a.flash === 'half' && !alive && random() < 0.5;
        const material = new THREE.MeshStandardMaterial({ map: blank, color: new THREE.Color(colour).multiplyScalar(smashed ? 0.08 : 0.32), emissive: colour, emissiveIntensity: 0, roughness: 0.3 });
        const lens = add(s.cylinder(lensR, lensR, 0.03, [hang.x + dx * (out + 0.012), y, hang.z + dz * (out + 0.012)], material, 20));
        lens.rotation.set(0, yaw, 0);
        lens.rotateX(Math.PI / 2);
        const hoodLength = a.body === 'black' ? 0.3 : 0.17;
        const hood = add(s.mesh(new THREE.CylinderGeometry(lensR + 0.015, lensR + 0.015, hoodLength, 16, 1, true, Math.PI * 0.38, Math.PI * 1.24), visor, [hang.x + dx * (out + hoodLength / 2), y, hang.z + dz * (out + hoodLength / 2)]));
        hood.rotation.set(0, yaw, 0);
        hood.rotateX(Math.PI / 2);
        lamps.push({ material, group, row, alive });
      }
    }

    // Other things on the span.
    const perch = (t: number) => new THREE.Vector3(...along(t, sag));
    if (a.hung === 'names') {
      for (const [index, text] of ['MAIN ST', 'ELM ST'].entries()) {
        const p = perch(0.5 + (index ? 0.13 : -0.13));
        const blade = paint(256, 64, (g, w, h) => {
          g.fillStyle = hex(new THREE.Color('#1f6b45').lerp(new THREE.Color('#9aa79c'), wear * 0.5));
          g.fillRect(0, 0, w, h);
          g.fillStyle = '#f4f0e6';
          g.font = 'bold 40px sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(text, w / 2, h / 2 + 2);
        });
        const plate = s.mesh(new THREE.PlaneGeometry(1.0, 0.25), sheet(blade), [p.x, p.y - 0.32, p.z]);
        plate.rotation.y = index ? Math.PI / 2 : 0;
        for (const dx of [-0.3, 0.3]) s.rod([p.x + (index ? 0 : dx), p.y, p.z + (index ? dx : 0)], [p.x + (index ? 0 : dx), p.y - 0.2, p.z + (index ? dx : 0)], 0.006, steel);
      }
    } else if (a.hung === 'banner') {
      const text = BANNERS[a.banner];
      const cloth = paint(512, 96, (g, w, h) => {
        g.fillStyle = hex(new THREE.Color(mood.cheer > 0.5 ? '#f3ead2' : '#e2ddd0').lerp(new THREE.Color('#aaa493'), wear * 0.5));
        g.fillRect(0, 0, w, h);
        g.fillStyle = hex(new THREE.Color(['#b3242c', '#24418f', '#1f6b45'][Math.floor(random() * 3)]).lerp(new THREE.Color('#8f8a80'), wear * 0.5));
        g.fillRect(0, 0, w, 8);
        g.fillRect(0, h - 8, w, 8);
        g.font = `bold ${Math.min(58, (w / text.length) * 1.5)}px sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(text, w / 2, h / 2 + 2, w * 0.92);
      });
      const p0 = new THREE.Vector3(...along(0.1, sag * 0.75, 0.95)), p1 = new THREE.Vector3(...along(0.42, sag * 0.75, 0.95));
      const mid = p0.clone().add(p1).multiplyScalar(0.5);
      const banner = s.mesh(new THREE.PlaneGeometry(p0.distanceTo(p1), 0.55), sheet(cloth), [mid.x, mid.y - 0.3, mid.z]);
      banner.rotation.y = -Math.atan2(p1.z - p0.z, p1.x - p0.x);
      banner.rotation.z = Math.atan2(p1.y - p0.y, Math.hypot(p1.x - p0.x, p1.z - p0.z)) + (wear > 0.6 ? 0.12 : 0);
    } else if (a.hung === 'sneakers') {
      const p = perch(0.24 + random() * 0.12);
      const canvas = mat(random() < 0.5 ? '#e9e6dc' : '#b3242c');
      const sole = mat('#f4f0e6');
      for (const [dx, drop] of [[-0.07, 0.42], [0.09, 0.58]] as const) {
        s.rod([p.x, p.y, p.z], [p.x + dx, p.y - drop, p.z + dx], 0.004, mat('#f4f0e6'));
        const shoe = s.box([0.1, 0.09, 0.26], [p.x + dx, p.y - drop - 0.1, p.z + dx], canvas);
        shoe.rotation.set(1.1 + random() * 0.4, random() * 3, 0);
        const bottom = s.box([0.11, 0.025, 0.28], [p.x + dx, p.y - drop - 0.16, p.z + dx], sole);
        bottom.rotation.copy(shoe.rotation);
        bottom.position.copy(shoe.position).add(new THREE.Vector3(0, -0.055, 0).applyEuler(shoe.rotation));
      }
    } else if (a.hung === 'garland') {
      const tinsel = mat(mood.warmth > 0.5 ? '#c9a437' : '#a9b7c4', { metalness: 0.8, roughness: 0.35 });
      const points: P3[] = [];
      for (let i = 0; i <= 24; i++) {
        const t = 0.08 + (i / 24) * 0.84, p = along(t, sag);
        points.push([p[0], p[1] - (i % 4 === 2 ? 0.32 : i % 2 ? 0.16 : 0.03), p[2]]);
      }
      s.tube(points, 0.035, tinsel);
      const star = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 0.2 : 0.5, angle = Math.PI / 2 + (i * Math.PI) / 5;
        if (i) star.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        else star.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      const p = perch(0.5);
      const lit = Math.abs(mood.daylight - 0.5) * 2;
      const mesh = s.mesh(new THREE.ExtrudeGeometry(star, { depth: 0.05, bevelEnabled: false }), mat('#f4e2a0', { emissive: '#ffd77a', emissiveIntensity: 0.2 + lit * mood.cheer }), [p.x, p.y + 0.62, p.z]);
      mesh.rotation.y = Math.PI / 4;
    } else if (a.hung === 'birds') {
      const feather = mat('#2a2b2e', { roughness: 0.9 });
      const flock = 4 + Math.round(mood.density * 9);
      for (let i = 0; i < flock; i++) {
        const t = 0.08 + random() * 0.32 + (random() < 0.5 ? 0.5 : 0);
        const p = perch(t);
        s.ball([0.06, 0.075, 0.09], [p.x, p.y + 0.08, p.z], feather, 8).rotation.y = Math.PI / 4;
        s.ball([0.04, 0.04, 0.04], [p.x + 0.04, p.y + 0.16, p.z - 0.04], feather, 8);
      }
    }

    const rate = mix(0.55, 1.5, mood.energy);
    const sway = mix(0.01, 0.16, mood.energy);
    const phase = random() * 6;
    const glow = mix(1.6, 2.6, Math.abs(mood.daylight - 0.5) * 2);
    const show = (time: number) => {
      const on = (time * rate) % 1 < 0.55;
      for (const lamp of lamps) {
        let lit = lamp.alive && (lamp.group === 'main' ? on : !on || a.flash === 'red');
        if (a.flash === 'red') lit = lamp.alive && on;
        if (lenses === 3) {
          const want = a.flash === 'green' && lamp.group === 'main' ? 2 : a.flash === 'amber' && lamp.group === 'main' ? 1 : 0;
          lit = lit && lamp.row === want;
          if (a.flash === 'green' && lamp.group === 'main') lit = lamp.row === 2;
        } else if (a.flash === 'green' && lamp.group === 'main') lit = lamp.row === lenses - 1;
        lamp.material.emissiveIntensity = lit ? glow : 0;
      }
      swing.rotation.x = Math.sin(time * 1.3 + phase) * sway;
      swing.rotation.z = Math.sin(time * 0.9 + phase * 2) * sway * 0.6 + (wear > 0.7 ? 0.06 : 0);
    };
    swing.scale.setScalar(1.55);
    swing.userData.live = true;
    fuse(s.root);
    show(0);
    return s.finish({ footprint: 3.2, update: (_dt, time) => show(time) });
  },
});
