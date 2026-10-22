import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { type Blob, type V, beam, clump, fuse, instances, limb, v } from './parts';

export default defineThing({
  questions: {
    anchors: choice('What is it slung between?', {
      trunks: 'Two living tree trunks with small ring platforms lashed round them, high in a canopy.',
      posts: 'Timber gate-frames staked and guyed into the ground, the classic gorge bridge.',
      cliffs: 'Two rock outcrops, the ropes tied off round boulders at the lip of a drop.',
      towers: 'Lashed bamboo scaffold towers, improvised and springy.',
    }),
    length: score('How long is the span?', ['A short hop of eight metres', 'Sixteen metres', 'A long nervous twenty-five metres']),
    sag: score('How much does it sag?', ['Pulled nearly taut', 'An easy belly', 'A deep swooping curve you climb out of']),
    deck: choice('What do you walk on?', {
      planks: 'Flat sawn boards laid crosswise.',
      bamboo: 'Round bamboo poles lashed side by side.',
      ladder: 'Aluminium ladder sections with a narrow board on top, as on a research canopy walkway.',
      footrope: 'No deck at all: a single thick foot-rope inside a V of netting.',
    }),
    sides: choice('What are the sides like?', {
      net: 'Diamond netting from hand rope to deck, like a fishing net.',
      droppers: 'Plain vertical ropes at every stride.',
      bare: 'Nothing but the two hand ropes: open air on both sides.',
      vines: 'Woven lianas and creepers, half grown into place.',
    }),
    story: choice('What state is the crossing in?', {
      sound: 'Sound and in use, every board where it should be.',
      gaps: 'Neglected: boards missing here and there, gaps you have to step across.',
      listing: 'One hand rope has snapped and hangs loose; the deck twists sideways mid-span.',
      severed: 'Cut through: the two halves hang down from their anchors, no way across.',
      mended: 'Freshly mended, with bright new boards and new rope among the old.',
    }),
    crosser: choice('Who or what is on it right now?', {
      nobody: 'Nobody: it hangs empty.',
      walker: 'One small figure partway across, gripping both ropes.',
      lantern: 'A lit lantern hung at mid-span to mark the way.',
      flags: 'Strings of small bright flags or ribbons tied along the hand ropes.',
      pack: 'An abandoned pack left on the boards.',
      monkey: 'A long-tailed monkey sitting on the hand rope as if it owned it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * random();

    const L = mix(8, 26, a.length) * rnd(0.92, 1.08);
    const h0 = { trunks: 7, posts: 3.4, cliffs: 5, towers: 5.5 }[a.anchors] + L * 0.05;
    const sag = Math.min(mix(0.035, 0.2, a.sag) * L, h0 - 0.7);
    const half = L / 2;
    const severed = a.story === 'severed', listing = a.story === 'listing';

    const woodTone = new THREE.Color('#6b4c31').lerp(new THREE.Color('#8a5a34'), mood.warmth * 0.6).lerp(new THREE.Color('#77736a'), mood.wear * 0.55);
    const wood = s.material(woodTone, { roughness: 0.85 });
    const newWood = s.material('#e3c990', { roughness: 0.7 });
    const ropeTone = new THREE.Color('#c9a66b').lerp(new THREE.Color('#7d6f55'), mood.wear * 0.6);
    const rope = s.material(ropeTone, { roughness: 0.95 });
    const newRope = s.material('#3f8fd0', { roughness: 0.7 });
    const metal = s.material('#b4bcc0', { metalness: 0.6, roughness: 0.4 });

    // Deck line. For a severed bridge each half swings down and hangs from its anchor.
    const hang = Math.min(L * 0.46, h0 - 0.5);
    const line = (t: number, side = 0): V => {
      if (!severed) return v((t - 0.5) * L, h0 - sag * 4 * t * (1 - t), 0);
      const d = t * hang, swing = 1.6 * (1 - Math.exp(-d / 1.4));
      return v(side * (half - swing), h0 - Math.max(0, d - swing * 0.75) - 0.25 * (1 - Math.exp(-d)), 0);
    };
    const runs = severed ? [-1, 1] : [0];
    const roll = (t: number) => (listing ? Math.sin(Math.PI * t) * 0.55 : 0) + Math.sin(t * 9 + L) * 0.03;
    const railHeight = severed ? 0.4 : 1.05, deckHalf = a.deck === 'footrope' ? 0.04 : a.deck === 'ladder' ? 0.3 : 0.48, railHalf = a.deck === 'footrope' ? 0.5 : 0.62;

    const span = new THREE.Group();
    span.position.y = h0;
    s.root.add(span);
    const addSpan = (g: THREE.BufferGeometry, material: THREE.Material) => {
      g.translate(0, -h0, 0);
      const mesh = new THREE.Mesh(g, material);
      mesh.castShadow = mesh.receiveShadow = true;
      span.add(mesh);
    };

    const oldBoards: THREE.BufferGeometry[] = [], freshBoards: THREE.BufferGeometry[] = [], ropes: THREE.BufferGeometry[] = [], freshRopes: THREE.BufferGeometry[] = [], net: THREE.BufferGeometry[] = [], metalParts: THREE.BufferGeometry[] = [];
    const missChance = { sound: 0, gaps: 0.18, listing: 0.14, severed: 0.2, mended: 0.02 }[a.story] + mood.wear * 0.1;
    let frameAt: { p: V; up: V; side: V; tan: V }[] = [];

    for (const run of runs) {
      const length = severed ? hang : L;
      const steps = Math.max(8, Math.round(length / 0.34));
      const frames: { p: V; up: V; side: V; tan: V }[] = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const p = line(t, run);
        const tan = line(Math.min(1, t + 0.01), run).sub(line(Math.max(0, t - 0.01), run)).normalize();
        const n = v(-tan.y, tan.x, 0);
        if (n.y < 0 && !severed) n.negate();
        if (severed && run > 0) n.negate();
        const r = severed ? 0 : roll(t);
        const z = v(0, 0, 1);
        frames.push({ p, tan, side: z.clone().multiplyScalar(Math.cos(r)).addScaledVector(n, Math.sin(r)), up: n.clone().multiplyScalar(Math.cos(r)).addScaledVector(z, -Math.sin(r)) });
      }
      if (!severed) frameAt = frames;
      const at = (f: (typeof frames)[number], up: number, side: number) => f.p.clone().addScaledVector(f.up, up).addScaledVector(f.side, side);

      // Boards.
      let gapRun = 0;
      frames.forEach((f, i) => {
        if (i === 0 || i === steps) return;
        const missing = random() < missChance && gapRun < 3;
        gapRun = missing ? gapRun + 1 : 0;
        if (a.deck === 'footrope') return;
        if (a.deck === 'ladder') {
          if (i % 1 === 0) metalParts.push(beam(at(f, 0, -deckHalf), at(f, 0, deckHalf), 0.03, 0.03));
          if (!missing) oldBoards.push(beam(at(f, 0.04, 0).addScaledVector(f.tan, -0.17), at(f, 0.04, 0).addScaledVector(f.tan, 0.17), 0.3, 0.025));
          return;
        }
        if (missing) return;
        const skew = rnd(-0.05, 0.05) * (1 + mood.wear * 2);
        const from = at(f, 0, -deckHalf - rnd(0, 0.06)).addScaledVector(f.tan, skew), to = at(f, 0, deckHalf + rnd(0, 0.06)).addScaledVector(f.tan, -skew);
        const fresh = a.story === 'mended' && random() < 0.22;
        if (a.deck === 'bamboo') {
          for (const off of [-0.11, 0, 0.11]) {
            const g = new THREE.CylinderGeometry(0.05, 0.05, from.distanceTo(to), 6);
            g.rotateX(Math.PI / 2);
            g.lookAt(to.clone().sub(from));
            const mid = from.clone().add(to).multiplyScalar(0.5).addScaledVector(f.tan, off);
            g.translate(mid.x, mid.y, mid.z);
            (fresh ? freshBoards : oldBoards).push(g);
          }
        } else {
          const g = beam(from, to, 0.06, 0.27);
          (fresh ? freshBoards : oldBoards).push(g);
        }
      });

      // Deck cables, foot rope and hand ropes.
      const stride = 2;
      const pick = (up: number, side: number) => frames.filter((_f, i) => i % stride === 0 || i === steps).map((f) => at(f, up, side));
      if (a.deck === 'footrope') ropes.push(limb(pick(0, 0), 0.075, 0.075, 6, 2));
      else for (const side of [-1, 1]) (a.deck === 'ladder' ? metalParts : ropes).push(limb(pick(-0.03, side * deckHalf), 0.04, 0.04, 5, 2));
      for (const side of [-1, 1]) {
        const snapped = listing && side > 0;
        if (snapped) {
          // The broken hand rope: two loose ends dangling from where they still hold.
          const cut = Math.floor(steps * rnd(0.4, 0.6));
          for (const [from, to] of [[0, cut - 2], [steps, cut + 2]] as const) {
            const pts = frames.slice(Math.min(from, to), Math.max(from, to) + 1).filter((_f, i) => i % stride === 0).map((f) => at(f, railHeight, side * railHalf));
            if (from > to) pts.reverse();
            const n = pts.length;
            pts.forEach((p, i) => { const k = Math.max(0, i / (n - 1) - 0.35) / 0.65; p.y -= k * k * (railHeight + 2.2); p.z += k * 0.5; });
            if (n > 2) ropes.push(limb(pts, 0.045, 0.045, 5, 2));
          }
          continue;
        }
        const pts = pick(railHeight, side * railHalf);
        (a.story === 'mended' && side < 0 ? freshRopes : ropes).push(limb(pts, 0.048, 0.048, 5, 2));
      }

      // Sides.
      const cell = a.deck === 'footrope' ? 1 : 2;
      for (const side of [-1, 1]) {
        if (listing && side > 0) continue;
        for (let i = 0; i + cell <= steps; i += cell) {
          const f = frames[i], g = frames[i + cell], m = frames[i + Math.floor(cell / 2)];
          const top0 = at(f, railHeight, side * railHalf), top1 = at(g, railHeight, side * railHalf);
          const low0 = at(f, 0, side * deckHalf), low1 = at(g, 0, side * deckHalf);
          if (a.sides === 'net' || a.deck === 'footrope') {
            const midTop = at(m, railHeight * 0.5, side * (railHalf + deckHalf) / 2);
            net.push(beam(top0, midTop, 0.022, 0.022), beam(midTop, low1, 0.022, 0.022), beam(low0, midTop, 0.022, 0.022), beam(midTop, top1, 0.022, 0.022));
          } else if (a.sides === 'droppers') {
            if ((i / cell) % 2 === 0) net.push(beam(top0, low0, 0.03, 0.03));
          } else if (a.sides === 'vines') {
            const wob = () => v(rnd(-0.12, 0.12), rnd(-0.1, 0.1), rnd(-0.05, 0.05));
            net.push(limb([top0, top0.clone().lerp(low1, 0.5).add(wob()), low1], 0.02, 0.014, 4, 2));
            if (random() < 0.6) net.push(limb([low0, low0.clone().lerp(top1, 0.5).add(wob()), top1], 0.016, 0.012, 4, 2));
          } else if ((i / cell) % 6 === 0) net.push(beam(top0, low0, 0.03, 0.03));
        }
      }
    }

    if (oldBoards.length) addSpan(fuse(oldBoards), wood);
    if (freshBoards.length) addSpan(fuse(freshBoards), newWood);
    if (ropes.length) addSpan(fuse(ropes), rope);
    if (freshRopes.length) addSpan(fuse(freshRopes), newRope);
    if (metalParts.length) addSpan(fuse(metalParts), metal);
    if (net.length) addSpan(fuse(net), a.sides === 'vines' ? s.material('#55683a', { roughness: 0.9 }) : rope);

    // Vines and moss beards hang from old bridges in thick air.
    const beards: Blob[] = [];
    if (!severed) {
      const count = Math.round(mix(0, 14, mood.density) * (a.sides === 'vines' ? 1.6 : 1) * mix(0.4, 1, mood.wear));
      for (let i = 0; i < count; i++) {
        const f = frameAt[Math.floor(rnd(0.05, 0.95) * frameAt.length)];
        const len = rnd(0.4, 1.3);
        beards.push({ at: f.p.clone().add(v(0, -len * 0.5 - h0, rnd(-0.45, 0.45))), size: v(0.1, len * 0.5, 0.1), color: new THREE.Color('#6f8748').offsetHSL(rnd(-0.03, 0.03), 0, rnd(-0.06, 0.06)) });
      }
      if (beards.length) span.add(instances(clump(1, 0.25), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), beards));
    }

    // Who is on it.
    const mid = severed ? null : frameAt[Math.floor(frameAt.length * rnd(0.38, 0.62))];
    const on = new THREE.Group();
    span.add(on);
    const put = (mesh: THREE.Mesh) => { s.root.remove(mesh); on.add(mesh); mesh.position.y -= h0; return mesh; };
    let glow: THREE.MeshStandardMaterial | null = null;
    if (a.crosser === 'walker') {
      const f = mid ?? { p: v(-half - 0.6, h0, 0) };
      const { x, y } = f.p;
      const coat = s.material(mood.cheer > 0.5 ? '#d8472b' : '#3b4a57'), dark = s.material('#2b2a28'), skin = s.material('#c99a72');
      put(s.rod([x - 0.08, y + 0.05, -0.12], [x, y + 0.85, -0.1], 0.07, dark));
      put(s.rod([x + 0.25, y + 0.05, 0.12], [x, y + 0.85, 0.1], 0.07, dark));
      put(s.box([0.3, 0.62, 0.42], [x, y + 1.15, 0], coat));
      put(s.ball([0.13, 0.15, 0.13], [x + 0.03, y + 1.62, 0], skin, 12));
      put(s.cylinder(0.2, 0.22, 0.05, [x + 0.03, y + 1.75, 0], s.material('#d9c48a'), 12));
      put(s.rod([x, y + 1.38, -0.22], [x + 0.2, y + railHeight + 0.02, -railHalf], 0.045, coat));
      put(s.rod([x, y + 1.38, 0.22], [x + 0.2, y + railHeight + 0.02, railHalf * (listing ? 0.4 : 1)], 0.045, coat));
      put(s.box([0.2, 0.42, 0.34], [x - 0.24, y + 1.18, 0], s.material('#6b7a3c')));
    }
    if (a.crosser === 'pack') {
      const f = mid ?? { p: v(-half - 0.7, h0, 0) };
      put(s.box([0.36, 0.55, 0.4], [f.p.x, f.p.y + 0.3, 0.1], s.material('#c2562b'))).rotation.z = 0.25;
      put(s.box([0.38, 0.14, 0.42], [f.p.x - 0.06, f.p.y + 0.6, 0.1], s.material('#7a3a22'))).rotation.z = 0.25;
      put(s.cylinder(0.07, 0.07, 0.42, [f.p.x + 0.1, f.p.y + 0.7, 0.1], s.material('#4f6f8f'), 10)).rotation.x = Math.PI / 2;
    }
    if (a.crosser === 'lantern') {
      const f = mid ?? { p: v(-half, h0 + 0.4, 0) };
      glow = s.material('#ffd98a', { emissive: '#ffb347', emissiveIntensity: 1.6 });
      const y = f.p.y + (severed ? 1.3 : railHeight - 0.42);
      put(s.rod([f.p.x, y + 0.4, -railHalf], [f.p.x, y + 0.12, -railHalf], 0.012, metal));
      put(s.cylinder(0.09, 0.11, 0.22, [f.p.x, y, -railHalf], glow, 10));
      put(s.cylinder(0.13, 0.13, 0.03, [f.p.x, y + 0.12, -railHalf], s.material('#2c2f33'), 10));
      put(s.cylinder(0.12, 0.12, 0.03, [f.p.x, y - 0.12, -railHalf], s.material('#2c2f33'), 10));
    }
    if (a.crosser === 'monkey' ) {
      const f = mid ?? { p: v(-half - 0.4, h0 + 0.6, 0) };
      const fur = s.material('#7c6a55'), face = s.material('#d8c3a5');
      const y = f.p.y + (severed ? 1.0 : railHeight), z = severed ? 0 : -railHalf;
      put(s.ball([0.16, 0.22, 0.16], [f.p.x, y + 0.2, z], fur, 12));
      put(s.ball([0.11, 0.11, 0.11], [f.p.x + 0.04, y + 0.48, z], fur, 12));
      put(s.ball([0.06, 0.06, 0.05], [f.p.x + 0.1, y + 0.46, z], face, 8));
      put(s.tube([[f.p.x - 0.1, y + 0.05, z], [f.p.x - 0.25, y - 0.3, z], [f.p.x - 0.2, y - 0.7, z + 0.05], [f.p.x - 0.3, y - 0.95, z]], 0.025, fur));
      put(s.rod([f.p.x + 0.05, y + 0.1, z], [f.p.x + 0.22, y - 0.02, z], 0.035, fur));
    }
    if (a.crosser === 'flags' && !severed) {
      const flags: Blob[] = [];
      const colours = mood.cheer > 0.35 ? ['#e3b21c', '#c9302c', '#f1ece0', '#2c7fb8', '#3c9a4a'] : ['#d9d4c7', '#9a968c', '#6f6a62'];
      frameAt.forEach((f, i) => {
        if (i % 2) return;
        for (const side of listing ? [-1] : [-1, 1]) {
          const p = f.p.clone().addScaledVector(f.up, railHeight - 0.17).addScaledVector(f.side, side * railHalf);
          p.y -= h0;
          flags.push({ at: p, size: v(0.26, 0.3, 1), color: colours[(i / 2 + (side > 0 ? 2 : 0)) % colours.length], tilt: new THREE.Euler(rnd(-0.2, 0.2), 0, Math.atan2(f.tan.y, f.tan.x) + rnd(-0.15, 0.15)) });
        }
      });
      span.add(instances(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), flags));
    }

    // Anchors.
    const stone = s.material(new THREE.Color('#8f8d84').lerp(new THREE.Color('#a39274'), mood.warmth * 0.5), { roughness: 0.95, flatShading: true });
    const bark = s.material(new THREE.Color('#7b6a55').lerp(new THREE.Color('#6a705a'), mood.wear * 0.5), { roughness: 0.95 });
    const leafMaterial = new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true });
    const leafTone = new THREE.Color().setHSL(mix(0.36, 0.26, mood.warmth), 0.5, mix(0.2, 0.3, mood.cheer));
    const leaves: Blob[] = [];
    // Rocks and banks are flat-bottomed so they sit on the ground instead of floating as balls.
    const rock = clump(1, 0.3);
    const rp = rock.attributes.position;
    for (let i = 0; i < rp.count; i++) if (rp.getY(i) < 0) rp.setY(i, 0);
    rock.computeVertexNormals();
    const rocks: Blob[] = [];
    const frame: THREE.BufferGeometry[] = [];
    const ties: THREE.BufferGeometry[] = [];
    for (const side of [-1, 1]) {
      const x = side * half;
      if (a.anchors === 'trunks') {
        const tx = x + side * 0.95, r = rnd(0.6, 0.8), topY = h0 + rnd(3.2, 4.6);
        frame.push(limb([v(tx + rnd(-0.3, 0.3), -0.6, rnd(-0.2, 0.2)), v(tx, h0 * 0.5, 0), v(tx, h0, 0), v(tx + side * rnd(0, 0.4), topY, rnd(-0.3, 0.3))], r * 1.25, r * 0.8, 10));
        s.cylinder(1.9, 1.9, 0.09, [tx, h0 - 0.05, 0], wood, 10);
        for (let k = 0; k < 6; k++) {
          const ang = (k / 6) * 6.28;
          ties.push(beam(v(tx + Math.cos(ang) * 1.75, h0 - 0.1, Math.sin(ang) * 1.75), v(tx + Math.cos(ang) * r * 0.9, h0 - 1.5, Math.sin(ang) * r * 0.9), 0.07, 0.07));
          if (Math.cos(ang) * side > -0.3) ties.push(beam(v(tx + Math.cos(ang) * 1.8, h0, Math.sin(ang) * 1.8), v(tx + Math.cos(ang) * 1.8, h0 + 1, Math.sin(ang) * 1.8), 0.05, 0.05));
        }
        s.ring(r * 0.98, 0.06, [tx, h0 + railHeight, 0], rope).rotation.x = Math.PI / 2;
        s.ring(r * 1.02, 0.06, [tx, h0 + 0.25, 0], rope).rotation.x = Math.PI / 2;
        for (let k = 0; k < 5; k++) {
          const size = rnd(1.3, 2.1);
          leaves.push({ at: v(tx + rnd(-1.6, 1.6), topY + rnd(-0.6, 0.8), rnd(-1.6, 1.6)), size: v(size, size * 0.6, size), color: leafTone.clone().offsetHSL(rnd(-0.02, 0.02), 0, rnd(-0.04, 0.05)), turn: rnd(0, 6) });
        }
      } else if (a.anchors === 'posts') {
        for (const z of [-0.8, 0.8]) {
          frame.push(beam(v(x + side * 0.1, -0.4, z * 1.15), v(x, h0 + 1.9, z), 0.2, 0.2));
          ties.push(limb([v(x, h0 + 1.7, z), v(x + side * 3, h0 * 0.6, z * 2.2), v(x + side * 5.6, 0.05, z * 3.6)], 0.04, 0.04, 5));
          frame.push(beam(v(x + side * 5.6, -0.2, z * 3.6), v(x + side * 5.8, 0.5, z * 3.65), 0.12, 0.12));
        }
        frame.push(beam(v(x, h0 + 1.65, -1.05), v(x, h0 + 1.65, 1.05), 0.18, 0.18));
        frame.push(beam(v(x, h0 - 0.12, -1), v(x, h0 - 0.12, 1), 0.16, 0.16));
        // An earth ramp up to the deck.
        rocks.push({ at: v(x + side * 3.1, 0, rnd(-0.3, 0.3)), size: v(3.2, h0 * 0.97, 3), color: new THREE.Color('#7d8055').lerp(new THREE.Color('#8a7a5f'), mood.wear * 0.6), turn: rnd(0, 6) });
        rocks.push({ at: v(x + side * 4.6, 0, rnd(-1.5, 1.5)), size: v(2.2, h0 * 0.5, 2.4), color: new THREE.Color('#72784d').lerp(new THREE.Color('#8a7a5f'), mood.wear * 0.6), turn: rnd(0, 6) });
      } else if (a.anchors === 'cliffs') {
        for (let k = 0; k < 7; k++) {
          const hgt = h0 * rnd(0.55, 1.02) * (k === 0 ? 1 : rnd(0.5, 1));
          const dx = k === 0 ? 1.5 : rnd(1.2, 4.2);
          rocks.push({ at: v(x + side * (k === 0 ? 1.7 : dx + 0.6), 0, k === 0 ? 0 : rnd(-2.4, 2.4)), size: v(rnd(1.6, 2.3), k === 0 ? h0 * 1.02 : hgt * 0.95, rnd(1.7, 2.5)), color: new THREE.Color('#8f8d84').lerp(new THREE.Color('#a39274'), mood.warmth * 0.5).offsetHSL(0, 0, rnd(-0.05, 0.05)), turn: rnd(0, 6) });
        }
        for (const z of [-0.75, 0.75]) frame.push(beam(v(x + side * 0.9, h0 - 1.4, z), v(x + side * 0.6, h0 + 1.35, z), 0.16, 0.16));
        if (mood.density > 0.3) for (let k = 0; k < 3; k++) { const size = rnd(0.6, 1.1); leaves.push({ at: v(x + side * rnd(1.5, 4), h0 * rnd(0.75, 1.05), rnd(-2, 2)), size: v(size, size * 0.6, size), color: leafTone.clone().offsetHSL(rnd(-0.02, 0.02), 0, rnd(-0.04, 0.05)), turn: rnd(0, 6) }); }
      } else {
        const cx = x + side * 1.05, w = 0.95;
        for (const dx of [-w, w]) for (const z of [-w, w]) frame.push(beam(v(cx + dx * 1.25, -0.3, z * 1.25), v(cx + dx, h0 + 1.8 + rnd(0, 0.5), z), 0.11, 0.11));
        for (const z of [-w, w]) {
          frame.push(beam(v(cx - w * 1.2, h0 * 0.12, z * 1.2), v(cx + w * 1.03, h0 * 0.9, z), 0.07, 0.07), beam(v(cx + w * 1.2, h0 * 0.12, z * 1.2), v(cx - w * 1.03, h0 * 0.9, z), 0.07, 0.07));
          frame.push(beam(v(cx - w - 0.2, h0 * 0.5, z * 1.1), v(cx + w + 0.2, h0 * 0.5, z * 1.1), 0.07, 0.07));
        }
        for (const dx of [-w, w]) frame.push(beam(v(cx + dx * 1.2, h0 * 0.12, -w * 1.2), v(cx + dx * 1.03, h0 * 0.9, w), 0.07, 0.07), beam(v(cx + dx, h0 + 1.5, -w - 0.2), v(cx + dx, h0 + 1.5, w + 0.2), 0.07, 0.07));
        s.box([w * 2.4, 0.08, w * 2.4], [cx, h0 - 0.05, 0], wood);
        // A ladder up the outer face.
        for (let k = 1; k < Math.floor(h0 / 0.45); k++) frame.push(beam(v(cx + side * (w * 1.25 - k * 0.45 * 0.25 * w / h0 + 0.05), k * 0.45, -0.3), v(cx + side * (w * 1.25 - k * 0.45 * 0.25 * w / h0 + 0.05), k * 0.45, 0.3), 0.05, 0.05));
      }
    }
    if (frame.length) s.mesh(fuse(frame), a.anchors === 'trunks' ? bark : a.anchors === 'towers' ? s.material(new THREE.Color('#c9b46a').lerp(new THREE.Color('#8d8a6c'), mood.wear * 0.6)) : wood);
    if (ties.length) s.mesh(fuse(ties), a.anchors === 'trunks' ? wood : rope);
    if (rocks.length) s.root.add(instances(rock, stone, rocks));
    if (leaves.length) s.root.add(instances(clump(), leafMaterial, leaves));

    const energy = mood.energy, flicker = glow;
    return s.finish({
      footprint: half + 1,
      update: (_dt, time) => {
        span.rotation.x = Math.sin(time * 1.1) * mix(0.004, 0.07, energy) * (severed ? 0.3 : 1);
        if (flicker) flicker.emissiveIntensity = 1.5 + Math.sin(time * 9) * 0.25 * energy;
      },
    });
  },
});
