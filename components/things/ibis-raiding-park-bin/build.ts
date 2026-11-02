import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, paint, paintHex } from '@conjure/kit';

type P3 = [number, number, number];

const canvasTexture = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

type Pose = 'probe' | 'sandwich' | 'guard' | 'fight';

export default defineThing({
  questions: {
    doing: choice('What is the ibis doing?', {
      probe: 'Standing on the rim with its head and neck plunged deep inside the bin, tail in the air.',
      sandwich: 'Triumphant on the rim, head high, a stolen sandwich clamped in its bill.',
      guard: 'Standing guard beside the bin, upright and watchful, daring anyone to come closer.',
      fight: 'Two ibises squabbling over the bin, wings half spread and bills jabbing.',
    }),
    lid: paint('What colour is the bin lid?', ['red', 'yellow', 'green', 'purple', 'blue']),
    state: choice('What state is the bin in?', {
      clean: 'A clean new bin, lid propped open, just a little rubbish inside.',
      overflowing: 'Overflowing after a public holiday: bags and boxes heaped above the rim, the lid jammed open.',
      knocked: 'Knocked over on its side, rubbish spilling across the ground.',
    }),
    spilled: choice('What has spilled around it?', {
      chips: 'Chip papers, scattered hot chips and a red sauce sachet.',
      bread: 'Bread crusts, a torn sandwich wrapper and crumbs.',
      cups: 'Paper coffee cups, a squashed can and a plastic bottle.',
      nothing: 'Nothing on the ground: the mess is all inside.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const knocked = a.state === 'knocked';
    const grime = mood.wear;

    // ----- the wheelie bin -----
    const binGroup = new THREE.Group();
    s.root.add(binGroup);
    const add = (mesh: THREE.Object3D, parent: THREE.Object3D) => { s.root.remove(mesh); parent.add(mesh); return mesh; };
    const bodyColour = new THREE.Color('#2f6a3a').lerp(new THREE.Color('#5d6650'), grime * 0.4);
    const body = s.material(bodyColour, { roughness: 0.55, side: THREE.DoubleSide });
    const lidMat = s.material(paintHex(a.lid), { roughness: 0.45 });
    const black = s.material('#1d1e1f', { roughness: 0.7 });
    const H = 0.95;
    const shell = new THREE.CylinderGeometry(0.41, 0.36, H, 4, 1, true).rotateY(Math.PI / 4);
    shell.scale(1, 1, 1.26);
    add(s.mesh(shell, body, [0, 0.06 + H / 2, 0]), binGroup);
    add(s.box([0.5, 0.02, 0.62], [0, 0.07, 0], body), binGroup);
    // Rim, the inside's dark shadow, the handle and wheels at the back.
    add(s.box([0.62, 0.05, 0.06], [0, 1.03, 0.37], body), binGroup);
    add(s.box([0.62, 0.05, 0.06], [0, 1.03, -0.37], body), binGroup);
    for (const sx of [-1, 1]) add(s.box([0.05, 0.05, 0.78], [sx * 0.3, 1.03, 0], body), binGroup);
    add(s.box([0.5, 0.01, 0.6], [0, 0.6, 0], s.material('#151615')), binGroup);
    add(s.rod([-0.25, 1.0, -0.43], [0.25, 1.0, -0.43], 0.018, body), binGroup);
    for (const sx of [-1, 1]) add(s.box([0.04, 0.1, 0.06], [sx * 0.25, 1.0, -0.4], body), binGroup);
    for (const sx of [-1, 1]) {
      const wheel = add(s.cylinder(0.1, 0.1, 0.05, [sx * 0.28, 0.1, -0.33], black, 18), binGroup);
      wheel.rotation.z = Math.PI / 2;
    }
    add(s.rod([-0.3, 0.1, -0.33], [0.3, 0.1, -0.33], 0.012, s.material('#8c8f93', { metalness: 0.6 })), binGroup);
    // A council sticker on the front.
    const sticker = canvasTexture(128, 160, (c) => {
      c.fillStyle = '#f4f2ec'; c.fillRect(0, 0, 128, 160);
      c.fillStyle = paintHex(a.lid); c.fillRect(0, 0, 128, 36);
      c.fillStyle = '#1d1e1f'; c.font = 'bold 18px sans-serif'; c.textAlign = 'center';
      c.fillText(a.lid === 'yellow' ? 'RECYCLE' : a.lid === 'green' ? 'GARDEN' : 'GENERAL', 64, 26);
      c.font = 'bold 15px sans-serif'; c.fillText('CITY OF', 64, 70); c.fillText('SYDNEY', 64, 90);
      c.font = '40px sans-serif'; c.fillText(String(100 + Math.floor(random() * 899)), 64, 140);
      if (grime > 0.3) { c.fillStyle = `rgba(80,70,50,${grime * 0.5})`; for (let k = 0; k < 30; k++) c.fillRect(random() * 128, random() * 160, 6, 3); }
    });
    const front = add(s.mesh(new THREE.PlaneGeometry(0.2, 0.25), new THREE.MeshStandardMaterial({ map: sticker, roughness: 0.6 }), [0, 0.75, 0.397]), binGroup);
    front.rotation.x = -Math.atan2(0.05, H) * 1.26;
    // The lid on its hinge at the back, propped open.
    const lid = new THREE.Group();
    lid.position.set(0, 1.06, -0.4);
    binGroup.add(lid);
    add(s.box([0.64, 0.035, 0.8], [0, 0.0175, 0.4], lidMat), lid);
    add(s.box([0.64, 0.06, 0.03], [0, -0.01, 0.8], lidMat), lid);
    lid.rotation.x = a.state === 'overflowing' ? -1.2 : -1.95;

    // Rubbish inside, heaped when overflowing.
    const bag = s.material('#202124', { roughness: 0.35 });
    const whiteBag = s.material('#e9e6dc', { roughness: 0.5 });
    const heap = a.state === 'overflowing' ? 6 : knocked ? 0 : 2;
    for (let k = 0; k < heap; k++) {
      const r = 0.16 + random() * 0.08;
      add(s.ball([r, r * 0.85, r], [(random() - 0.5) * 0.3, a.state === 'overflowing' ? 0.95 + (k % 3) * 0.12 + random() * 0.05 : 0.8, (random() - 0.5) * 0.35], k % 3 ? bag : whiteBag, 14), binGroup);
    }
    if (a.state === 'overflowing') {
      add(s.box([0.3, 0.2, 0.25], [0.12, 1.32, 0.05], s.material('#c8a77e')), binGroup).rotation.set(0.3, 0.5, 0.2);
      add(s.box([0.24, 0.32, 0.03], [-0.15, 1.28, 0.12], s.material('#f4f2ec')), binGroup).rotation.set(-0.3, 0.2, 0.4);
    }
    if (knocked) {
      binGroup.rotation.z = Math.PI / 2 - 0.08;
      binGroup.position.set(0.47, 0.31, 0);
      lid.rotation.x = -1.2;
    }

    // ----- litter on the ground -----
    const litter: { at: P3; size: number; color: string }[] = [];
    const flats: { at: P3; size: number; color: string }[] = [];
    const spread = knocked ? 1.4 : 0.8;
    const centre = knocked ? -0.7 : 0.2;
    const near = () => [centre + (random() - 0.5) * spread * 1.3, 0, 0.45 + random() * spread * 0.8] as P3;
    if (a.spilled === 'chips' || knocked) {
      for (let k = 0; k < 30; k++) { const p = near(); litter.push({ at: [p[0], 0.008, p[2]], size: 1, color: '#e8c25a' }); }
      for (let k = 0; k < 3; k++) { const p = near(); flats.push({ at: [p[0], 0.003, p[2]], size: 1.6, color: '#f4f2ec' }); }
      const sachet = s.box([0.05, 0.006, 0.035], [centre + 0.25, 0.003, 0.75], s.material('#c8102e', { roughness: 0.3 }));
      sachet.rotation.y = random() * 3;
      s.ball([0.03, 0.004, 0.025], [centre + 0.3, 0.002, 0.78], s.material('#a00d22', { roughness: 0.2 }), 10);
    }
    if (a.spilled === 'bread') {
      for (let k = 0; k < 10; k++) { const p = near(); litter.push({ at: [p[0], 0.01, p[2]], size: 1.6, color: '#c98f4e' }); }
      for (let k = 0; k < 2; k++) { const p = near(); flats.push({ at: [p[0], 0.003, p[2]], size: 1.4, color: '#dfe8ec' }); }
    }
    if (litter.length) s.scatter(new THREE.BoxGeometry(0.06, 0.012, 0.012), s.material('#ffffff', { roughness: 0.8 }), litter);
    if (flats.length) {
      const paper = canvasTexture(64, 64, (c) => { c.fillStyle = '#f4f2ec'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#c8102e'; for (let k = 0; k < 4; k++) c.fillRect(0, k * 16, 64, 6); });
      const mesh = s.scatter(new THREE.BoxGeometry(0.12, 0.004, 0.1), new THREE.MeshStandardMaterial({ map: paper, roughness: 0.9 }), flats);
      mesh.castShadow = false;
    }
    if (a.spilled === 'cups') {
      const cup = s.material('#f4f2ec');
      for (let k = 0; k < 3; k++) { const p = near(); const m = s.cylinder(0.045, 0.032, 0.11, [p[0], 0.045, p[2]], cup, 12); m.rotation.set(Math.PI / 2, 0, random() * 3); }
      const p = near();
      s.cylinder(0.033, 0.033, 0.06, [p[0], 0.033, p[2]], s.material('#c9ccd1', { metalness: 0.6 }), 12).rotation.z = Math.PI / 2;
      const q = near();
      s.lathe([[0.035, 0], [0.035, 0.15], [0.012, 0.2], [0, 0.2]], new THREE.MeshStandardMaterial({ color: '#cfe6ef', transparent: true, opacity: 0.5 }), [q[0], 0.035, q[2]]).rotation.z = Math.PI / 2;
    }

    // ----- the ibis -----
    const white = s.material(new THREE.Color('#f1efe6').lerp(new THREE.Color('#bdb6a2'), grime * 0.5), { roughness: 0.85 });
    const skin = s.material('#1a1a1c', { roughness: 0.5 });
    const legMat = s.material('#2a2726', { roughness: 0.6 });
    const necks: { group: THREE.Group; base: number; phase: number }[] = [];
    const bird = (pose: Pose, at: P3, turn: number, size = 1) => {
      const g = new THREE.Group();
      g.position.set(...at); g.rotation.y = turn; g.scale.setScalar(size);
      s.root.add(g);
      const put = (m: THREE.Object3D, parent: THREE.Object3D = g) => add(m, parent);
      const bodyTilt = pose === 'probe' ? 0.55 : pose === 'guard' ? -0.15 : 0.15;
      const torso = new THREE.Group();
      torso.position.set(0, 0.3, 0);
      torso.rotation.z = -bodyTilt;
      g.add(torso);
      // Body, folded wings with black tips, dangling black tail plumes.
      put(s.lathe([[0, -0.2], [0.07, -0.17], [0.11, -0.08], [0.115, 0.02], [0.095, 0.12], [0.05, 0.19], [0, 0.21]], white), torso).rotation.z = -Math.PI / 2;
      for (const z of [-1, 1]) {
        const wing = put(s.ball([0.17, 0.07, 0.035], [-0.03, 0.03, z * 0.09], white, 14), torso);
        wing.rotation.set(z * 0.15, 0, 0.12);
        if (pose === 'fight') { wing.position.set(-0.02, 0.07, z * 0.13); wing.rotation.set(z * 0.55, 0, 0.2); wing.scale.set(0.17, 0.035, 0.12); }
      }
      for (let k = 0; k < 4; k++) {
        const plume = put(s.ball([0.08, 0.016, 0.02], [-0.21 - k * 0.012, -0.03 - k * 0.012, (k - 1.5) * 0.025], skin, 8), torso);
        plume.rotation.z = -0.5 - k * 0.12;
      }
      // Legs: thighs hidden in the feathers, long dark shanks and splayed toes.
      for (const z of [-1, 1]) {
        const hip = new THREE.Vector3(0.02, 0.24, z * 0.04);
        const knee = new THREE.Vector3(-0.01 + (pose === 'fight' && z > 0 ? 0.06 : 0), 0.13, z * 0.045);
        put(s.rod(hip.toArray() as P3, knee.toArray() as P3, 0.009, legMat));
        put(s.rod(knee.toArray() as P3, [0.01, 0.0, z * 0.05], 0.008, legMat));
        for (const t of [-0.5, 0, 0.5]) put(s.rod([0.01, 0.004, z * 0.05], [0.01 + Math.cos(t) * 0.055, 0.004, z * 0.05 + Math.sin(t) * 0.05], 0.005, legMat));
        put(s.rod([0.01, 0.004, z * 0.05], [-0.04, 0.004, z * 0.05], 0.005, legMat));
      }
      // The bald black neck and head, and the long down-curved bill, on a pivot that bobs.
      const neck = new THREE.Group();
      neck.position.set(0.17, 0.05, 0);
      torso.add(neck);
      const neckPts: P3[] = pose === 'probe'
        ? [[0, 0, 0], [0.08, -0.02, 0], [0.16, -0.1, 0], [0.2, -0.22, 0]]
        : pose === 'guard'
          ? [[0, 0, 0], [0.04, 0.1, 0], [0.03, 0.2, 0], [0.06, 0.28, 0]]
          : [[0, 0, 0], [0.06, 0.07, 0], [0.06, 0.16, 0], [0.1, 0.23, 0]];
      // White feathers sheath the base of the neck; the bare black skin starts above.
      put(s.tube(neckPts.slice(0, 2).concat([[neckPts[1][0] * 1.4, neckPts[1][1] * 1.4, 0]]), 0.04, white), neck);
      put(s.tube(neckPts, 0.022, skin), neck);
      const head = neckPts[3];
      put(s.ball([0.045, 0.036, 0.034], head, skin, 14), neck);
      const billDir = pose === 'probe' ? -1.35 : pose === 'guard' ? -0.25 : -0.45;
      const bill: P3[] = [];
      for (let k = 0; k <= 6; k++) {
        const t = k / 6;
        const angle = billDir - t * 0.9;
        const prev = k ? bill[k - 1] : [head[0] + 0.03, head[1] - 0.005, 0] as P3;
        bill.push(k ? [prev[0] + Math.cos(angle) * 0.03, prev[1] + Math.sin(angle) * 0.03, 0] : prev);
      }
      for (let k = 0; k < 6; k++) put(s.rod(bill[k], bill[k + 1], mix(0.011, 0.004, k / 6), skin, mix(0.011, 0.004, (k + 1) / 6)), neck);
      if (pose === 'sandwich') {
        const tip = bill[4];
        const sandwich = new THREE.Shape(); sandwich.moveTo(0, 0); sandwich.lineTo(0.11, 0); sandwich.lineTo(0, 0.1); sandwich.closePath();
        const sand = put(s.mesh(new THREE.ExtrudeGeometry(sandwich, { depth: 0.035, bevelEnabled: false }), s.material('#e8cf9a'), [tip[0] - 0.03, tip[1] - 0.06, -0.018]), neck);
        sand.rotation.z = 0.3;
        put(s.box([0.1, 0.008, 0.04], [tip[0] + 0.01, tip[1] - 0.03, 0], s.material('#5c9a3a')), neck).rotation.z = 0.3;
      }
      necks.push({ group: neck, base: neck.rotation.z, phase: random() * 6 });
      return g;
    };
    const rimY = knocked ? 0 : 1.055;
    if (a.doing === 'probe') bird('probe', knocked ? [-0.95, 0, 0.05] : [-0.05, rimY, 0.36], knocked ? 0 : Math.PI / 2);
    if (a.doing === 'sandwich') bird('sandwich', knocked ? [-0.5, 0.0, 0.25] : [0.12, rimY, 0.35], knocked ? 0.3 : 0.15);
    if (a.doing === 'guard') bird('guard', [0.62, 0, 0.3], Math.PI * 0.9);
    if (a.doing === 'fight') {
      bird('probe', knocked ? [-0.95, 0, 0.05] : [-0.05, rimY, 0.36], knocked ? 0 : Math.PI / 2);
      bird('fight', [0.5, 0, 0.55], Math.PI * 0.85);
    }

    // Turn it so the bill's curve reads in profile.
    const all = new THREE.Group();
    for (const child of [...s.root.children]) all.add(child);
    s.root.add(all);
    all.rotation.y = 0.52;

    const energy = 0.15 + mood.energy;
    return s.finish({
      update: (_dt, time) => {
        for (const n of necks) n.group.rotation.z = n.base + Math.sin(time * 5 * energy + n.phase) * 0.12 * energy;
      },
    });
  },
});
