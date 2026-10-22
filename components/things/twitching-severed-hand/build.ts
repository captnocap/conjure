import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type Curl = [number, number, number];
interface Pose { fingers: [Curl, Curl, Curl, Curl]; thumb: [number, number, number]; turn: [number, number, number]; spread: number }

const POSES: Record<string, Pose> = {
  limp: { fingers: [[0.25, 0.45, 0.3], [0.35, 0.55, 0.35], [0.45, 0.65, 0.4], [0.55, 0.7, 0.4]], thumb: [-0.6, 0.2, 0.3], turn: [Math.PI, -0.5, 0], spread: 1 },
  pointing: { fingers: [[0.02, 0.03, 0.02], [1.45, 1.7, 1.1], [1.5, 1.7, 1.1], [1.5, 1.7, 1.1]], thumb: [-0.35, 0.5, 0.9], turn: [0.25, -0.45, 0], spread: 0.4 },
  crawling: { fingers: [[-0.55, 1.05, 0.55], [-0.75, 1.15, 0.6], [-0.45, 1.0, 0.55], [-0.7, 1.1, 0.6]], thumb: [-1.0, 0.25, 0.5], turn: [0, -0.55, -0.42], spread: 2.4 },
  clutching: { fingers: [[0.95, 1.1, 0.7], [1.0, 1.15, 0.75], [1.05, 1.2, 0.8], [1.1, 1.25, 0.8]], thumb: [-0.95, 0.55, 0.6], turn: [Math.PI, -0.5, 0], spread: 0.6 },
  thumbsup: { fingers: [[1.5, 1.7, 1.0], [1.5, 1.7, 1.0], [1.5, 1.7, 1.0], [1.5, 1.7, 1.0]], thumb: [-1.5, -0.25, -0.1], turn: [-Math.PI / 2, -0.35, 0], spread: 0.2 },
  drumming: { fingers: [[-0.1, 0.55, 0.45], [0.2, 0.5, 0.4], [-0.25, 0.6, 0.45], [0.15, 0.5, 0.4]], thumb: [-0.8, 0.1, 0.2], turn: [0, -0.5, -0.12], spread: 1.5 },
};

export default defineThing({
  questions: {
    pose: choice('What is the hand doing?', {
      limp: 'Lying limp on its back, fingers softly curled.',
      pointing: 'Pointing, one finger out, at something or someone.',
      crawling: 'Up on its fingertips like a spider, mid-crawl.',
      clutching: 'Palm up, fingers closed tight around something.',
      thumbsup: 'A fist on its side giving a thumbs up.',
      drumming: 'Palm down, fingers arched, drumming impatiently.',
    }),
    item: choice('What does it hold or wear?', {
      nothing: 'Nothing.',
      ring: 'A gold wedding ring.',
      watch: 'A wristwatch, still ticking.',
      photo: 'A torn photograph.',
      scalpel: 'A scalpel.',
      key: 'A brass key on a paper tag.',
    }),
    skin: choice('What tone has the skin taken?', {
      fresh: 'Fresh and pale, as if only asleep.',
      grey: 'Putty grey.',
      green: 'Greenish, well on its way.',
      purple: 'Mottled purple and blue.',
      waxy: 'Waxy yellow, like a candle.',
    }),
    cut: choice('How does it end at the wrist?', {
      clean: 'A clean surgical cut showing two neat circles of bone.',
      ragged: 'Ragged and torn, with a splinter of bone.',
      stitched: 'A rounded stump, sewn shut with black thread.',
      cuff: 'Inside the cut-off cuff of a white shirt sleeve.',
    }),
    moves: noul('Has it been moving: dragged smears across the tray, pushed up against the rim?'),
    tray: choice('What is it lying on?', {
      steel: 'A rimmed stainless instrument tray.',
      cloth: 'A steel tray lined with a green surgical cloth.',
      evidence: 'A steel tray with a numbered yellow evidence marker.',
      ice: 'A tray packed with crushed ice.',
    }),
    nails: choice('What are the fingernails like?', {
      plain: 'Short and plain.',
      red: 'Long and painted red.',
      black: 'Bruised black.',
      dirty: 'Broken, with earth under them.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pose = POSES[a.pose];
    const tone = new THREE.Color({ fresh: '#dcc0ab', grey: '#a9aca4', green: '#97a77f', purple: '#9a86a6', waxy: '#dccb8f' }[a.skin]);
    const skinM = s.material(tone, { roughness: 0.65 });
    const creaseM = s.material(tone.clone().multiplyScalar(0.72));
    const nailM = s.material({ plain: '#e6dccb', red: '#b3202b', black: '#2a2430', dirty: '#6d5f48' }[a.nails], { roughness: 0.35 });
    const steel = s.material('#c4cbce', { metalness: 0.8, roughness: 0.3 });
    const blood = s.material('#761820', { roughness: 0.4 });
    const bone = s.material('#ece4cc');

    // Tray.
    const TW = 0.36, TD = 0.26, TY = 0.016;
    s.box([TW, 0.006, TD], [0, 0.003, 0], steel);
    for (const [w, d, x, z] of [[TW, 0.008, 0, TD / 2], [TW, 0.008, 0, -TD / 2], [0.008, TD, TW / 2, 0], [0.008, TD, -TW / 2, 0]] as const) s.box([w, TY, d], [x, TY / 2, z], steel);
    let floor = 0.006;
    if (a.tray === 'cloth') { s.box([TW - 0.02, 0.004, TD - 0.02], [0, 0.008, 0], s.material('#5f9a86', { roughness: 0.95 })); floor = 0.01; }
    if (a.tray === 'ice') {
      const ice = new THREE.MeshStandardMaterial({ color: '#e4f2f6', roughness: 0.2 });
      s.box([TW - 0.02, 0.012, TD - 0.02], [0, 0.012, 0], ice);
      s.scatter(new THREE.IcosahedronGeometry(1, 0), ice, Array.from({ length: 110 }, () => ({ at: [(random() - 0.5) * (TW - 0.04), 0.018 + random() * 0.004, (random() - 0.5) * (TD - 0.04)] as [number, number, number], size: 0.006 + random() * 0.007 })));
      floor = 0.02;
    }

    // The hand, built with the wrist at the origin, fingers along +x, palm facing -y.
    const hand = new THREE.Group();
    const add = (parent: THREE.Object3D, mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };
    const bar = (parent: THREE.Object3D, length: number, r0: number, r1: number) => {
      const m = add(parent, new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, length, 10), skinM));
      m.rotation.z = -Math.PI / 2; m.position.x = length / 2;
      add(parent, new THREE.Mesh(new THREE.SphereGeometry(r1, 10, 8), skinM)).position.x = length;
      add(parent, new THREE.Mesh(new THREE.SphereGeometry(r0 * 1.06, 10, 8), skinM));
    };
    const palm = add(hand, new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), skinM));
    palm.scale.set(0.054, 0.0155, 0.044); palm.position.set(0.05, 0, 0);
    const heel = add(hand, new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), skinM));
    heel.scale.set(0.03, 0.016, 0.022); heel.position.set(0.03, -0.005, 0.022);
    const edge = add(hand, new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), skinM));
    edge.scale.set(0.04, 0.014, 0.014); edge.position.set(0.045, -0.003, -0.03);
    const wrist = add(hand, new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.06, 18), skinM));
    wrist.rotation.z = Math.PI / 2; wrist.scale.set(0.017, 1, 0.029); wrist.position.set(-0.022, 0, 0);
    for (const z of [-0.012, 0.004, 0.02]) {
      const tendon = add(hand, new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.06, 6), skinM));
      tendon.rotation.z = Math.PI / 2; tendon.rotation.y = z * 8; tendon.position.set(0.05, 0.0135, z);
    }

    const LEN: Curl[] = [[0.046, 0.027, 0.023], [0.051, 0.031, 0.024], [0.047, 0.029, 0.023], [0.037, 0.021, 0.02]];
    const ROOT: [number, number][] = [[0.094, 0.031], [0.1, 0.011], [0.095, -0.01], [0.085, -0.029]];
    const SPLAY = [0.09, 0.02, -0.05, -0.13];
    const joints: { node: THREE.Group; rest: number; finger: number }[] = [];
    const finger = (index: number, lengths: number[], curls: number[], base: THREE.Vector3, yaw: number, radius: number, thumb = false) => {
      let parent: THREE.Object3D = new THREE.Group();
      parent.position.copy(base); parent.rotation.y = yaw;
      hand.add(parent);
      if (thumb) { const roll = new THREE.Group(); roll.rotation.x = -0.9; parent.add(roll); parent = roll; }
      lengths.forEach((length, k) => {
        const joint = new THREE.Group();
        joint.rotation.z = -curls[k];
        parent.add(joint);
        joints.push({ node: joint, rest: -curls[k], finger: index });
        const r0 = radius * (1 - k * 0.1), r1 = radius * (0.9 - k * 0.1);
        bar(joint, length, r0, r1);
        if (k === lengths.length - 1) {
          const nail = add(joint, new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), nailM));
          const long = a.nails === 'red' ? 1.5 : 1;
          nail.scale.set(0.0085 * long, 0.002, r1 * 0.82); nail.position.set(length * 0.62 + (long - 1) * 0.004, r1 * 0.82, 0);
        } else {
          const crease = add(joint, new THREE.Mesh(new THREE.TorusGeometry(r1 * 1.02, 0.0008, 4, 12), creaseM));
          crease.rotation.y = Math.PI / 2; crease.position.x = length;
        }
        const next = new THREE.Group(); next.position.x = length; joint.add(next); parent = next;
      });
    };
    for (let i = 0; i < 4; i++) finger(i, LEN[i], pose.fingers[i], new THREE.Vector3(ROOT[i][0], 0, ROOT[i][1]), SPLAY[i] * pose.spread, 0.0092 - i * 0.0005 + (i === 0 ? 0.0003 : 0));
    finger(4, [0.04, 0.03], [pose.thumb[1], pose.thumb[2]], new THREE.Vector3(0.03, -0.004, 0.034), pose.thumb[0], 0.0108, true);

    // The end at the wrist.
    const end = -0.052;
    const oval = (r: number, depth: number, material: THREE.Material, x: number) => {
      const m = add(hand, new THREE.Mesh(new THREE.CylinderGeometry(1, 1, depth, 18), material));
      m.rotation.z = Math.PI / 2; m.scale.set(0.017 * r, 1, 0.029 * r); m.position.set(x, 0, 0); return m;
    };
    if (a.cut === 'clean') {
      oval(0.96, 0.002, blood, end - 0.0005);
      for (const z of [-0.012, 0.011]) { const b = add(hand, new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.004, 12), bone)); b.rotation.z = Math.PI / 2; b.position.set(end - 0.002, 0, z); }
    } else if (a.cut === 'ragged') {
      oval(0.9, 0.004, blood, end);
      for (let i = 0; i < 11; i++) {
        const ang = (i / 11) * Math.PI * 2;
        const flap = add(hand, new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.012 + random() * 0.022, 5), i % 3 ? skinM : blood));
        flap.rotation.z = Math.PI / 2 + (random() - 0.5) * 0.6; flap.position.set(end - 0.008, Math.sin(ang) * 0.013, Math.cos(ang) * 0.024);
      }
      const shard = add(hand, new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.04, 5), bone));
      shard.rotation.z = Math.PI / 2 + 0.15; shard.position.set(end - 0.018, 0.002, 0.008);
    } else if (a.cut === 'stitched') {
      const cap = add(hand, new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), skinM));
      cap.scale.set(0.016, 0.017, 0.029); cap.position.set(end, 0, 0);
      const thread = s.material('#17171a');
      for (let i = -2; i <= 2; i++) for (const tilt of [0.7, -0.7]) {
        const x = add(hand, new THREE.Mesh(new THREE.BoxGeometry(0.0016, 0.012, 0.0016), thread));
        x.position.set(end - 0.0158 * Math.sqrt(1 - (i * 0.011 / 0.03) ** 2), 0, i * 0.011); x.rotation.x = tilt;
      }
    } else {
      oval(0.9, 0.003, blood, end);
      const cuff = oval(1.32, 0.045, s.material('#f2f0ea', { roughness: 0.9 }), end + 0.012);
      cuff.castShadow = true;
      const link = add(hand, new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), s.material('#d6b54a', { metalness: 0.8, roughness: 0.3 })));
      link.position.set(end + 0.012, 0.012, 0.035);
      oval(1.42, 0.02, s.material('#2b2f3a', { roughness: 0.9 }), end - 0.004);
    }

    // Worn items travel with the hand.
    const gold = s.material('#e0b93f', { metalness: 0.85, roughness: 0.25, emissive: '#5a4208', emissiveIntensity: 0.35 });
    if (a.item === 'ring') {
      const host = joints.find((j) => j.finger === 2)!.node;
      const ring = add(host, new THREE.Mesh(new THREE.TorusGeometry(0.0098, 0.0022, 8, 20), gold));
      ring.rotation.y = Math.PI / 2; ring.position.x = 0.018;
    } else if (a.item === 'watch') {
      oval(1.12, 0.016, s.material('#3a2a1e', { roughness: 0.7 }), -0.028);
      const face = add(hand, new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.006, 20), gold));
      face.position.set(-0.028, 0.02, 0);
      const dial = add(hand, new THREE.Mesh(new THREE.CylinderGeometry(0.0145, 0.0145, 0.0065, 20), s.material('#f3f0e2')));
      dial.position.set(-0.028, 0.0202, 0);
      for (const [len, ang] of [[0.011, random() * 6.28], [0.008, random() * 6.28]] as const) {
        const handM = add(hand, new THREE.Mesh(new THREE.BoxGeometry(len, 0.001, 0.0012), s.material('#111111')));
        handM.position.set(-0.028 + Math.cos(ang) * len / 2, 0.0238, Math.sin(ang) * len / 2); handM.rotation.y = -ang;
      }
    }

    // Pose it, drop it onto the tray, and push it to the rim if it has been travelling.
    const holder = new THREE.Group();
    holder.add(hand);
    hand.rotation.order = 'YZX';
    hand.rotation.set(pose.turn[0], pose.turn[1] + (random() - 0.5) * 0.3, pose.turn[2]);
    hand.position.set(-0.03, 0, 0.02);
    s.root.add(holder);
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(hand);
    hand.position.y += floor - box.min.y;
    const centre = box.getCenter(new THREE.Vector3());
    hand.position.x -= centre.x; hand.position.z -= centre.z;
    if (a.moves) {
      const dx = 0.05 + random() * 0.03, dz = 0.03;
      holder.position.set(dx, 0, dz);
      holder.rotation.y = -0.25;
      const smear = new THREE.MeshStandardMaterial({ color: a.cut === 'stitched' ? '#6b6f70' : '#7a2026', transparent: true, opacity: 0.55, roughness: 0.4, depthWrite: false });
      for (let i = 0; i < 4; i++) {
        const z0 = -0.03 + i * 0.018 + (random() - 0.5) * 0.01;
        const len = 0.11 + random() * 0.07;
        const streak = s.box([len, 0.0006, 0.004 + random() * 0.004], [-TW / 2 + 0.03 + len / 2, floor + 0.0006, z0 - 0.03], smear);
        streak.rotation.y = 0.18 + (random() - 0.5) * 0.12; streak.castShadow = false;
      }
    }

    // Loose items, and what it clutches.
    const loose = new THREE.Group();
    const inPalm = a.pose === 'clutching';
    if (a.item === 'photo') {
      const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 160;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#efe6d2'; ctx.fillRect(0, 0, 128, 160);
      ctx.fillStyle = '#8a7a66'; ctx.fillRect(10, 10, 108, 120);
      ctx.fillStyle = '#d8c6a8'; ctx.beginPath(); ctx.arc(50, 60, 22, 0, 6.3); ctx.fill(); ctx.fillRect(22, 84, 56, 46);
      ctx.fillStyle = '#efe6d2'; ctx.beginPath(); ctx.moveTo(128, 0); ctx.lineTo(70, 0); ctx.lineTo(96, 50); ctx.lineTo(84, 90); ctx.lineTo(112, 160); ctx.lineTo(128, 160); ctx.fill();
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const photo = add(loose, new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.075), new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, roughness: 0.8 })));
      photo.rotation.set(-Math.PI / 2 + (inPalm ? 0.5 : 0.04), 0, 0.4);
    } else if (a.item === 'scalpel') {
      const handle = add(loose, new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.003, 0.008), steel));
      const blade = add(loose, new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.035, 3), steel));
      blade.rotation.z = -Math.PI / 2; blade.scale.z = 0.25; blade.position.x = 0.062;
      void handle;
      loose.rotation.y = 0.3; loose.rotation.z = inPalm ? 0.2 : 0;
    } else if (a.item === 'key') {
      const brass = s.material('#b88d3a', { metalness: 0.8, roughness: 0.35 });
      const bow = add(loose, new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.0028, 6, 16), brass)); bow.rotation.x = Math.PI / 2;
      add(loose, new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.003, 0.004), brass)).position.x = 0.028;
      add(loose, new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.003, 0.009), brass)).position.set(0.045, 0, 0.005);
      const tag = s.label(String(100 + Math.floor(random() * 220)), 0.032, 0.018, [0, 0, 0], '#27303a', '#e8dcb8');
      loose.add(tag); tag.rotation.x = -Math.PI / 2; tag.position.set(-0.03, 0.001, 0.012); tag.rotation.z = 0.5;
    }
    if (loose.children.length) {
      if (inPalm) { hand.add(loose); loose.position.set(0.062, -0.022, 0); loose.rotation.x += Math.PI; }
      else { s.root.add(loose); loose.position.set(a.moves ? -0.07 : 0.085, floor + 0.004, a.moves ? 0.08 : 0.085); loose.rotation.y += random() * 0.8; }
    }
    if (a.tray === 'evidence') {
      const marker = s.material('#f0cf2e', { roughness: 0.6 });
      const tent = s.mesh(new THREE.CylinderGeometry(0.001, 0.03, 0.05, 4, 1), marker, [-0.135, floor + 0.025, -0.09]);
      tent.scale.z = 0.5; tent.rotation.y = Math.PI / 4 + 0.3;
      const num = s.label(String(1 + Math.floor(random() * 9)), 0.026, 0.03, [-0.132, floor + 0.022, -0.078], '#111111', '#f0cf2e');
      num.rotation.set(-0.42, 0.3, 0);
    }
    if (a.cut !== 'stitched' && mood.cheer < 0.7) {
      const pool = new THREE.Vector3(end, 0, 0).applyMatrix4(hand.matrixWorld.clone());
      hand.updateMatrixWorld(true);
      pool.set(end, 0, 0).applyMatrix4(hand.matrixWorld);
      if (pool.y < floor + 0.05) s.ball([0.022 + (1 - mood.cheer) * 0.02, 0.0012, 0.018 + random() * 0.012], [pool.x, floor + 0.001, pool.z], blood, 12);
    }

    const energy = mood.energy, lively = a.moves ? 1 : 0.35;
    const baseY = holder.position.y;
    return s.finish({
      update: (_dt, time) => {
        const speed = mix(1.2, 11, energy);
        for (const j of joints) {
          if (j.finger === 4) continue;
          const tap = Math.max(0, Math.sin(time * speed - j.finger * 0.9));
          j.node.rotation.z = j.rest + tap * tap * mix(0.03, 0.3, energy) * lively * (a.pose === 'clutching' ? 0.3 : 1);
        }
        if (a.moves && a.pose === 'crawling') holder.position.y = baseY + Math.abs(Math.sin(time * speed * 0.5)) * 0.004 * energy;
      },
    });
  },
});
