import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const DOOR = {
  orange: 'Safety orange, the chain-brand colour seen from the highway.',
  blue: 'Royal blue, corporate and clean.',
  green: 'Forest green, an older family-run yard.',
  red: 'Barn red, sun-faded toward pink.',
  cream: 'Cream white, anonymous and chalky.',
  bare: 'Unpainted galvanised steel, the cheapest row at the back.',
} as const;
const DOOR_TINT: Record<keyof typeof DOOR, string> = {
  orange: '#e2702a', blue: '#2f5fa8', green: '#3d6b4a', red: '#a8463c', cream: '#e3dcc6', bare: '#a9b0b1',
};

/** A sheet with ribs pressed into it, so the corrugation takes real light. */
function ribbed(width: number, height: number, pitch: number, depth: number, vertical: boolean) {
  const count = Math.max(2, Math.round((vertical ? width : height) / pitch)) * 4;
  const geometry = new THREE.PlaneGeometry(width, height, vertical ? count : 1, vertical ? 1 : count);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const along = vertical ? position.getX(i) + width / 2 : position.getY(i) + height / 2;
    const phase = (along / pitch) % 1;
    position.setZ(i, phase > 0.25 && phase < 0.75 ? depth : 0);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    state: choice('How is the door standing?', {
      shut: 'Rolled all the way down and latched.',
      cracked: 'Lifted a hand\'s width off the ground, a strip of darkness underneath.',
      half: 'Half raised, stopped at chest height, the inside in shadow.',
      open: 'Rolled right up, the whole unit on show.',
    }),
    colour: choice('What colour is the door?', DOOR),
    wall: choice('What is the row built of?', {
      steel: 'Pale corrugated steel sheet, the standard prefab row.',
      block: 'Painted concrete block, heavy and municipal.',
      stucco: 'Sand-coloured stucco, a sunbelt facility.',
    }),
    contents: choice('If the door is raised, what is inside?', {
      boxes: 'Cardboard boxes stacked to the roof, a whole household flattened into cubes.',
      household: 'A sofa on end, a mattress, a standing lamp: a home with nowhere to go.',
      car: 'The nose of a car under a dust tarp, kept and not driven.',
      mannequins: 'A crowd of shop mannequins standing in the dark.',
      chair: 'One chair facing out and nothing else, as if someone sits here.',
      band: 'A drum kit and amplifiers: a rehearsal room nobody admits to.',
      safe: 'A single steel safe at the back of an otherwise bare unit.',
      empty: 'Swept empty, a stain on the slab where something stood for years.',
    }),
    lock: choice('What is on the hasp?', {
      disc: 'A round stainless disc padlock, properly locked.',
      overlock: 'A red overlock put on by the office: the rent is unpaid.',
      cut: 'Nothing, and a bolt-cut padlock lying on the ground.',
      open: 'An unlocked padlock hanging open by its shackle.',
      double: 'Two padlocks, one above the other: somebody is careful.',
    }),
    light: noul('Is a light on inside the unit?'),
    outside: choice('What has been left on the apron in front?', {
      nothing: 'Nothing, bare asphalt.',
      box: 'A single taped box somebody forgot.',
      living: 'A doormat, a folding chair and a thermos: someone is quietly living here.',
      cleared: 'Black bin bags and a broken chair, a unit being cleared out.',
      flowers: 'A bunch of supermarket flowers laid at the foot of the door.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 3.1, H = 2.95, OW = 2.5, OH = 2.25, D = 2.3;
    const pier = (W - OW) / 2;
    const raise = { shut: 0, cracked: 0.07, half: 0.52, open: 0.93 }[a.state];

    const wallTint = new THREE.Color({ steel: '#d5d6cc', block: '#c9c2b0', stucco: '#d8c19a' }[a.wall]);
    const wallMat = s.material(wallTint, { roughness: 0.8, metalness: a.wall === 'steel' ? 0.25 : 0 });
    const trim = s.material('#6f7672', { metalness: 0.5, roughness: 0.5 });
    const dark = s.material('#1d1f22', { roughness: 0.95 });
    const steel = s.material('#c9cfd1', { metalness: 0.85, roughness: 0.28 });

    // Front wall: two piers and a header around the opening.
    const wallPieces: [number, number, number, number][] = [
      [pier, H, -W / 2 + pier / 2, H / 2], [pier, H, W / 2 - pier / 2, H / 2], [OW, H - OH, 0, OH + (H - OH) / 2],
    ];
    for (const [w, h, x, y] of wallPieces) {
      s.box([w, h, 0.16], [x, y, -0.08], wallMat);
      if (a.wall === 'steel') s.mesh(ribbed(w, h, 0.15, 0.022, true), wallMat, [x, y, 0.001]);
    }
    if (a.wall === 'block') {
      const grout = s.material('#9c9686');
      for (let y = 0.2; y < H; y += 0.2) {
        s.box([pier, 0.012, 0.01], [-W / 2 + pier / 2, y, 0.003], grout);
        s.box([pier, 0.012, 0.01], [W / 2 - pier / 2, y, 0.003], grout);
        if (y > OH) s.box([OW, 0.012, 0.01], [0, y, 0.003], grout);
      }
    }
    // Frame, roof edge with gutter, slab.
    for (const x of [-1, 1]) s.box([0.07, OH, 0.1], [x * (OW / 2 + 0.035), OH / 2, 0.03], trim);
    s.box([OW + 0.14, 0.07, 0.1], [0, OH + 0.035, 0.03], trim);
    s.box([W + 0.1, 0.1, D + 0.35], [0, H + 0.05, -D / 2 + 0.1], trim);
    s.box([W + 0.1, 0.09, 0.1], [0, H - 0.03, 0.27], trim);
    s.rod([W / 2 - 0.12, H - 0.06, 0.27], [W / 2 - 0.12, 0.1, 0.1], 0.03, trim);
    s.box([W, 0.06, D + 0.9], [0, 0.0, -D / 2 + 0.45], s.material('#8f8d86', { roughness: 0.95 }));

    // The unit itself: three walls in shadow.
    const inner = s.material(a.light ? '#8a8474' : '#3c3d3d', { roughness: 0.95, side: THREE.DoubleSide });
    s.box([W, H, 0.08], [0, H / 2, -D], inner);
    for (const x of [-1, 1]) s.box([0.08, H, D], [x * (W / 2 - 0.04), H / 2, -D / 2], wallMat);
    for (const x of [-1, 1]) s.box([0.02, H - 0.1, D - 0.2], [x * (W / 2 - 0.1), H / 2, -D / 2 - 0.08], inner);
    let bulb: THREE.MeshStandardMaterial | null = null;
    if (a.light) {
      const glow = new THREE.Color().setHSL(mix(0.14, 0.08, mood.warmth), 0.9, 0.7);
      bulb = new THREE.MeshStandardMaterial({ color: '#fff2c4', emissive: glow, emissiveIntensity: 2.2 });
      s.rod([0, H - 0.02, -D * 0.5], [0, H - 0.45, -D * 0.5], 0.008, dark);
      s.ball([0.06, 0.08, 0.06], [0, H - 0.5, -D * 0.5], bulb, 12);
      // Light spilling onto the slab through the gap.
      if (raise > 0.03) {
        const spill = new THREE.Mesh(new THREE.PlaneGeometry(OW * 0.9, 0.7 + raise), new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.28, depthWrite: false }));
        spill.rotation.x = -Math.PI / 2;
        spill.position.set(0, 0.035, 0.3 + raise * 0.3);
        s.root.add(spill);
      }
    }

    // The door: a ribbed curtain hanging from the header, with a bottom bar.
    const doorTint = new THREE.Color(DOOR_TINT[a.colour]).lerp(new THREE.Color('#b9a999'), mood.wear * 0.35);
    const curtainH = OH * (1 - raise);
    const streaks = paint(256, 256, (ctx) => {
      ctx.fillStyle = `#${doorTint.getHexString()}`;
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < mood.wear * 46; i++) {
        const x = random() * 256, y = random() * 200, len = 20 + random() * 150 * mood.wear;
        const g = ctx.createLinearGradient(0, y, 0, y + len);
        g.addColorStop(0, random() < 0.5 ? 'rgba(96,52,24,0.55)' : 'rgba(40,40,36,0.35)');
        g.addColorStop(1, 'rgba(96,52,24,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, 2 + random() * 7, len);
      }
      if (mood.wear > 0.55) {
        // A dented band where something backed into it.
        const y = 150 + random() * 60;
        const g = ctx.createLinearGradient(0, y, 0, y + 26);
        g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(0.5, 'rgba(20,20,20,0.4)'); g.addColorStop(1, 'rgba(20,20,20,0)');
        ctx.fillStyle = g;
        ctx.fillRect(30 + random() * 80, y, 70 + random() * 60, 26);
      }
    });
    const doorMat = new THREE.MeshStandardMaterial({ map: streaks, roughness: mix(0.45, 0.85, mood.wear), metalness: a.colour === 'bare' ? 0.6 : 0.2, side: THREE.DoubleSide });
    const doorZ = -0.05;
    const sag = mood.wear > 0.6 && a.state !== 'shut' ? (random() - 0.5) * 0.05 : 0;
    const curtain = s.mesh(ribbed(OW, curtainH, 0.075, 0.018, false), doorMat, [0, OH - curtainH / 2, doorZ]);
    curtain.rotation.z = sag * 0.3;
    const bar = s.box([OW, 0.07, 0.05], [0, OH - curtainH + 0.035, doorZ + 0.01], trim);
    bar.rotation.z = sag;
    s.box([OW, 0.02, 0.07], [0, OH - curtainH - 0.005, doorZ + 0.01], dark).rotation.z = sag;
    // Roll drum behind the header, growing as the door goes up.
    const drum = s.cylinder(0.1 + raise * 0.1, 0.1 + raise * 0.1, OW, [0, OH + 0.2, -0.3], doorMat, 18);
    drum.rotation.z = Math.PI / 2;
    // Pull rope and handle.
    const barY = OH - curtainH;
    s.box([0.22, 0.035, 0.035], [-0.5, barY + 0.2, doorZ + 0.04], steel);
    if (raise > 0.3) s.rod([0.2, barY, doorZ + 0.03], [0.2 + (random() - 0.5) * 0.1, Math.max(0.5, barY - 0.7), doorZ + 0.05], 0.008, s.material('#d9d3bd'));

    // Unit number, stencilled on a plate over the door.
    const number = `${'ABCDEFG'[Math.floor(random() * 7)]}${10 + Math.floor(random() * 89)}`;
    s.label(number, 0.62, 0.3, [0, OH + 0.38, 0.03], '#1f2326', mood.wear > 0.6 ? '#cfc8ae' : '#f0ead2');

    // Hasp and locks ride on the door at the right-hand jamb.
    const latchY = barY + 0.75;
    const lx = OW / 2 - 0.16;
    if (latchY < OH - 0.1) {
      const z = doorZ + 0.03;
      s.box([0.26, 0.09, 0.012], [lx, latchY, z], steel);
      s.box([0.05, 0.14, 0.03], [lx + 0.11, latchY, z + 0.01], steel);
      s.rod([lx - 0.1, latchY, z + 0.02], [lx + 0.09, latchY, z + 0.02], 0.012, trim);
      const disc = (y: number, colour: string, emissive = 0) => {
        const lock = s.cylinder(0.05, 0.05, 0.03, [lx + 0.11, y, z + 0.045], colour === 'steel' ? steel : s.material(colour, { roughness: 0.4, emissive: colour, emissiveIntensity: emissive }), 20);
        lock.rotation.x = Math.PI / 2;
        s.ring(0.026, 0.006, [lx + 0.11, y + 0.045, z + 0.045], steel, Math.PI);
      };
      if (a.lock === 'disc' || a.lock === 'double') disc(latchY - 0.03, 'steel');
      if (a.lock === 'double') disc(latchY + 0.14, '#c9a23a');
      if (a.lock === 'overlock') {
        disc(latchY - 0.03, '#d22a25', 0.25);
        s.label('LIEN', 0.2, 0.09, [lx - 0.02, latchY - 0.16, z + 0.01], '#ffffff', '#c5221f');
      }
      if (a.lock === 'open') {
        const body = s.box([0.06, 0.055, 0.025], [lx + 0.13, latchY - 0.1, z + 0.04], s.material('#c9a23a', { metalness: 0.7, roughness: 0.35 }));
        body.rotation.z = 0.35;
        s.ring(0.022, 0.006, [lx + 0.115, latchY - 0.05, z + 0.04], steel, Math.PI * 1.2);
      }
    }
    if (a.lock === 'cut') {
      const gx = 0.6 + random() * 0.4, gz = 0.35 + random() * 0.25;
      s.cylinder(0.05, 0.05, 0.03, [gx, 0.045, gz], steel, 20);
      const shackle = s.ring(0.03, 0.007, [gx + 0.12, 0.04, gz + 0.06], steel, Math.PI * 0.9);
      shackle.rotation.x = Math.PI / 2;
    }

    // What was kept. Everything sits back from the door line, dim unless the light is on.
    const seen = raise > 0.04;
    const lit = a.light ? 0.5 : 0.12;
    const tone = (colour: string) => {
      const c = new THREE.Color(colour);
      return s.material(c, { roughness: 0.9, emissive: c, emissiveIntensity: lit * 0.6 });
    };
    const card = tone('#b08a58'), cardDark = tone('#8d6b42');
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material = card, turn = 0) => {
      const mesh = s.box([w, h, d], [x, y + h / 2, z], m);
      mesh.rotation.y = turn;
      return mesh;
    };
    if (seen) {
      const fill = mix(0.35, 1, mood.density);
      if (a.contents === 'boxes') {
        const tape = tone('#d8cfae');
        for (let cx = -1.05; cx < 1.1; cx += 0.52) {
          let y = 0.03;
          const top = (0.7 + random() * 1.5) * fill + 0.35;
          while (y < Math.min(top, 2.4)) {
            const h = 0.3 + random() * 0.22, w = 0.44 + random() * 0.08;
            const z = -0.55 - random() * 0.12;
            box(w, h, 0.45, cx + (random() - 0.5) * 0.05, y, z, random() < 0.3 ? cardDark : card, (random() - 0.5) * 0.12);
            s.box([0.05, 0.004, 0.452], [cx, y + h + 0.001, z], tape);
            s.box([0.05, h * 0.3, 0.004], [cx, y + h * 0.85, z + 0.228], tape);
            y += h + 0.005;
          }
        }
        for (let i = 0; i < 6 * fill; i++) box(0.5, 0.35, 0.45, -1 + random() * 2, 0.03 + Math.floor(random() * 4) * 0.36, -1.3 - random() * 0.5, cardDark);
      } else if (a.contents === 'household') {
        const sofa = tone(mood.warmth > 0.5 ? '#8a4a3a' : '#4d6470');
        box(0.85, 1.95, 0.8, -0.72, 0.03, -0.75, sofa, 0.08);
        box(0.85, 0.22, 0.95, -0.72, 0.03, -0.7, sofa, 0.08);
        for (const y of [0.5, 1.15]) box(0.7, 0.55, 0.14, -0.72, y, -0.3, tone('#a56a55'), 0.08);
        const mattress = box(1.3, 1.9, 0.22, 0.55, 0.03, -1.1, tone('#d9d4c4'));
        mattress.rotation.x = -0.12;
        s.rod([0.2, 0.03, -0.5], [0.2, 1.5, -0.5], 0.018, tone('#8b7a4a'));
        s.cylinder(0.12, 0.2, 0.26, [0.2, 1.6, -0.5], tone('#e8dcae'), 16);
        s.cylinder(0.16, 0.16, 0.03, [0.2, 0.045, -0.5], tone('#8b7a4a'), 16);
        for (let i = 0; i < 2 + fill * 5; i++) box(0.45, 0.33, 0.42, 0.55 + random() * 0.5, 0.03 + Math.floor(i / 2) * 0.34, -0.5 - random() * 0.1, i % 3 ? card : cardDark, (random() - 0.5) * 0.3);
        box(0.5, 0.75, 0.5, 0.95, 0.03, -1.7, tone('#6d5137'));
      } else if (a.contents === 'car') {
        const tarp = tone(mood.cheer > 0.5 ? '#9fb0b8' : '#7c7f78');
        s.ball([0.88, 0.42, 1.0], [0, 0.62, -1.1], tarp, 20);
        s.ball([0.7, 0.36, 0.7], [0, 0.98, -1.5], tarp, 20);
        s.box([1.72, 0.3, 0.3], [0, 0.42, -0.25], tarp);
        for (const x of [-0.72, 0.72]) {
          const tyre = s.cylinder(0.3, 0.3, 0.2, [x, 0.33, -0.55], tone('#222426'), 18);
          tyre.rotation.z = Math.PI / 2;
        }
        s.box([0.5, 0.11, 0.02], [0, 0.42, -0.09], tone('#e8e4d2'));
        if (fill > 0.6) for (let i = 0; i < 4; i++) box(0.4, 0.3, 0.4, -1.2, 0.03 + i * 0.31, -1.8, card);
      } else if (a.contents === 'mannequins') {
        const skin = tone('#d9c9b4');
        const count = Math.round(mix(2, 9, mood.density));
        for (let i = 0; i < count; i++) {
          const x = -1.05 + (i % 5) * 0.52 + (random() - 0.5) * 0.2, z = -0.5 - Math.floor(i / 5) * 0.6 - random() * 0.3;
          const turn = (random() - 0.5) * 1.2;
          const g = new THREE.Group();
          const add = (mesh: THREE.Mesh) => { s.root.remove(mesh); g.add(mesh); };
          add(s.cylinder(0.11, 0.07, 0.85, [0, 0.45, 0], skin, 10));
          add(s.cylinder(0.17, 0.12, 0.55, [0, 1.15, 0], skin, 10));
          add(s.ball([0.09, 0.115, 0.1], [0, 1.6, 0], skin, 12));
          add(s.rod([-0.19, 1.38, 0], [-0.24, 0.8, 0.04], 0.035, skin));
          if (random() < 0.7) add(s.rod([0.19, 1.38, 0], [0.26, 0.8, 0.04], 0.035, skin));
          add(s.cylinder(0.16, 0.16, 0.02, [0, 0.02, 0], tone('#55585a'), 12));
          g.position.set(x, 0.03, z); g.rotation.y = turn;
          s.root.add(g);
        }
      } else if (a.contents === 'chair') {
        const wood = tone('#6d4a2c');
        const g = new THREE.Group();
        const add = (mesh: THREE.Mesh) => { s.root.remove(mesh); g.add(mesh); };
        add(s.box([0.44, 0.04, 0.44], [0, 0.46, 0], wood));
        for (const x of [-0.19, 0.19]) for (const z of [-0.19, 0.19]) add(s.box([0.04, z < 0 ? 0.95 : 0.46, 0.04], [x, z < 0 ? 0.475 : 0.23, z], wood));
        add(s.box([0.42, 0.22, 0.03], [0, 0.82, -0.19], wood));
        g.position.set((random() - 0.5) * 0.3, 0.03, -1.0); g.rotation.y = (random() - 0.5) * 0.3;
        s.root.add(g);
        if (mood.density > 0.5) { s.cylinder(0.04, 0.04, 0.12, [0.45, 0.09, -0.9], tone('#c9cfd1'), 10); s.box([0.3, 0.02, 0.22], [-0.5, 0.04, -0.8], tone('#e8e4d2')); }
      } else if (a.contents === 'band') {
        const shell = tone(mood.cheer > 0.5 ? '#b3262c' : '#27405e'), chrome = tone('#cfd4d6'), black = tone('#25272a');
        const kick = s.cylinder(0.3, 0.3, 0.4, [0, 0.33, -1.0], shell, 20); kick.rotation.x = Math.PI / 2;
        s.cylinder(0.29, 0.29, 0.01, [0, 0.33, -0.795], tone('#ece6d2'), 20).rotation.x = Math.PI / 2;
        s.cylinder(0.19, 0.19, 0.16, [-0.5, 0.72, -0.9], shell, 16); s.rod([-0.5, 0.03, -0.9], [-0.5, 0.64, -0.9], 0.015, chrome);
        s.cylinder(0.16, 0.16, 0.2, [-0.18, 0.84, -1.0], shell, 16); s.cylinder(0.16, 0.16, 0.2, [0.2, 0.84, -1.0], shell, 16);
        s.cylinder(0.22, 0.22, 0.35, [0.55, 0.45, -1.2], shell, 16);
        for (const [x, y] of [[-0.85, 1.25], [0.8, 1.4]] as const) { s.rod([x, 0.03, -1.1], [x, y, -1.1], 0.012, chrome); s.cylinder(0.24, 0.24, 0.012, [x, y, -1.1], tone('#c9a23a'), 20).rotation.z = 0.2; }
        box(0.7, 0.75, 0.35, -0.95, 0.03, -1.85, black); box(0.7, 0.28, 0.33, -0.95, 0.79, -1.85, black);
        s.cylinder(0.24, 0.24, 0.01, [-0.95, 0.42, -1.67], tone('#55585a'), 18).rotation.x = Math.PI / 2;
        box(0.6, 0.55, 0.3, 0.95, 0.03, -1.85, black);
        if (fill > 0.5) for (let i = 0; i < 5; i++) s.cylinder(0.033, 0.033, 0.12, [-1 + random() * 2, 0.09, -0.3 - random() * 0.3], tone('#b7412c'), 8);
      } else if (a.contents === 'safe') {
        const iron = tone('#3d4a4a');
        box(0.75, 1.15, 0.65, 0.3, 0.03, -1.75, iron);
        s.box([0.6, 1.0, 0.03], [0.3, 0.6, -1.41], tone('#2d3838'));
        s.cylinder(0.07, 0.07, 0.04, [0.2, 0.7, -1.38], tone('#cfd4d6'), 16).rotation.x = Math.PI / 2;
        s.rod([0.38, 0.7, -1.37], [0.5, 0.7, -1.37], 0.015, tone('#cfd4d6'));
      } else {
        const stain = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshStandardMaterial({ color: '#5a5750', roughness: 1, transparent: true, opacity: 0.55, depthWrite: false }));
        stain.rotation.x = -Math.PI / 2; stain.scale.set(1.3, 0.8, 1); stain.position.set(0.2, 0.034, -1.1);
        s.root.add(stain);
        s.rod([-1.2, 0.05, -2.1], [-0.9, 1.3, -2.2], 0.015, tone('#b08a58'));
        s.box([0.3, 0.03, 0.12], [-1.2, 0.05, -2.05], tone('#555a5c'));
      }
    }

    // The apron.
    if (a.outside === 'box') {
      box(0.5, 0.36, 0.42, -0.75 + random() * 0.3, 0.03, 0.42, s.material('#b08a58'), random() - 0.5);
    } else if (a.outside === 'living') {
      s.box([0.7, 0.015, 0.45], [0, 0.04, 0.4], s.material('#6a5138'));
      const frame = s.material('#c9cfd1', { metalness: 0.7 }), web = s.material(mood.cheer > 0.5 ? '#3f9a7c' : '#56677a');
      const cx = -0.95, cz = 0.45;
      s.box([0.46, 0.03, 0.42], [cx, 0.42, cz], web);
      s.box([0.46, 0.45, 0.03], [cx, 0.68, cz - 0.22], web).rotation.x = -0.15;
      for (const x of [-0.22, 0.22]) { s.rod([cx + x, 0.03, cz - 0.2], [cx + x, 0.45, cz + 0.2], 0.012, frame); s.rod([cx + x, 0.03, cz + 0.2], [cx + x, 0.9, cz - 0.26], 0.012, frame); }
      s.cylinder(0.04, 0.045, 0.26, [cx + 0.42, 0.16, cz + 0.1], s.material('#2d5a48', { metalness: 0.4 }), 12);
    } else if (a.outside === 'cleared') {
      const bag = s.material('#26282b', { roughness: 0.5 });
      for (let i = 0; i < 3 + Math.round(mood.density * 4); i++) {
        const r = 0.2 + random() * 0.1, x = -1.2 + random() * 1.0, z = 0.3 + random() * 0.35;
        s.ball([r, r * 0.85, r], [x, 0.03 + r * 0.8, z], bag, 10);
        s.cylinder(0.01, 0.05, 0.1, [x, 0.03 + r * 1.65, z], bag, 6);
      }
      const wood = s.material('#6d4a2c');
      const seat = s.box([0.42, 0.04, 0.42], [0.9, 0.24, 0.5], wood); seat.rotation.z = Math.PI / 2 - 0.1;
      s.rod([0.92, 0.05, 0.3], [1.35, 0.1, 0.3], 0.02, wood); s.rod([0.92, 0.42, 0.68], [1.3, 0.5, 0.7], 0.02, wood);
    } else if (a.outside === 'flowers') {
      const fx = -0.3 + random() * 0.6;
      const wrap = s.cylinder(0.11, 0.03, 0.42, [fx, 0.1, 0.22], s.material('#e9e5d8', { roughness: 0.5 }), 10);
      wrap.rotation.set(Math.PI / 2 - 0.25, 0, 0.4);
      const petals = ['#e4c22f', '#d94f6b', '#f1ede2', '#e07a2b'];
      for (let i = 0; i < 9; i++) s.ball([0.035, 0.035, 0.035], [fx - 0.08 + random() * 0.12, 0.17 + random() * 0.05, 0.0 + random() * 0.1], s.material(petals[i % 4], { emissive: petals[i % 4], emissiveIntensity: 0.15 }), 8);
    }
    // Weeds and grit at the foot of a worn row.
    if (mood.wear > 0.5) {
      const weed = s.material('#6f8046');
      for (let i = 0; i < mood.wear * 10; i++) {
        const x = (random() < 0.5 ? -1 : 1) * (OW / 2 + random() * pier), h = 0.08 + random() * 0.2;
        s.rod([x, 0.03, 0.03], [x + (random() - 0.5) * 0.1, 0.03 + h, 0.06], 0.008, weed, 0.002);
      }
    }

    const flicker = bulb && mood.energy > 0.6 ? bulb : null;
    return s.finish({ update: flicker ? (_dt, time) => { flicker.emissiveIntensity = 2.2 * (Math.sin(time * 31) * Math.sin(time * 7.3) > 0.55 ? 0.35 : 1); } : undefined });
  },
});
