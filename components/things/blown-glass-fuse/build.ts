import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { MASK_OPTIONS, board, gather, paint, solder } from './pcb';

export default defineThing({
  questions: {
    size: choice('What kind of fuse is it?', {
      small: 'A small 20 millimetre glass cartridge, the common European kind.',
      long: 'A long 32 millimetre glass cartridge with fat end caps, older and American.',
      ceramic: 'A white ceramic body filled with sand, so nothing inside can be seen.',
    }),
    state: choice('What has happened to it?', {
      intact: 'Nothing. A single fine wire runs unbroken down the middle.',
      slow: 'Nothing. It is a slow-blow type with the wire coiled round a core like a spring.',
      blown: 'Blown gently: the wire has parted in the middle, leaving two drooping stubs with beads on their ends.',
      vaporised: 'Blown violently: no wire left, only a silver and black smear plated on the inside of the glass.',
      shattered: 'The glass has burst. Both end caps are still in their clips with shards on the board between them.',
    }),
    bridged: noul('Has someone bypassed it by wrapping copper wire from cap to cap?'),
    spare: noul('Is a spare fuse lying loose on the board beside it?'),
    base: choice('What are the clips mounted on?', {
      bare: 'Two bare sprung clips soldered straight to the board.',
      block: 'A black moulded holder block with the clips set into it.',
      cover: 'Bare clips with a clear snap-on safety cover hinged open beside them.',
    }),
    legend: choice('What is lettered on the board beside it?', {
      rating: 'F1 T2A 250V',
      mains: 'MAINS  ~  LIVE',
      rail: '+12V RAIL',
      warning: 'REPLACE WITH SAME TYPE',
    }),
    board: choice('What kind of board is it on?', MASK_OPTIONS),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const len = a.size === 'long' ? 32 : 20, r = a.size === 'long' ? 3.1 : 2.6, cap = a.size === 'long' ? 6.5 : 5;
    const axis = r + 4.2 + (a.base === 'block' ? 2.6 : 0);
    const nickel = s.material('#cfd1cf', { metalness: 0.88, roughness: mix(0.2, 0.5, mood.wear) });
    const tin = s.material('#c9ccc9', { metalness: 0.85, roughness: 0.3 });
    const brass = s.material('#c9a85a', { metalness: 0.8, roughness: 0.35 });
    const copper = s.material('#c06a3a', { metalness: 0.75, roughness: 0.35 });
    const black = s.material('#17181b', { roughness: 0.6 });
    const failed = a.state === 'blown' || a.state === 'vaporised' || a.state === 'shattered';
    const w = len + 22, d = 34;
    const clipX = len / 2 - cap / 2;

    board(s, {
      w, d, mask: a.board, random, wear: mood.wear,
      pads: [-1, 1].flatMap((side) => [{ x: side * clipX, z: -3.4, r: 1.3 }, { x: side * clipX, z: 3.4, r: 1.3 }]),
      outlines: [{ x: 0, z: 0, w: len + 5, d: r * 2 + 5 }],
      silk: [{ text: { rating: 'F1 T2A 250V', mains: 'MAINS ~ LIVE', rail: '+12V RAIL', warning: 'REPLACE WITH SAME TYPE' }[a.legend], x: 0, z: -d / 2 + 4.2, size: a.legend === 'warning' ? 2.1 : 2.8 }],
      extra: (ctx) => {
        if (!failed) return;
        const strength = a.state === 'blown' ? 0.35 : 0.8;
        const soot = ctx.createRadialGradient(0, 0, 1, 0, 0, len * 0.55);
        soot.addColorStop(0, `rgba(20,16,12,${strength})`);
        soot.addColorStop(1, 'rgba(20,16,12,0)');
        ctx.fillStyle = soot;
        ctx.save(); ctx.scale(1, 0.6); ctx.fillRect(-w, -d * 2, w * 2, d * 4); ctx.restore();
      },
    });

    /** One cartridge lying along x, centred on its own axis. */
    const cartridge = (state: typeof a.state, ceramic: boolean) => gather(s, () => {
      const inner = len / 2 - cap + 0.6;
      for (const side of [-1, 1]) {
        const body = s.cylinder(r + 0.28, r + 0.28, cap, [side * (len / 2 - cap / 2), 0, 0], nickel, 24);
        body.rotation.z = Math.PI / 2;
        s.ball([0.7, r + 0.28, r + 0.28], [side * len / 2, 0, 0], nickel, 20);
        const rim = s.ring(r + 0.3, 0.14, [side * (len / 2 - cap), 0, 0], nickel);
        rim.rotation.y = Math.PI / 2;
      }
      if (ceramic) {
        const print = paint(512, 256, (ctx, cw, ch) => {
          ctx.fillStyle = '#ece8dc'; ctx.fillRect(0, 0, cw, ch);
          ctx.fillStyle = '#31404f'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = 'bold 44px monospace';
          for (let k = 0; k < 2; k++) ctx.fillText('T2A H 250V', cw / 2, ch * (0.25 + k * 0.5));
          if (state === 'blown' || state === 'vaporised') {
            for (let k = 0; k < 2; k++) {
              const burn = ctx.createRadialGradient(cw / 2, ch * (0.25 + k * 0.5), 4, cw / 2, ch * (0.25 + k * 0.5), state === 'vaporised' ? 190 : 90);
              burn.addColorStop(0, 'rgba(25,18,10,0.95)'); burn.addColorStop(1, 'rgba(60,40,20,0)');
              ctx.fillStyle = burn; ctx.fillRect(0, 0, cw, ch);
            }
            ctx.strokeStyle = '#1a1410'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(cw * 0.45, 0);
            for (let y = 0; y <= ch; y += 16) ctx.lineTo(cw * 0.5 + (random() - 0.5) * 50, y);
            ctx.stroke();
          }
        });
        if (state !== 'shattered') {
          const tube = s.mesh(new THREE.CylinderGeometry(r, r, inner * 2, 28, 1, true), new THREE.MeshStandardMaterial({ map: print, roughness: 0.75 }));
          tube.rotation.z = Math.PI / 2;
          tube.rotation.x = 1.2;
        }
        return;
      }
      if (state === 'shattered') {
        const shard = new THREE.MeshStandardMaterial({ color: '#cfe6e2', roughness: 0.1, transparent: true, opacity: 0.55 });
        for (const side of [-1, 1]) for (let k = 0; k < 7; k++) {
          const angle = (k / 7) * Math.PI * 2 + random(), tall = 1 + random() * 3.5;
          const tooth = s.mesh(new THREE.ConeGeometry(r * 0.42, tall, 3), shard, [side * (inner - tall / 2 + 0.3), Math.cos(angle) * (r - 0.25), Math.sin(angle) * (r - 0.25)]);
          tooth.rotation.z = side * Math.PI / 2;
        }
        return;
      }
      const glass = new THREE.MeshPhysicalMaterial({ color: '#dff1ee', roughness: 0.05, transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide });
      const tube = s.mesh(new THREE.CylinderGeometry(r, r, inner * 2, 28, 1, true), glass);
      tube.rotation.z = Math.PI / 2;
      tube.castShadow = false;
      // A long highlight so the glass still reads as a tube in a flat print.
      const shine = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false });
      s.box([inner * 1.7, 0.22, 0.5], [0, r * 0.86, r * 0.52], shine).castShadow = false;
      s.box([inner * 1.1, 0.12, 0.3], [inner * 0.2, r * 0.45, r * 0.9], shine).castShadow = false;
      const wire = s.material('#b9bcbd', { metalness: 0.8, roughness: 0.3 });
      if (state === 'intact') {
        s.tube([[-inner, 0, 0], [0, -0.35, 0.1], [inner, 0, 0]], 0.16, wire);
      } else if (state === 'slow') {
        s.rod([-inner, 0, 0], [inner, 0, 0], 0.3, s.material('#d8d2c2', { roughness: 0.8 }));
        const points: [number, number, number][] = [];
        const turns = Math.round(inner * 1.3);
        for (let k = 0; k <= turns * 8; k++) {
          const t = k / (turns * 8);
          points.push([-inner * 0.72 + t * inner * 1.44, Math.cos(t * turns * Math.PI * 2) * 0.75, Math.sin(t * turns * Math.PI * 2) * 0.75]);
        }
        s.tube(points, 0.13, copper);
        s.ball([0.9, 0.9, 0.9], [inner * 0.76, 0, 0], tin, 10);
      } else if (state === 'blown') {
        for (const side of [-1, 1]) {
          const reach = inner * (0.3 + random() * 0.3);
          const tip: [number, number, number] = [side * (inner - reach), -r * 0.55, (random() - 0.5) * 1];
          s.tube([[side * inner, 0, 0], [side * (inner - reach * 0.5), -0.2, 0], tip], 0.16, wire);
          s.ball([0.42, 0.42, 0.42], tip, wire, 10);
        }
        const film = new THREE.MeshStandardMaterial({ color: '#4a4a48', roughness: 0.6, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
        const haze = s.mesh(new THREE.CylinderGeometry(r - 0.12, r - 0.12, inner * 0.5, 20, 1, true), film);
        haze.rotation.z = Math.PI / 2; haze.castShadow = false;
      } else {
        // Vaporised: metal plated onto the inside of the glass in a ragged cloud.
        const smear = paint(256, 256, (ctx, cw, ch) => {
          ctx.clearRect(0, 0, cw, ch);
          for (let k = 0; k < 90; k++) {
            const x = cw * (0.5 + (random() - 0.5) * (0.3 + random() * 0.55)), y = random() * ch, radius = 10 + random() * 46;
            const cloud = ctx.createRadialGradient(x, y, 0, x, y, radius);
            const silver = random() < 0.55;
            cloud.addColorStop(0, silver ? 'rgba(215,218,220,0.85)' : 'rgba(20,18,16,0.9)');
            cloud.addColorStop(1, silver ? 'rgba(215,218,220,0)' : 'rgba(20,18,16,0)');
            ctx.fillStyle = cloud;
            ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
          }
        });
        smear.wrapT = THREE.RepeatWrapping;
        const film = new THREE.MeshStandardMaterial({ map: smear, metalness: 0.5, roughness: 0.35, transparent: true, depthWrite: false, side: THREE.DoubleSide });
        const plated = s.mesh(new THREE.CylinderGeometry(r - 0.1, r - 0.1, inner * 2, 24, 1, true), film);
        plated.rotation.z = Math.PI / 2; plated.castShadow = false;
        for (const side of [-1, 1]) s.ball([0.5, 0.5, 0.5], [side * (inner - 0.3), -0.4, 0], wire, 8);
      }
    });

    const ceramic = a.size === 'ceramic';
    const fuse = cartridge(a.state, ceramic);
    fuse.position.set(0, axis, 0);
    fuse.rotation.x = random() * 0.6;

    // Clips: a sprung C of brass open at the top, on a foot with two legs.
    const profile = new THREE.Shape();
    const open = 0.92, outer = r + 1.15, grip = r + 0.38;
    profile.absarc(0, 0, outer, Math.PI / 2 - open, Math.PI / 2 + open, true);
    profile.absarc(0, 0, grip, Math.PI / 2 + open, Math.PI / 2 - open, false);
    profile.closePath();
    for (const side of [-1, 1]) {
      const geometry = new THREE.ExtrudeGeometry(profile, { depth: cap - 1.2, bevelEnabled: false, curveSegments: 20 });
      geometry.translate(0, 0, -(cap - 1.2) / 2);
      geometry.rotateY(Math.PI / 2);
      s.mesh(geometry, brass, [side * clipX, axis, 0]);
      for (const lip of [-1, 1]) {
        const flare = s.box([cap - 1.2, 2.2, 0.75], [side * clipX, axis + Math.cos(open) * outer + 0.8, lip * (Math.sin(open) * outer + 0.55)], brass);
        flare.rotation.x = lip * 0.6;
      }
      s.box([cap - 1.2, axis - outer + 0.5, 3], [side * clipX, (axis - outer + 0.5) / 2, 0], brass);
      s.box([cap - 1.2, 0.6, 9], [side * clipX, a.base === 'block' ? 2.9 : 0.3, 0], brass);
      if (a.base !== 'block') for (const z of [-3.4, 3.4]) solder(s, side * clipX, z, tin, 0.9);
      else { s.cylinder(1.1, 1.1, 0.5, [side * clipX, 3.3, 3.2], tin, 8); }
    }
    if (a.base === 'block') {
      s.box([len + 7, 2.6, 12], [0, 1.3, 0], black);
      for (const side of [-1, 1]) s.box([1.2, 6, 12], [side * (len / 2 + 2.9), 3, 0], black);
    } else if (a.base === 'cover') {
      const clear = new THREE.MeshPhysicalMaterial({ color: '#e8f2f4', roughness: 0.15, transparent: true, opacity: 0.4 });
      const hood = s.mesh(new THREE.CylinderGeometry(r + 2.6, r + 2.6, len + 3, 20, 1, false, 0, Math.PI), clear, [0, 1.6, d / 2 - 7.5]);
      hood.rotation.set(0, 0, Math.PI / 2);
      hood.rotation.x = Math.PI * 0.5 + 0.3;
      hood.scale.x = 0.55;
    }

    if (a.state === 'shattered' && !ceramic) {
      const shard = new THREE.MeshStandardMaterial({ color: '#cfe6e2', roughness: 0.1, transparent: true, opacity: 0.6 });
      for (let k = 0; k < 22; k++) {
        const piece = s.mesh(new THREE.ConeGeometry(0.6 + random() * 1.3, 0.25, 3), shard, [(random() - 0.5) * (len + 6), 0.14, (random() - 0.5) * 16]);
        piece.rotation.y = random() * 6;
        piece.scale.z = 0.5 + random();
      }
    } else if (a.state === 'shattered') {
      const chalk = s.material('#ece8dc', { roughness: 0.8 });
      for (let k = 0; k < 14; k++) {
        const size = 0.7 + random() * 1.8;
        s.box([size, size * 0.5, size * 0.8], [(random() - 0.5) * (len + 2), 0.3, (random() - 0.5) * 13], chalk).rotation.set(random(), random() * 3, random());
      }
      for (let k = 0; k < 40; k++) s.ball([0.35, 0.25, 0.35], [(random() - 0.5) * len * 0.8, 0.12, (random() - 0.5) * 9], s.material('#d9cfae', { roughness: 1 }), 6);
    }

    if (a.bridged) {
      // The dangerous fix: a strand twisted round each cap and slung across the top.
      for (const side of [-1, 1]) for (let turn = 0; turn < 3; turn++) {
        const loop = s.ring(r + 0.3, 0.24, [side * (len / 2 - cap - 0.5 - turn * 0.6), axis, 0], copper);
        loop.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.25;
      }
      const from = len / 2 - cap - 1;
      s.tube([[-from, axis + r + 0.5, 0.3], [-from * 0.5, axis + r + 2 + random() * 1.5, 1.2], [from * 0.3, axis + r + 1.2, -0.8], [from, axis + r + 0.5, 0.2]], 0.26, copper);
      s.tube([[from, axis + r + 0.5, 0.2], [from + 1.5, axis + r + 2.5, 1], [from + 0.5, axis + r + 4, 2]], 0.24, copper);
    }
    if (a.spare) {
      const extra = cartridge('intact', ceramic);
      extra.position.set((random() - 0.5) * 6, r + 0.3, d / 2 - 4.5);
      extra.rotation.y = (random() - 0.5) * 0.7;
    }

    s.root.scale.setScalar(0.001);
    return s.finish();
  },
});
