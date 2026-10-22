import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { halo, lamp, paint, shade, skin, weather, write } from './paint';

const LIVERY = {
  orange: 'Black hull under a bright orange wheelhouse, the classic pilot cutter.',
  yellow: 'Navy hull and a yellow wheelhouse.',
  white: 'White all over with a red stripe, a tidy modern launch.',
  green: 'Dark green hull and cream upperworks, an old wooden harbour launch still in service.',
  grey: 'Plain grey from waterline to masthead, officious.',
  red: 'Rescue red hull with a white wheelhouse, a northern boat.',
} as const;
const PAINT: Record<keyof typeof LIVERY, { hull: string; house: string; ink: string; stripe: string }> = {
  orange: { hull: '#1d1f22', house: '#f0641a', ink: '#f4f1e6', stripe: '#f0641a' },
  yellow: { hull: '#1c2f55', house: '#f0c21c', ink: '#f4f1e6', stripe: '#f0c21c' },
  white: { hull: '#ecebe4', house: '#f1f0ea', ink: '#1c2f55', stripe: '#c22a22' },
  green: { hull: '#1f4a38', house: '#e9dfc2', ink: '#e9dfc2', stripe: '#c9a23a' },
  grey: { hull: '#767e84', house: '#8b9398', ink: '#f1f1ee', stripe: '#3a4046' },
  red: { hull: '#c22a22', house: '#f1f0ea', ink: '#f4f1e6', stripe: '#f4f1e6' },
};

export default defineThing({
  questions: {
    livery: choice('What livery does the launch wear?', LIVERY),
    doing: choice('What is it doing?', {
      arriving: 'Arriving at speed, bow up, white bow wave and a long wake.',
      idling: 'Idling on station, rocking gently in rings of ripples.',
      tied: 'Tied up alongside a floating pontoon, lines made fast, engine off.',
      boarding: 'Pressed against the towering flank of a ship while the pilot climbs a rope ladder.',
      drifting: 'Drifting with nobody at the wheel and no lights, slightly side-on.',
    }),
    wording: choice('What is written along the hull and wheelhouse?', {
      pilot: 'PILOT in big block letters.',
      pilots: 'PILOTS.',
      lotse: 'LOTSE, a German river mouth.',
      pilote: 'PILOTE, a French channel port.',
      name: 'Only a boat name, hand-lettered.',
      number: 'Just a service number.',
    }),
    crew: choice('Who can be seen on deck?', {
      nobody: 'Nobody: everyone is inside or gone.',
      deckhand: 'One deckhand in hi-vis holding a boathook.',
      pilot: 'The pilot in a dark coat with a bag, waiting at the rail.',
      both: 'A deckhand and the pilot together.',
      dog: 'A ship dog standing on the foredeck, nose to the wind.',
    }),
    lights: choice('What lights is it showing?', {
      pilot: 'White over red at the masthead: the pilot signal, plus side lights.',
      search: 'A searchlight on the roof throwing a beam ahead.',
      anchor: 'A single white light.',
      blue: 'A flashing blue light, on urgent business.',
      dark: 'None at all.',
    }),
    fenders: choice('What hangs along the sides?', {
      tyres: 'A row of old lorry tyres on ropes.',
      rubber: 'A heavy continuous rubber belting, no tyres.',
      balls: 'Fat orange inflatable ball fenders.',
      rope: 'Old woven rope fenders, tan and frayed.',
    }),
    water: choice('What is the water like?', {
      harbour: 'Flat oily harbour water, grey-green.',
      choppy: 'Short grey chop with whitecaps.',
      glow: 'Calm, with long orange and white reflections of quay lights.',
      ice: 'Dark water with plates of thin ice.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const b = new Sculpture(context);
    const { mood, random } = context;
    const dusk = Math.min(1, Math.abs(mood.daylight - 0.5) * 2);
    const p = PAINT[a.livery];
    const L = 13.6, B = 4.3, N = 30;
    const steel = b.material('#9aa1a5', { metalness: 0.6, roughness: 0.4 });
    const black = b.material('#16181a', { roughness: 0.9 });
    const deckPaint = b.material(a.livery === 'green' ? '#8c6a45' : '#5d666a');
    const house = b.material(p.house, { roughness: 0.5 });
    const lightsOn = a.lights !== 'dark' && a.doing !== 'drifting';
    const manned = a.doing !== 'tied' && a.doing !== 'drifting';
    const name = ['ST ELMO', 'KITTIWAKE', 'RESOLVE', 'MARGIT', 'ESTRELLA', 'PATHFINDER'][Math.floor(random() * 6)];
    const words = { pilot: 'PILOT', pilots: 'PILOTS', lotse: 'LOTSE', pilote: 'PILOTE', name, number: `P ${10 + Math.floor(random() * 80)}` }[a.wording];

    // Hull shell from waterline to gunwale.
    const half = (u: number) => Math.max(0.04, (B / 2) * (u < 0.5 ? mix(0.9, 1, u / 0.5) : Math.pow(Math.cos(((u - 0.5) / 0.5) * Math.PI / 2), 0.7)));
    const sheer = (u: number) => 1.25 + 0.85 * Math.pow(Math.max(0, (u - 0.4) / 0.6), 2);
    const rows = [[0, 0.78], [0.4, 0.94], [1, 1]] as const;
    const point = (u: number, row: number, side: number): [number, number, number] => {
      const [yf, bf] = rows[row];
      return [side * half(u) * bf, yf * sheer(u), -L / 2 + u * L - (1 - yf) * 1.1 * u * u * u];
    };
    const positions: number[] = [], uvs: number[] = [], index: number[] = [];
    for (const side of [1, -1]) {
      const start = positions.length / 3;
      for (let i = 0; i <= N; i++) for (let j = 0; j < 3; j++) {
        positions.push(...point(i / N, j, side));
        uvs.push(side > 0 ? 1 - i / N : i / N, rows[j][0]);
      }
      for (let i = 0; i < N; i++) for (let j = 0; j < 2; j++) {
        const q = start + i * 3 + j;
        if (side > 0) index.push(q, q + 1, q + 3, q + 1, q + 4, q + 3);
        else index.push(q, q + 3, q + 1, q + 1, q + 3, q + 4);
      }
    }
    const hullGeometry = new THREE.BufferGeometry();
    hullGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    hullGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    hullGeometry.setIndex(index);
    hullGeometry.computeVertexNormals();
    const hullTex = paint(1024, 128, (ctx, w, h) => {
      ctx.fillStyle = p.hull; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = p.stripe; ctx.fillRect(0, h * 0.2, w, h * 0.09);
      ctx.fillStyle = '#7a2a22'; ctx.fillRect(0, h * 0.86, w, h * 0.14);
      write(ctx, words, w * 0.52, h * 0.58, h * 0.46, p.ink, a.wording === 'name' ? 'italic bold SIZEpx serif' : 'bold SIZEpx sans-serif', w * 0.34);
      weather(ctx, w, h, random, mood.wear);
      ctx.fillStyle = 'rgba(60,80,60,0.5)'; ctx.fillRect(0, h * 0.93, w, h * 0.07);
    });
    b.mesh(hullGeometry, skin(hullTex, { side: THREE.DoubleSide, roughness: 0.6 }));
    // Transom and deck.
    const transom = new THREE.BufferGeometry();
    const tp: number[] = [];
    for (let j = 0; j < 3; j++) tp.push(...point(0, j, -1), ...point(0, j, 1));
    transom.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
    transom.setIndex([0, 2, 1, 1, 2, 3, 2, 4, 3, 3, 4, 5]);
    transom.computeVertexNormals();
    b.mesh(transom, new THREE.MeshStandardMaterial({ color: p.hull, side: THREE.DoubleSide, roughness: 0.7 }));
    const deckY = (u: number) => sheer(u) - 0.3;
    const dp: number[] = [], di: number[] = [];
    for (let i = 0; i <= N; i++) { const u = i / N; dp.push(-half(u) * 0.98, deckY(u), -L / 2 + u * L, half(u) * 0.98, deckY(u), -L / 2 + u * L); }
    for (let i = 0; i < N; i++) di.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
    const deck = new THREE.BufferGeometry();
    deck.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
    deck.setIndex(di);
    deck.computeVertexNormals();
    b.mesh(deck, new THREE.MeshStandardMaterial({ color: deckPaint.color, side: THREE.DoubleSide, roughness: 0.9 }));
    const D = 0.95;

    // Rubbing strake and fenders.
    for (const side of [1, -1]) {
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push([side * (half(u) + 0.03), sheer(u) - 0.1, -L / 2 + u * L]); }
      b.tube(pts, a.fenders === 'rubber' ? 0.17 : 0.08, black);
      const count = a.fenders === 'rubber' ? 0 : 3 + Math.round(mood.density * 3);
      for (let i = 0; i < count; i++) {
        const u = 0.1 + (i / Math.max(1, count - 1)) * 0.6 + (random() - 0.5) * 0.03;
        const x = side * (half(u) * 0.98 + 0.13), z = -L / 2 + u * L, y = 0.62 + random() * 0.12;
        if (a.fenders === 'tyres') { b.ring(0.3, 0.12, [x, y, z], black).rotation.y = Math.PI / 2; }
        else if (a.fenders === 'balls') b.ball([0.3, 0.34, 0.3], [x + side * 0.12, y - 0.05, z], b.material('#f0641a', { roughness: 0.5 }), 14);
        else b.cylinder(0.14, 0.14, 0.75, [x, y - 0.05, z], b.material('#b99a62', { roughness: 1 }), 10);
        b.rod([x, y + 0.25, z], [side * half(u), sheer(u), z], 0.015, b.material('#c9b58a'));
      }
    }

    // Trunk cabin and raked wheelhouse.
    const HW = 2.7, hz = 0.9, hy = D + 0.45;
    b.box([3.0, 0.5, 5.8], [0, D + 0.22, hz - 0.5], house);
    const profile = new THREE.Shape([[-1.7, 0], [1.25, 0], [1.25, 0.75], [1.7, 1.95], [-1.55, 1.95]].map(([x, y]) => new THREE.Vector2(x, y)));
    const cabin = new THREE.ExtrudeGeometry(profile, { depth: HW, bevelEnabled: false }).translate(0, 0, -HW / 2).rotateY(-Math.PI / 2);
    b.mesh(cabin, house, [0, hy, hz]);
    b.box([HW + 0.3, 0.1, 3.7], [0, hy + 2.0, hz + 0.05], b.material(shade(p.house, -0.25)));
    const cabinLit = lightsOn && manned;
    const glassTex = (panes: number, helm: boolean) => paint(64 * panes, 64, (ctx, w, h) => {
      for (let i = 0; i < panes; i++) {
        const x = i * 64;
        if (cabinLit) { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffeeb8'); g.addColorStop(1, '#eba14a'); ctx.fillStyle = g; }
        else { const g = ctx.createLinearGradient(x, 0, x + 64, h); g.addColorStop(0, '#3a4c58'); g.addColorStop(0.5, '#5a6e7a'); g.addColorStop(0.56, '#27333c'); g.addColorStop(1, '#1b242b'); ctx.fillStyle = g; }
        ctx.fillRect(x, 0, 64, h);
        if (helm && manned && i === Math.floor(panes / 2)) { ctx.fillStyle = '#1a1512'; ctx.beginPath(); ctx.arc(x + 32, 26, 9, 0, 7); ctx.fill(); ctx.fillRect(x + 18, 36, 28, 30); }
        ctx.strokeStyle = '#15171a'; ctx.lineWidth = 7; ctx.strokeRect(x, 0, 64, h);
      }
    });
    const glass = (panes: number, helm = false) => { const map = glassTex(panes, helm); return new THREE.MeshStandardMaterial({ map, roughness: 0.2, emissiveMap: map, emissive: cabinLit ? '#ffffff' : '#000000', emissiveIntensity: cabinLit ? mix(0.35, 1.0, dusk) : 0 }); };
    const front = b.mesh(new THREE.PlaneGeometry(HW - 0.3, 0.95), glass(3, true), [0, hy + 1.38, hz + 1.5]);
    front.rotation.x = 0.365; front.castShadow = false;
    for (const side of [1, -1]) {
      const pane = b.mesh(new THREE.PlaneGeometry(2.7, 0.75), glass(4), [side * (HW / 2 + 0.012), hy + 1.38, hz - 0.15]);
      pane.rotation.y = side * Math.PI / 2; pane.castShadow = false;
      const board = b.label(words, 1.9, 0.42, [side * (HW / 2 + 0.014), hy + 0.5, hz - 0.2], a.livery === 'white' ? '#1c2f55' : '#f4f1e6', a.livery === 'white' ? '#f1f0ea' : '#1d1f22');
      board.rotation.y = side * Math.PI / 2; board.castShadow = false;
    }
    const back = b.mesh(new THREE.PlaneGeometry(0.7, 1.5), b.material(shade(p.house, -0.3)), [0.5, hy + 0.85, hz - 1.72]);
    back.rotation.y = Math.PI;

    // Roof: radar, searchlight, mast with its lights, aerials, liferaft.
    const roof = hy + 2.05;
    b.cylinder(0.1, 0.14, 0.4, [0, roof + 0.2, hz + 0.7], steel, 10);
    const radar = b.box([1.5, 0.12, 0.16], [0, roof + 0.46, hz + 0.7], b.material('#f1f0ea'));
    b.cylinder(0.3, 0.3, 0.75, [-0.85, roof + 0.32, hz - 1.0], b.material('#f1f0ea'), 14).rotation.x = Math.PI / 2;
    for (const x of [-1.1, 1.15]) b.rod([x, roof, hz - 1.4], [x * 1.1, roof + 2.6 + random() * 0.8, hz - 1.7], 0.02, black, 0.006);
    const mastZ = hz - 0.7, mastTop = roof + 2.7;
    b.rod([0, roof, mastZ], [0, mastTop, mastZ - 0.25], 0.07, steel, 0.045);
    b.rod([-0.8, roof + 1.7, mastZ - 0.16], [0.8, roof + 1.7, mastZ - 0.16], 0.03, steel);
    const lampOn = (colour: string, on: boolean, at: [number, number, number], size = 0.13) => {
      const material = on ? lamp(colour, mix(1.3, 3, dusk)) : b.material('#4a4d4f');
      b.ball([size, size, size], at, material, 12);
      if (on) b.ball([size * 4.2, size * 4.2, size * 4.2], at, halo(colour, mix(0.1, 0.24, dusk)), 12).castShadow = false;
      return material as THREE.MeshStandardMaterial;
    };
    const top: [number, number, number] = [0, mastTop + 0.1, mastZ - 0.26];
    lampOn('#fff6da', lightsOn && a.lights !== 'blue', top);
    if (a.lights === 'pilot' || a.lights === 'dark') lampOn('#ff2a1a', lightsOn && a.lights === 'pilot', [0, mastTop - 0.5, mastZ - 0.14]);
    const blue = a.lights === 'blue' ? lampOn('#2a6bff', lightsOn, [0.5, roof + 0.2, hz - 0.3], 0.16) : null;
    const sides = a.lights === 'pilot' || a.lights === 'search' || a.lights === 'blue';
    b.box([0.08, 0.22, 0.3], [HW / 2 + 0.16, roof - 0.1, hz + 0.6], sides && lightsOn ? lamp('#22e06a', 2) : black);
    b.box([0.08, 0.22, 0.3], [-HW / 2 - 0.16, roof - 0.1, hz + 0.6], sides && lightsOn ? lamp('#ff2a1a', 2) : black);
    b.cylinder(0.2, 0.16, 0.3, [0.8, roof + 0.3, hz + 1.2], steel, 14).rotation.x = Math.PI / 2 - 0.15;
    if (a.lights === 'search' && lightsOn) {
      b.cylinder(0.17, 0.17, 0.03, [0.8, roof + 0.28, hz + 1.36], lamp('#fffbe8', 3), 14).rotation.x = Math.PI / 2 - 0.15;
      const beam = b.mesh(new THREE.ConeGeometry(1.5, 6.5, 18, 1, true).rotateX(-Math.PI / 2).translate(0, 0, 3.25), halo('#fff6d0', mix(0.07, 0.2, dusk)), [0.8, roof + 0.25, hz + 1.4]);
      beam.rotation.x = 0.16; beam.castShadow = false;
    }
    // Pilot flag: white and red halves.
    if (a.doing !== 'drifting') {
      const flagTex = paint(64, 48, (ctx, w, h) => { ctx.fillStyle = '#f4f1e6'; ctx.fillRect(0, 0, w / 2, h); ctx.fillStyle = '#d0281f'; ctx.fillRect(w / 2, 0, w / 2, h); });
      b.mesh(new THREE.PlaneGeometry(0.62, 0.45), skin(flagTex, { side: THREE.DoubleSide }), [-0.8, roof + 1.42, mastZ - 0.48]).rotation.y = Math.PI / 2 + 0.2;
    }

    // Deck fittings: handrails, bitts, engine hatch, stern platform.
    for (const side of [1, -1]) {
      const pts: [number, number, number][] = [];
      const posts: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i <= 8; i++) {
        const u = 0.6 + (i / 8) * 0.385, x = side * Math.max(0.05, half(u) - 0.12), z = -L / 2 + u * L;
        pts.push([x, sheer(u) + 0.75, z]);
        posts.push({ at: [x, sheer(u) + 0.37, z], size: 1 });
      }
      b.tube(pts, 0.03, steel);
      b.scatter(new THREE.CylinderGeometry(0.022, 0.022, 0.76, 6), steel, posts);
      b.rod([side * 1.2, hy + 1.0, hz - 1.75], [side * 1.2, D + 1.0, -L / 2 + 0.5], 0.03, steel);
      b.rod([side * 1.2, D, -L / 2 + 0.5], [side * 1.2, D + 1.0, -L / 2 + 0.5], 0.03, steel);
    }
    b.box([1.9, 0.22, 2.2], [0, D + 0.11, -4.2], b.material(shade(p.house, -0.12)));
    for (const z of [L / 2 - 1.4, -L / 2 + 0.9]) { b.cylinder(0.09, 0.11, 0.42, [0, deckY(z > 0 ? 0.9 : 0.05) + 0.21, z], black, 10); b.rod([-0.22, deckY(z > 0 ? 0.9 : 0.05) + 0.32, z], [0.22, deckY(z > 0 ? 0.9 : 0.05) + 0.32, z], 0.04, black); }
    b.box([3.0, 0.08, 0.7], [0, 0.42, -L / 2 - 0.3], black);
    b.cylinder(0.06, 0.06, 0.5, [-1.1, hy + 2.3, hz - 1.5], black, 8);
    if (mood.density > 0.4) b.ring(0.33, 0.07, [HW / 2 + 0.02, hy + 1.0, hz - 1.4], b.material('#f0641a')).rotation.y = Math.PI / 2;

    // People (and the dog).
    const person = (root: THREE.Object3D, at: [number, number, number], coat: string, hat: string, turn = 0) => {
      const g = new THREE.Group();
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, y: number, x = 0, z = 0) => { const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
      for (const x of [-0.1, 0.1]) add(new THREE.CylinderGeometry(0.08, 0.07, 0.85, 8), b.material('#22262b'), 0.42, x);
      add(new THREE.CapsuleGeometry(0.2, 0.42, 4, 10), b.material(coat), 1.15);
      if (coat === '#f2e21c') add(new THREE.CylinderGeometry(0.205, 0.205, 0.07, 10), b.material('#d9dcdc'), 1.1);
      add(new THREE.SphereGeometry(0.12, 12, 8), b.material('#c99a7a'), 1.68);
      add(new THREE.SphereGeometry(0.13, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), b.material(hat), 1.71);
      g.position.set(...at); g.rotation.y = turn;
      root.add(g);
      return g;
    };
    const foreY = deckY(0.8), foreZ = -L / 2 + 0.8 * L;
    const boarding = a.doing === 'boarding';
    if (a.crew === 'deckhand' || a.crew === 'both') {
      const hand = person(b.root, [boarding ? -0.9 : 0.9, D, -3.0], '#f2e21c', '#f4f1e6', boarding ? -1.2 : 0.6);
      const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.6, 6), b.material('#b98f55'));
      hook.position.set(0.28, 1.3, 0.1); hook.rotation.z = -0.12; hand.add(hook);
    }
    if ((a.crew === 'pilot' || a.crew === 'both') && !boarding) {
      const pilot = person(b.root, [-0.75, foreY, foreZ - 0.3], '#1c2533', '#f4f1e6', -0.5);
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.16), b.material('#6a3d22'));
      bag.position.set(0.3, 0.75, 0); pilot.add(bag);
    }
    if (a.crew === 'dog') {
      const fur = b.material(['#3a2c20', '#d8c9a3', '#1c1c1c'][Math.floor(random() * 3)], { roughness: 1 });
      const z = foreZ + 0.9, y = deckY(0.87);
      b.ball([0.15, 0.16, 0.34], [0, y + 0.42, z], fur, 12);
      b.ball([0.11, 0.11, 0.14], [0, y + 0.64, z + 0.34], fur, 10);
      b.ball([0.05, 0.05, 0.1], [0, y + 0.61, z + 0.47], fur, 8);
      for (const x of [-0.08, 0.08]) { b.cylinder(0.035, 0.03, 0.34, [x, y + 0.17, z + 0.2], fur, 6); b.cylinder(0.035, 0.03, 0.34, [x, y + 0.17, z - 0.22], fur, 6); b.ball([0.035, 0.07, 0.03], [x, y + 0.72, z + 0.3], fur, 6); }
      b.rod([0, y + 0.5, z - 0.3], [0, y + 0.72, z - 0.5], 0.03, fur, 0.015);
    }

    // The water it floats on.
    const R = boarding ? 8.8 : 7.9;
    const waterBase = { harbour: '#4f6660', choppy: '#5b6a70', glow: '#3d4f5e', ice: '#2c3c48' }[a.water];
    const waterTex = paint(1024, 1024, (ctx, w, h) => {
      ctx.fillStyle = waterBase; ctx.fillRect(0, 0, w, h);
      // The disc's cap maps canvas x to world z and canvas y to world -x.
      const k = w / (2 * R), P = (x: number, z: number): [number, number] => [w / 2 + z * k, h / 2 - x * k];
      const dashes = a.water === 'choppy' ? 900 : 380;
      for (let i = 0; i < dashes; i++) {
        ctx.strokeStyle = random() < 0.5 ? shade(waterBase, 0.22) : shade(waterBase, -0.25); ctx.lineWidth = 1.5 + random() * 2.5; ctx.globalAlpha = 0.5;
        const x = random() * w, y = random() * h, len = 8 + random() * 34;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + len / 2, y - 3 - random() * 4, x + len, y); ctx.stroke();
        if (a.water === 'choppy' && random() < 0.16) { ctx.strokeStyle = '#eef4f4'; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x + len * 0.6, y + 2); ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
      if (a.water === 'glow') for (let i = 0; i < 9; i++) {
        const x = random() * w, colour = random() < 0.65 ? '255,170,70' : '255,250,230';
        for (let y = 0; y < h; y += 5) { const wide = 10 + random() * 22; ctx.fillStyle = `rgba(${colour},${0.1 + random() * 0.22})`; ctx.fillRect(x - wide / 2 + Math.sin(y * 0.05 + i) * 5, y, wide, 3); }
      }
      if (a.water === 'ice') for (let i = 0; i < 46; i++) {
        const x = random() * w, y = random() * h, r = 18 + random() * 50;
        if (Math.hypot((x - w / 2) * 0.4, y - h / 2) < 150) continue;
        ctx.fillStyle = 'rgba(226,238,242,0.85)'; ctx.beginPath();
        for (let j = 0; j < 6; j++) { const t = j * 1.047 + random() * 0.5, rr = r * (0.6 + random() * 0.5); ctx.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); }
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(235,245,245,0.55)';
      if (a.doing === 'arriving') {
        // Wake: a foamy V opening astern, churned white down the middle.
        ctx.fillStyle = 'rgba(238,246,246,0.75)'; ctx.beginPath(); ctx.moveTo(...P(-1.2, -L / 2 + 0.5)); ctx.lineTo(...P(1.2, -L / 2 + 0.5)); ctx.lineTo(...P(2.4, -R)); ctx.lineTo(...P(-2.4, -R)); ctx.fill();
        ctx.lineWidth = 9;
        for (const side of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(...P(side * 0.4, L / 2 - 0.6 - i * 2.5)); ctx.lineTo(...P(side * (5.5 + i * 1.5), -R)); ctx.stroke(); }
      } else {
        ctx.lineWidth = 4;
        const rings = a.doing === 'idling' ? 5 : 2;
        for (let i = 0; i < rings; i++) { ctx.globalAlpha = 0.7 - i * 0.12; ctx.beginPath(); ctx.ellipse(w / 2, h / 2, (L / 2 + 0.4 + i * 0.6) * k, (B / 2 + 0.5 + i * 0.6) * k, 0, 0, Math.PI * 2); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
    });
    const disc = s.mesh(new THREE.CylinderGeometry(R, R, 0.1, 64), [s.material(shade(waterBase, -0.3)), new THREE.MeshStandardMaterial({ map: waterTex, roughness: 0.22, metalness: 0.25 }), s.material(shade(waterBase, -0.3))] as unknown as THREE.Material, [0, 0.05, 0]);
    disc.castShadow = false;

    const boat = b.root;
    const turned = new THREE.Group();
    const yaw = a.doing === 'drifting' ? 0.35 : 0;
    boat.position.set(0, 0.02, 0);
    boat.rotation.y = yaw;
    const trim = a.doing === 'arriving' ? -0.06 : 0;
    boat.rotation.x = trim;
    if (a.doing === 'arriving') boat.position.y = 0.16;
    s.root.add(boat);

    if (a.doing === 'arriving') {
      const foam = new THREE.MeshStandardMaterial({ color: '#f2f7f7', roughness: 0.9 });
      const puffs = Array.from({ length: 26 }, (_u, i) => { const side = i % 2 ? 1 : -1, t = random(); return { at: [side * (0.5 + t * 2.2 + random() * 0.3), 0.14 + (1 - t) * 0.3 * random(), L / 2 - 1.2 - t * 5.5] as [number, number, number], size: 0.25 + random() * 0.4 * (1 - t * 0.5) }; });
      for (let i = 0; i < 10; i++) puffs.push({ at: [(random() - 0.5) * 2.4, 0.12, -L / 2 - 0.6 - random() * 1.6], size: 0.3 + random() * 0.35 });
      s.scatter(new THREE.SphereGeometry(1, 8, 6), foam, puffs).castShadow = false;
    }
    if (a.doing === 'tied') {
      const px = -(B / 2 + 1.45);
      s.box([2.2, 0.5, 11], [px, 0.3, 0], s.material('#7d756a'));
      s.box([2.3, 0.08, 11.1], [px, 0.58, 0], s.material('#9a8f7c'));
      for (const z of [-4.2, 4.2]) {
        s.cylinder(0.12, 0.15, 0.4, [px + 0.75, 0.82, z], black, 10);
        s.tube([[px + 0.75, 0.9, z], [px + 1.3, 0.8, z * 0.99], [-(half(z > 0 ? 0.82 : 0.15)) + 0.1, sheer(z > 0 ? 0.82 : 0.15) + 0.05, z > 0 ? 4.4 : -4.8]], 0.035, s.material('#d9d2bd'));
      }
      for (const z of [-5.2, 5.2]) s.cylinder(0.2, 0.2, 2.6, [px - 0.9, 1.3, z], s.material('#5a4a3a'), 10);
      s.box([0.5, 0.3, 0.4], [px, 0.77, 1.5], s.material('#2a55a8'));
    }
    if (boarding) {
      const sx = -(B / 2 + 0.75), SH = 6.6, SL = 15.5, ST = 2.6;
      const shipTex = paint(1024, 512, (ctx, w, h) => {
        ctx.fillStyle = '#23292f'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#8a2c23'; ctx.fillRect(0, h * 0.86, w, h * 0.14);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
        for (let x = 0; x < w; x += 128) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (let y = 0; y < h; y += 100) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        // Pilot boarding mark and rope ladder.
        const lx = w * 0.5;
        ctx.fillStyle = '#f4f1e6'; ctx.fillRect(lx - 70, h * 0.06, 70, 34); ctx.fillStyle = '#e8c21c'; ctx.fillRect(lx, h * 0.06, 70, 34);
        ctx.strokeStyle = '#d8c79c'; ctx.lineWidth = 5;
        for (const dx of [-16, 16]) { ctx.beginPath(); ctx.moveTo(lx + dx, h * 0.02); ctx.lineTo(lx + dx, h * 0.82); ctx.stroke(); }
        ctx.strokeStyle = '#c98f4a'; ctx.lineWidth = 6;
        for (let y = h * 0.14; y < h * 0.82; y += 22) { ctx.beginPath(); ctx.moveTo(lx - 20, y); ctx.lineTo(lx + 20, y); ctx.stroke(); }
        for (let i = 0; i < 6; i++) write(ctx, `${14 - i * 2}M`, w * 0.9, h * (0.3 + i * 0.1), 26, '#f4f1e6', 'bold SIZEpx sans-serif');
        weather(ctx, w, h, random, 0.35 + mood.wear * 0.65, '#8a4a24');
      });
      const plate = s.material('#23292f');
      s.mesh(new THREE.BoxGeometry(ST, SH, SL), [skin(shipTex), plate, s.material('#7a3a2c'), plate, plate, plate] as unknown as THREE.Material, [sx - ST / 2, SH / 2, 0]);
      s.box([0.14, 1.0, SL], [sx - 0.07, SH + 0.5, 0], plate);
      for (let i = 0; i < 2; i++) s.mesh(new THREE.BoxGeometry(2.0, 2.4, 5.6), [skin(paint(256, 128, (ctx, w, h) => { const c = ['#8e3b2a', '#1f4f86', '#1f6b4a', '#e0661c'][Math.floor(random() * 4)]; ctx.fillStyle = c; ctx.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 12) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x, 0, 4, h); } })), plate, plate, plate, plate, plate] as unknown as THREE.Material, [sx - 1.45, SH + 1.2, -3.2 + i * 6.2]);
      for (let i = 0; i < 7; i++) s.rod([sx - 0.1, SH, -SL / 2 + 0.5 + i * 3], [sx - 0.1, SH + 1.1, -SL / 2 + 0.5 + i * 3], 0.03, steel);
      s.rod([sx - 0.1, SH + 1.1, -SL / 2 + 0.5], [sx - 0.1, SH + 1.1, SL / 2 - 0.5], 0.03, steel);
      if (a.crew === 'pilot' || a.crew === 'both') {
        const climber = person(s.root, [sx + 0.3, 3.4 + random() * 2, 0], '#1c2533', '#f4f1e6', -Math.PI / 2);
        climber.rotation.z = 0.08;
      }
      if (lightsOn) { s.box([0.1, 0.25, 0.5], [sx + 0.05, SH - 0.5, 0.9], lamp('#fff2c8', mix(1, 2.6, dusk))); s.mesh(new THREE.ConeGeometry(1.8, 6, 16, 1, true), halo('#fff2c8', mix(0.04, 0.14, dusk)), [sx + 1.1, SH - 3.6, 0.9]).castShadow = false; }
    }

    // Shown three-quarter on: bow to the front left, the lettered side toward the viewer.
    turned.add(...s.root.children);
    turned.rotation.y = -0.95;
    s.root.add(turned);

    const bobRate = mix(0.5, 1.8, mood.energy), bobSize = (a.water === 'choppy' ? 2 : 1) * mix(0.3, 1, mood.energy);
    return s.finish({
      footprint: R * 0.8,
      update: (dt, time) => {
        if (manned && lightsOn) radar.rotation.y += dt * mix(1, 4, mood.energy);
        boat.rotation.x = trim + Math.sin(time * bobRate) * 0.02 * bobSize;
        boat.rotation.z = Math.sin(time * bobRate * 0.7 + 1) * 0.03 * bobSize;
        if (blue) blue.emissiveIntensity = Math.sin(time * 9) > 0 ? 3.5 : 0.2;
      },
    });
  },
});
