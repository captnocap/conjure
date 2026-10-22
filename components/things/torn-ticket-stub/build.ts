import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const KINDS = {
  cinema: 'A cinema ticket: ADMIT ONE in block capitals inside a ruled border.',
  raffle: 'A raffle ticket: a big serial number and KEEP THIS COUPON.',
  train: 'A small stiff card railway ticket with a destination and a diagonal stripe.',
  coat: 'A coat-check tag: a bold number on a card with clipped corners, a hole and a loop of string.',
  concert: 'A concert ticket with a barcode, a seat row and a dark printed band.',
  ride: 'A fairground ride ticket with a star and the word RIDE.',
} as const;
const STOCKS = {
  red: 'Faded red card.',
  orange: 'Orange card, the classic raffle roll.',
  blue: 'Pale blue card.',
  yellow: 'Yellow card.',
  pink: 'Pink card.',
  cream: 'Cream card, like old railway stock.',
  green: 'Mint green card.',
} as const;
const STOCK_HEX: Record<keyof typeof STOCKS, string> = { red: '#d9534a', orange: '#f0933a', blue: '#9fc4e6', yellow: '#f2d552', pink: '#f2a6c0', cream: '#efe4c4', green: '#a5d6b3' };

export default defineThing({
  questions: {
    kind: choice('What was the ticket for?', KINDS),
    stock: choice('What colour is the card?', STOCKS),
    used: choice('Was it ever used?', {
      stub: 'Used: only the torn stub is left, one edge ragged along the perforation.',
      whole: 'Never used: both halves are still joined along an untorn line of perforations.',
      started: 'The tear was started and abandoned: the halves hang together by the last few perforations.',
      pair: 'Two stubs kept together, one lying across the other.',
    }),
    state: choice('What state is the paper in?', {
      fresh: 'Nearly flat and crisp, torn tonight.',
      curled: 'Curled into a shallow trough from weeks in a back pocket.',
      rolled: 'Rolled tight at one end by fidgeting fingers.',
      tent: 'Folded once down the middle and standing like a little tent.',
      crumpled: 'Crumpled and creased, then half smoothed out again.',
      soaked: 'Been through the wash: buckled, water-stained, the ink bled into brown tide marks.',
    }),
    number: choice('What number is printed on it?', {
      ordinary: 'An unremarkable six-digit serial.',
      lucky: '777, obviously lucky.',
      unlucky: '13, row 13, seat 13.',
      first: '000001, the first ticket sold.',
      last: '999999, the end of the roll.',
    }),
    mark: choice('Has anything been done to it since?', {
      none: 'Nothing.',
      punched: 'A conductor has clipped a round hole through it.',
      stamped: 'A slanted red rubber stamp across the print.',
      written: 'A phone number scrawled across it in blue biro.',
      taped: 'A strip of yellowed sticky tape across one corner, from a scrapbook or a mirror.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    s.root.scale.setScalar(0.001); // modelled in millimetres
    const card = a.kind === 'train' ? { w: 30, h: 57 * 0.53 } : a.kind === 'coat' ? { w: 34, h: 50 } : a.kind === 'concert' ? { w: 46, h: 30 } : { w: 32, h: 25 };
    const joined = a.used === 'whole' || a.used === 'started';
    const serial = { ordinary: String(100000 + Math.floor(random() * 899999)), lucky: '000777', unlucky: '131313', first: '000001', last: '999999' }[a.number];
    const stock = new THREE.Color(STOCK_HEX[a.stock]).lerp(new THREE.Color('#b9ab8c'), mood.wear * 0.3);
    const ink = a.stock === 'red' ? '#3a0f0f' : '#1f2430';
    const soaked = a.state === 'soaked';

    // Paint one face. `half` is 0 for the kept stub, 1 for the part the usher would have taken.
    const paint = (half: 0 | 1, torn: 'left' | 'right' | 'none', back = false) => {
      const px = 512, py = Math.round((512 * card.h) / card.w);
      const canvas = document.createElement('canvas');
      canvas.width = px;
      canvas.height = py;
      const g = canvas.getContext('2d')!;
      // The silhouette: ragged perforation teeth on a torn edge, clipped corners on a coat tag.
      g.beginPath();
      const teeth = 16, inset = 20;
      const edge = (x: number, down: boolean) => {
        for (let i = 0; i <= teeth * 2; i++) {
          const y = ((down ? i : teeth * 2 - i) / (teeth * 2)) * py;
          g.lineTo(x + (i % 2 ? 0 : (x < px / 2 ? 1 : -1) * (5 + random() * 9)) + (random() - 0.5) * 3, y);
        }
      };
      const clip = a.kind === 'coat' ? 60 : 0;
      if (torn === 'left') edge(inset, false); else { g.lineTo(0, py); g.lineTo(0, clip); g.lineTo(clip, 0); }
      if (torn === 'right') { g.lineTo(px - inset, 0); edge(px - inset, true); } else { g.lineTo(px - clip, 0); g.lineTo(px, clip); g.lineTo(px, py); }
      g.closePath();
      g.save();
      g.clip();
      g.fillStyle = `#${(back ? stock.clone().lerp(new THREE.Color('#ffffff'), 0.25) : stock).getHexString()}`;
      g.fillRect(0, 0, px, py);
      if (soaked) { g.shadowColor = ink; g.shadowBlur = 9; }
      g.fillStyle = g.strokeStyle = ink;
      g.globalAlpha = soaked ? 0.6 : mix(1, 0.7, mood.wear);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const text = (words: string, x: number, y: number, size: number, font = 'bold', max = px * 0.84) => { g.font = `${font} ${size}px sans-serif`; g.fillText(words, x, y, max); };
      if (back) {
        g.globalAlpha *= 0.35;
        text(a.kind === 'raffle' ? 'NAME ............' : 'NOT TRANSFERABLE', px / 2, py * 0.5, 30, 'normal');
      } else if (a.kind === 'cinema' || a.kind === 'ride') {
        g.lineWidth = 6;
        g.strokeRect(34, 20, px - 68, py - 40);
        g.lineWidth = 2;
        g.strokeRect(46, 32, px - 92, py - 64);
        if (a.kind === 'cinema') {
          text(half ? 'ADMIT' : 'ADMIT ONE', px / 2, py * 0.36, half ? 96 : 84);
          text(half ? 'ONE' : `No ${serial}`, px / 2, py * 0.64, half ? 96 : 52, half ? 'bold' : 'normal');
          text(half ? serial : 'KEEP THIS STUB', px / 2, py * 0.84, 28, 'normal');
        } else {
          g.beginPath();
          for (let i = 0; i < 10; i++) { const r = i % 2 ? 34 : 82, t = (i / 10) * Math.PI * 2 - Math.PI / 2; g.lineTo(px * 0.27 + Math.cos(t) * r, py * 0.45 + Math.sin(t) * r); }
          g.fill();
          text('RIDE', px * 0.67, py * 0.4, 96);
          text(half ? 'GOOD FOR ONE' : serial, px * 0.62, py * 0.74, 40, 'normal', px * 0.6);
        }
      } else if (a.kind === 'raffle') {
        text(serial, px / 2, py * 0.36, 118, 'bold');
        g.fillRect(40, py * 0.57, px - 80, 5);
        text(half ? 'DRAW TONIGHT' : 'KEEP THIS COUPON', px / 2, py * 0.74, 44);
        text('TICKET', px / 2, py * 0.9, 26, 'normal');
      } else if (a.kind === 'train') {
        g.save();
        g.globalAlpha *= 0.4;
        g.fillStyle = '#b3302c';
        g.translate(px / 2, py / 2);
        g.rotate(-0.5);
        g.fillRect(-px, -24, px * 2, 48);
        g.restore();
        text(half ? 'RETURN' : 'SINGLE', px / 2, py * 0.2, 54);
        text(half ? 'HOME' : 'CENTRAL', px / 2, py * 0.47, 88);
        text(`3rd CLASS  ${serial.slice(2)}`, px / 2, py * 0.74, 44, 'normal');
        text('NOT VALID AFTER DATE', px / 2, py * 0.9, 26, 'normal');
      } else if (a.kind === 'coat') {
        g.lineWidth = 7;
        g.beginPath();
        g.arc(px / 2, py * 0.13, 22, 0, 7);
        g.stroke();
        text(serial.slice(3), px / 2, py * 0.5, 190);
        g.fillRect(60, py * 0.72, px - 120, 6);
        text('CLOAKROOM', px / 2, py * 0.8, 50);
        text('NO TAG NO COAT', px / 2, py * 0.9, 30, 'normal');
      } else {
        g.fillRect(0, 0, px, py * 0.26);
        g.fillStyle = `#${stock.getHexString()}`;
        text(half ? 'ONE NIGHT ONLY' : 'LIVE TONIGHT', px / 2, py * 0.13, 58);
        g.fillStyle = ink;
        text(`ROW ${serial.slice(0, 2)}  SEAT ${serial.slice(4)}`, px * 0.38, py * 0.45, 46, 'bold', px * 0.66);
        text('DOORS 8PM', px * 0.38, py * 0.65, 40, 'normal', px * 0.6);
        for (let x = 40; x < px * 0.7;) { const w = 2 + Math.floor(random() * 4) * 2; g.fillRect(x, py * 0.78, w, py * 0.16); x += w + 2 + Math.floor(random() * 3) * 2; }
        g.save();
        g.translate(px * 0.86, py * 0.6);
        g.rotate(Math.PI / 2);
        text(serial, 0, 0, 44, 'bold', py * 0.6);
        g.restore();
      }
      g.shadowBlur = 0;
      g.globalAlpha = 1;
      if (!back && a.mark === 'stamped') {
        g.save();
        g.translate(px * 0.55, py * 0.55);
        g.rotate(-0.32);
        g.globalAlpha = 0.72;
        g.strokeStyle = g.fillStyle = '#c21f2f';
        g.lineWidth = 7;
        g.strokeRect(-150, -44, 300, 88);
        text(['VOID', 'PAID', 'USED', 'ADMITTED'][Math.floor(random() * 4)], 0, 4, 70, 'bold', 270);
        g.restore();
      }
      if ((!back && a.mark === 'written') || (back && a.mark === 'written' && random() > 0.5)) {
        g.save();
        g.translate(px * 0.5, py * 0.56);
        g.rotate(-0.12 + random() * 0.2);
        g.fillStyle = '#2440b8';
        g.globalAlpha = 0.85;
        g.font = 'italic 58px cursive';
        g.fillText(`${Math.floor(200 + random() * 700)} ${Math.floor(1000 + random() * 8999)}`, 0, 0, px * 0.8);
        g.font = 'italic 44px cursive';
        g.fillText('call me', 20, 52, px * 0.6);
        g.restore();
      }
      // Age: yellowing, grime, creases, and tide marks if it was washed.
      g.fillStyle = `rgba(120,90,40,${mood.wear * 0.22})`;
      g.fillRect(0, 0, px, py);
      const rings = soaked ? 7 : Math.round(mood.wear * 3);
      for (let i = 0; i < rings; i++) {
        g.strokeStyle = `rgba(120,80,30,${0.3 + random() * 0.3})`;
        g.fillStyle = 'rgba(150,110,50,0.13)';
        g.lineWidth = 2 + random() * 3;
        g.beginPath();
        g.ellipse(random() * px, random() * py, 40 + random() * 130, 30 + random() * 90, random() * 3, 0, 7);
        g.fill();
        g.stroke();
      }
      if (a.state === 'crumpled')
        for (let i = 0; i < 16; i++) {
          g.strokeStyle = i % 2 ? 'rgba(255,255,255,0.4)' : 'rgba(60,40,20,0.28)';
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(random() * px, random() * py);
          g.lineTo(random() * px, random() * py);
          g.stroke();
        }
      g.restore();
      // Holes knocked out after printing.
      g.globalCompositeOperation = 'destination-out';
      if (a.kind === 'coat') { g.beginPath(); g.arc(px / 2, py * 0.13, 14, 0, 7); g.fill(); }
      if (a.mark === 'punched') { g.beginPath(); g.arc(back ? px * 0.24 : px * 0.76, py * 0.3, 26, 0, 7); g.fill(); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      return texture;
    };

    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // One card: a plane bent by a profile along its width, with separate front and back prints.
    const sheet = (half: 0 | 1, torn: 'left' | 'right' | 'none', state: typeof a.state, strength: number) => {
      const group = new THREE.Group();
      const { w, h } = card;
      const nx = 48, nz = 20;
      const geometry = new THREE.PlaneGeometry(w, h, nx, nz);
      const position = geometry.getAttribute('position');
      const phase = random() * 6, phase2 = random() * 6;
      // Integrate a bend angle across the width so the paper never stretches.
      const xs: number[] = [], ys: number[] = [];
      let x = 0, y = 0, theta = 0;
      const total = { fresh: 0.35, curled: 2.1, rolled: 0, tent: 0, crumpled: 0.7, soaked: 0.4 }[state] * strength;
      const start = state === 'tent' ? Math.PI / 2 - 0.5 : -total / 2;
      theta = start;
      for (let i = 0; i <= nx; i++) {
        xs.push(x);
        ys.push(y);
        const t = i / nx;
        let bend = total / nx;
        if (state === 'rolled') bend = t > 0.45 ? ((t - 0.45) / 0.55) ** 1.5 * 0.42 * strength : 0.01;
        if (state === 'tent') bend = Math.abs(t - 0.5) < 0.5 / nx + 1e-6 ? -(Math.PI - 1.0) : 0;
        theta += bend;
        x += (Math.cos(theta) * w) / nx;
        y += (Math.sin(theta) * w) / nx;
      }
      const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
      for (let i = 0; i < position.count; i++) {
        const u = position.getX(i) / w + 0.5, wz = position.getY(i);
        const f = u * nx, i0 = Math.min(nx - 1, Math.floor(f)), frac = f - i0;
        let py = mix(ys[i0], ys[i0 + 1], frac);
        const px = mix(xs[i0], xs[i0 + 1], frac) - midX;
        if (state === 'crumpled') py += (Math.abs(Math.sin(u * 9 + wz * 0.21 + phase)) + Math.abs(Math.sin(u * 4 - wz * 0.33 + phase2))) * 1.6 * strength;
        if (state === 'soaked') py += (Math.sin(u * 11 + phase) + Math.sin(wz * 0.5 + phase2)) * 0.9;
        if (state === 'fresh' || state === 'curled') py += (wz / h) * (u - 0.5) * 5 * strength + Math.sin(u * 3 + phase) * 0.3;
        position.setXYZ(i, px, py, -wz);
      }
      geometry.computeVertexNormals();
      const common = { alphaTest: 0.5, roughness: 0.92 } as const;
      add(group, geometry, new THREE.MeshStandardMaterial({ ...common, map: paint(half, torn), side: THREE.FrontSide, shadowSide: THREE.DoubleSide }));
      add(group, geometry, new THREE.MeshStandardMaterial({ ...common, map: paint(half, torn, true), side: THREE.BackSide }));
      return group;
    };

    const strength = mix(0.7, 1.3, random());
    const tentJoin = joined && a.state === 'tent';
    const first = sheet(0, joined ? 'none' : 'right', tentJoin ? 'fresh' : a.state, strength);
    if (tentJoin) {
      // The perforation is the fold: the two halves lean together into a ridge.
      const slope = 0.85 + random() * 0.25, gap = a.used === 'started' ? 0.5 : 0;
      const left = new THREE.Group(), right = new THREE.Group();
      first.position.x = -card.w / 2;
      left.add(first);
      left.rotation.z = slope;
      const second = sheet(1, 'none', 'fresh', strength);
      second.position.x = card.w / 2;
      right.add(second);
      right.rotation.z = -slope;
      right.rotation.y = -gap;
      right.position.x = 0.4;
      s.root.add(left, right);
    } else s.root.add(first);
    if (joined && !tentJoin) {
      // The second half continues from the perforation line; a started tear swings it away.
      const second = sheet(1, 'none', a.state === 'rolled' ? 'fresh' : a.state, strength);
      const hinge = new THREE.Group();
      first.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(first), box2 = new THREE.Box3().setFromObject(second);
      hinge.position.set(box.max.x, 0, 0);
      second.position.set(-box2.min.x + 0.6, 0, 0);
      if (a.used === 'started') { hinge.rotation.y = -(0.3 + random() * 0.3); hinge.position.z = card.h * 0.06; second.position.z = -card.h * 0.06; }
      hinge.add(second);
      s.root.add(hinge);
      // The perforation: a dashed line of dark pips down the join.
      const pips = Array.from({ length: 12 }, (_unused, i) => ({ at: [box.max.x + 0.3, 0.2, (i - 5.5) * (card.h / 12.5)] as [number, number, number], size: 0.45 }));
      if (a.used === 'whole' && (a.state === 'fresh' || a.state === 'soaked')) s.scatter(new THREE.BoxGeometry(0.5, 0.3, 2.2), new THREE.MeshStandardMaterial({ color: '#3b3128', roughness: 1 }), pips);
    }
    if (a.used === 'pair') {
      const other = sheet(0, 'left', a.state === 'tent' ? 'curled' : a.state, mix(0.6, 1.2, random()));
      other.rotation.y = 0.5 + random() * 0.8;
      other.position.set(card.w * 0.45, 0.6, card.h * (0.3 + random() * 0.25));
      s.root.add(other);
    }
    if (a.kind === 'coat') {
      const hole = new THREE.Vector3(0, 0, -card.h * 0.37);
      first.updateMatrixWorld(true);
      const lift = new THREE.Box3().setFromObject(first).min.y;
      const points = [hole.clone().setY(lift + 1.2)];
      for (let i = 1; i <= 9; i++) {
        const t = (i / 10) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.sin(t) * 9 * (1 + (random() - 0.5) * 0.3), lift + 0.4, hole.z - 12 + Math.cos(t) * 12 - (i === 5 ? random() * 5 : 0)));
      }
      points.push(hole.clone().setY(lift + 1.2));
      add(s.root, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 80, 0.45, 6), new THREE.MeshStandardMaterial({ color: new THREE.Color('#e9e2cf').lerp(new THREE.Color('#8a7a5c'), mood.wear * 0.6), roughness: 1 }));
    }
    if (a.mark === 'taped') {
      const tape = add(s.root, new THREE.PlaneGeometry(16, 6.5, 6, 1), new THREE.MeshStandardMaterial({ color: '#d9c98a', roughness: 0.3, transparent: true, opacity: 0.72, side: THREE.DoubleSide }));
      tape.rotation.set(-Math.PI / 2, 0, 0.7);
      first.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(first);
      tape.position.set(box.min.x + 4, box.min.y + (a.state === 'tent' ? 0.05 : 1.2), -card.h / 2 + 3);
      if (a.state === 'curled' || a.state === 'rolled') tape.position.y = box.max.y * 0.5;
    }
    return s.finish();
  },
});
