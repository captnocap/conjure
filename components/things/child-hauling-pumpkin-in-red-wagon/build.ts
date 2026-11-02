import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, type FigureHair, paint, paintHex } from '@conjure/kit';
import { gourd } from './props';
import { pumpkin, stem } from './pumpkin';

function plaid(base: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const c = new THREE.Color(base);
  ctx.fillStyle = c.getStyle(); ctx.fillRect(0, 0, 64, 64);
  ctx.globalAlpha = 0.65; ctx.fillStyle = c.clone().multiplyScalar(0.3).getStyle();
  ctx.fillRect(0, 20, 64, 16); ctx.fillRect(20, 0, 16, 64);
  ctx.globalAlpha = 0.5; ctx.fillStyle = '#f2ead8'; ctx.fillRect(0, 50, 64, 3); ctx.fillRect(50, 0, 3, 64);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export default defineThing({
  questions: {
    outfit: choice('What is the child wearing?', {
      puffy: 'A puffy jacket and a knit hat with a bobble, cheeks cold.',
      flannel: 'A flannel shirt, jeans and bright rubber wellies for the mud.',
      witch: 'Already in costume: a little witch with a pointed hat.',
      ghost: 'Already in costume: a bedsheet ghost with cut-out eyes.',
      hero: 'Already in costume: a superhero cape flying behind.',
    }),
    size: choice('How big is the pumpkin they chose?', {
      huge: 'Comically huge: bigger than the wagon, bulging over every side.',
      right: 'Just right: a proper carving pumpkin filling the wagon bed.',
      tiny: 'Tiny: one little palm-sized pumpkin rolling around in the empty wagon.',
    }),
    pose: choice('What is the child doing?', {
      straining: 'Straining forward with all their weight, the handle taut behind them.',
      triumphant: 'Marching triumphantly, free fist raised, prize in tow.',
      looking: 'Walking but looking back over their shoulder at the pumpkin.',
      sitting: 'Sitting in the wagon themselves, hugging the pumpkin, waiting to be pulled.',
    }),
    wagon: paint('What colour is the toy wagon?', ['red', 'crimson', 'blue', 'green', 'yellow', 'teal', 'purple', 'grey']),
    extra: choice('What else rides in the wagon?', {
      nothing: 'Nothing else.',
      gourds: 'A handful of striped little gourds.',
      leaves: 'A heap of collected red and gold autumn leaves.',
      bucket: 'A plastic jack-o-lantern candy bucket.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = 1.05 + random() * 0.15;
    const wagonHex = paintHex(a.wagon, '#c8102e');
    const body = s.material(wagonHex, { roughness: 0.35, metalness: 0.15 });
    const black = s.material('#1c1c1e', { roughness: 0.7 });
    const hubMat = s.material('#e8e6e0', { roughness: 0.3, metalness: 0.4 });
    const sitting = a.pose === 'sitting';

    // The toy wagon, long side to the viewer, front toward +x.
    const BL = 0.92, BW = 0.46, BH = 0.14, floorY = 0.2;
    const wagon = new THREE.Group();
    s.root.add(wagon);
    const wx = sitting ? 0 : -0.45;
    wagon.position.x = wx;
    const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; wagon.add(mesh); return mesh; };
    add(new THREE.Mesh(new THREE.BoxGeometry(BL, 0.025, BW), body)).position.y = floorY;
    for (const z of [-BW / 2, BW / 2]) add(new THREE.Mesh(new THREE.BoxGeometry(BL, BH, 0.025), body)).position.set(0, floorY + BH / 2, z);
    for (const x of [-BL / 2, BL / 2]) add(new THREE.Mesh(new THREE.BoxGeometry(0.025, BH, BW), body)).position.set(x, floorY + BH / 2, 0);
    // Rolled rim.
    for (const z of [-BW / 2, BW / 2]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, BL + 0.03, 8), body)).rotation.z = Math.PI / 2;
    wagon.children.slice(-2).forEach((rim, i) => rim.position.set(0, floorY + BH, i ? BW / 2 : -BW / 2));
    // Wheels and axles.
    for (const x of [-BL * 0.34, BL * 0.34]) {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, BW + 0.12, 8), black)).rotation.x = Math.PI / 2;
      wagon.children[wagon.children.length - 1].position.set(x, 0.1, 0);
      for (const z of [-BW / 2 - 0.05, BW / 2 + 0.05]) {
        const tyre = add(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.03, 10, 24), black));
        tyre.position.set(x, 0.105, z);
        const hub = add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.035, 16), hubMat));
        hub.rotation.x = Math.PI / 2;
        hub.position.set(x, 0.105, z);
      }
    }
    add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.05), black)).position.set(BL / 2 + 0.03, 0.12, 0);
    const pivot = new THREE.Vector3(wx + BL / 2 + 0.06, 0.12, 0);

    // The pumpkin in the bed.
    const pr = { huge: 0.4, right: 0.2, tiny: 0.075 }[a.size];
    const pumpkinColour = new THREE.Color('#e2701a').offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.5) * 0.08);
    const pAt = new THREE.Vector3(wx + (sitting && a.size !== 'huge' ? BL * 0.22 : (a.size === 'tiny' ? (random() - 0.5) * 0.4 : 0)), floorY + 0.012, (a.size === 'tiny' ? (random() - 0.5) * 0.2 : 0));
    const p = pumpkin(s, { radius: pr, height: pr * 1.5, ribs: 10, groove: 0.8, color: pumpkinColour, slump: a.size === 'huge' ? 0.4 : 0.15 }, random);
    p.mesh.position.copy(pAt);
    if (a.size === 'tiny') p.mesh.rotation.z = (random() - 0.5) * 0.6;
    stem(s, p.topAt.clone().add(pAt), pr * 0.35, pr * 0.08, s.material('#6e6236'), random);
    const pumpkinTop = pAt.y + pr * 1.5 * 0.85;

    // Extras in the bed.
    const freeX = sitting ? wx - BL * 0.3 : wx + (a.size === 'huge' ? 0 : BL * 0.3);
    if (a.extra === 'gourds') for (let i = 0; i < 4; i++) gourd(s, [freeX + (random() - 0.5) * 0.25, floorY + 0.012 + (a.size === 'huge' ? 0.05 : 0), (random() - 0.5) * 0.3], random);
    if (a.extra === 'leaves') {
      const leafColours = ['#c0391b', '#e8a020', '#a85a1a', '#d46a1a', '#8a2a1a'];
      const pts = Array.from({ length: 70 }, () => ({ at: [wx + (random() - 0.5) * BL * 0.9, floorY + 0.02 + random() * 0.1, (random() - 0.5) * BW * 0.9] as [number, number, number], size: 0.035 + random() * 0.02, color: leafColours[Math.floor(random() * 5)] }));
      const g = new THREE.CircleGeometry(1, 5).rotateX(-Math.PI / 2 + 0.3);
      s.scatter(g, s.material('#ffffff', { side: THREE.DoubleSide, roughness: 0.9 }), pts);
    }
    if (a.extra === 'bucket') {
      const orange = s.material('#f07a10', { roughness: 0.35 });
      const bx = freeX, bz = (random() - 0.5) * 0.1;
      s.lathe([[0.001, 0], [0.08, 0], [0.1, 0.06], [0.095, 0.13], [0.085, 0.14], [0.001, 0.14]], orange, [bx, floorY + 0.012, bz]);
      s.ring(0.09, 0.006, [bx, floorY + 0.2, bz], black, Math.PI);
      const face = s.label('▲ ▲', 0.1, 0.05, [bx, floorY + 0.1, bz + 0.1], '#1c1c1e', '#f07a10');
      face.material = new THREE.MeshStandardMaterial({ color: '#1c1c1e' });
      face.scale.set(0.6, 0.6, 1);
    }

    // The child.
    const outfit = {
      puffy: { top: ['#d24a2a', '#2a6ab0', '#e8b52c', '#6a3a8a'][Math.floor(random() * 4)], bottom: '#3a4a6a', shoes: '#4a3a30', hair: 'cap' as FigureHair, build: 'heavy' as const },
      flannel: { top: '#a8281e', bottom: '#4a6a9a', shoes: ['#f0c020', '#2f7a3a', '#c8203a'][Math.floor(random() * 3)], hair: 'short' as FigureHair, build: 'average' as const },
      witch: { top: '#1e1a24', bottom: '#2a1e34', shoes: '#1a1a1a', hair: 'long' as FigureHair, build: 'average' as const },
      ghost: { top: '#f2f0ea', bottom: '#3a4a6a', shoes: '#f0ede4', hair: 'none' as FigureHair, build: 'average' as const },
      hero: { top: '#2a4ab0', bottom: '#2a4ab0', shoes: '#c8203a', hair: 'short' as FigureHair, build: 'average' as const },
    }[a.outfit];
    const skin = ['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0', '#9a6b4b'][Math.floor(random() * 5)];
    const kid = figure(s, {
      height: H, build: outfit.build, style: 'doll', pose: sitting ? 'sitting' : 'walking',
      hair: outfit.hair, hairColor: ['#3b2a22', '#8a5a2a', '#d8b060', '#1a1410'][Math.floor(random() * 4)],
      top: outfit.top, bottom: outfit.bottom, shoes: outfit.shoes, skin, sleeves: 'long',
      gaze: a.pose === 'triumphant' ? 'up' : a.pose === 'straining' ? 'down' : 'ahead',
    });
    s.root.add(kid.root);
    const { joints } = kid;
    const headR = H * 0.064;
    if (a.outfit === 'flannel') {
      const tint = new THREE.Color('#a8281e').lerp(new THREE.Color('#8b8275'), mood.wear * 0.18);
      const check = s.material('#ffffff', { map: plaid('#a8281e'), roughness: 0.8 });
      kid.root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && (m.material as THREE.MeshStandardMaterial).color?.equals(tint)) m.material = check; });
      // Wellies.
      for (const side of ['left', 'right'] as const) {
        const boot = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.042, H * 0.04, H * 0.13, 10), s.material(outfit.shoes, { roughness: 0.3 }));
        boot.position.y = H * 0.07;
        boot.castShadow = true;
        joints.ankles[side].add(boot);
      }
    }
    if (a.outfit === 'puffy') {
      // Puffy jacket bands and a bobble on the knit hat.
      for (let i = 0; i < 3; i++) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(H * 0.075, H * 0.016, 6, 16), s.material(outfit.top, { roughness: 0.4 }));
        band.rotation.x = Math.PI / 2;
        band.scale.set(1.3, 1, 1);
        band.position.y = H * (0.05 + i * 0.075);
        joints.spine.add(band);
      }
      const bobble = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.4, 10, 8), s.material('#f2efe6', { roughness: 1 }));
      bobble.position.y = headR * 1.3;
      kid.head.add(bobble);
    }
    if (a.outfit === 'witch') {
      const felt = s.material('#1e1a24', { roughness: 0.9 });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.9, headR * 1.9, 0.01, 20), felt);
      brim.position.y = headR * 0.75;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.95, headR * 2.6, 14), felt);
      cone.position.y = headR * 0.75 + headR * 1.25;
      cone.rotation.z = 0.2;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.97, headR * 1.0, headR * 0.25, 14), s.material('#7b2fa8'));
      band.position.y = headR * 0.9;
      kid.head.add(brim, cone, band);
      const dress = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.09, H * 0.17, H * 0.28, 14, 1, true), s.material('#1e1a24', { side: THREE.DoubleSide, roughness: 0.9 }));
      dress.position.y = -H * 0.12;
      kid.pelvis.add(dress);
    }
    if (a.outfit === 'ghost') {
      const sheet = s.material('#f6f4ee', { side: THREE.DoubleSide, roughness: 0.9 });
      const profile: [number, number][] = [[0.001, headR * 1.15], [headR * 0.8, headR * 0.95], [headR * 1.15, 0], [headR * 1.3, -headR * 1.6], [H * 0.17, -H * 0.38], [H * 0.2, -H * 0.42]];
      const shroud = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 20), sheet);
      shroud.castShadow = true;
      kid.head.add(shroud);
      for (const sx of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.CircleGeometry(headR * 0.2, 12), black);
        eye.position.set(sx * headR * 0.38, headR * 0.15, headR * 1.12);
        kid.head.add(eye);
      }
    }
    if (a.outfit === 'hero') {
      const cape = new THREE.Mesh(new THREE.PlaneGeometry(H * 0.3, H * 0.42, 1, 6).translate(0, -H * 0.21, 0), s.material('#c8203a', { side: THREE.DoubleSide, roughness: 0.6 }));
      cape.position.set(0, H * 0.27, -H * 0.06);
      cape.rotation.x = sitting ? 0.1 : 0.55;
      cape.castShadow = true;
      joints.spine.add(cape);
      const mask = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.95, headR * 0.12, 6, 20), black);
      mask.position.y = headR * 0.12;
      mask.rotation.x = Math.PI / 2;
      kid.head.add(mask);
    }

    if (sitting) {
      // In the wagon, behind (or on top of) the pumpkin, hugging it.
      kid.root.rotation.y = Math.PI / 2;
      if (a.size !== 'huge') {
        // Legs stretched out along the wagon bed, not through its floor.
        for (const side of ['left', 'right'] as const) { joints.hips[side].rotation.x = -1.45; joints.knees[side].rotation.x = 0.12; joints.ankles[side].rotation.x = 0; }
        kid.settle();
        kid.measure();
      }
      s.root.updateMatrixWorld(true);
      const hips = kid.pelvis.getWorldPosition(new THREE.Vector3());
      const seatY = a.size === 'huge' ? pumpkinTop + 0.02 : floorY + 0.03;
      const seatX = a.size === 'huge' ? pAt.x - 0.05 : wx - BL * 0.3;
      kid.root.position.set(seatX - hips.x, seatY - kid.hipHeight + 0.02, -hips.z);
      s.root.updateMatrixWorld(true);
      const hug = new THREE.Vector3(pAt.x - (a.size === 'huge' ? -pr * 0.6 : pr * 0.5), a.size === 'huge' ? pumpkinTop - pr * 0.3 : pAt.y + pr, 0);
      kid.reach('left', hug.clone().add(new THREE.Vector3(0, 0, -pr * 0.5)), { space: s.root });
      kid.reach('right', hug.clone().add(new THREE.Vector3(0, 0, pr * 0.5)), { space: s.root });
      // The handle lies forward on the ground.
      s.rod(pivot.toArray() as [number, number, number], [pivot.x + 0.7, 0.03, 0.08], 0.012, black);
      s.rod([pivot.x + 0.7, 0.03, 0.0], [pivot.x + 0.7, 0.03, 0.16], 0.014, black);
    } else {
      kid.root.rotation.y = Math.PI / 2;
      if (a.pose === 'straining') joints.body.rotation.x = 0.38;
      if (a.pose === 'triumphant') { joints.shoulders.left.rotation.set(-2.7, 0, 0.35); joints.elbows.left.rotation.set(-0.5, 0, 0); }
      if (a.pose === 'looking') joints.neck.rotation.set(0, -1.6, 0);
      kid.settle();
      s.root.updateMatrixWorld(true);
      const grip = new THREE.Vector3(pivot.x + 0.62, a.pose === 'straining' ? 0.42 : 0.5, 0.06);
      // Stand the child so the grip sits just behind its right hip.
      const hip = kid.pelvis.getWorldPosition(new THREE.Vector3());
      kid.root.position.x += grip.x + (a.pose === 'straining' ? 0.38 : 0.22) - hip.x;
      kid.root.position.z += -0.12 - hip.z;
      kid.settle();
      s.root.updateMatrixWorld(true);
      kid.reach('right', grip, { space: s.root });
      s.root.updateMatrixWorld(true);
      const hand = kid.hands.right.getWorldPosition(new THREE.Vector3());
      s.root.worldToLocal(hand);
      s.rod(pivot.toArray() as [number, number, number], hand.toArray() as [number, number, number], 0.011, black);
      const tee = s.rod([hand.x, hand.y, hand.z - 0.06], [hand.x, hand.y, hand.z + 0.06], 0.014, black);
      void tee;
      if (a.pose === 'looking') kid.lookAt(pAt.clone().setY(pAt.y + pr), s.root);
    }

    return s.finish({ update: (dt, time) => kid.update(dt, time) });
  },
});
