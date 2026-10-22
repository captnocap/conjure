import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { SKULL, buildSkull, capPatch, longBone, painted, strands, surface } from './skull';

const HAIR = {
  red: '#b0421c', black: '#1f1b19', blond: '#cfae62', grey: '#8f8b84', white: '#e6e0d0', brown: '#5a3a23',
} as const;

export default defineThing({
  questions: {
    hair: score('How much hair is left on it?', ['Three or four stray wisps', 'A few thin patches', 'Half the scalp', 'Nearly a full head of hair']),
    style: choice('How is the remaining hair worn?', {
      wisps: 'Short dry wisps standing off the bone, like dandelion fluff.',
      long: 'Long lank locks hanging down past the jaw and pooling on the shelf.',
      braid: 'One thick plait still tightly braided, hanging over the cheek and tied with a ribbon.',
      wig: 'The remains of a powdered wig: stiff rolled side curls and a queue with a black bow.',
      tonsure: 'A monk\'s fringe: a ring of cropped hair around a bare crown.',
      topknot: 'A knot of hair bound on the crown with cord, spraying out above it.',
    }),
    colour: choice('What colour is the hair?', {
      red: 'Coppery red, startlingly bright against the bone.',
      black: 'Coal black.',
      blond: 'Straw blond.',
      grey: 'Iron grey.',
      white: 'White as thistledown.',
      brown: 'Dull mouse brown.',
    }),
    teeth: choice('Which teeth remain?', {
      full: 'A full, even grin.',
      gappy: 'Most of them, with a few dark gaps.',
      few: 'Only three or four lonely pegs.',
      none: 'None at all, smooth gums of bone.',
      gold: 'A full grin with one gold tooth catching the light.',
    }),
    jaw: choice('What about the lower jaw?', {
      attached: 'In place, the mouth closed.',
      agape: 'In place but hanging open, as if mid-sentence.',
      missing: 'Lost; the skull sits tipped back on its upper teeth.',
      beside: 'Come loose and laid neatly beside the skull.',
    }),
    brow: choice('What is painted or written on the brow?', {
      bare: 'Nothing, plain bone.',
      name: 'A name and a year in black lettering.',
      flowers: 'A wreath of painted roses and green leaves, as on the Hallstatt skulls.',
      cross: 'A dark painted cross between two initials.',
      number: 'A collector\'s catalogue number in ink.',
      laurel: 'A green laurel garland with a red ribbon.',
    }),
    rest: choice('What does it rest on?', {
      shelf: 'A worn stone shelf.',
      bones: 'A neat stack of long bones.',
      book: 'A thick leather-bound book.',
      cushion: 'A faded velvet cushion with tassels.',
      box: 'Its own little painted wooden house with a gabled roof.',
      earth: 'Bare earth, half sunk.',
    }),
    tribute: choice('What has somebody left beside it?', {
      nothing: 'Nothing; no one comes.',
      sprig: 'A fresh green sprig of rosemary.',
      comb: 'A bone comb, as if to tidy the hair.',
      candle: 'A stub of candle, still burning.',
      rosary: 'A string of wooden rosary beads.',
      coins: 'A few small coins.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const g = new THREE.Group();
    g.scale.setScalar(SKULL.unit);
    s.root.add(g);
    const put = <T extends THREE.Object3D>(object: T) => { g.add(object); return object; };
    const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number] = [0, 0, 0]) => {
      const m = new THREE.Mesh(geometry, material);
      m.position.set(...at);
      m.castShadow = m.receiveShadow = true;
      return put(m);
    };

    const boneColour = new THREE.Color('#e4d8b8').lerp(new THREE.Color(mood.warmth > 0.5 ? '#d9b983' : '#cfd0c4'), Math.abs(mood.warmth - 0.5) * 1.1).lerp(new THREE.Color('#9a8262'), mood.wear * 0.45);
    const keepChance = { full: 1, gappy: 0.72, few: 0.22, none: 0, gold: 1 }[a.teeth] * (a.teeth === 'none' ? 0 : 1 - mood.wear * 0.15);
    const keep = () => random() < keepChance;
    const upperKept = Array.from({ length: 12 }, (_u, i) => keep() && !(a.teeth === 'gold' && i === 4));
    const lowerKept = Array.from({ length: 12 }, keep);
    const hasJaw = a.jaw === 'attached' || a.jaw === 'agape';
    const skull = buildSkull({
      bone: boneColour, hollow: '#2b211a', stain: '#7a5f3c', blotch: mix(0.15, 1, mood.wear), random,
      jaw: a.jaw === 'attached' ? 'closed' : a.jaw === 'agape' ? 'open' : 'closed', gape: mix(0.3, 0.55, random()),
      upper: (i) => upperKept[i], lower: (i) => lowerKept[i],
    });
    const head = put(new THREE.Group());
    head.add(skull.root);
    const gold = new THREE.MeshStandardMaterial({ color: '#e2b23a', metalness: 0.9, roughness: 0.25, emissive: '#6b4a08', emissiveIntensity: 0.5 });
    if (a.teeth === 'gold') {
      const tooth = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.14, 7), gold);
      tooth.position.set(Math.sin(-0.3) * 0.37, -1.025, 0.38 + Math.cos(-0.3) * 0.37 * 1.08);
      tooth.castShadow = true;
      skull.root.add(tooth);
    }
    let looseJaw: THREE.Group | null = null;
    if (!hasJaw && skull.jaw) {
      skull.root.remove(skull.jaw);
      if (a.jaw === 'beside') looseJaw = skull.jaw;
      else skull.jaw.traverse((node) => { const m = node as THREE.Mesh; if (m.isMesh && m.material !== skull.plain && m.material !== skull.ivory) m.geometry.dispose(); else if (m.isMesh) m.geometry.dispose(); });
    }

    // Hair, in skull space so it tips with the head.
    const hairColour = new THREE.Color(HAIR[a.colour]);
    if (a.style === 'wig') hairColour.lerp(new THREE.Color('#e9e3d2'), 0.6);
    hairColour.lerp(new THREE.Color('#857a68'), mood.wear * 0.3);
    const hair = new THREE.MeshStandardMaterial({ color: hairColour, roughness: 0.9 });
    const scalp = new THREE.MeshStandardMaterial({ color: '#6d4c36', roughness: 0.95, side: THREE.DoubleSide });
    const floorLocal = hasJaw ? SKULL.chin : SKULL.teeth;
    const paths: THREE.Vector3[][] = [];
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
    const strand = (from: THREE.Vector3, length: number, wave: number) => {
      const d = from.clone().normalize();
      if (Math.abs(d.y) > 0.98) d.add(new THREE.Vector3(jitter(0.3), 0, jitter(0.3))).normalize();
      const points = [surface(d, 1.02)];
      let travelled = 0;
      const step = 0.13;
      while (travelled < length && d.y > -0.2) {
        const tangent = new THREE.Vector3(0, -1, 0).addScaledVector(d, d.y).normalize();
        d.addScaledVector(tangent, step).add(new THREE.Vector3(jitter(0.04), 0, jitter(0.04))).normalize();
        travelled += step;
        points.push(surface(d, 1.03 + travelled * 0.03 + wave * 0.05 * Math.sin(travelled * 9)));
      }
      const out = new THREE.Vector3(d.x, 0, d.z).normalize();
      let q = points[points.length - 1];
      const phase = random() * 6;
      while (travelled < length && q.y > floorLocal + 0.06) {
        q = q.clone();
        q.y -= step;
        q.addScaledVector(out, 0.012 + wave * 0.05 * Math.sin(travelled * 8 + phase));
        q.x += jitter(0.02);
        travelled += step;
        points.push(q);
      }
      for (let i = 0; i < 3 && travelled < length; i++) {
        q = q.clone().addScaledVector(out, 0.14).add(new THREE.Vector3(jitter(0.08), 0, jitter(0.08)));
        q.y = floorLocal + 0.03;
        travelled += step;
        points.push(q);
      }
      paths.push(points);
    };
    const patches = [new THREE.Vector3(-0.55, 0.55, -0.45), new THREE.Vector3(0.7, 0.45, 0.05), new THREE.Vector3(0.1, 0.8, -0.5), new THREE.Vector3(-0.6, 0.6, 0.35)]
      .map((v) => v.add(new THREE.Vector3(jitter(0.2), jitter(0.1), jitter(0.2))).normalize());
    const used = Math.max(1, Math.round(mix(1, 4, a.hair)));
    const spread = mix(0.22, 0.75, a.hair);
    const count = Math.round(mix(14, 240, a.hair));
    const rootNear = (centre: THREE.Vector3) => {
      for (let attempt = 0; attempt < 12; attempt++) {
        const v = centre.clone().add(new THREE.Vector3(jitter(spread), jitter(spread), jitter(spread))).normalize();
        if (v.y > 0.12 && !(v.z > 0.55 && v.y < 0.55)) return v;
      }
      return centre.clone();
    };
    const scalpPatch = (centre: THREE.Vector3, size: number) => {
      const geo = new THREE.SphereGeometry(1, 16, 6, 0, Math.PI * 2, 0, size);
      const position = geo.attributes.position as THREE.BufferAttribute;
      const turn = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), centre);
      const v = new THREE.Vector3();
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i).applyQuaternion(turn);
        const edge = 1 + (i % 17 > 12 ? jitter(0.01) : 0);
        const p = surface(v, 1.014 * edge);
        position.setXYZ(i, p.x, p.y, p.z);
      }
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, scalp);
      m.castShadow = true;
      skull.root.add(m);
    };
    if (a.style !== 'tonsure' && a.style !== 'topknot') for (let i = 0; i < used; i++) scalpPatch(patches[i], spread * 0.8);

    if (a.style === 'wisps' || a.style === 'braid' || a.style === 'wig') {
      const n = a.style === 'wisps' ? count : Math.round(count * 0.35);
      for (let i = 0; i < n; i++) {
        const v = rootNear(patches[i % used]);
        // Wisps stand off the bone instead of lying on it.
        const base = surface(v, 1.02), tip = surface(v, 1.02 + mix(0.12, 0.45, random()));
        tip.add(new THREE.Vector3(jitter(0.12), jitter(0.05) - 0.05, jitter(0.12)));
        paths.push([base, base.clone().lerp(tip, 0.5).add(new THREE.Vector3(jitter(0.04), 0.03, jitter(0.04))), tip]);
      }
    }
    if (a.style === 'long') for (let i = 0; i < count; i++) strand(rootNear(patches[i % used]), mix(1.1, 2.9, random()), mix(0.1, 0.9, random()));
    if (a.style === 'tonsure') {
      const ring = Math.round(mix(40, 260, a.hair));
      for (let i = 0; i < ring; i++) {
        const angle = random() * Math.PI * 2;
        if (random() > mix(0.35, 1, a.hair) && Math.sin(angle * 2.3 + patches[0].x * 5) > 0) continue;
        const v = new THREE.Vector3(Math.sin(angle), mix(0.28, 0.5, random()), Math.cos(angle)).normalize();
        if (v.z > 0.75) continue;
        strand(v, mix(0.3, 0.6, random()), 0.3);
      }
    }
    if (a.style === 'topknot') {
      const crown = new THREE.Vector3(jitter(0.1), 1, -0.15).normalize();
      const knotTop = surface(crown, 1.32);
      const n = Math.round(mix(20, 150, a.hair));
      for (let i = 0; i < n; i++) {
        const angle = random() * Math.PI * 2, reach = mix(0.25, 0.75, random());
        const v = crown.clone().add(new THREE.Vector3(Math.sin(angle) * 0.5, 0, Math.cos(angle) * 0.5)).normalize();
        const tip = knotTop.clone().add(new THREE.Vector3(Math.sin(angle) * reach, mix(0.35, -0.3, reach) + jitter(0.1), Math.cos(angle) * reach));
        paths.push([surface(v, 1.02), surface(crown, 1.18).add(new THREE.Vector3(jitter(0.04), 0, jitter(0.04))), knotTop.clone().add(new THREE.Vector3(Math.sin(angle) * 0.1, 0.12, Math.cos(angle) * 0.1)), tip]);
      }
      const cord = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.035, 6, 14), new THREE.MeshStandardMaterial({ color: '#8a2d24', roughness: 0.8 }));
      cord.position.copy(surface(crown, 1.22));
      cord.rotation.x = Math.PI / 2;
      skull.root.add(cord);
      const pad = new THREE.SphereGeometry(1, 16, 6, 0, Math.PI * 2, 0, mix(0.3, 0.8, a.hair));
      const position = pad.attributes.position as THREE.BufferAttribute;
      const turn = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), crown), v = new THREE.Vector3();
      for (let i = 0; i < position.count; i++) { const p = surface(v.fromBufferAttribute(position, i).applyQuaternion(turn), 1.025); position.setXYZ(i, p.x, p.y, p.z); }
      pad.computeVertexNormals();
      skull.root.add(new THREE.Mesh(pad, hair));
    }
    if (a.style === 'braid') {
      const side = patches[1].x > 0 ? 1 : -1;
      const parts: THREE.Vector3[] = [];
      const start = new THREE.Vector3(side * 0.75, 0.5, 0.15).normalize();
      const length = mix(1.3, 2.6, a.hair);
      let p = surface(start, 1.05);
      for (let t = 0; t < length; t += 0.11) {
        if (p.y > floorLocal + 0.12) p = new THREE.Vector3(side * (0.8 + Math.sin(t * 1.2) * 0.08), p.y - 0.11, 0.2 + t * 0.12);
        else p = new THREE.Vector3(p.x - side * 0.05, floorLocal + 0.1, p.z + 0.1);
        parts.push(p);
      }
      const thick = mix(0.07, 0.13, a.hair);
      const lump = new THREE.SphereGeometry(1, 8, 6);
      const plait = new THREE.InstancedMesh(lump, hair, parts.length * 2);
      const matrix = new THREE.Matrix4();
      parts.forEach((at, i) => {
        const taper = 1 - (i / parts.length) * 0.45;
        for (const k of [0, 1]) {
          const offset = (k === 0 ? 1 : -1) * thick * 0.55 * (i % 2 === k ? 1 : 0.3);
          matrix.makeScale(thick * taper, thick * 0.8 * taper, thick * taper).setPosition(at.x, at.y, at.z + offset);
          plait.setMatrixAt(i * 2 + k, matrix);
        }
      });
      plait.castShadow = true;
      skull.root.add(plait);
      const end = parts[parts.length - 1];
      const bow = new THREE.Mesh(new THREE.TorusGeometry(thick * 0.9, 0.035, 6, 12), new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#c7334a' : '#31405e', roughness: 0.7 }));
      bow.position.copy(parts[Math.max(0, parts.length - 3)]);
      bow.rotation.x = Math.PI / 2;
      skull.root.add(bow);
      for (let i = 0; i < 14; i++) paths.push([end.clone(), end.clone().add(new THREE.Vector3(jitter(0.12), 0.02, 0.2 + jitter(0.08)))]);
    }
    if (a.style === 'wig') {
      const rolls = Math.max(1, Math.round(mix(1, 4, a.hair)));
      for (const side of [-1, 1]) for (let i = 0; i < rolls; i++) {
        if (random() < mood.wear * 0.4 && i > 0) continue;
        const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.55, 12), hair);
        roll.rotation.x = Math.PI / 2;
        roll.position.set(side * (0.82 + i * 0.03), 0.22 - i * 0.29, -0.05 + jitter(0.04));
        roll.rotation.z = jitter(0.15);
        roll.castShadow = true;
        skull.root.add(roll);
        const core = new THREE.Mesh(new THREE.CircleGeometry(0.08, 10), new THREE.MeshStandardMaterial({ color: '#6b6658' }));
        core.position.set(roll.position.x, roll.position.y, roll.position.z + 0.281);
        skull.root.add(core);
      }
      const cap = new THREE.Mesh(capPatch(Math.PI, mix(0.9, 2.6, a.hair), 0.02, mix(0.7, 1.35, a.hair), 1.04), hair);
      cap.castShadow = true;
      skull.root.add(cap);
      const queue = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.05, 0.9, 8), hair);
      queue.position.set(0, -0.55, -1.08);
      queue.rotation.x = -0.25;
      skull.root.add(queue);
      const bow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.08), new THREE.MeshStandardMaterial({ color: '#1c1a1d', roughness: 0.7 }));
      bow.position.set(0, -0.15, -1.1);
      skull.root.add(bow);
    }
    const hairMesh = strands(paths, a.style === 'wisps' ? 0.011 : 0.014, hair, 3);
    skull.root.add(hairMesh);

    // Brow painting.
    if (a.brow !== 'bare') {
      const fade = 1 - mood.wear * 0.45;
      const texture = painted(512, 256, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.globalAlpha = fade;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const ink = '#241a14';
        const leaf = (x: number, y: number, angle: number, size: number, colour: string) => {
          ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.fillStyle = colour;
          ctx.beginPath(); ctx.ellipse(0, 0, size, size * 0.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        };
        const rose = (x: number, y: number, size: number, colour: string) => {
          ctx.fillStyle = colour;
          for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x + Math.cos(i * 1.256) * size * 0.55, y + Math.sin(i * 1.256) * size * 0.55, size * 0.55, 0, Math.PI * 2); ctx.fill(); }
          ctx.fillStyle = '#e8c44a'; ctx.beginPath(); ctx.arc(x, y, size * 0.3, 0, Math.PI * 2); ctx.fill();
        };
        if (a.brow === 'name') {
          const names = ['ANNA', 'JOSEF', 'MARIA', 'KASPAR', 'ELISE', 'TOBIAS'];
          ctx.fillStyle = ink;
          ctx.font = 'bold 84px serif';
          ctx.fillText(names[Math.floor(random() * names.length)], w / 2, h * 0.42, w * 0.6);
          ctx.font = 'bold 56px serif';
          ctx.fillText(`† ${1700 + Math.floor(random() * 180)}`, w / 2, h * 0.78);
        } else if (a.brow === 'flowers') {
          for (let i = 0; i <= 14; i++) {
            const t = i / 14, x = w * (0.14 + t * 0.72), y = h * (0.72 - Math.sin(t * Math.PI) * 0.42);
            leaf(x - 12, y + 14, t * 3 - 1.5, 26, '#2f6b3a');
            leaf(x + 14, y - 10, t * 3, 24, '#3f8048');
          }
          const reds = mood.cheer > 0.4 ? ['#c8283a', '#d65a7c', '#3c5fb0'] : ['#8a2a32', '#7a5a78', '#3d4c74'];
          for (let i = 0; i < 6; i++) { const t = i / 5; rose(w * (0.16 + t * 0.68), h * (0.72 - Math.sin(t * Math.PI) * 0.42), 24, reds[i % 3]); }
        } else if (a.brow === 'cross') {
          ctx.fillStyle = ink;
          ctx.fillRect(w / 2 - 12, h * 0.16, 24, h * 0.7);
          ctx.fillRect(w / 2 - 52, h * 0.34, 104, 24);
          ctx.font = 'bold 90px serif';
          const letters = 'ABFGHJKMRST';
          ctx.fillText(letters[Math.floor(random() * letters.length)], w * 0.28, h * 0.55);
          ctx.fillText(letters[Math.floor(random() * letters.length)], w * 0.72, h * 0.55);
        } else if (a.brow === 'number') {
          ctx.fillStyle = '#1d2a55';
          ctx.font = 'italic bold 80px serif';
          ctx.fillText(`No. ${100 + Math.floor(random() * 880)}`, w / 2, h * 0.55);
          ctx.fillRect(w * 0.3, h * 0.8, w * 0.4, 5);
        } else {
          for (const side of [-1, 1]) for (let i = 0; i < 9; i++) {
            const t = i / 8, x = w / 2 + side * w * (0.06 + t * 0.32), y = h * (0.75 - t * t * 0.5);
            leaf(x, y - 12, side * (0.9 - t), 30, '#3d7a3c');
            leaf(x, y + 12, side * (-0.3 - t), 28, '#2b5f33');
          }
          ctx.fillStyle = '#b3262e';
          ctx.fillRect(w / 2 - 22, h * 0.7, 44, 26);
          ctx.fillRect(w / 2 - 30, h * 0.8, 16, 40);
          ctx.fillRect(w / 2 + 14, h * 0.8, 16, 40);
        }
      });
      const paint = new THREE.Mesh(capPatch(0, 0.68, 0.66, 1.34, 1.012), new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.35, roughness: 0.9 }));
      skull.root.add(paint);
    }

    // Seat the head.
    const tip = hasJaw ? 0 : -0.3;
    skull.root.rotation.x = tip + (a.rest === 'cushion' ? -0.06 : 0);
    head.rotation.set(0, jitter(0.22), jitter(0.05));
    s.root.updateMatrixWorld(true);
    const seated = new THREE.Box3().setFromObject(skull.cranium);
    for (const child of skull.root.children) if (child !== hairMesh) seated.expandByObject(child);
    const floor = 0;
    head.position.y = floor - seated.min.y / SKULL.unit - (a.rest === 'cushion' ? 0.14 : a.rest === 'earth' ? 0.2 : 0);
    if (looseJaw) {
      put(looseJaw);
      looseJaw.position.set(1.45, 0.9, 0.25);
      looseJaw.rotation.set(0, -0.5 + jitter(0.2), 0);
    }

    // What it rests on.
    const stone = s.material('#a9a394', { roughness: 0.95 });
    const boneMat = new THREE.MeshStandardMaterial({ color: boneColour.clone().multiplyScalar(0.92), roughness: 0.85 });
    if (a.rest === 'shelf') {
      mesh(new THREE.BoxGeometry(4.4, 0.45, 3.1), stone, [0.3, -0.225, 0]);
      mesh(new THREE.BoxGeometry(4.4, 0.25, 0.25), s.material('#8f8a7c'), [0.3, -0.58, 1.3]);
      for (let i = 0; i < 5; i++) mesh(new THREE.BoxGeometry(0.02, 0.46, 3.11), s.material('#6f6a5e'), [-1.5 + i * 0.9 + jitter(0.2), -0.225, 0]);
    } else if (a.rest === 'bones') {
      const rows = Math.round(mix(2, 4, mood.density));
      for (let row = 0; row < rows; row++) for (let i = 0; i < 7; i++) {
        const bone = put(longBone(mix(3.4, 4.2, random()), 0.15, boneMat));
        bone.position.set(0.2 + jitter(0.15), -0.19 - row * 0.36, -1.15 + i * 0.38 + (row % 2) * 0.19);
        bone.rotation.y = jitter(0.05);
      }
    } else if (a.rest === 'book') {
      const leather = s.material(mood.warmth > 0.5 ? '#6b2f22' : '#2f3f38', { roughness: 0.7 });
      const book = put(new THREE.Group());
      const add = (size: [number, number, number], at: [number, number, number], material: THREE.Material) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...size), material); m.position.set(...at); m.castShadow = m.receiveShadow = true; book.add(m); };
      add([3.3, 0.08, 2.5], [0, -0.04, 0], leather);
      add([3.3, 0.08, 2.5], [0, -0.66, 0], leather);
      add([0.1, 0.7, 2.5], [-1.65, -0.35, 0], leather);
      add([3.1, 0.54, 2.36], [0.02, -0.35, 0], s.material('#e3d6b2'));
      for (const z of [-0.8, 0, 0.8]) add([0.13, 0.72, 0.1], [-1.66, -0.35, z], gold);
      add([0.5, 0.1, 0.4], [1.3, -0.02, 1.0], gold);
      book.rotation.y = 0.2 + jitter(0.15);
      book.position.x = 0.25;
    } else if (a.rest === 'cushion') {
      const velvet = s.material(mood.cheer > 0.5 ? '#9b2f4a' : '#4a2d5c', { roughness: 0.95 });
      mesh(new THREE.SphereGeometry(1, 24, 14), velvet, [0, -0.35, 0]).scale.set(2.1, 0.5, 1.8);
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        mesh(new THREE.ConeGeometry(0.1, 0.45, 8), gold, [x * 1.75, -0.5, z * 1.45]).rotation.z = x * 1.2;
        mesh(new THREE.SphereGeometry(0.09, 8, 6), gold, [x * 1.55, -0.42, z * 1.35]);
      }
      mesh(new THREE.BoxGeometry(4.6, 0.2, 3.9), stone, [0, -0.95, 0]);
    } else if (a.rest === 'box') {
      const wood = s.material(mood.cheer > 0.5 ? '#3d6f8a' : '#5a4630', { roughness: 0.85 });
      const trim = s.material('#d8c9a0');
      mesh(new THREE.BoxGeometry(2.7, 0.14, 2.6), wood, [0, -0.07, -0.1]);
      mesh(new THREE.BoxGeometry(2.7, 2.9, 0.12), wood, [0, 1.45, -1.34]);
      for (const x of [-1, 1]) {
        mesh(new THREE.BoxGeometry(0.12, 2.9, 2.6), wood, [x * 1.29, 1.45, -0.1]);
        const roof = mesh(new THREE.BoxGeometry(1.75, 0.12, 2.9), trim, [x * 0.68, 3.3, -0.05]);
        roof.rotation.z = -x * 0.62;
      }
      mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), trim, [0, 4.05, 0]);
      mesh(new THREE.BoxGeometry(0.36, 0.08, 0.08), trim, [0, 4.15, 0]);
    } else {
      const earth = s.material('#6a5a47', { roughness: 1 });
      mesh(new THREE.CylinderGeometry(2.3, 2.6, 0.3, 18), earth, [0, -0.15, 0]);
      for (let i = 0; i < 14; i++) mesh(new THREE.DodecahedronGeometry(mix(0.12, 0.3, random())), earth, [jitter(1.9), 0.02, jitter(1.9)]);
    }

    // Tribute.
    let flame: THREE.Mesh | null = null;
    const tx = -1.55, tz = 0.75;
    if (a.tribute === 'sprig') {
      const green = new THREE.MeshStandardMaterial({ color: mood.wear > 0.7 ? '#7b7a4a' : '#4f8a45', roughness: 0.8 });
      const twig: THREE.Vector3[][] = [];
      for (let i = 0; i < 3; i++) {
        const base = new THREE.Vector3(tx + jitter(0.1), 0.05, tz + 0.5), end = new THREE.Vector3(tx + jitter(0.4), 0.09, tz - 0.9 + jitter(0.2));
        twig.push([base, end]);
        for (let t = 0.15; t < 1; t += 0.07) for (const side of [-1, 1]) {
          const at = base.clone().lerp(end, t);
          twig.push([at, at.clone().add(new THREE.Vector3(side * 0.16, 0.08, -0.08))]);
        }
      }
      put(strands(twig, 0.022, green, 4));
    } else if (a.tribute === 'comb') {
      const horn = new THREE.MeshStandardMaterial({ color: '#e0d2a8', roughness: 0.6 });
      const comb = put(new THREE.Group());
      const spine = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.07, 0.22), horn);
      spine.castShadow = true;
      comb.add(spine);
      for (let i = 0; i < 16; i++) {
        if (random() < mood.wear * 0.4) continue;
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.32), horn);
        tooth.position.set(-0.46 + i * 0.061, 0, 0.26);
        comb.add(tooth);
      }
      comb.position.set(tx, 0.04, tz);
      comb.rotation.y = 0.5 + jitter(0.3);
    } else if (a.tribute === 'candle') {
      const wax = new THREE.MeshStandardMaterial({ color: '#efe6c8', roughness: 0.6, emissive: '#7a5a20', emissiveIntensity: 0.35 });
      const tall = mix(0.25, 0.8, random());
      mesh(new THREE.CylinderGeometry(0.16, 0.18, tall, 12), wax, [tx, tall / 2, tz]);
      mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.05, 12), wax, [tx, 0.025, tz]);
      flame = mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb23a', emissiveIntensity: 2.2 }), [tx, tall + 0.2, tz]);
      flame.scale.set(0.08, 0.2, 0.08);
      flame.castShadow = false;
    } else if (a.tribute === 'rosary') {
      const bead = new THREE.SphereGeometry(0.055, 8, 6);
      const woodBead = new THREE.MeshStandardMaterial({ color: '#4a2f1c', roughness: 0.6 });
      const n = 34;
      const beads = new THREE.InstancedMesh(bead, woodBead, n + 5);
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2;
        matrix.makeTranslation(tx + 0.1 + Math.cos(angle) * 0.55, 0.055, tz + 0.2 + Math.sin(angle) * 0.42 + Math.sin(angle * 3) * 0.05);
        beads.setMatrixAt(i, matrix);
      }
      for (let i = 0; i < 5; i++) { matrix.makeTranslation(tx + 0.1 + i * 0.03, 0.055, tz + 0.66 + i * 0.12); beads.setMatrixAt(n + i, matrix); }
      beads.castShadow = true;
      put(beads);
      mesh(new THREE.BoxGeometry(0.06, 0.04, 0.36), woodBead, [tx + 0.25, 0.04, tz + 1.4]);
      mesh(new THREE.BoxGeometry(0.22, 0.04, 0.06), woodBead, [tx + 0.25, 0.04, tz + 1.32]);
    } else if (a.tribute === 'coins') {
      const n = 3 + Math.floor(random() * 4 + mood.density * 4);
      for (let i = 0; i < n; i++) {
        const coin = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.025, 12), i % 3 === 0 ? gold : new THREE.MeshStandardMaterial({ color: '#9a6a3c', metalness: 0.7, roughness: 0.45 }), [tx + jitter(0.45), 0.02 + (i % 2) * 0.02, tz + jitter(0.45)]);
        coin.rotation.x = jitter(0.15);
      }
    }

    const flicker = mix(1.5, 9, mood.energy);
    return s.finish({
      update: flame ? (_dt, time) => {
        const f = 1 + Math.sin(time * flicker) * 0.12 + Math.sin(time * flicker * 2.7) * 0.07;
        flame!.scale.set(0.08 * (2 - f), 0.2 * f, 0.08 * (2 - f));
      } : undefined,
    });
  },
});
