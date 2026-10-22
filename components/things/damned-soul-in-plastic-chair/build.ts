import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, type FigureStyle, mix } from '@conjure/kit';

type P = [number, number, number];

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineThing({
  questions: {
    pose: choice('How are they sitting?', {
      slumped: 'Slumped right down in the chair, chin on chest, arms hanging.',
      hands: 'Bent forward with their head in their hands.',
      ceiling: 'Leaning back, staring at the ceiling, arms dangling.',
      upright: 'Sitting up straight and patient, ticket held up ready, as if their number might come.',
      asleep: 'Asleep, head tipped onto one shoulder, arms folded.',
    }),
    outfit: choice('What are they wearing?', {
      gown: 'A pale blue hospital gown, bare legs and paper slippers.',
      suit: 'A dark suit, as if they came straight from the office or the funeral.',
      pyjamas: 'Striped pyjamas and slippers.',
      toga: 'A white toga and sandals, here a very long time.',
      tracksuit: 'A green tracksuit and white trainers.',
    }),
    ticket: choice('What about their ticket?', {
      small: 'A small pink paper ticket in one hand.',
      enormous: 'A huge card on their lap with an enormous number on it, readable from across the room.',
      strip: 'A long strip of tickets trailing from their hand to the floor; they took several, just in case.',
      none: 'Hands empty. They lost it, or never got one.',
    }),
    above: choice('What hovers above their head?', {
      nothing: 'Nothing.',
      smoke: 'A thin curl of grey smoke.',
      halo: 'A tarnished halo ring, slightly askew, still technically on.',
      both: 'A halo, and smoke coming off it.',
    }),
    flame: choice('Is anything burning?', {
      none: 'No.',
      shoulder: 'A small steady flame on one shoulder, which they have stopped noticing.',
      both: 'A little flame on each shoulder.',
      feet: 'Flames licking up from under the chair.',
    }),
    bag: choice('What is at their feet?', {
      nothing: 'Nothing.',
      plastic: 'A white plastic carrier bag of belongings.',
      suitcase: 'A small battered suitcase.',
      box: 'A banker\'s box with a lid, labelled PERSONAL EFFECTS.',
      urn: 'A small brass urn, which they keep glancing at.',
    }),
    style: choice('What kind of figure is it?', {
      person: 'A simplified clothed person with two dot eyes.',
      mannequin: 'A jointed wooden artist mannequin, faceless.',
      silhouette: 'A flat dark silhouette, a cut-out against the light.',
      toy: 'A blocky toy figure with square limbs.',
    }),
    head: choice('What is on their head?', {
      short: 'Short hair.',
      long: 'Long hair hanging down.',
      bun: 'Hair in a tired bun.',
      none: 'Bald.',
      hood: 'A hood pulled up.',
      cap: 'A baseball cap.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = 1.55 + random() * 0.3;
    const style: FigureStyle = ({ person: 'doll', mannequin: 'mannequin', silhouette: 'silhouette', toy: 'blocky' } as const)[a.style];
    const skin = ['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0', '#9a6b4b', '#c9c2c0'][Math.floor(random() * 6)];
    const outfit = {
      gown: { top: '#bcd5e3', bottom: skin, shoes: '#9fb0bd', sleeves: 'short' as const },
      suit: { top: '#2b2d36', bottom: '#2b2d36', shoes: '#1a1a1c', sleeves: 'long' as const },
      pyjamas: { top: '#a9c0e6', bottom: '#a9c0e6', shoes: '#6b4a3a', sleeves: 'long' as const },
      toga: { top: '#efe8d8', bottom: '#efe8d8', shoes: '#a07a50', sleeves: 'short' as const },
      tracksuit: { top: '#3d8f4d', bottom: '#3d8f4d', shoes: '#f2f2f2', sleeves: 'long' as const },
    }[a.outfit];
    const mirror = random() < 0.5;
    const person = figure(s, {
      height: H, style, skin, hair: a.head, mirror,
      pose: a.pose === 'slumped' ? 'slumped' : 'sitting',
      gaze: a.pose === 'ceiling' ? 'up' : a.pose === 'upright' ? 'ahead' : 'down',
      hairColor: ['#3b2a22', '#1d1a18', '#8a6a3a', '#c9c2b8', '#6a2a1a'][Math.floor(random() * 5)],
      ...outfit,
    });
    const { joints } = person;
    const RAD = Math.PI / 180;
    if (a.pose === 'hands') {
      // Elbows on the knees, forearms up, hands meeting at the lowered face.
      joints.spine.rotation.x = 0.7;
      joints.neck.rotation.x = 0.55;
      for (const side of ['left', 'right'] as const) {
        const sign = side === 'left' ? 1 : -1;
        joints.shoulders[side].rotation.x = -78 * RAD;
        joints.shoulders[side].rotation.z = sign * 12 * RAD;
        joints.elbows[side].rotation.x = -142 * RAD;
        joints.elbows[side].rotation.y = sign * 48 * RAD;
      }
    } else if (a.pose === 'ceiling') {
      joints.spine.rotation.x = -0.22;
      joints.neck.rotation.x = -0.75;
      for (const side of ['left', 'right'] as const) {
        const sign = side === 'left' ? 1 : -1;
        joints.shoulders[side].rotation.x = 6 * RAD;
        joints.shoulders[side].rotation.z = sign * 22 * RAD;
        joints.elbows[side].rotation.x = -8 * RAD;
      }
    } else if (a.pose === 'upright') {
      const hand = mirror ? 'left' : 'right';
      const sign = hand === 'left' ? 1 : -1;
      joints.shoulders[hand].rotation.x = -40 * RAD;
      joints.elbows[hand].rotation.x = -100 * RAD;
      joints.elbows[hand].rotation.y = sign * 20 * RAD;
    } else if (a.pose === 'asleep') {
      joints.neck.rotation.z = (mirror ? -1 : 1) * 0.55;
      joints.neck.rotation.x = 0.3;
      joints.spine.rotation.x = 0.12;
      for (const side of ['left', 'right'] as const) {
        const sign = side === 'left' ? 1 : -1;
        joints.shoulders[side].rotation.x = -35 * RAD;
        joints.shoulders[side].rotation.z = -sign * 4 * RAD;
        joints.elbows[side].rotation.x = -118 * RAD;
        joints.elbows[side].rotation.y = sign * 72 * RAD;
      }
    }
    person.settle();
    s.root.add(person.root);
    person.root.updateMatrixWorld(true);
    const hips = person.pelvis.getWorldPosition(new THREE.Vector3());
    const headAt = person.head.getWorldPosition(new THREE.Vector3());
    const headR = H * 0.064;
    const k = H / 1.7;

    // ---- The chair, bolted to the floor ----
    const plasticTint = ['#d9802d', '#c7bca0', '#3d7f86', '#8a3d3d', '#6f7d86'][Math.floor(random() * 5)];
    const plastic = s.material(plasticTint, { roughness: 0.45 });
    const steel = s.material('#8e9397', { metalness: 0.7, roughness: 0.4 });
    const seatTop = Math.max(0.2, person.hipHeight - 0.085 * k);
    const cx = hips.x, cz = hips.z;
    const seat = s.box([0.46, 0.035, 0.44], [cx, seatTop - 0.0175, cz + 0.1], plastic);
    void seat;
    const back = s.box([0.46, 0.42, 0.035], [cx, seatTop + 0.22, cz - 0.14], plastic);
    back.rotation.x = -0.16;
    s.box([0.46, 0.07, 0.07], [cx, seatTop - 0.02, cz - 0.13], plastic);
    for (const x of [-1, 1]) s.box([0.035, 0.1, 0.3], [cx + x * 0.2125, seatTop + 0.03, cz + 0.02], plastic);
    // Beam, legs, floor plates and bolts.
    s.box([0.7, 0.04, 0.05], [cx, seatTop - 0.07, cz + 0.08], steel);
    for (const x of [-0.3, 0.3]) {
      s.rod([cx + x, seatTop - 0.07, cz + 0.08], [cx + x, 0.015, cz + 0.08], 0.014, steel);
      s.box([0.1, 0.015, 0.22], [cx + x, 0.0075, cz + 0.08], steel);
      for (const z of [-0.08, 0.08]) s.cylinder(0.012, 0.012, 0.012, [cx + x, 0.02, cz + 0.08 + z], s.material('#4a4d50', { metalness: 0.8 }), 8);
    }

    // ---- Ticket ----
    const hand = mirror ? person.hands.left : person.hands.right;
    const paper = new THREE.Color('#f5c6d4').lerp(new THREE.Color('#d6c59c'), mood.wear * 0.5);
    const number = 1_000_000 + Math.floor(random() * 8_999_999);
    const ticketMap = (big: boolean) => paint(big ? 384 : 128, big ? 512 : 160, (c, w, h) => {
      c.fillStyle = `#${paper.getHexString()}`; c.fillRect(0, 0, w, h);
      c.fillStyle = '#2b2530'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `bold ${big ? 30 : 13}px sans-serif`; c.fillText('YOUR NUMBER', w / 2, h * 0.14);
      const text = String(number);
      c.font = `bold ${big ? 96 : 40}px monospace`;
      if (big) { c.fillText(text.slice(0, 4), w / 2, h * 0.42); c.fillText(text.slice(4), w / 2, h * 0.62); }
      else c.fillText(text.slice(-3), w / 2, h * 0.55);
      c.font = `${big ? 24 : 11}px sans-serif`; c.fillText('please wait', w / 2, h * 0.86);
      c.setLineDash([6, 6]); c.strokeStyle = '#2b2530'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 3); c.lineTo(w, 3); c.stroke();
    });
    if (a.ticket === 'small' || a.ticket === 'strip') {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.07 * k, 0.09 * k), new THREE.MeshStandardMaterial({ map: ticketMap(false), side: THREE.DoubleSide, roughness: 0.9 }));
      leaf.position.set(0, -0.02 * k, 0.03 * k);
      leaf.rotation.x = -0.4;
      leaf.castShadow = true;
      hand.add(leaf);
      if (a.ticket === 'strip') {
        person.root.updateMatrixWorld(true);
        const from = hand.getWorldPosition(new THREE.Vector3());
        const pts: P[] = [[from.x, from.y - 0.04, from.z + 0.03], [from.x + 0.02, Math.max(0.3, from.y * 0.55), from.z + 0.12], [from.x + 0.05, 0.02, from.z + 0.22], [from.x + 0.15, 0.01, from.z + 0.3]];
        const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
        const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
        const segments = 40;
        for (let i = 0; i <= segments; i++) {
          const p = curve.getPointAt(i / segments);
          positions.push(p.x - 0.035, p.y, p.z, p.x + 0.035, p.y, p.z);
          uvs.push(0, (i / segments) * 6, 1, (i / segments) * 6);
          if (i < segments) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        const map = ticketMap(false); map.wrapT = THREE.RepeatWrapping;
        s.mesh(geometry, new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.9 }));
      }
    } else if (a.ticket === 'enormous') {
      const card = s.mesh(new THREE.PlaneGeometry(0.34 * k, 0.45 * k), new THREE.MeshStandardMaterial({ map: ticketMap(true), side: THREE.DoubleSide, roughness: 0.9 }), [cx, seatTop + 0.24 * k, cz + 0.2 * k]);
      card.rotation.x = -0.35;
      const backing = s.box([0.34 * k, 0.45 * k, 0.004], [cx, seatTop + 0.24 * k, cz + 0.2 * k - 0.003], s.material('#e9e3d2'));
      backing.rotation.x = -0.35;
    }

    // ---- Fire, smoke, halo ----
    const flames: THREE.Group[] = [];
    const flameAt = (at: P, size: number) => {
      const group = new THREE.Group();
      group.position.set(...at);
      const outer = new THREE.MeshStandardMaterial({ color: '#ff7a1a', emissive: '#ff5a10', emissiveIntensity: 1.6, transparent: true, opacity: 0.85, depthWrite: false });
      const inner = new THREE.MeshStandardMaterial({ color: '#ffe27a', emissive: '#ffd24a', emissiveIntensity: 2.2 });
      const o = s.mesh(new THREE.ConeGeometry(0.4, 1, 10), outer, [0, 0.5, 0]); o.castShadow = false;
      const i = s.mesh(new THREE.ConeGeometry(0.2, 0.6, 8), inner, [0, 0.3, 0]); i.castShadow = false;
      const glow = s.mesh(new THREE.SphereGeometry(0.7, 10, 8), new THREE.MeshBasicMaterial({ color: '#ff8a2a', transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }), [0, 0.35, 0]); glow.castShadow = false;
      group.add(o, i, glow);
      group.scale.setScalar(size);
      group.userData.size = size;
      s.root.add(group);
      flames.push(group);
    };
    if (a.flame === 'shoulder' || a.flame === 'both') {
      const sides = a.flame === 'both' ? (['left', 'right'] as const) : ([mirror ? 'right' : 'left'] as const);
      for (const side of sides) {
        const at = joints.shoulders[side].getWorldPosition(new THREE.Vector3());
        flameAt([at.x, at.y + 0.02 * k, at.z], 0.14 * k);
      }
    }
    if (a.flame === 'feet') {
      for (let i = 0; i < 6; i++) flameAt([cx + (random() - 0.5) * 0.5, 0, cz + 0.05 + (random() - 0.5) * 0.4], 0.14 + random() * 0.14);
    }
    const smoke: THREE.Mesh[] = [];
    if (a.above === 'smoke' || a.above === 'both') {
      const grey = new THREE.MeshStandardMaterial({ color: '#8a8a8e', transparent: true, opacity: 0.45, depthWrite: false });
      for (let i = 0; i < 6; i++) {
        const puff = s.ball([0.03, 0.03, 0.03], [headAt.x, headAt.y + headR * 1.6 + i * 0.08, headAt.z], grey.clone(), 8);
        puff.castShadow = false;
        puff.userData.phase = i / 6;
        smoke.push(puff);
      }
    }
    let halo: THREE.Mesh | null = null;
    if (a.above === 'halo' || a.above === 'both') {
      halo = s.ring(headR * 1.4, headR * 0.16, [headAt.x, headAt.y + headR * 1.9, headAt.z - headR * 0.3], s.material('#c9a24a', { metalness: 0.8, roughness: 0.35, emissive: '#ffd56a', emissiveIntensity: mix(0.2, 0.9, mood.cheer) }));
      halo.rotation.x = Math.PI / 2 + 0.3;
      halo.rotation.z = 0.2;
      halo.castShadow = false;
    }

    // ---- At their feet ----
    const side = mirror ? -1 : 1;
    const bx = cx + side * 0.36, bz = cz + 0.3;
    if (a.bag === 'plastic') {
      const white = s.material('#f2f2ee', { roughness: 0.6 });
      const bag = s.ball([0.14, 0.17, 0.11], [bx, 0.16, bz], white, 14); bag.rotation.y = random();
      s.box([0.2, 0.06, 0.12], [bx, 0.03, bz], white);
      for (const dx of [-0.05, 0.05]) s.ring(0.03, 0.006, [bx + dx, 0.34, bz], white).rotation.y = Math.PI / 2;
    } else if (a.bag === 'suitcase') {
      s.box([0.34, 0.26, 0.13], [bx, 0.13, bz], s.material('#5a3a2a', { roughness: 0.6 }));
      s.box([0.35, 0.02, 0.14], [bx, 0.13, bz], s.material('#2b1d16'));
      s.box([0.12, 0.03, 0.03], [bx, 0.275, bz], s.material('#2b1d16'));
      for (const dx of [-0.15, 0.15]) s.box([0.03, 0.26, 0.03], [bx + dx, 0.13, bz + 0.07], s.material('#2b1d16'));
    } else if (a.bag === 'box') {
      s.box([0.38, 0.26, 0.3], [bx, 0.13, bz], s.material('#d9cba8', { roughness: 0.9 }));
      s.box([0.4, 0.04, 0.32], [bx, 0.28, bz], s.material('#c9b998', { roughness: 0.9 }));
      s.label('PERSONAL EFFECTS', 0.26, 0.07, [bx, 0.15, bz + 0.151], '#1f1f24', '#f3eee0');
      for (const dx of [-0.19, 0.19]) s.box([0.004, 0.03, 0.12], [bx + dx, 0.17, bz], s.material('#8a7a5a'));
    } else if (a.bag === 'urn') {
      const brass = s.material('#c9a24a', { metalness: 0.85, roughness: 0.3 });
      s.lathe([[0, 0], [0.07, 0], [0.075, 0.015], [0.05, 0.03], [0.045, 0.06], [0.08, 0.12], [0.085, 0.2], [0.07, 0.26], [0.05, 0.28], [0.055, 0.3], [0.03, 0.32], [0.015, 0.34], [0, 0.35]], brass, [bx, 0, bz]);
    }

    const energy = mix(0.5, 2.4, mood.energy);
    const phase = random() * 10;
    return s.finish({
      footprint: 0.45,
      update: (dt, time) => {
        person.update(dt, time);
        const t = time * energy + phase;
        for (const [i, flame] of flames.entries()) {
          const base = flame.userData.size as number;
          flame.scale.set(base * (0.85 + Math.sin(t * 9 + i) * 0.15), base * (0.9 + Math.sin(t * 13 + i * 2) * 0.25), base * (0.85 + Math.cos(t * 11 + i) * 0.15));
          flame.rotation.z = Math.sin(t * 7 + i) * 0.12;
        }
        for (const puff of smoke) {
          const u = (t * 0.12 + (puff.userData.phase as number)) % 1;
          puff.position.set(headAt.x + Math.sin(u * 9 + phase) * 0.05, headAt.y + headR * 1.6 + u * 0.55, headAt.z + Math.cos(u * 7) * 0.03);
          puff.scale.setScalar(0.02 + u * 0.07);
          (puff.material as THREE.MeshStandardMaterial).opacity = 0.45 * (1 - u);
        }
        if (halo) { halo.position.y = headAt.y + headR * 1.9 + Math.sin(t * 1.3) * 0.012; halo.rotation.z = 0.2 + Math.sin(t * 0.7) * 0.08; }
      },
    });
  },
});
