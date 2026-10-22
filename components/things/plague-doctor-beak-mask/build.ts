import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { blob, g, horn, painted, shell, type ShellSpec } from './face';

const LENSES = {
  clear: 'Clear pale glass, a little blue, eyes almost visible.',
  red: 'Blood-red glass, as the old accounts describe.',
  green: 'Bottle green.',
  smoked: 'Smoked black, nothing behind them.',
  amber: 'Warm amber, like candlelight held in a jar.',
} as const;
const LENS_COLOUR: Record<keyof typeof LENSES, string> = { clear: '#bcd6de', red: '#b3141c', green: '#2f7d4a', smoked: '#1b1d20', amber: '#e39a1c' };

export default defineThing({
  questions: {
    material: choice('What is the mask made of?', {
      papier: 'White papier-mache, chalky and smooth, the classic carnival blank.',
      leather: 'Dark tooled leather with a stitched seam along the beak and brass rivets.',
      gilded: 'A gilded carnival showpiece, gold all over.',
    }),
    lens: choice('What colour are the round glass lenses?', LENSES),
    beak: score('How long is the beak?', ['A short blunt snout', 'A proper curved beak', 'An absurdly long stork bill']),
    dress: choice('What does it wear around the mask?', {
      full: 'The wide flat black hat and a black cowl falling over the shoulders.',
      hat: 'Only the wide black hat, set on the bare head form.',
      bare: 'Nothing: the bare mask strapped to a linen head form.',
    }),
    decoration: choice('How is the mask decorated?', {
      plain: 'Left plain.',
      scrollwork: 'Curling leaf scrollwork in gold (or dark red on a gilded mask).',
      music: 'Decoupage of old sheet music, staves and notes pasted across it.',
    }),
    reading: choice('How does it read?', {
      carnival: 'A carnival costume: bright ribbon, a plume in the hat, made to be admired.',
      plague: 'Something that walked out of 1656: waxed and stained, herbs stuffed in the beak, a pointing cane beside it.',
      relic: 'A museum relic: dusty, cracked, with a paper tag tied on.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const grim = a.reading === 'plague' ? 1 : a.reading === 'relic' ? 0.6 : 0;
    const dirt = Math.min(1, grim * 0.6 + mood.wear * 0.6);
    const baseColour = { papier: '#f1ecdf', leather: '#5b3721', gilded: '#d9aa3a' }[a.material];
    const ornament = a.material === 'gilded' ? '#7c1620' : '#c99a2a';

    const decorate = (ctx: CanvasRenderingContext2D, W: number, H: number, seam: boolean) => {
      ctx.fillStyle = baseColour;
      ctx.fillRect(0, 0, W, H);
      if (a.decoration === 'music') {
        for (let i = 0; i < 16; i++) {
          const x = random() * W, y = random() * H, w = 90 + random() * 120, h = 60 + random() * 70;
          ctx.save(); ctx.translate(x, y); ctx.rotate((random() - 0.5) * 1.6);
          ctx.fillStyle = random() < 0.5 ? '#efe2bd' : '#e6d5a6'; ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.strokeStyle = '#2b2118'; ctx.lineWidth = 1.5; ctx.fillStyle = '#2b2118';
          for (let st = 0; st < 2; st++) {
            for (let l = 0; l < 5; l++) { ctx.beginPath(); ctx.moveTo(-w / 2 + 6, -h / 2 + 10 + st * 30 + l * 4); ctx.lineTo(w / 2 - 6, -h / 2 + 10 + st * 30 + l * 4); ctx.stroke(); }
            for (let n = 0; n < w / 14; n++) { const nx = -w / 2 + 12 + n * 13, ny = -h / 2 + 10 + st * 30 + Math.floor(random() * 5) * 4; ctx.beginPath(); ctx.ellipse(nx, ny, 3.6, 2.6, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(nx + 2.6, ny - 13, 1.4, 13); }
          }
          ctx.restore();
        }
      } else if (a.decoration === 'scrollwork') {
        ctx.strokeStyle = ornament; ctx.lineWidth = 6; ctx.lineCap = 'round';
        for (let i = 0; i < 26; i++) {
          const x = random() * W, y = random() * H, turn = random() < 0.5 ? 1 : -1, r0 = 16 + random() * 22;
          ctx.beginPath();
          for (let k = 0; k <= 40; k++) { const t = k / 40, ang = t * 7 * turn + i, r = r0 * (1 - t * 0.85); const px = x + Math.cos(ang) * r, py = y + Math.sin(ang) * r; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
          ctx.stroke();
          ctx.fillStyle = ornament; ctx.beginPath(); ctx.ellipse(x + r0 * 1.3 * turn, y + r0 * 0.6, 12, 5, i, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (a.material === 'leather') {
        ctx.strokeStyle = 'rgba(25,14,8,0.5)'; ctx.lineWidth = 1;
        for (let i = 0; i < 200; i++) { const x = random() * W, y = random() * H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 22, y + (random() - 0.5) * 22); ctx.stroke(); }
        if (seam) {
          ctx.strokeStyle = '#d9c9a3'; ctx.lineWidth = 4; ctx.setLineDash([10, 9]);
          for (const u of [0.24, 0.76]) { ctx.beginPath(); ctx.moveTo(W * u, 0); ctx.lineTo(W * u, H); ctx.stroke(); }
          ctx.setLineDash([]);
        }
      }
      for (let i = 0; i < dirt * 26; i++) {
        ctx.fillStyle = `rgba(${40 + random() * 30},${30 + random() * 20},${18},${0.12 + random() * 0.25})`;
        blob(ctx, random() * W, random() * H, 20 + random() * 60, random); ctx.fill();
      }
      if (a.reading === 'relic') {
        ctx.strokeStyle = 'rgba(30,22,16,0.7)'; ctx.lineWidth = 2;
        for (let i = 0; i < 10; i++) { let x = random() * W, y = random() * H; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (random() - 0.5) * 70; y += random() * 50; ctx.lineTo(x, y); } ctx.stroke(); }
      }
    };
    const skinOptions = { roughness: a.material === 'gilded' ? 0.32 : a.material === 'leather' ? 0.55 : 0.7, metalness: a.material === 'gilded' ? 0.75 : 0, side: THREE.DoubleSide };
    const faceSkin = new THREE.MeshStandardMaterial({ ...skinOptions, map: painted(512, 512, (ctx, _X, _Y, W, H) => decorate(ctx, W, H, false)) });
    const beakSkin = new THREE.MeshStandardMaterial({ ...skinOptions, map: painted(512, 512, (ctx, _X, _Y, W, H) => decorate(ctx, W, H, true)) });

    const head = new THREE.Group();
    const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; head.add(mesh); return mesh; };
    const linen = s.material('#d9cdb4', { roughness: 0.95 });
    const wood = s.material('#7b5433', { roughness: 0.5 });
    const headY = 0.29;

    // Head form on a turned neck.
    const skull = add(new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), linen));
    skull.scale.set(0.082, 0.108, 0.094); skull.position.set(0, headY, 0);
    add(new THREE.Mesh(new THREE.LatheGeometry([[0.1, 0], [0.1, 0.018], [0.05, 0.03], [0.034, 0.06], [0.038, 0.16], [0.05, 0.2]].map(([x, y]) => new THREE.Vector2(x, y)), 28), a.dress === 'full' ? linen : wood));

    // The mask: a smooth face plate, lens rings and the beak.
    const spec: ShellSpec = {
      w: 0.176, h: 0.19, d: 0.085, taper: 0.3, round: 2.2, segU: 48, segV: 56,
      relief: (u, v) => 0.1 * g(v, 0.34, 0.14) * g(Math.abs(u), 0.4, 0.4) - 0.06 * g(Math.abs(u), 0.42, 0.2) * g(v, 0.14, 0.14) + 0.2 * g(u, 0, 0.3) * g(v, -0.1, 0.4),
    };
    const face = shell(spec, faceSkin);
    face.position.set(0, headY + 0.006, 0.018);
    head.add(face);
    const length = mix(0.11, 0.33, a.beak);
    const droop = length * mix(0.28, 0.5, a.beak);
    const by = headY - 0.012, bz = 0.075;
    head.add(horn([[0, by + 0.004, bz - 0.02], [0, by, bz + length * 0.35], [0, by - droop * 0.35, bz + length * 0.72], [0, by - droop, bz + length]], (t) => 0.05 * (1 - t) ** 0.72 + 0.004, beakSkin, { sides: 16, steps: 32, squash: 1.12, side: [1, 0, 0] }));
    const brass = s.material('#b98a35', { metalness: 0.85, roughness: 0.3 });
    const glass = new THREE.MeshStandardMaterial({ color: LENS_COLOUR[a.lens], roughness: 0.08, metalness: 0.3, emissive: LENS_COLOUR[a.lens], emissiveIntensity: a.lens === 'smoked' ? 0 : mix(0.15, 0.55, mood.cheer) });
    for (const side of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(side * 0.043, headY + 0.034, 0.09);
      eye.rotation.y = side * 0.5; eye.rotation.x = -0.12;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.005, 8, 28), brass);
      const pane = new THREE.Mesh(new THREE.SphereGeometry(0.023, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), glass);
      pane.rotation.x = Math.PI / 2; pane.scale.z = 0.35;
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.027, 0.016, 20, 1, true), brass);
      tube.rotation.x = Math.PI / 2; tube.position.z = -0.007;
      for (const m of [rim, pane, tube]) { m.castShadow = true; eye.add(m); }
      head.add(eye);
      if (a.material === 'leather')
        for (let k = 0; k < 6; k++) { const ang = k / 6 * Math.PI * 2; const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 6, 4), brass); rivet.position.set(Math.cos(ang) * 0.034, Math.sin(ang) * 0.034, -0.004); eye.add(rivet); }
    }
    // Breathing holes near the tip, and what is stuffed inside.
    const dark = s.material('#15110e');
    for (let k = 0; k < 3; k++) for (const side of [-1, 1]) {
      const t = 0.42 + k * 0.1;
      add(new THREE.Mesh(new THREE.SphereGeometry(0.0035, 8, 6), dark)).position.set(side * (0.05 * (1 - t) ** 0.72 + 0.003), by - droop * t * t * 0.9 - 0.004, bz + length * t);
    }
    if (a.reading === 'plague') {
      const herb = s.material('#5d7a3a', { roughness: 0.9 });
      for (let k = 0; k < 6; k++) {
        const x = (random() - 0.5) * 0.02, z = bz + length * (0.2 + random() * 0.2);
        head.add(horn([[x, by - 0.035, z], [x * 2, by - 0.06, z + 0.01], [x * 3 + (random() - 0.5) * 0.02, by - 0.085 - random() * 0.02, z + (random() - 0.5) * 0.03]], (t) => 0.004 * (1 - t * 0.5), random() < 0.4 ? s.material('#8a6a9c') : herb, { sides: 5, steps: 6 }));
      }
    }

    const black = s.material(grim ? '#1b1a1c' : '#18161b', { roughness: 0.92 });
    const ribbon = s.material(mood.cheer > 0.5 ? '#c2182e' : '#5b1a52', { roughness: 0.5 });
    if (a.dress === 'bare') {
      const strapSkin = a.material === 'leather' ? s.material('#3c2415') : ribbon;
      const around = add(new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 40), strapSkin));
      around.scale.set(0.081, 0.093, 0.1); around.rotation.x = Math.PI / 2; around.position.set(0, headY + 0.03, 0);
      const over = add(new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 40), strapSkin));
      over.scale.set(0.093, 0.108, 0.1); over.rotation.y = Math.PI / 2; over.position.set(0, headY, 0);
    } else {
      const hat = new THREE.Group();
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.165, 0.008, 40), black);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.086, 0.075, 32), black);
      crown.position.y = 0.04;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.016, 32), a.reading === 'carnival' ? ribbon : s.material('#2b2622'));
      band.position.y = 0.014;
      for (const m of [brim, crown, band]) { m.castShadow = m.receiveShadow = true; hat.add(m); }
      if (a.reading === 'carnival') {
        const plume = horn([[0.07, 0.02, 0.03], [0.12, 0.12, 0], [0.09, 0.2, -0.08], [0.02, 0.22, -0.16]], (t) => 0.004 + 0.03 * Math.sin(t * Math.PI) ** 0.6, s.material(mood.cheer > 0.5 ? '#f3efe6' : '#7a1626', { roughness: 1 }), { sides: 8, squash: 0.35 });
        hat.add(plume);
      }
      hat.position.set(0, headY + 0.086, -0.022);
      hat.rotation.set(-0.3, 0, (random() - 0.5) * 0.12);
      head.add(hat);
    }
    if (a.dress === 'full') {
      const hood = add(new THREE.Mesh(new THREE.LatheGeometry([[0.09, headY + 0.09], [0.1, headY + 0.02], [0.098, headY - 0.07], [0.12, headY - 0.13]].map(([x, y]) => new THREE.Vector2(x, y)), 32, 1.0, Math.PI * 2 - 2.0), black));
      (hood.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      const cape: [number, number][] = [[0.075, headY - 0.085], [0.11, headY - 0.13], [0.17, headY - 0.2], [0.21, 0.03], [0.225, 0]];
      const capeMesh = add(new THREE.Mesh(new THREE.LatheGeometry(cape.map(([x, y]) => new THREE.Vector2(x, y)), 40), black));
      const pos = capeMesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), ang = Math.atan2(z, x);
        const fold = 1 + 0.07 * Math.sin(ang * 9) * (1 - y / (headY - 0.085));
        pos.setXYZ(i, x * fold, y, z * fold);
      }
      capeMesh.geometry.computeVertexNormals();
    }
    head.rotation.y = 0.62 + (random() - 0.5) * 0.2;
    s.root.add(head);

    if (a.reading === 'plague') {
      const cane = s.material('#4a3423', { roughness: 0.6 });
      s.rod([-0.26, 0.012, 0.16], [0.2, 0.012, 0.3], 0.008, cane, 0.006);
      s.ball([0.012, 0.012, 0.012], [-0.26, 0.012, 0.16], s.material('#b98a35', { metalness: 0.8, roughness: 0.3 }), 10);
    } else if (a.reading === 'relic') {
      const tag = s.label('No. 1656', 0.07, 0.035, [-0.16, 0.002, 0.2], '#3a2c1e', '#e8dcb8');
      tag.rotation.x = -Math.PI / 2; tag.rotation.z = 0.4;
      s.tube([[-0.19, 0.003, 0.19], [-0.2, 0.006, 0.12], [-0.12, 0.02, 0.06], [-0.05, 0.03, 0.03]], 0.0012, s.material('#b9a57c'));
    } else {
      const loose = s.tube([[0.1, 0.004, 0.2], [0.02, 0.008, 0.25], [-0.08, 0.004, 0.2], [-0.15, 0.004, 0.26]], 0.006, ribbon);
      loose.scale.y = 0.4;
    }
    return s.finish();
  },
});
