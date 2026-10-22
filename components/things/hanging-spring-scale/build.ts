import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

export default defineThing({
  questions: {
    weighing: choice('What is being weighed?', {
      greens: 'A red plastic bag stuffed with leafy greens, stalks poking out.',
      oranges: 'A heap of loose mandarins, a leaf still on one.',
      fish: 'A whole silver fish, its tail hanging over the rim.',
      ginger: 'Knobbly hands of ginger and a few heads of garlic.',
      lychee: 'A bunch of lychees on the twig, pink and bumpy.',
      prawns: 'A wet handful of grey prawns in a clear bag of water.',
    }),
    load: score('How loaded is the scale?', ['Empty, the pan swinging free', 'A light pinch', 'A fair measure', 'Heavy, the spring stretched', 'Overloaded, needle past the last mark']),
    dial: choice('What kind of dial is it?', {
      enamel: 'A white enamel face in a red painted case, the common market kind.',
      brass: 'An old brass-cased dial with a yellowed face and fine black numerals.',
      green: 'A chipped green case with a cracked glass, older than the stallholder.',
      blue: 'A new blue plastic one with fat red numerals, bought last month.',
    }),
    holder: choice('What hangs under the dial?', {
      pan: 'A shallow steel pan on three chains.',
      basket: 'A red plastic colander basket on cords.',
      hook: 'Just a hook: the bag is hung straight on it.',
    }),
    mount: choice('What does it hang from?', {
      post: 'An iron bracket on a timber stall post.',
      frame: 'A steel pipe frame standing over a crate of produce.',
      awning: 'The corner of an awning pole, a striped tarp and a red lamp beside it.',
    }),
    trust: choice('Is there anything telling about the weighing?', {
      honest: 'No. It hangs true and nobody questions it.',
      card: 'A hand-written card swears the scale is checked and fair.',
      magnet: 'Something small and dark is stuck under the pan.',
      second: 'A customer has hung her own little pocket scale beside it to check.',
      coins: 'A dish of coins and a folded note sits beneath, the sale just done.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const steel = s.material('#bfc5c7', { metalness: 0.75, roughness: mix(0.25, 0.55, mood.wear) });
    const iron = s.material('#3a3d3f', { metalness: 0.5, roughness: 0.6 });
    const HANG = 1.56;
    const load = a.load;
    const loaded = load > 0.08;

    // Mount.
    if (a.mount === 'post') {
      const timber = s.material('#8a6844', { roughness: 0.9 });
      s.box([0.1, HANG + 0.23, 0.1], [-0.42, (HANG + 0.23) / 2, 0], timber);
      s.box([0.3, 0.14, 0.3], [-0.42, 0.07, 0], s.material('#a9a79c', { roughness: 0.95 }));
      s.box([0.5, 0.03, 0.035], [-0.17, HANG + 0.06, 0], iron);
      s.rod([-0.37, HANG - 0.28, 0], [0.02, HANG + 0.045, 0], 0.012, iron);
      s.ring(0.07, 0.008, [0.03, HANG - 0.02, 0], iron, Math.PI * 0.8).rotation.z = Math.PI * 1.1;
      for (let i = 0; i < 4; i++) s.ball([0.06, 0.15, 0.03], [-0.42 + (random() - 0.5) * 0.03, 1.2 - i * 0.015, 0.06 + i * 0.02], s.material(pick(['#d9262e', '#e23a36', '#c81e28']), { roughness: 0.35 }), 10);
    } else if (a.mount === 'frame') {
      for (const x of [-0.5, 0.5]) { s.rod([x * 1.1, 0, 0], [x, HANG + 0.08, 0], 0.02, steel); s.rod([x * 1.1, 0.02, -0.25], [x * 1.1, 0.02, 0.25], 0.02, steel); }
      s.rod([-0.52, HANG + 0.08, 0], [0.52, HANG + 0.08, 0], 0.02, steel);
      const crate = s.material(pick(['#c9372c', '#2f6fb3', '#3f9a5a']), { roughness: 0.6 });
      s.box([0.5, 0.26, 0.36], [0, 0.13, -0.05], crate);
      for (let i = 0; i < 4; i++) s.box([0.08, 0.16, 0.365], [-0.18 + i * 0.12, 0.13, -0.05], s.material('#2a1c1c'));
      const fruit = s.material(a.weighing === 'oranges' ? '#f08a1e' : a.weighing === 'lychee' ? '#d8506a' : '#5f9a3a', { roughness: 0.6 });
      for (let i = 0; i < 14; i++) s.ball([0.055, 0.05, 0.055], [(random() - 0.5) * 0.4, 0.27 + random() * 0.04, -0.05 + (random() - 0.5) * 0.26], fruit, 10);
    } else {
      s.rod([-0.55, 0, 0], [-0.55, HANG + 0.3, 0], 0.025, steel);
      s.cylinder(0.14, 0.16, 0.1, [-0.55, 0.05, 0], s.material('#a9a79c', { roughness: 0.95 }), 14);
      s.rod([-0.6, HANG + 0.1, 0], [0.55, HANG + 0.1, 0], 0.02, steel);
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 32;
      const ctx = canvas.getContext('2d')!;
      const stripes = pick([['#d8322c', '#f3efe2'], ['#2f6fc2', '#f3efe2'], ['#3f8f5a', '#f3efe2'], ['#e88a2a', '#2f6fc2']]);
      for (let i = 0; i < 8; i++) { ctx.fillStyle = stripes[i % 2]; ctx.fillRect(i * 16, 0, 16, 32); }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const tarp = s.mesh(new THREE.PlaneGeometry(1.2, 0.5, 8, 1), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8, side: THREE.DoubleSide }), [-0.02, HANG + 0.27, -0.16]);
      tarp.rotation.x = -0.75;
      const flap = s.mesh(new THREE.PlaneGeometry(1.2, 0.16, 8, 1), tarp.material as THREE.Material, [-0.02, HANG + 0.02, 0.012]);
      flap.rotation.x = 0.08;
      const lx = 0.4;
      s.rod([lx, HANG + 0.1, 0], [lx, HANG - 0.1, 0], 0.005, iron);
      s.lathe([[0.03, 0.14], [0.05, 0.13], [0.17, 0], [0.175, -0.01]], s.material('#d3202a', { roughness: 0.4, emissive: '#b0141c', emissiveIntensity: mix(0.25, 0.6, mood.cheer), side: THREE.DoubleSide }), [lx, HANG - 0.24, 0]);
      s.ball([0.045, 0.05, 0.045], [lx, HANG - 0.22, 0], new THREE.MeshStandardMaterial({ color: '#fff0c8', emissive: '#ffb040', emissiveIntensity: mix(1.5, 3, mood.cheer) }), 10);
    }

    // Everything that swings.
    const hung = new THREE.Group();
    hung.position.set(0.03, HANG, 0);
    s.root.add(hung);
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], scale: [number, number, number] = [1, 1, 1], parent: THREE.Object3D = hung) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at); mesh.scale.set(...scale);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const rod = (from: [number, number, number], to: [number, number, number], radius: number, material: THREE.Material, parent: THREE.Object3D = hung) => {
      const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to), d = q.clone().sub(p);
      const mesh = add(new THREE.CylinderGeometry(radius, radius, d.length(), 6), material, p.add(q).multiplyScalar(0.5).toArray() as [number, number, number], [1, 1, 1], parent);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      return mesh;
    };
    const link = new THREE.TorusGeometry(0.017, 0.0045, 5, 10);
    const chain = (y0: number, y1: number, parent: THREE.Object3D = hung) => {
      const n = Math.max(2, Math.round((y0 - y1) / 0.03));
      for (let i = 0; i < n; i++) { const m = add(link, iron, [0, mix(y0, y1, (i + 0.5) / n), 0], [0.75, 1, 1], parent); m.rotation.y = i % 2 ? Math.PI / 2 : 0; }
    };
    chain(-0.02, -0.2);

    // The dial.
    const DR = 0.19, dialY = -0.2 - DR - 0.03;
    const style = {
      enamel: { body: '#c8242a', face: '#f6f4ec', ink: '#1a1c1f', hand: '#d01f26', metal: 0.2 },
      brass: { body: '#b08a3a', face: '#e8d9a8', ink: '#2a2014', hand: '#20160c', metal: 0.8 },
      green: { body: '#3f6f52', face: '#dcd8c2', ink: '#20261f', hand: '#8a1a1a', metal: 0.2 },
      blue: { body: '#2a6fd0', face: '#ffffff', ink: '#d01f26', hand: '#1a1c1f', metal: 0.05 },
    }[a.dial];
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = faceCanvas.height = 256;
    {
      const ctx = faceCanvas.getContext('2d')!;
      ctx.fillStyle = style.face; ctx.beginPath(); ctx.arc(128, 128, 128, 0, 7); ctx.fill();
      for (let i = 0; i < mood.wear * 60 + (a.dial === 'brass' || a.dial === 'green' ? 25 : 0); i++) { ctx.fillStyle = `rgba(120,90,40,${random() * 0.14})`; ctx.beginPath(); ctx.arc(random() * 256, random() * 256, 4 + random() * 22, 0, 7); ctx.fill(); }
      ctx.strokeStyle = ctx.fillStyle = style.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(128, 128, 118, 0, 7); ctx.stroke();
      for (let i = 0; i < 50; i++) {
        const t = (i / 50) * Math.PI * 2 - Math.PI / 2, major = i % 5 === 0;
        ctx.lineWidth = major ? 5 : 2;
        ctx.beginPath(); ctx.moveTo(128 + Math.cos(t) * 116, 128 + Math.sin(t) * 116); ctx.lineTo(128 + Math.cos(t) * (major ? 94 : 104), 128 + Math.sin(t) * (major ? 94 : 104)); ctx.stroke();
        if (major) { ctx.font = `900 ${a.dial === 'blue' ? 28 : 22}px sans-serif`; ctx.fillText(String(i / 5), 128 + Math.cos(t) * 74, 128 + Math.sin(t) * 74); }
      }
      ctx.font = '900 15px sans-serif'; ctx.fillText(a.dial === 'brass' ? 'CATTY' : 'KG', 128, 172);
      if (a.dial === 'green') { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(40, 60); ctx.lineTo(120, 130); ctx.lineTo(110, 210); ctx.moveTo(120, 130); ctx.lineTo(200, 150); ctx.stroke(); }
    }
    const faceTexture = new THREE.CanvasTexture(faceCanvas); faceTexture.colorSpace = THREE.SRGBColorSpace;
    const bodyMaterial = s.material(style.body, { metalness: style.metal, roughness: 0.4 });
    const dial = new THREE.Group();
    dial.position.set(0, dialY, 0);
    hung.add(dial);
    const drum = add(new THREE.CylinderGeometry(DR, DR, 0.09, 32), bodyMaterial, [0, 0, 0], [1, 1, 1], dial);
    drum.rotation.x = Math.PI / 2;
    const bezel = add(new THREE.TorusGeometry(DR - 0.006, 0.012, 8, 32), a.dial === 'brass' ? bodyMaterial : steel, [0, 0, 0.045], [1, 1, 1], dial);
    bezel.castShadow = false;
    for (const z of [0.047, -0.047]) { const face = add(new THREE.CircleGeometry(DR - 0.012, 32), new THREE.MeshStandardMaterial({ map: faceTexture, roughness: 0.35 }), [0, 0, z], [1, 1, 1], dial); if (z < 0) face.rotation.y = Math.PI; face.castShadow = false; }
    add(new THREE.BoxGeometry(0.05, 0.05, 0.03), bodyMaterial, [0, DR + 0.012, 0], [1, 1, 1], dial);
    add(new THREE.CylinderGeometry(0.018, 0.018, 0.05, 10), bodyMaterial, [0, -DR - 0.015, 0], [1, 1, 1], dial);
    const needle = new THREE.Group();
    needle.position.set(0, 0, 0.052);
    dial.add(needle);
    add(new THREE.BoxGeometry(0.012, DR * 0.82, 0.004), s.material(style.hand, { roughness: 0.4 }), [0, DR * 0.3, 0], [1, 1, 1], needle).castShadow = false;
    add(new THREE.CylinderGeometry(0.014, 0.014, 0.008, 10), iron, [0, 0, 0], [1, 1, 1], needle).rotation.x = Math.PI / 2;
    const rest = -load * Math.PI * 1.85 - (loaded ? 0 : 0.03);
    needle.rotation.z = rest;

    // Spring rod, hook and holder.
    const stretch = load * 0.07;
    const hookY = dialY - DR - 0.06 - stretch;
    rod([0, dialY - DR, 0], [0, hookY, 0], 0.006, steel);
    const hookRing = add(new THREE.TorusGeometry(0.028, 0.006, 6, 14, Math.PI * 1.5), steel, [0, hookY - 0.026, 0]);
    hookRing.rotation.z = Math.PI * 0.75;
    const below = new THREE.Group();
    below.position.set(0, hookY - 0.052, 0);
    hung.add(below);
    const PR = 0.19, panY = -0.3;
    const goods = new THREE.Group();
    below.add(goods);
    if (a.holder === 'pan') {
      for (let i = 0; i < 3; i++) { const t = (i / 3) * Math.PI * 2 + 0.5; rod([0, 0, 0], [Math.cos(t) * PR, panY + 0.03, Math.sin(t) * PR], 0.004, iron, below); }
      const pan = add(new THREE.LatheGeometry([[0, 0], [0.12, 0.004], [PR - 0.02, 0.022], [PR, 0.05], [PR + 0.008, 0.052]].map(([x, y]) => new THREE.Vector2(x, y)), 28), s.material('#c9ced0', { metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide }), [0, panY - 0.02, 0], [1, 1, 1], below);
      pan.receiveShadow = true;
      goods.position.y = panY - 0.012;
    } else if (a.holder === 'basket') {
      const plastic = s.material(pick(['#d6322c', '#e86a2a', '#2f8fc2']), { roughness: 0.45, side: THREE.DoubleSide });
      for (let i = 0; i < 4; i++) { const t = (i / 4) * Math.PI * 2 + 0.4; rod([0, 0, 0], [Math.cos(t) * PR, panY + 0.1, Math.sin(t) * PR], 0.004, s.material('#e9e4d2'), below); }
      add(new THREE.LatheGeometry([[0, 0], [0.13, 0], [PR, 0.12], [PR + 0.012, 0.12]].map(([x, y]) => new THREE.Vector2(x, y)), 20), plastic, [0, panY - 0.02, 0], [1, 1, 1], below);
      for (let k = 0; k < 3; k++) add(new THREE.TorusGeometry(0.14 + k * 0.022, 0.006, 5, 24), plastic, [0, panY + 0.01 + k * 0.04, 0], [1, 1, 1], below).rotation.x = Math.PI / 2;
      goods.position.y = panY - 0.015;
    } else goods.position.y = -0.33;

    // The goods.
    const ball = new THREE.SphereGeometry(1, 14, 10);
    const amount = mix(0.35, 1.15, load);
    const bagRed = s.material('#dc2a30', { roughness: 0.3, transparent: true, opacity: 0.9 });
    const onHook = a.holder === 'hook';
    const sack = (colour: THREE.Material, r: number) => {
      // A tied carrier bag: a slumped body and two handle loops running up.
      add(ball, colour, [0, r * 0.75, 0], [r, r * 0.8, r * 0.85], goods);
      const up = onHook ? 0.33 - 0.02 : r * 1.9;
      for (const side of [-1, 1]) rod([side * r * 0.45, r * 1.25, 0], [side * 0.012, up, 0], 0.012, colour, goods);
      return r;
    };
    if (loaded) {
      if (a.weighing === 'greens') {
        const r = sack(bagRed, 0.12 * amount + 0.03);
        const leaf = s.material('#4f9a3a', { roughness: 0.7, side: THREE.DoubleSide }), stalk = s.material('#e4edd0', { roughness: 0.6 });
        for (let i = 0; i < 7; i++) {
          const t = random() * 6, lean = 0.3 + random() * 0.5;
          const stem = rod([Math.cos(t) * 0.03, r * 1.1, Math.sin(t) * 0.03], [Math.cos(t) * r * lean * 1.6, r * 1.9, Math.sin(t) * r * lean * 1.6], 0.012, stalk, goods);
          const blade = add(ball, leaf, [Math.cos(t) * r * lean * 1.9, r * 2.05, Math.sin(t) * r * lean * 1.9], [0.06, 0.085, 0.018], goods);
          blade.rotation.set(random(), t, random() - 0.5); stem.castShadow = true;
        }
      } else if (a.weighing === 'oranges') {
        const peel = s.material('#f08a1e', { roughness: 0.55 });
        const n = Math.round(mix(2, 9, load));
        if (onHook) sack(s.material('#f4a6a0', { roughness: 0.3, transparent: true, opacity: 0.45, depthWrite: false }), 0.14);
        for (let i = 0; i < n; i++) { const layer = i < 5 ? 0 : 1, t = i * 1.4, r = layer ? 0.04 : i === 0 ? 0 : 0.085; add(ball, peel, [Math.cos(t) * r, 0.05 + layer * 0.075, Math.sin(t) * r], [0.05, 0.045, 0.05], goods); }
        add(ball, s.material('#3f8a3a', { side: THREE.DoubleSide }), [0.02, 0.105 + (n > 5 ? 0.075 : 0), 0.02], [0.04, 0.004, 0.02], goods);
      } else if (a.weighing === 'fish') {
        const skin = s.material('#c5ced4', { roughness: 0.25, metalness: 0.4 });
        const L = mix(0.3, 0.5, load);
        if (onHook) {
          add(ball, skin, [0, 0.33 - L * 0.5 - 0.03, 0], [L * 0.15, L * 0.5, L * 0.07], goods);
          add(new THREE.ConeGeometry(L * 0.16, L * 0.22, 4), skin, [0, 0.33 - L - 0.08, 0], [1, 1, 0.2], goods);
          add(ball, iron, [L * 0.06, 0.33 - 0.09, L * 0.05], [0.01, 0.01, 0.01], goods);
        } else {
          add(ball, skin, [0.02, 0.045, 0], [L * 0.5, 0.035, L * 0.18], goods);
          const tail = add(new THREE.ConeGeometry(L * 0.17, L * 0.26, 4), skin, [-L * 0.55, 0.05, 0], [1, 1, 0.2], goods);
          tail.rotation.z = -Math.PI / 2 - 0.2;
          add(ball, iron, [L * 0.38, 0.07, L * 0.06], [0.01, 0.01, 0.01], goods);
          add(ball, s.material('#8fa0aa', { roughness: 0.25, metalness: 0.4 }), [0, 0.066, -L * 0.05], [L * 0.3, 0.012, L * 0.08], goods);
        }
      } else if (a.weighing === 'ginger') {
        const root = s.material('#d9bd8a', { roughness: 0.8 }), garlic = s.material('#f1ece0', { roughness: 0.7 });
        if (onHook) sack(s.material('#f4a6a0', { roughness: 0.3, transparent: true, opacity: 0.45, depthWrite: false }), 0.13);
        const n = Math.round(mix(2, 6, load));
        for (let i = 0; i < n; i++) {
          const x = (random() - 0.5) * 0.16, z = (random() - 0.5) * 0.16, y = 0.04 + (i > 3 ? 0.05 : 0);
          for (let k = 0; k < 4; k++) add(ball, root, [x + (random() - 0.5) * 0.08, y + random() * 0.02, z + (random() - 0.5) * 0.08], [0.03 + random() * 0.02, 0.025, 0.025 + random() * 0.015], goods).rotation.y = random() * 3;
        }
        for (let i = 0; i < 2; i++) { const x = 0.08 - i * 0.16, z = 0.07; add(ball, garlic, [x, 0.05, z], [0.04, 0.035, 0.04], goods); add(new THREE.ConeGeometry(0.012, 0.04, 6), garlic, [x, 0.095, z], [1, 1, 1], goods); }
      } else if (a.weighing === 'lychee') {
        const shell = s.material('#d8506a', { roughness: 0.75 }), twig = s.material('#6a4a2a');
        const n = Math.round(mix(4, 16, load));
        const baseY = onHook ? 0.3 : 0.03;
        for (let i = 0; i < n; i++) {
          const t = i * 2.4, r = onHook ? 0.03 + (i / n) * 0.06 : 0.02 + Math.sqrt(i / n) * 0.11;
          const at: [number, number, number] = onHook ? [Math.cos(t) * r, baseY - 0.05 - (i / n) * 0.2, Math.sin(t) * r] : [Math.cos(t) * r, baseY + 0.015 + (i % 3) * 0.022, Math.sin(t) * r];
          add(new THREE.IcosahedronGeometry(1, 1), i % 5 === 0 ? s.material('#b8c24a', { roughness: 0.75 }) : shell, at, [0.03, 0.033, 0.03], goods);
          if (onHook) rod([0, baseY, 0], at, 0.003, twig, goods);
        }
        if (!onHook) { rod([-0.14, 0.05, 0.02], [0.13, 0.08, -0.03], 0.005, twig, goods); add(ball, s.material('#3f7a3a', { side: THREE.DoubleSide }), [0.13, 0.085, -0.03], [0.06, 0.004, 0.022], goods); }
      } else {
        const water = new THREE.MeshStandardMaterial({ color: '#cfe6ea', roughness: 0.05, transparent: true, opacity: 0.5 });
        const r = sack(water, 0.1 * amount + 0.03);
        const shell = s.material('#9aa0a6', { roughness: 0.4 });
        for (let i = 0; i < 7; i++) { const p = add(new THREE.TorusGeometry(0.03, 0.01, 5, 8, Math.PI * 1.2), shell, [(random() - 0.5) * r, r * (0.3 + random() * 0.5), (random() - 0.5) * r * 0.5 + r * 0.6], [1, 1, 1], goods); p.rotation.set(random() * 3, random() * 3, random() * 3); }
      }
    }

    // What gives the game away.
    if (a.trust === 'card') {
      const card = s.label(pick(['FAIR SCALE', 'CHECKED', 'HONEST WEIGHT', 'NO CHEATING']), 0.3, 0.1, [0, -0.1, 0.01], '#c21f1f', '#f6efd4');
      card.position.set(0.24, -0.26, 0.02); card.rotation.z = -0.12;
      hung.add(card);
      rod([0.02, -0.04, 0], [0.2, -0.21, 0.02], 0.002, iron);
    } else if (a.trust === 'magnet' && a.holder !== 'hook') {
      add(new THREE.CylinderGeometry(0.035, 0.035, 0.025, 12), s.material('#1c1e20', { metalness: 0.6, roughness: 0.4 }), [0.07, panY - 0.035, 0.04], [1, 1, 1], below);
      add(new THREE.CylinderGeometry(0.036, 0.036, 0.008, 12), s.material('#c21f1f'), [0.07, panY - 0.05, 0.04], [1, 1, 1], below);
    } else if (a.trust === 'second') {
      const mini = new THREE.Group();
      mini.position.set(a.mount === 'post' ? -0.2 : -0.3, HANG + (a.mount === 'post' ? 0.04 : 0.08), 0);
      s.root.add(mini);
      chain(-0.02, -0.14, mini);
      add(new THREE.BoxGeometry(0.05, 0.2, 0.025), s.material('#c9a03a', { metalness: 0.7, roughness: 0.4 }), [0, -0.25, 0], [1, 1, 1], mini);
      add(new THREE.BoxGeometry(0.03, 0.15, 0.004), s.material('#f1ead0'), [0, -0.25, 0.014], [1, 1, 1], mini).castShadow = false;
      add(new THREE.BoxGeometry(0.034, 0.006, 0.006), s.material('#c21f1f'), [0, -0.25 - load * 0.06 + 0.04, 0.017], [1, 1, 1], mini);
      rod([0, -0.35, 0], [0, -0.44, 0], 0.004, iron, mini);
      add(new THREE.TorusGeometry(0.02, 0.005, 6, 12, Math.PI * 1.5), iron, [0, -0.46, 0], [1, 1, 1], mini).rotation.z = Math.PI * 0.75;
    } else if (a.trust === 'coins') {
      const dish = s.cylinder(0.11, 0.07, 0.035, [0.2, 0.018, 0.25], s.material(pick(['#2f8fc2', '#d6322c', '#f2f0e8']), { roughness: 0.4 }), 16);
      dish.castShadow = true;
      for (let i = 0; i < 6; i++) s.cylinder(0.016, 0.016, 0.004, [0.2 + (random() - 0.5) * 0.09, 0.038 + i * 0.003, 0.25 + (random() - 0.5) * 0.09], s.material(pick(['#c9a03a', '#b9bcc0']), { metalness: 0.8, roughness: 0.3 }), 10);
      s.box([0.09, 0.006, 0.045], [0.2, 0.05, 0.25], s.material('#7fa68a', { roughness: 0.8 })).rotation.y = 0.5;
    }

    const energy = mood.energy;
    const phase = random() * 6;
    const swing = loaded ? 0.03 : 0.07;
    return s.finish({
      footprint: 0.6,
      update(_dt, time) {
        hung.rotation.z = Math.sin(time * 1.9 + phase) * swing * mix(0.3, 1.5, energy);
        hung.rotation.x = Math.sin(time * 1.3 + phase * 2) * swing * 0.5 * mix(0.3, 1.5, energy);
        needle.rotation.z = rest + (Math.sin(time * 23) * 0.03 + Math.sin(time * 3.1 + phase) * 0.06) * mix(0.4, 1.6, energy) * (loaded ? 1 : 0.3);
      },
    });
  },
});
