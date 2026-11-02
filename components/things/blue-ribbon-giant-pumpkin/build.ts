import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, paint, paintHex, score } from '@conjure/kit';
import { pumpkin, stem } from './pumpkin';

const RIBBONS = { blue: '#1f4fb8', red: '#c3202e', purple: '#6a2a9a', gold: '#d6a62c' } as const;
const RIBBON_TEXT = { blue: '1ST', red: '2ND', purple: 'BEST', gold: 'CHAMP' } as const;

function canvasPlane(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, options: THREE.MeshStandardMaterialParameters = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.max(64, Math.round(512 * height / width));
  const ctx = canvas.getContext('2d')!;
  draw(ctx, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({ map: texture, transparent: true, alphaTest: 0.4, roughness: 0.8, side: THREE.DoubleSide, ...options });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

export default defineThing({
  questions: {
    rind: paint('What colour is the giant pumpkin?', ['coral', 'orange', 'amber', 'yellow', 'cream', 'white', 'green', 'olive']),
    size: score('How heavy is it?', ['A respectable 600 pounds', 'Around a thousand pounds', 'A record-chasing ton and a half', 'An absurd 2,000-pound monster']),
    ribbon: choice('What ribbon is pinned to it?', {
      blue: 'A blue first-prize rosette from the county fair.',
      red: 'A red second-place rosette, close but not quite.',
      purple: 'A purple Best in Show rosette with long tails.',
      gold: 'A gold Champion rosette, the big one.',
      none: 'No ribbon: it did not place, or it never went to the fair.',
    }),
    tag: choice('How is its weight shown?', {
      chalk: 'Chalked straight onto its skin in big white numbers.',
      placard: 'A printed fair placard on a stake in front of it.',
      cardboard: 'A hand-lettered cardboard sign propped against the pallet.',
      none: 'Not shown at all.',
    }),
    marks: choice('Has anyone marked the skin?', {
      none: 'Untouched, smooth and proud.',
      initials: 'A child has scratched initials inside a heart into the rind, now scabbed pale.',
      face: 'A child has carved a shallow grinning jack-o-lantern face into its side.',
    }),
    story: choice('What is its situation now?', {
      fresh: 'Fresh from the weigh-off, wiped clean and gleaming.',
      strap: 'The lifting harness from the forklift is still slung around it.',
      cracked: 'A split has opened near its base and it is weeping a little.',
      collapsing: 'Weeks after the fair, it is softening and starting to slump in on one side.',
    }),
    toddler: noul('Is a toddler sitting on top of it for a photo?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = mix(0.55, 0.95, a.size);
    const H = R * 1.1;
    const collapse = a.story === 'collapsing' ? 1 : 0;
    const wood = s.material('#a9875c', { roughness: 0.9 });
    const darkWood = s.material('#7b5f3f', { roughness: 0.9 });

    // The pallet: top deck boards on three stringers, bottom boards.
    const PW = R * 2.4, PD = R * 2.3, PH = 0.14;
    for (let i = 0; i < 7; i++) s.box([PW, 0.022, PD / 7 * 0.78], [0, PH - 0.011, -PD / 2 + PD / 7 * (i + 0.5)], i % 3 === 1 ? darkWood : wood).rotation.y = (random() - 0.5) * 0.01;
    for (const x of [-1, 0, 1]) s.box([0.09, PH - 0.044, PD], [x * (PW / 2 - 0.05), PH / 2, 0], darkWood);
    for (const z of [-1, 0, 1]) s.box([PW, 0.022, 0.12], [0, 0.011, z * (PD / 2 - 0.06)], wood);

    // The pumpkin, slumped under its weight; colour mottled toward rot with wear.
    const rind = new THREE.Color(paintHex(a.rind, '#f2735a')).lerp(new THREE.Color('#8a6a45'), mood.wear * 0.25 + collapse * 0.2);
    const body = pumpkin(s, { radius: R, height: H, ribs: 16, groove: 0.55, slump: 1 + collapse * 0.6, color: rind, shade: 0.35, mottle: 0.35 + mood.wear * 0.4 + collapse * 0.3, roughness: 0.45 }, random);
    body.mesh.position.y = PH;
    if (collapse) { body.mesh.scale.set(1.08, 0.82, 1.04); }
    const lift = PH;
    const sy = collapse ? 0.82 : 1, sx = collapse ? 1.08 : 1, sz = collapse ? 1.04 : 1;
    const frame = (u: number, v: number) => {
      const e = 0.004;
      const p = body.at(u, v);
      const du = body.at(u + e, v).sub(body.at(u - e, v));
      const dv = body.at(u, v + e).sub(body.at(u, v - e));
      const n = dv.clone().cross(du).normalize();
      p.set(p.x * sx, p.y * sy + lift, p.z * sz);
      return { p, n };
    };
    const stemMat = s.material('#7f7344', { roughness: 0.95 });
    const top = frame(0, 1).p;
    stem(s, top.clone().add(new THREE.Vector3(0, -0.02, 0)), 0.16 * R / 0.7, 0.06 * R / 0.7, stemMat, random);

    const stick = (mesh: THREE.Object3D, u: number, v: number, out = 0.012) => {
      const { p, n } = frame(u, v);
      mesh.position.copy(p).addScaledVector(n, out);
      mesh.lookAt(mesh.position.clone().add(n));
      s.root.add(mesh);
      return mesh;
    };
    // A decal that follows the curved skin: a patch of the pumpkin's own surface lifted a hair off it.
    const decal = (width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, u0: number, v0: number) => {
      const material = (canvasPlane(width, height, draw).material as THREE.MeshStandardMaterial);
      const centre = frame(u0, v0).p;
      const around = Math.max(0.05, Math.hypot(centre.x, centre.z)) * Math.PI * 2;
      const up = frame(u0, v0 + 0.05).p.distanceTo(frame(u0, v0 - 0.05).p) / 0.1;
      const du = width / around, dv = height / up;
      const mesh = s.surface((uu, vv, t) => {
        const { p, n } = frame(u0 - (uu - 0.5) * du, Math.min(0.99, Math.max(0.01, v0 + (vv - 0.5) * dv)));
        t.copy(p).addScaledVector(n, 0.01);
      }, material, { segments: [12, 8] });
      mesh.castShadow = false;
      return mesh;
    };
    const lbs = Math.round(600 + a.size * 1500 + random() * 90);
    const weight = `${lbs.toLocaleString('en-US')} LBS`;

    // Marks on the front face (+z is u = 0.25).
    if (a.marks === 'initials') {
      const letters = ['J', 'M', 'A', 'K', 'T', 'E', 'S', 'R'];
      const pair = `${letters[Math.floor(random() * 8)]}+${letters[Math.floor(random() * 8)]}`;
      decal(R * 0.55, R * 0.5, (ctx, w, h) => {
        ctx.strokeStyle = '#f3dfb0'; ctx.lineWidth = 9; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(w / 2, h * 0.92);
        ctx.bezierCurveTo(w * 0.02, h * 0.55, w * 0.12, h * 0.02, w / 2, h * 0.28);
        ctx.bezierCurveTo(w * 0.88, h * 0.02, w * 0.98, h * 0.55, w / 2, h * 0.92);
        ctx.stroke();
        ctx.fillStyle = '#f3dfb0'; ctx.font = `bold ${h * 0.26}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(pair, w / 2, h * 0.52);
      }, 0.22, 0.58);
    }
    if (a.marks === 'face') {
      decal(R * 0.9, R * 0.65, (ctx, w, h) => {
        ctx.fillStyle = '#4a1e08';
        ctx.strokeStyle = '#f6d48a'; ctx.lineWidth = 6;
        const tri = (cx: number, cy: number, r: number) => { ctx.beginPath(); ctx.moveTo(cx - r, cy + r * 0.7); ctx.lineTo(cx + r, cy + r * 0.7); ctx.lineTo(cx, cy - r * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke(); };
        tri(w * 0.3, h * 0.3, w * 0.1); tri(w * 0.7, h * 0.3, w * 0.1); tri(w * 0.5, h * 0.5, w * 0.05);
        ctx.beginPath();
        ctx.moveTo(w * 0.15, h * 0.62);
        for (let i = 0; i <= 8; i++) ctx.lineTo(w * (0.15 + i * 0.0875), h * (i % 2 ? 0.7 : 0.78) + Math.sin(i / 8 * Math.PI) * h * 0.1);
        for (let i = 8; i >= 0; i--) ctx.lineTo(w * (0.15 + i * 0.0875), h * 0.62 + Math.sin(i / 8 * Math.PI) * h * 0.2);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }, 0.24, 0.5);
    }
    if (a.tag === 'chalk') {
      decal(R * 0.8, R * 0.26, (ctx, w, h) => {
        ctx.fillStyle = '#f7f4ea'; ctx.font = `bold ${h * 0.7}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.95; ctx.fillText(weight, w / 2, h / 2, w * 0.95);
      }, a.marks === 'none' ? 0.22 : 0.3, a.marks === 'none' ? 0.5 : 0.74);
    }
    if (a.tag === 'placard' || a.tag === 'cardboard') {
      const cardboard = a.tag === 'cardboard';
      const sign = canvasPlane(0.42, 0.3, (ctx, w, h) => {
        ctx.fillStyle = cardboard ? '#c69c66' : '#f6f2e4'; ctx.fillRect(0, 0, w, h);
        if (!cardboard) { ctx.fillStyle = a.ribbon === 'none' ? '#2a5a3a' : RIBBONS[a.ribbon]; ctx.fillRect(0, 0, w, h * 0.26); }
        ctx.fillStyle = cardboard ? '#2a1a10' : '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `bold ${h * 0.16}px ${cardboard ? 'cursive' : 'sans-serif'}`;
        ctx.fillText(cardboard ? 'OUR BIG GUY!' : 'GIANT PUMPKIN', w / 2, h * 0.14, w * 0.9);
        ctx.fillStyle = '#2a1a10'; ctx.font = `bold ${h * 0.3}px ${cardboard ? 'cursive' : 'sans-serif'}`;
        ctx.fillText(weight, w / 2, h * 0.6, w * 0.9);
      }, { alphaTest: 0, transparent: false });
      if (cardboard) {
        sign.position.set(R * 0.5, 0.15 + 0.14, PD / 2 + 0.06);
        sign.rotation.x = -0.25;
        s.root.add(sign);
      } else {
        const stake = s.box([0.025, 0.7, 0.02], [R * 0.75, 0.35, PD / 2 + 0.22], wood);
        void stake;
        sign.position.set(R * 0.75, 0.62, PD / 2 + 0.235);
        s.root.add(sign);
      }
    }

    // The rosette: pleated ring, centre button and two tails.
    if (a.ribbon !== 'none') {
      const colour = RIBBONS[a.ribbon];
      const ribbonMat = s.material(colour, { roughness: 0.45, side: THREE.DoubleSide });
      const k = (0.85 + a.size * 0.3) * 1.7;
      const rosette = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * k, 0.07 * k, 0.008, 24), ribbonMat);
      disc.rotation.x = Math.PI / 2;
      rosette.add(disc);
      for (let i = 0; i < 18; i++) {
        const pleat = new THREE.Mesh(new THREE.BoxGeometry(0.03 * k, 0.07 * k, 0.006), ribbonMat);
        const ang = (i / 18) * Math.PI * 2;
        pleat.position.set(Math.cos(ang) * 0.085 * k, Math.sin(ang) * 0.085 * k, 0.003 + 0.004 * (i % 2));
        pleat.rotation.z = ang - Math.PI / 2;
        rosette.add(pleat);
      }
      for (const side of [-1, 1]) {
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.055 * k, 0.24 * k, 0.004), ribbonMat);
        tail.position.set(side * 0.03 * k, -0.17 * k, -0.004);
        tail.rotation.z = side * 0.18;
        rosette.add(tail);
      }
      const button = canvasPlane(0.11 * k, 0.11 * k, (ctx, w, h) => {
        ctx.fillStyle = '#f4efe0'; ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.48, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = colour; ctx.lineWidth = 14; ctx.stroke();
        ctx.fillStyle = '#1a1a1a'; ctx.font = `bold ${h * 0.3}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(RIBBON_TEXT[a.ribbon as keyof typeof RIBBONS], w / 2, h / 2, w * 0.8);
      });
      button.position.z = 0.016;
      rosette.add(button);
      rosette.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
      stick(rosette, 0.06, 0.66, 0.01);
    }

    if (a.story === 'strap') {
      const strapMat = s.material('#d8b11c', { roughness: 0.7 });
      const belly = frame(0, 0.42).p;
      let girth = 0;
      for (let i = 0; i < 64; i++) { const q = frame(i / 64, 0.42).p; girth = Math.max(girth, Math.hypot(q.x, q.z)); }
      s.ring(girth + 0.012, 0.022, [0, belly.y, 0], strapMat).rotation.x = Math.PI / 2;
      const hookY = top.y + R * 0.9;
      for (let i = 0; i < 4; i++) {
        const u = i / 4 + 0.125;
        const pts: [number, number, number][] = [];
        for (let j = 0; j <= 8; j++) {
          const { p, n } = frame(u, 0.42 + j * 0.06);
          pts.push([p.x + n.x * 0.02, p.y + n.y * 0.02, p.z + n.z * 0.02]);
        }
        pts.push([0, hookY, 0]);
        s.tube(pts, 0.016, strapMat);
      }
      s.ring(0.07, 0.015, [0, hookY + 0.06, 0], s.material('#6e7378', { metalness: 0.8, roughness: 0.4 }));
    }
    if (a.story === 'cracked') {
      // A jagged split across the lower front, dark and wet, with weeping drips below it.
      const split = s.material('#3a1806', { roughness: 0.3 });
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= 10; i++) {
        const { p, n } = frame(0.03 + i * 0.013, 0.36 + Math.sin(i * 2.1) * 0.035 + (i % 2) * 0.02);
        pts.push([p.x + n.x * 0.004, p.y + n.y * 0.004, p.z + n.z * 0.004]);
      }
      s.tube(pts, 0.016 * R / 0.7, split);
      for (let i = 0; i < 4; i++) {
        const u = 0.05 + i * 0.028;
        const drip = [frame(u, 0.36), frame(u, 0.3), frame(u, 0.25 - random() * 0.04)].map(({ p, n }) => [p.x + n.x * 0.004, p.y + n.y * 0.004, p.z + n.z * 0.004] as [number, number, number]);
        s.tube(drip, 0.008, s.material('#8a4a14', { roughness: 0.2 }));
      }
    }

    if (a.toddler) {
      const kid = figure(s, {
        height: 0.82, build: 'heavy', pose: 'sitting', style: 'doll', hair: random() < 0.5 ? 'cap' : 'short',
        top: ['#d14a3a', '#3a6fb0', '#e8b52c', '#6a9a4a'][Math.floor(random() * 4)], bottom: '#3a4a6a', shoes: '#f0ede4',
        skin: ['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0'][Math.floor(random() * 4)], sleeves: 'long', gaze: 'ahead',
      });
      s.root.add(kid.root);
      const seat = frame(0.25, 0.86).p;
      kid.root.updateMatrixWorld(true);
      const hips = kid.pelvis.getWorldPosition(new THREE.Vector3());
      kid.root.position.set(seat.x - hips.x + 0.05, seat.y - kid.hipHeight + 0.02, seat.z - hips.z - 0.04);
      kid.joints.shoulders.left.rotation.z = 0.5;
      kid.joints.shoulders.right.rotation.z = -0.5;
      kid.joints.shoulders.left.rotation.x = -0.6;
      kid.joints.shoulders.right.rotation.x = -0.6;
      const update = (dt: number, time: number) => kid.update(dt, time);
      return s.finish({ update });
    }
    return s.finish();
  },
});
