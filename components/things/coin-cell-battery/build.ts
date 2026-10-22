import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { MASK_OPTIONS, board, gather, instances, paint, place } from './pcb';

export default defineThing({
  questions: {
    holder: choice('What holds the cell?', {
      clip: 'An open metal cradle with two posts and a sprung strap across the top.',
      socket: 'A round black plastic socket with a metal tab hooked over one edge, as on a PC motherboard.',
      upright: 'A vertical slot holder, so the cell stands on its edge like a wheel.',
      tabbed: 'No holder: tabs are spot-welded to the cell and soldered straight to the board, never meant to be changed.',
    }),
    state: choice('What state is the battery in?', {
      seated: 'Seated properly and doing its job.',
      half: 'Half ejected, one edge sprung up out of the holder.',
      empty: 'Gone. The holder is empty and the clock has stopped.',
      corroded: 'In place but crusted with white and green corrosion that has crept onto the holder.',
      beside: 'Taken out and left lying face down on the board next to its empty holder.',
    }),
    face: choice('What is on the face of the cell?', {
      engraved: 'The standard engraving: CR2032, 3V, a plus sign.',
      plus: 'Almost blank, with one very large plus sign.',
      dated: 'The engraving plus a date written across it by hand in marker.',
      scratched: 'Scratched and dulled until the engraving barely shows.',
    }),
    legend: choice('What does the board lettering beside it say?', {
      bat: 'BAT1',
      rtc: 'RTC BACKUP',
      cmos: 'CMOS',
      zero: '00:00:00',
    }),
    clear: noul('Is there a three-pin clear-memory jumper next to it?'),
    clock: noul('Is the clock crystal and its little chip visible beside it?'),
    board: choice('What kind of board is it on?', MASK_OPTIONS),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = 10, T = 3.2;
    const steel = s.material('#c9ccce', { metalness: 0.85, roughness: mix(0.22, 0.55, mood.wear) });
    const tin = s.material('#c9ccc9', { metalness: 0.85, roughness: 0.3 });
    const black = s.material('#17181b', { roughness: 0.6 });
    const shift = a.state === 'beside' ? -10 : 0;
    const w = 46 - shift * 2, d = 38;
    const hx = -4 + shift, hz = -2, ax = 16 + shift;
    const upright = a.holder === 'upright';
    const corroded = a.state === 'corroded';

    board(s, {
      w, d, mask: a.board, random, wear: mood.wear,
      outlines: [{ x: hx, z: hz, w: upright ? 24 : 26, d: upright ? 7 : 26, round: !upright }],
      pads: [{ x: hx - 12.5, z: hz, r: 1.5, square: true }, { x: hx + 12.5, z: hz, r: 1.5 }],
      silk: [
        { text: { bat: 'BAT1', rtc: 'RTC BACKUP', cmos: 'CMOS', zero: '00:00:00' }[a.legend], x: hx, z: hz + (upright ? 8 : 15.5), size: 3 },
        { text: '+', x: hx - 15, z: hz - 5, size: 4 },
        ...(a.clear ? [{ text: 'CLR', x: ax, z: 13.5, size: 2.2 }] : []),
        ...(a.clock ? [{ text: '32.768', x: ax - 0.5, z: -15.5, size: 1.8 }] : []),
      ],
      extra: (ctx) => {
        if (!corroded) return;
        for (let i = 0; i < 9; i++) {
          const angle = random() * Math.PI * 2, reach = 9 + random() * 7, r = 2 + random() * 4;
          const stain = ctx.createRadialGradient(hx + Math.cos(angle) * reach, hz + Math.sin(angle) * reach, 0, hx + Math.cos(angle) * reach, hz + Math.sin(angle) * reach, r);
          stain.addColorStop(0, 'rgba(190,220,200,0.7)');
          stain.addColorStop(1, 'rgba(190,220,200,0)');
          ctx.fillStyle = stain;
          ctx.fillRect(hx - 30, hz - 30, 60, 60);
        }
      },
    });

    const faceTexture = paint(512, 512, (ctx) => {
      const sheen = ctx.createLinearGradient(0, 0, 512, 512);
      sheen.addColorStop(0, '#e2e4e5'); sheen.addColorStop(0.45, '#b9bcbe'); sheen.addColorStop(0.6, '#d9dbdc'); sheen.addColorStop(1, '#a9acae');
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = 'rgba(70,74,78,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(256, 256, 232, 0, Math.PI * 2); ctx.stroke();
      const engraving = a.face === 'scratched' ? 'rgba(70,74,78,0.3)' : 'rgba(58,62,66,0.9)';
      ctx.fillStyle = engraving;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (a.face === 'plus') {
        ctx.fillRect(256 - 110, 256 - 16, 220, 32);
        ctx.fillRect(256 - 16, 256 - 110, 32, 220);
      } else {
        const arch = (text: string, radius: number, centre: number, size: number) => {
          ctx.font = `bold ${size}px sans-serif`;
          const step = size * 0.72 / radius;
          [...text].forEach((letter, index) => {
            const angle = centre + (index - (text.length - 1) / 2) * step;
            ctx.save();
            ctx.translate(256 + Math.sin(angle) * radius, 256 - Math.cos(angle) * radius);
            ctx.rotate(angle);
            ctx.fillText(letter, 0, 0);
            ctx.restore();
          });
        };
        arch('CR2032', 160, 0, 64);
        arch('LITHIUM', 196, Math.PI, 34);
        ctx.font = 'bold 70px sans-serif';
        ctx.fillText('3V', 256, 350);
        ctx.fillRect(256 - 46, 232, 92, 14);
        ctx.fillRect(256 - 7, 193, 14, 92);
      }
      if (a.face === 'dated') {
        ctx.save();
        ctx.translate(256, 262);
        ctx.rotate(-0.25 + random() * 0.3);
        ctx.fillStyle = '#16182a';
        ctx.font = 'italic bold 104px cursive';
        ctx.fillText(["'09", '3/14', '2011', "JAN '06", '1999'][Math.floor(random() * 5)], 0, 0, 380);
        ctx.restore();
      }
      const scuffs = a.face === 'scratched' ? 260 : Math.round(mood.wear * 90);
      for (let i = 0; i < scuffs; i++) {
        ctx.strokeStyle = `rgba(${random() < 0.5 ? '90,94,98' : '240,240,240'},${0.2 + random() * 0.35})`;
        ctx.lineWidth = 1 + random() * 2.5;
        const x = random() * 512, y = random() * 512, angle = random() * Math.PI, length = 20 + random() * 110;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length); ctx.stroke();
      }
      if (corroded) for (let i = 0; i < 40; i++) {
        const angle = random() * Math.PI * 2, reach = 150 + random() * 100, r = 12 + random() * 34;
        ctx.fillStyle = `rgba(${random() < 0.5 ? '205,225,205' : '120,160,140'},0.55)`;
        ctx.beginPath(); ctx.arc(256 + Math.cos(angle) * reach, 256 + Math.sin(angle) * reach, r, 0, Math.PI * 2); ctx.fill();
      }
    });

    const present = a.state !== 'empty';
    // The cell, belly on y = 0, face up, centred.
    const cell = present ? gather(s, () => {
      s.lathe([[0, 0], [8.1, 0], [8.5, 0.25], [8.5, 0.95], [9.1, 1.0], [R, 1.15], [R, T - 0.3], [R - 0.35, T], [0, T]], steel);
      s.cylinder(8.75, 8.75, 0.25, [0, 0.98, 0], s.material('#3b4a55', { roughness: 0.7 }), 32);
      const face = s.mesh(new THREE.CircleGeometry(R - 0.4, 48), new THREE.MeshStandardMaterial({ map: faceTexture, metalness: 0.7, roughness: mix(0.3, 0.6, mood.wear) }), [0, T + 0.01, 0]);
      face.rotation.x = -Math.PI / 2;
      // The knurled negative side, seen when it lies face down.
      const under = s.mesh(new THREE.CircleGeometry(8, 32), s.material('#b3b6b8', { metalness: 0.8, roughness: 0.5 }), [0, -0.01, 0]);
      under.rotation.x = Math.PI / 2;
      for (let ring = 1; ring < 4; ring++) s.ring(ring * 2.2, 0.12, [0, -0.02, 0], s.material('#8d9092', { metalness: 0.7 })).rotation.x = Math.PI / 2;
      if (corroded) {
        const pale = s.material('#d5e3d6', { roughness: 1 }), green = s.material('#7fae9a', { roughness: 1 });
        for (let i = 0; i < 46; i++) {
          const angle = random() * Math.PI * 2, reach = R * (0.82 + random() * 0.3), size = 0.5 + random() * 1.3;
          s.ball([size, size * 0.7, size], [Math.cos(angle) * reach, random() * (T + 0.6), Math.sin(angle) * reach], i % 3 ? pale : green, 8);
        }
      }
    }) : null;

    let seatY = 0.9;
    if (a.holder === 'clip') {
      s.cylinder(6.5, 6.5, 0.4, [hx, 0.2, hz], tin, 24);
      for (const side of [-1, 1]) {
        s.box([1.1, 5.4, 7], [hx + side * 11.4, 2.7, hz], tin);
        s.box([3.2, 0.5, 4], [hx + side * 12.6, 0.25, hz], tin);
      }
      const lift = a.state === 'half' ? 2.2 : 0;
      const strap = s.tube([[hx - 11.4, 5.2, 0], [hx - 7, 5.6 + lift, 0], [hx, 4.5 + lift * 1.4, 0], [hx + 5, 5 + lift, 0], [hx + 8, 5.8 + lift, 0]], 0.5, tin);
      strap.scale.z = 5;
      strap.position.z = hz;
      seatY = 0.5;
    } else if (a.holder === 'socket') {
      s.cylinder(12.6, 12.6, 1, [hx, 0.5, hz], black, 40);
      const wall = s.mesh(new THREE.LatheGeometry([[10.5, 1], [10.5, 4.8], [12.6, 4.8], [12.6, 1]].map(([x, y]) => new THREE.Vector2(x, y)), 40, 0.65, Math.PI * 2 - 1.3), black, [hx, 0, hz]);
      void wall;
      s.box([5, 0.5, 4.6], [hx, 5.05, hz - 9.4], tin);
      s.box([5, 4.6, 0.5], [hx, 2.8, hz - 12.2], tin);
      const finger = s.box([3.4, 0.45, 4.5], [hx, 3.4, hz + 11.2], tin);
      finger.rotation.x = 0.5;
      s.cylinder(4, 4, 0.3, [hx, 1.15, hz], tin, 20);
      seatY = 1.3;
    } else if (upright) {
      s.box([24, 5.5, 2], [hx, 2.75, hz - 2.6], black);
      s.box([24, 5.5, 2], [hx, 2.75, hz + 2.6], black);
      s.box([24, 1.6, 7.2], [hx, 0.8, hz], black);
      for (const side of [-1, 1]) s.box([1.4, 13, 3.4], [hx + side * 11.2, 6.5, hz], tin);
      s.box([0.5, 9, 3], [hx, 8, hz - 2], tin).rotation.x = 0.1;
    } else {
      for (const side of [-1, 1]) {
        s.box([8, 0.35, 4], [hx + side * 10.5, 0.6 + (side > 0 ? T + 0.25 : 0), hz], tin);
        s.box([0.35, 0.6 + (side > 0 ? T + 0.25 : 0), 4], [hx + side * 14.4, (0.6 + (side > 0 ? T + 0.25 : 0)) / 2, hz], tin);
        s.box([3, 0.35, 4], [hx + side * 15.8, 0.2, hz], tin);
      }
      if (present) s.ring(R + 0.15, 0.55, [hx, 0.75 + T / 2, hz], s.material('#d9b62e', { roughness: 0.45 })).rotation.x = Math.PI / 2;
      seatY = 0.75;
    }

    if (cell) {
      if (a.state === 'beside') {
        cell.rotation.x = Math.PI;
        cell.position.set(21 - random() * 2, T + 0.05, 1 + random() * 4);
        cell.scale.setScalar(0.999);
      } else if (upright) {
        cell.rotation.x = Math.PI / 2;
        cell.rotation.z = random() * 6;
        cell.rotation.order = 'YXZ';
        cell.position.set(hx, R + 1.6, hz - T / 2);
        if (a.state === 'half') { cell.position.y += 5.5; cell.position.x += 3; cell.rotation.y = 0.16; }
      } else {
        cell.rotation.y = (random() - 0.5) * 1.4;
        cell.position.set(hx, seatY, hz);
        if (a.state === 'half') {
          cell.rotation.order = 'XYZ';
          cell.rotation.x = -0.36;
          cell.position.set(hx, seatY + 3.6, hz + 4.5);
        }
      }
    }

    if (a.clear) {
      const pins: THREE.Matrix4[] = [];
      for (let i = 0; i < 3; i++) pins.push(place([ax - 2.54 + i * 2.54, 3.2, 9], [0, 0, 0], [0.64, 9, 0.64]));
      instances(s, new THREE.BoxGeometry(1, 1, 1), s.material('#d6b65c', { metalness: 0.85, roughness: 0.3 }), pins);
      s.box([7.8, 2.5, 2.5], [ax, 1.25, 9], black);
      const onClear = a.state === 'empty' || random() < 0.3;
      s.box([5, 5.5, 2.5], [ax + (onClear ? 1.27 : -1.27), 5.3, 9], s.material(['#2a56c6', '#c62f2f', '#e0c020', '#1c1d20'][Math.floor(random() * 4)], { roughness: 0.5 }));
    }
    if (a.clock) {
      const can = s.cylinder(1.5, 1.5, 8, [ax - 1, 1.6, -9], steel, 14);
      can.rotation.z = Math.PI / 2;
      can.rotation.y = 0.2;
      s.box([5, 1.6, 4], [ax - 1, 1, -3], black);
      const legs: THREE.Matrix4[] = [];
      for (let i = 0; i < 4; i++) for (const side of [-1, 1]) legs.push(place([ax - 1 - 1.9 + i * 1.27, 0.35, -3 + side * 2.6], [0, 0, 0], [0.45, 0.5, 1.4]));
      instances(s, new THREE.BoxGeometry(1, 1, 1), tin, legs);
    }

    s.root.scale.setScalar(0.001);
    return s.finish();
  },
});
