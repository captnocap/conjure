import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';
import { Batch, card, painted, pick } from './util';

const GOLD = '#e9bc3e', WHITE_GOLD = '#d9dde0', ROSE = '#dd9c76', OLD = '#b98a2c';
const VELVET = { black: '#1b1a1f', burgundy: '#6c1527', royal: '#1e2f80', emerald: '#17513a', blush: '#b98a8c' } as const;
const WORDS = ['ALWAYS', 'M + J 1987', 'FOREVER', 'COME HOME', 'TO ROSA', 'JUNE 12', 'MY LOVE', 'SEMPER FI'];

export default defineThing({
  questions: {
    rings: choice('What kind of rings fill the tray?', {
      plain: 'Plain gold wedding bands, thin and wide, worn smooth.',
      diamonds: 'Engagement rings: thin bands with small bright stones.',
      class: 'Chunky class rings with big coloured stones, somebody\'s graduation year.',
      military: 'Heavy service rings and signets with dark flat stones.',
      pairs: 'His-and-hers pairs kept together in one slot, large band and small.',
      mixed: 'All of it together, sorted by nothing but arrival.',
    }),
    fill: score('How full is the tray?', ['A few survivors in bare velvet', 'Half the slots', 'Nearly full', 'Every slot taken']),
    gap: noul('Is there one conspicuous empty slot in the front row, its ticket left behind?'),
    velvet: choice('What colour is the velvet?', {
      black: 'Black, so the gold does the talking.',
      burgundy: 'Burgundy, the jeweller\'s classic.',
      royal: 'Royal blue.',
      emerald: 'Deep emerald green.',
      blush: 'Dusty pink that has seen a lot of sun.',
    }),
    tray: choice('What is the tray itself?', {
      wood: 'A shallow wooden tray with mitred corners.',
      leatherette: 'A black leatherette jeweller\'s tray with stitched edges.',
      cigar: 'An old cigar box, lid propped open behind the rows.',
      steel: 'A grey steel cash-drawer insert, strictly business.',
    }),
    tags: choice('How are the rings ticketed?', {
      price: 'Tiny white handwritten price tags on thread.',
      ticket: 'Manila pawn tickets with numbers; not yet forfeit.',
      red: 'Red markdown tags; nobody is buying.',
      bare: 'No tags at all.',
    }),
    beside: choice('What lies beside the tray?', {
      nothing: 'Nothing.',
      'loose-band': 'One engraved band lying loose with a note of what it says inside.',
      'ring-box': 'A small hinged ring box, open and empty.',
      loupe: 'A jeweller\'s loupe and a polishing cloth.',
      mandrel: 'A tapered steel sizing stick with a ring halfway down it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const NS = 5, NR = 3;
    const IW = 0.3, ID = 0.21, RIM = 0.012, FLOOR = 0.008, WALL = 0.03;
    const tray = new THREE.Group();
    s.root.add(tray);
    const put = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; tray.add(mesh); return mesh; };
    const boxIn = (size: [number, number, number], at: [number, number, number], material: THREE.Material) => {
      const mesh = put(new THREE.Mesh(new THREE.BoxGeometry(...size), material));
      mesh.position.set(...at);
      return mesh;
    };

    // ---- the tray ----
    const shell = { wood: '#7a4a2a', leatherette: '#18181b', cigar: '#b07a3e', steel: '#868d90' }[a.tray];
    const body = s.material(shell, { roughness: a.tray === 'steel' ? 0.4 : 0.65, metalness: a.tray === 'steel' ? 0.45 : 0 });
    boxIn([IW + RIM * 2, FLOOR, ID + RIM * 2], [0, FLOOR / 2, 0], body);
    for (const z of [-1, 1]) boxIn([IW + RIM * 2, WALL, RIM], [0, WALL / 2, z * (ID / 2 + RIM / 2)], body);
    for (const x of [-1, 1]) boxIn([RIM, WALL, ID], [x * (IW / 2 + RIM / 2), WALL / 2, 0], body);
    if (a.tray === 'leatherette') {
      const stitch = new Batch(new THREE.BoxGeometry(0.006, 0.0012, 0.0015), s.material('#d8d2bd'));
      for (let i = 0; i < 26; i++) for (const z of [-1, 1]) stitch.add([-IW / 2 + (i / 25) * IW, WALL + 0.0004, z * (ID / 2 + RIM / 2)]);
      stitch.into(tray);
    } else if (a.tray === 'cigar') {
      const lid = new THREE.Group();
      lid.position.set(0, WALL, -ID / 2 - RIM);
      lid.rotation.x = -1.25 - random() * 0.2;
      const board = new THREE.Mesh(new THREE.BoxGeometry(IW + RIM * 2, 0.006, ID + RIM * 2), body);
      board.position.set(0, 0, -(ID + RIM * 2) / 2);
      board.castShadow = true;
      lid.add(board);
      const label = card(IW * 0.8, ID * 0.7, painted(256, 180, (ctx, w, h) => {
        ctx.fillStyle = '#efe1b4';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#a3261d';
        ctx.lineWidth = 8;
        ctx.strokeRect(10, 10, w - 20, h - 20);
        ctx.fillStyle = '#a3261d';
        ctx.beginPath();
        ctx.ellipse(w / 2, h * 0.42, 70, 40, 0, 0, 7);
        ctx.fill();
        ctx.fillStyle = '#e9bc3e';
        ctx.font = 'bold italic 30px serif';
        ctx.textAlign = 'center';
        ctx.fillText('FLOR FINA', w / 2, h * 0.47);
        ctx.fillStyle = '#3a2618';
        ctx.font = 'bold 20px serif';
        ctx.fillText('50 CLAROS', w / 2, h * 0.84);
      }));
      label.rotation.x = Math.PI / 2;
      label.position.set(0, -0.0035, -(ID + RIM * 2) / 2);
      lid.add(label);
      tray.add(lid);
      for (const x of [-1, 1]) boxIn([0.02, 0.003, 0.012], [x * IW * 0.3, WALL, -ID / 2 - RIM / 2], s.material('#c9a23e', { metalness: 0.4 }));
    } else if (a.tray === 'steel') {
      for (const x of [-1, 1]) boxIn([0.004, WALL * 0.6, 0.05], [x * (IW / 2 + RIM + 0.002), WALL * 0.6, 0], s.material('#5e6669', { metalness: 0.4 }));
    } else {
      for (const x of [-1, 1]) for (const z of [-1, 1]) boxIn([RIM * 1.3, WALL + 0.002, RIM * 1.3], [x * (IW / 2 + RIM / 2), WALL / 2, z * (ID / 2 + RIM / 2)], s.material('#5f3820'));
    }

    // ---- velvet rolls ----
    const cloth = new THREE.Color(VELVET[a.velvet]).multiplyScalar(a.velvet === 'blush' ? 0.85 : 0.62).lerp(new THREE.Color('#9a9080'), mood.wear * 0.22);
    const velvet = new THREE.MeshStandardMaterial({ color: cloth, roughness: 1 });
    boxIn([IW, 0.004, ID], [0, FLOOR + 0.002, 0], velvet);
    const pitch = ID / (NR + 1), rollR = pitch * 0.4;
    const rolls = new Batch(new THREE.CylinderGeometry(rollR, rollR, IW - 0.004, 14), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }));
    const rollY = FLOOR + rollR * 0.6;
    for (let r = 0; r <= NR; r++) rolls.add([0, rollY, -ID / 2 + pitch * (r + 0.5)], [1, 1, 1], [0, 0, Math.PI / 2], cloth.clone().offsetHSL(0, 0, (random() - 0.5) * 0.03 + 0.03));
    rolls.into(tray);

    // ---- rings ----
    const shine = (emissive: string) => new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.45, roughness: 0.28, emissive, emissiveIntensity: mix(0.35, 0.75, mood.cheer) });
    const bands = new Batch(new THREE.TorusGeometry(1, 0.24, 8, 28), shine('#5a4718'));
    const heads = new Batch(new THREE.BoxGeometry(1, 1, 1), shine('#4a3c1c'));
    const gemMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.05, metalness: 0.1, emissive: '#ffffff', emissiveIntensity: 0.3 });
    const gems = new Batch(new THREE.OctahedronGeometry(1, 0), gemMat);
    const stones = new Batch(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.15, emissive: '#222222', emissiveIntensity: 0.5 }));
    const tags = new Batch(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }));
    const tone = () => pick(random, [GOLD, GOLD, GOLD, OLD, WHITE_GOLD, ROSE]);
    const lean = -0.32;
    type RingKind = 'plain' | 'diamonds' | 'class' | 'military';

    const ring = (kind: RingKind, at: [number, number, number], radius: number, tilt = lean, yaw = 0) => {
      const [x, y, z] = at;
      const up = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(tilt, yaw, 0));
      const top = (d: number): [number, number, number] => [x + up.x * d, y + up.y * d, z + up.z * d];
      if (kind === 'plain') {
        bands.add(at, [radius, radius, radius * (0.8 + random() * 1.3)], [tilt, yaw, 0], tone());
      } else if (kind === 'diamonds') {
        const metal = pick(random, [GOLD, WHITE_GOLD, WHITE_GOLD, ROSE]);
        bands.add(at, [radius, radius, radius * 0.6], [tilt, yaw, 0], metal);
        heads.add(top(radius * 1.12), [radius * 0.5, radius * 0.3, radius * 0.5], [tilt, yaw, 0], metal);
        gems.add(top(radius * 1.45), radius * (0.34 + random() * 0.3), [tilt, yaw + 0.78, 0], pick(random, ['#ffffff', '#ffffff', '#f4fbff', '#fff2c8', '#ffd6e2']));
      } else if (kind === 'class') {
        const metal = pick(random, [GOLD, OLD, WHITE_GOLD]);
        bands.add(at, [radius, radius, radius * 1.4], [tilt, yaw, 0], metal);
        heads.add(top(radius * 1.15), [radius * 1.25, radius * 0.5, radius * 1.1], [tilt, yaw, 0], metal);
        stones.add(top(radius * 1.42), [radius * 0.52, radius * 0.3, radius * 0.44], [tilt, yaw, 0], pick(random, ['#c21f32', '#1f49c2', '#178a4a', '#7a2fc0', '#e08a1c', '#12161c']));
      } else {
        const metal = pick(random, [WHITE_GOLD, OLD, GOLD, '#9aa0a3']);
        bands.add(at, [radius, radius, radius * 1.6], [tilt, yaw, 0], metal);
        heads.add(top(radius * 1.16), [radius * 1.3, radius * 0.5, radius * 1.3], [tilt, yaw, 0], metal);
        heads.add(top(radius * 1.43), [radius * 1.0, radius * 0.12, radius * 1.0], [tilt, yaw, 0], pick(random, ['#101216', '#101216', '#1c2f66', '#5a1218']));
        stones.add(top(radius * 1.5), radius * 0.2, [0, 0, 0], GOLD);
      }
    };

    const level = clamp01(mix(0.14, 1, a.fill) * mix(0.88, 1.1, mood.density));
    const tagColour = { price: '#f7f3e6', ticket: '#e2c583', red: '#d3302b', bare: '#000000' }[a.tags];
    const gapSlot = a.gap ? 1 + Math.floor(random() * (NS - 2)) : -1;
    const kinds: RingKind[] = ['plain', 'diamonds', 'class', 'military'];
    const slotW = (IW - 0.02) / NS;
    const addTag = (x: number, z: number, lying = false) => {
      if (a.tags === 'bare') return;
      const turn = (random() - 0.5) * 0.7;
      tags.add([x + slotW * 0.2, rollY + rollR + (lying ? 0.0006 : 0.001), z + pitch * 0.5 + (lying ? 0 : 0.002)], [0.017, 0.0008, 0.011], [0.1, turn, 0], tagColour);
      tags.add([x + slotW * 0.1, rollY + rollR * 0.9, z + pitch * 0.3], [0.0008, 0.0008, pitch * 0.5], [0.5, turn * 0.3, 0], '#e8e2cf');
    };
    for (let r = 0; r < NR; r++) for (let i = 0; i < NS; i++) {
      const x = -IW / 2 + 0.01 + slotW * (i + 0.5) + (random() - 0.5) * 0.003;
      const z = -ID / 2 + pitch * (r + 1);
      const y = FLOOR + 0.021;
      const isGap = r === NR - 1 && i === gapSlot;
      const beside = r === NR - 1 && Math.abs(i - gapSlot) === 1 && a.gap;
      if (isGap) {
        // only the ticket and a dent remain
        addTag(x - slotW * 0.2, z, true);
        tags.add([x, rollY + rollR * 0.82, z - pitch * 0.5], [slotW * 0.5, 0.004, 0.004], [0, 0, 0], cloth.clone().multiplyScalar(0.55));
        continue;
      }
      if (!beside && random() > level) {
        if (random() < 0.25) addTag(x - slotW * 0.2, z, true);
        continue;
      }
      const kind: RingKind = a.rings === 'mixed' ? pick(random, kinds) : a.rings === 'pairs' ? 'plain' : a.rings;
      const radius = 0.0165 + (random() - 0.5) * 0.004;
      if (a.rings === 'pairs') {
        const metal = tone();
        bands.add([x - 0.008, y + 0.001, z], [radius * 1.08, radius * 1.08, radius * 1.4], [lean, 0.25, 0], metal);
        bands.add([x + 0.01, y - 0.002, z + 0.004], [radius * 0.84, radius * 0.84, radius * 0.9], [lean, -0.3, 0], metal);
        if (random() < 0.4) gems.add([x + 0.01, y + radius * 0.95, z - 0.001], radius * 0.3, [lean, 0.78, 0], '#ffffff');
      } else ring(kind, [x, y, z], radius, lean + (random() - 0.5) * 0.15, (random() - 0.5) * 0.35);
      addTag(x, z);
    }

    // ---- beside the tray ----
    const sideX = (random() < 0.5 ? -1 : 1) * (IW / 2 + RIM + 0.06), table = 0;
    const loose = new THREE.Group();
    s.root.add(loose);
    if (a.beside === 'loose-band') {
      const r = 0.017;
      const band = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.2, 8, 28), shine('#4a3c1c'));
      (band.material as THREE.MeshStandardMaterial).color.set(GOLD);
      band.scale.z = 2.2;
      band.rotation.set(Math.PI / 2 - 0.5, 0, 0.3);
      band.position.set(sideX, table + r * 0.62, 0.04);
      band.castShadow = true;
      loose.add(band);
      const word = pick(random, WORDS);
      const note = card(0.085, 0.044, painted(256, 132, (ctx, w, h) => {
        ctx.fillStyle = '#f6f1df';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#23305c';
        ctx.font = 'italic bold 44px cursive, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(word, w / 2, h / 2 + 4, w - 30);
        ctx.beginPath();
        ctx.arc(18, h / 2, 7, 0, 7);
        ctx.fillStyle = '#6a6a6a';
        ctx.fill();
      }));
      note.rotation.x = -Math.PI / 2;
      note.rotation.z = (random() - 0.5) * 0.8;
      note.position.set(sideX + 0.005, table + 0.0008, -0.025);
      loose.add(note);
      const thread = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(sideX, table + 0.004, 0.035), new THREE.Vector3(sideX - 0.015, table + 0.001, 0.01), new THREE.Vector3(sideX - 0.02, table + 0.001, -0.02)]), 12, 0.0005, 4), new THREE.MeshStandardMaterial({ color: '#e8e2cf' }));
      loose.add(thread);
    } else if (a.beside === 'ring-box') {
      const skin = s.material(pick(random, ['#5a1622', '#1c2550', '#1a1a1d']), { roughness: 0.8 });
      const b = s.box([0.05, 0.022, 0.05], [sideX, 0.011, 0.02], skin);
      b.rotation.y = 0.3;
      const lidBox = s.box([0.05, 0.02, 0.05], [sideX - 0.008, 0.045, -0.012], skin);
      lidBox.rotation.set(-1.25, 0.3, 0);
      const cushion = s.box([0.042, 0.006, 0.042], [sideX, 0.023, 0.02], s.material('#efe9da', { roughness: 1 }));
      cushion.rotation.y = 0.3;
      const slot = s.box([0.022, 0.003, 0.004], [sideX, 0.0262, 0.02], s.material('#8d8774'));
      slot.rotation.y = 0.3;
    } else if (a.beside === 'loupe') {
      const cloth2 = s.box([0.09, 0.002, 0.07], [sideX, 0.001, 0.02], s.material(pick(random, ['#e9d94a', '#8fb8d8', '#d9d2c0']), { roughness: 1 }));
      cloth2.rotation.y = 0.5;
      const barrel = s.cylinder(0.014, 0.012, 0.024, [sideX, 0.014, 0.02], s.material('#141416'), 16);
      barrel.rotation.z = 0.0;
      s.cylinder(0.0155, 0.0155, 0.004, [sideX, 0.027, 0.02], s.material('#cfd3d5', { metalness: 0.5, roughness: 0.3 }), 16);
      s.cylinder(0.012, 0.012, 0.0045, [sideX, 0.0275, 0.02], s.material('#9fd0e6', { roughness: 0.05, emissive: '#5a8aa0', emissiveIntensity: 0.4 }), 16);
    } else if (a.beside === 'mandrel') {
      const steel = s.material('#c7cbce', { metalness: 0.55, roughness: 0.3 });
      const stick = s.cylinder(0.006, 0.0115, 0.2, [sideX, 0.0115, 0], steel, 16);
      stick.rotation.x = Math.PI / 2;
      stick.rotation.z = 0.0;
      const grip = s.cylinder(0.011, 0.011, 0.06, [sideX, 0.0115, 0.125], s.material('#3a2618'), 12);
      grip.rotation.x = Math.PI / 2;
      const on = s.ring(0.0105, 0.0022, [sideX, 0.0115, 0.03], shine('#4a3c1c'));
      (on.material as THREE.MeshStandardMaterial).color.set(GOLD);
    }
    for (const batch of [bands, heads, gems, stones, tags]) batch.into(tray);

    // the tray rests tilted toward the buyer on a little block
    tray.rotation.x = 0.14;
    tray.position.y = Math.sin(0.14) * (ID / 2 + RIM) + 0.001;
    s.box([IW * 0.7, Math.sin(0.14) * (ID + RIM * 2) * 0.82, 0.02], [0, Math.sin(0.14) * (ID + RIM * 2) * 0.41, -ID / 2 + 0.03], s.material('#3a3a3c'));

    const twinkle = mix(0, 0.25, mood.energy);
    return s.finish({
      update: (_dt, time) => { gemMat.emissiveIntensity = 0.3 + Math.sin(time * 3.1) * twinkle; },
    });
  },
});
