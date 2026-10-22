import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const TIMES = {
  'ten-past-three': [3, 10],
  'five-to-nine': [8, 55],
  noon: [12, 0],
  'twenty-past-four': [4, 20],
  'half-six': [6, 30],
  'quarter-to-twelve': [11, 45],
  'two-minutes-to-midnight': [11, 58],
} as const;

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineThing({
  questions: {
    mount: choice('What is the clock fixed to?', {
      wall: 'A cut-out slab of painted corridor wall with a dado rail, the clock high on it.',
      tiled: 'A slab of glazed tiled wall, as in a station subway, a swimming bath or a hospital basement.',
      pole: 'A double-faced clock on top of a tall slim platform pole.',
      gantry: 'Hung on a drop rod from a beam between two posts, as over a station concourse or a factory floor.',
    }),
    hour: choice('What time does it show?', {
      'ten-past-three': 'Ten past three, the dead middle of the night or a slow afternoon.',
      'five-to-nine': 'Five to nine, just before the bell, the shift, the appointment.',
      noon: 'Exactly twelve, both hands straight up.',
      'twenty-past-four': 'Twenty past four, the long tail of the day.',
      'half-six': 'Half past six, hands in one straight vertical line.',
      'quarter-to-twelve': 'A quarter to twelve, nearly there.',
      'two-minutes-to-midnight': 'Two minutes to twelve, the last moment before something.',
    }),
    state: choice('Is it keeping time?', {
      ticking: 'Running steadily, the second hand stepping round.',
      stopped: 'Stopped dead; nobody has changed the battery.',
      stuck: 'The second hand twitches on one spot, trying and failing to advance.',
      cracked: 'The glass is cracked across and the hands froze at that moment.',
      backwards: 'Running backwards, the second hand stepping the wrong way.',
    }),
    face: choice('What is the dial like?', {
      numerals: 'Plain black numerals one to twelve, the school classroom dial.',
      bars: 'Bold black bars and no numbers, a railway dial with a red lollipop second hand.',
      'twenty-four': 'Twelve-hour numerals with a small inner ring of 13 to 24, a hospital or military dial.',
      blank: 'Only four heavy quarter marks on an otherwise empty face.',
    }),
    rim: choice('What is the case made of?', {
      black: 'A thin black plastic rim.',
      chrome: 'A polished chrome bezel.',
      white: 'A chunky white plastic rim that has yellowed with the face.',
      wood: 'A turned brown wooden surround, an old schoolhouse clock.',
      green: 'A dark green enamelled metal drum.',
    }),
    finish: choice('What colours is the wall or post painted?', {
      hospital: 'Pale green over a darker green gloss dado.',
      school: 'Cream over chocolate-brown gloss.',
      office: 'Flat grey-white with a strip of cable trunking.',
      station: 'Off-white with a deep blue band.',
      mauve: 'Tired pink-mauve over a plum dado.',
    }),
    beneath: choice('What is fixed below the clock?', {
      nothing: 'Nothing, only bare wall or post.',
      quiet: 'A small engraved QUIET PLEASE sign.',
      notices: 'Paper notices taped or pinned up, curling at the corners.',
      bell: 'A red fire-alarm bell and a break-glass call point.',
      timetable: 'A framed timetable or rota in small print.',
      switch: 'A light switch and a scuffed patch where hands have rubbed.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [hour, minute] = TIMES[a.hour];
    const palette = {
      hospital: ['#cfe0cf', '#6f9a82', '#3f5f50'],
      school: ['#ece0bf', '#6a4630', '#3b2a20'],
      office: ['#dcdedb', '#b9bdbb', '#5d6466'],
      station: ['#e6e3d6', '#2b4f86', '#1d2f4d'],
      mauve: ['#e3c9cf', '#8a5673', '#4d3145'],
    }[a.finish];
    const upper = s.material(palette[0]);
    const lower = s.material(palette[1], { roughness: 0.35 });
    const dark = s.material(palette[2]);
    const black = s.material('#16181a', { roughness: 0.5 });
    const steel = s.material('#aeb4b5', { metalness: 0.6, roughness: 0.35 });
    const onWall = a.mount === 'wall' || a.mount === 'tiled';
    const R = onWall ? 0.3 : 0.34;

    // The dial is painted once and shared by both faces of a double-sided clock.
    const yellow = mood.wear * 0.5 + (a.rim === 'white' ? 0.15 : 0);
    const paper = new THREE.Color('#fbfbf6').lerp(new THREE.Color('#e2cf9a'), yellow).getStyle();
    const dial = paint(512, 512, (ctx) => {
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, 512, 512);
      ctx.translate(256, 256);
      ctx.fillStyle = ctx.strokeStyle = '#111';
      for (let i = 0; i < 60; i++) {
        const major = i % 5 === 0, quarter = i % 15 === 0;
        ctx.save();
        ctx.rotate((i / 60) * Math.PI * 2);
        if (a.face === 'bars') ctx.fillRect(major ? -9 : -3, -238, major ? 18 : 6, major ? 62 : 22);
        else if (a.face === 'blank') { if (quarter) ctx.fillRect(-13, -236, 26, 70); }
        else ctx.fillRect(major ? -5 : -2, -240, major ? 10 : 4, major ? 26 : 14);
        ctx.restore();
      }
      if (a.face === 'numerals' || a.face === 'twenty-four') {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let n = 1; n <= 12; n++) {
          const angle = (n / 12) * Math.PI * 2;
          ctx.font = 'bold 58px sans-serif';
          ctx.fillText(String(n), Math.sin(angle) * 178, -Math.cos(angle) * 178 + 3);
          if (a.face === 'twenty-four') {
            ctx.font = 'bold 26px sans-serif';
            ctx.fillStyle = '#b3261e';
            ctx.fillText(String(n + 12 === 24 ? 24 : n + 12), Math.sin(angle) * 122, -Math.cos(angle) * 122 + 2);
            ctx.fillStyle = '#111';
          }
        }
      }
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#555';
      if (a.face !== 'blank') ctx.fillText('QUARTZ', 0, 76);
      // Fly specks and a tide mark as it ages.
      ctx.fillStyle = 'rgba(90,70,40,0.5)';
      for (let i = 0; i < mood.wear * 60; i++) ctx.fillRect((random() - 0.5) * 460, (random() - 0.5) * 460, 2 + random() * 3, 2 + random() * 3);
      if (a.state === 'cracked') {
        ctx.strokeStyle = 'rgba(40,40,40,0.85)';
        const ox = (random() - 0.5) * 200, oy = (random() - 0.5) * 200;
        for (let i = 0; i < 7; i++) {
          let x = ox, y = oy;
          const heading = (i / 7) * Math.PI * 2 + random();
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x, y);
          for (let step = 0; step < 6; step++) {
            x += Math.cos(heading + (random() - 0.5) * 0.9) * 60;
            y += Math.sin(heading + (random() - 0.5) * 0.9) * 60;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(ox, oy, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    const dialMaterial = new THREE.MeshStandardMaterial({ map: dial, roughness: 0.6, emissive: '#ffffff', emissiveMap: dial, emissiveIntensity: 0.12 });
    const rimMaterial = {
      black, chrome: s.material('#e4e8ea', { metalness: 0.9, roughness: 0.18 }),
      white: s.material(new THREE.Color('#f1efe6').lerp(new THREE.Color('#d9c48c'), yellow)),
      wood: s.material('#6b4326', { roughness: 0.55 }),
      green: s.material('#27493a', { roughness: 0.4, metalness: 0.3 }),
    }[a.rim];
    const fat = a.rim === 'wood' ? 0.055 : a.rim === 'white' || a.rim === 'green' ? 0.04 : 0.024;

    const seconds: THREE.Object3D[] = [];
    const startSecond = Math.floor(random() * 60);
    const makeFace = (group: THREE.Group, z: number) => {
      const plate = new THREE.Mesh(new THREE.CircleGeometry(R, 48), dialMaterial);
      plate.position.z = z;
      group.add(plate);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R + fat * 0.5, fat, 10, 56), rimMaterial);
      rim.position.z = z - fat * 0.2;
      rim.castShadow = true;
      group.add(rim);
      const hand = (length: number, width: number, tail: number, angle: number, material: THREE.Material, lift: number) => {
        const pivot = new THREE.Group();
        const blade = new THREE.Mesh(new THREE.BoxGeometry(width, length + tail, 0.005), material);
        blade.position.y = (length - tail) / 2;
        pivot.add(blade);
        pivot.position.z = z + lift;
        pivot.rotation.z = -angle;
        group.add(pivot);
        return pivot;
      };
      const minuteAngle = ((minute + startSecond / 60) / 60) * Math.PI * 2;
      hand(R * 0.52, R * 0.085, R * 0.1, ((hour % 12) / 12) * Math.PI * 2 + minuteAngle / 12, black, 0.008);
      hand(R * 0.8, R * 0.06, R * 0.12, minuteAngle, black, 0.014);
      const red = s.material('#c2261d', { roughness: 0.4 });
      const second = hand(R * 0.82, R * 0.018, R * 0.22, (startSecond / 60) * Math.PI * 2, a.face === 'bars' ? red : black, 0.02);
      if (a.face === 'bars') {
        const lollipop = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.075, R * 0.075, 0.005, 20), red);
        lollipop.rotation.x = Math.PI / 2;
        lollipop.position.y = R * 0.62;
        second.add(lollipop);
      }
      const boss = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.045, R * 0.045, 0.03, 16), black);
      boss.rotation.x = Math.PI / 2;
      boss.position.z = z + 0.012;
      group.add(boss);
      seconds.push(second);
    };

    // What sits beneath the clock, built around a point on a flat surface facing +z.
    const under = (x: number, y: number, z: number, room: number) => {
      const at = (dx: number, dy: number, dz = 0): [number, number, number] => [x + dx, y + dy, z + dz];
      if (a.beneath === 'quiet') {
        s.box([room * 0.62, 0.13, 0.012], at(0, 0), dark);
        s.label('QUIET PLEASE', room * 0.58, 0.1, at(0, 0, 0.008), '#f4f1e4', palette[2]);
      } else if (a.beneath === 'notices') {
        const sheets = 2 + Math.round(mood.density * 4);
        for (let i = 0; i < sheets; i++) {
          const w = 0.15 + random() * 0.08, h = w * 1.35;
          const sheet = s.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({
            roughness: 0.9,
            map: paint(96, 128, (ctx) => {
              ctx.fillStyle = ['#fbf8ec', '#f6e58a', '#f4c9c3', '#cfe6f4', '#d9efc8'][Math.floor(random() * 5)];
              ctx.fillRect(0, 0, 96, 128);
              ctx.fillStyle = '#222';
              ctx.fillRect(12, 12, 40 + random() * 30, 9);
              ctx.fillStyle = '#666';
              for (let line = 0; line < 9; line++) ctx.fillRect(12, 32 + line * 10, 40 + random() * 32, 3);
            }),
          }), at((random() - 0.5) * room * 0.6, (random() - 0.5) * 0.3, 0.004 + i * 0.002));
          sheet.rotation.z = (random() - 0.5) * (0.12 + mood.wear * 0.5);
          s.cylinder(0.008, 0.008, 0.006, [sheet.position.x, sheet.position.y + h * 0.42, sheet.position.z + 0.004], s.material(['#c2261d', '#2b62b8', '#e0b020'][i % 3]), 8).rotation.x = Math.PI / 2;
        }
      } else if (a.beneath === 'bell') {
        const red = s.material('#c4241c', { roughness: 0.3, metalness: 0.3 });
        s.cylinder(0.085, 0.085, 0.02, at(-room * 0.16, 0.06, 0.012), dark, 24).rotation.x = Math.PI / 2;
        const gong = s.ball([0.08, 0.08, 0.045], at(-room * 0.16, 0.06, 0.03), red, 24);
        gong.castShadow = true;
        s.cylinder(0.014, 0.014, 0.02, at(-room * 0.16, 0.06, 0.08), steel, 10).rotation.x = Math.PI / 2;
        s.box([0.1, 0.1, 0.04], at(room * 0.18, 0.02, 0.02), red);
        s.box([0.06, 0.045, 0.006], at(room * 0.18, 0.025, 0.042), s.material('#f3f0e6'));
      } else if (a.beneath === 'timetable') {
        s.box([room * 0.7, 0.38, 0.02], at(0, -0.04, 0.008), dark);
        s.mesh(new THREE.PlaneGeometry(room * 0.64, 0.32), new THREE.MeshStandardMaterial({
          roughness: 0.5,
          map: paint(256, 160, (ctx) => {
            ctx.fillStyle = '#f5f2e3';
            ctx.fillRect(0, 0, 256, 160);
            ctx.fillStyle = palette[1];
            ctx.fillRect(0, 0, 256, 22);
            ctx.fillStyle = '#333';
            for (let row = 0; row < 11; row++) for (let col = 0; col < 5; col++) if (random() > 0.18) ctx.fillRect(10 + col * 49, 32 + row * 11.5, 22 + random() * 18, 4);
            ctx.strokeStyle = '#999';
            for (let col = 1; col < 5; col++) { ctx.beginPath(); ctx.moveTo(col * 49 + 4, 24); ctx.lineTo(col * 49 + 4, 160); ctx.stroke(); }
          }),
        }), at(0, -0.04, 0.02));
      } else if (a.beneath === 'switch') {
        s.box([0.086, 0.086, 0.012], at(room * 0.2, -0.05, 0.006), s.material('#f3f1ea', { roughness: 0.35 }));
        s.box([0.022, 0.04, 0.012], at(room * 0.2, -0.045, 0.014), s.material('#fbfaf5', { roughness: 0.3 }));
        const scuff = s.mesh(new THREE.CircleGeometry(0.16, 20), new THREE.MeshStandardMaterial({ color: '#5b5245', transparent: true, opacity: 0.12 + mood.wear * 0.25, depthWrite: false }), at(room * 0.2, -0.07, 0.002));
        scuff.scale.set(1, 1.3, 1);
        scuff.castShadow = false;
      }
    };

    const clock = new THREE.Group();
    s.root.add(clock);
    const tilt = (random() - 0.5) * mood.wear * 0.22;

    if (onWall) {
      const W = 1.15, H = 1.9, T = 0.14, dado = 0.6;
      if (a.mount === 'tiled') {
        const tiles = paint(256, 512, (ctx) => {
          ctx.fillStyle = '#8f9690';
          ctx.fillRect(0, 0, 256, 512);
          const cols = 6, rows = 12, band = palette[1];
          for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
            const base = new THREE.Color(r === 6 || r === 11 ? band : '#f1f0e6');
            base.offsetHSL(0, 0, (random() - 0.5) * 0.05 - mood.wear * random() * 0.12);
            ctx.fillStyle = base.getStyle();
            if (mood.wear > 0.6 && random() < (mood.wear - 0.6) * 0.3) ctx.fillStyle = '#7d8079';
            ctx.fillRect(c * 256 / cols + 1.5, r * 512 / rows + 1.5, 256 / cols - 3, 512 / rows - 3);
          }
        });
        s.box([W, H, T], [0, H / 2, -T / 2], s.material('#bdb9aa'));
        s.mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.22 }), [0, H / 2, 0.002]);
      } else {
        s.box([W, H - dado, T], [0, dado + (H - dado) / 2, -T / 2], upper);
        s.box([W, dado, T + 0.006], [0, dado / 2, -T / 2], lower);
        s.box([W, 0.05, T + 0.04], [0, dado, -T / 2], a.finish === 'office' ? s.material('#f2f2ee') : dark);
        s.box([W, 0.1, T + 0.03], [0, 0.05, -T / 2], dark);
        if (a.finish === 'office') for (const x of [-0.3, 0.25]) s.box([0.086, 0.086, 0.02], [x, dado + 0.0, 0.02], s.material('#fafaf6'));
      }
      // Exposed brick and plaster edge so it reads as a slice of a larger wall.
      s.box([W + 0.01, H + 0.005, T * 0.5], [0, H / 2, -T * 0.72], s.material('#b9a590'));
      const back = new THREE.Mesh(new THREE.CylinderGeometry(R + fat, R + fat, 0.05, 48), rimMaterial);
      back.rotation.x = Math.PI / 2;
      back.position.z = 0.025;
      back.castShadow = true;
      clock.add(back);
      makeFace(clock, 0.052);
      clock.position.set(0, H - R - 0.13, 0);
      clock.rotation.z = tilt;
      under(0, 0.86, 0.004, W);
    } else {
      const post = s.material(palette[1], { roughness: 0.4, metalness: 0.2 });
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(R + fat, R + fat, 0.16, 48), rimMaterial);
      drum.rotation.x = Math.PI / 2;
      drum.castShadow = true;
      clock.add(drum);
      makeFace(clock, 0.082);
      const rear = new THREE.Group();
      rear.rotation.y = Math.PI;
      clock.add(rear);
      makeFace(rear, 0.082);
      if (a.mount === 'pole') {
        const top = 2.5;
        s.cylinder(0.14, 0.17, 0.08, [0, 0.04, 0], dark, 20);
        s.cylinder(0.075, 0.1, 0.3, [0, 0.2, 0], post, 16);
        s.cylinder(0.04, 0.05, top - R - 0.4, [0, 0.35 + (top - R - 0.4) / 2, 0], post, 14);
        s.ball([0.06, 0.04, 0.06], [0, top - R - 0.06, 0], dark, 14);
        clock.position.set(0, top, 0);
        s.ball([0.035, 0.05, 0.035], [0, top + R + fat + 0.03, 0], dark, 10);
        if (a.beneath !== 'nothing' && a.beneath !== 'switch') {
          s.box([0.5, 0.5, 0.03], [0, 1.5, 0.05], dark);
          under(0, 1.52, 0.07, 0.56);
        }
      } else {
        const span = 1.5, top = 2.55;
        for (const x of [-span / 2, span / 2]) {
          s.box([0.09, top, 0.09], [x, top / 2, 0], post);
          s.box([0.2, 0.03, 0.2], [x, 0.015, 0], dark);
          s.rod([x, top - 0.4, 0], [x - Math.sign(x) * 0.36, top - 0.04, 0], 0.016, dark);
        }
        s.box([span + 0.3, 0.1, 0.1], [0, top, 0], post);
        s.rod([0, top - 0.05, 0], [0, top - 0.3, 0], 0.018, steel);
        clock.position.set(0, top - 0.3 - R - fat, 0);
        // A swinging lamp shade either side keeps the gantry from being a bare goalpost.
        for (const x of [-0.5, 0.5]) {
          s.rod([x, top - 0.05, 0], [x, top - 0.22, 0], 0.008, steel);
          s.lathe([[0.02, 0], [0.05, -0.02], [0.13, -0.1], [0.135, -0.11]], dark, [x, top - 0.2, 0]).material = new THREE.MeshStandardMaterial({ color: palette[2], side: THREE.DoubleSide, roughness: 0.4 });
          s.ball([0.035, 0.035, 0.035], [x, top - 0.3, 0], new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffe9a0', emissiveIntensity: mix(0.3, 1.2, 1 - mood.daylight * 0.5) }), 10);
        }
        if (a.beneath !== 'nothing' && a.beneath !== 'switch') {
          s.box([0.56, 0.5, 0.03], [-span / 2, 1.45, 0.06], dark);
          under(-span / 2, 1.47, 0.08, 0.6);
        }
      }
      clock.rotation.z = tilt * 0.4;
    }

    const glass = new THREE.Mesh(new THREE.CircleGeometry(R, 40), new THREE.MeshPhysicalMaterial({ color: '#dff0f5', transparent: true, opacity: 0.1, roughness: 0.05, depthWrite: false }));
    glass.position.z = (onWall ? 0.052 : 0.082) + 0.03;
    clock.add(glass);
    clock.traverse((node) => { if ((node as THREE.Mesh).isMesh && node !== glass) node.receiveShadow = true; });

    // The second hand steps once a second; a livelier mood runs the escapement a little fast.
    const rate = mix(0.6, 1.6, mood.energy);
    let last = -1;
    const update = (_dt: number, time: number) => {
      if (a.state === 'stopped' || a.state === 'cracked') return;
      const beat = Math.floor(time * rate);
      const phase = time * rate - beat;
      let step: number;
      if (a.state === 'stuck') step = startSecond + (phase < 0.12 ? Math.sin((phase / 0.12) * Math.PI) * 0.45 : 0);
      else step = startSecond + (a.state === 'backwards' ? -beat : beat) + (phase < 0.08 ? (phase / 0.08 - 1) * (a.state === 'backwards' ? -1 : 1) : 0);
      if (step === last) return;
      last = step;
      for (const hand of seconds) hand.rotation.z = -(step / 60) * Math.PI * 2;
    };
    return s.finish({ update });
  },
});
