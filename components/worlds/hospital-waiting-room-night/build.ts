import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type P3 = [number, number, number];

const DEPARTMENTS = {
  emergency: ['#d5362a', 'EMERGENCY'],
  xray: ['#2a6fd0', 'X-RAY'],
  maternity: ['#e06a9a', 'MATERNITY'],
  wards: ['#2f9e5a', 'WARDS 4-7'],
  oncology: ['#8b4ac0', 'ONCOLOGY'],
  theatres: ['#e0a21a', 'THEATRES'],
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

export default defineWorld({
  questions: {
    beyond: choice('Where does the coloured floor stripe lead, through the double doors?', {
      emergency: 'A red stripe to the emergency department.',
      xray: 'A blue stripe to X-ray and imaging.',
      maternity: 'A pink stripe to the maternity unit.',
      wards: 'A green stripe to the wards.',
      oncology: 'A purple stripe to oncology.',
      theatres: 'A yellow stripe to the operating theatres.',
    }),
    doors: choice('What are the double doors at the back doing?', {
      glowing: 'Shut, both portholes glowing with the brighter light beyond.',
      ajar: 'One leaf stands ajar and a wedge of light falls across the floor.',
      restricted: 'Shut under a lit red NO ENTRY lamp; someone is in there.',
      dim: 'Shut, one porthole dark, the corridor beyond half switched off.',
    }),
    hatch: choice('What state is the reception hatch in?', {
      half: 'Shutter half down, the office lit behind it, nobody at the desk.',
      shut: 'Shutter fully down with a handwritten note taped to it.',
      open: 'Still open and lit, a swivel chair pushed back from the desk.',
      dark: 'Shutter half down and the office behind it dark except for a monitor.',
    }),
    floor: choice('What is the vinyl floor like?', {
      marbled: 'Grey-green marbled sheet vinyl with a coved edge.',
      speckled: 'Cream vinyl with a fine dark speckle.',
      blue: 'Blue-grey safety flooring.',
      checker: 'Old brown and cream lino tiles from another decade.',
    }),
    walls: choice('How are the walls painted?', {
      green: 'Pale green above a darker green dado.',
      magnolia: 'Magnolia everywhere, with a timber bump rail.',
      blue: 'Pale blue above, with a frieze of cartoon animals for the children.',
      peach: 'Peach above terracotta, a nineties attempt at warmth.',
    }),
    pinboard: choice('What is on the pinboard?', {
      posters: 'Crowded health posters and leaflets overlapping each other.',
      thanks: 'Thank-you cards and children\'s drawings for the staff.',
      bare: 'Mostly bare cork with one official notice and old pin holes.',
      rota: 'A fire plan, a cleaning rota and a photocopied visiting-hours sheet.',
    }),
    corner: choice('What stands in the far corner?', {
      vending: 'A drinks vending machine, the brightest thing in the room.',
      plant: 'A tall tired pot plant.',
      tank: 'A softly lit fish tank on a cabinet.',
      toys: 'A children\'s corner with a play mat and a little table.',
      tv: 'A wall-mounted television on mute, showing rolling news.',
      nothing: 'Nothing but a fire extinguisher.',
    }),
    hour: choice('What time does the wall clock say?', {
      late: 'Ten to midnight.',
      small: 'Ten past three.',
      dawn: 'Twenty to six, nearly morning.',
      stopped: 'It has stopped at some time nobody trusts.',
    }),
    night: choice('What has the night left in the room?', {
      nothing: 'Nothing; it is empty and tidy.',
      mopped: 'A mop bucket and a wet-floor sign; half the floor shines.',
      vigil: 'Paper cups, a blanket and a pillow on the fixed seats where someone has been all night.',
      tickets: 'A take-a-number dispenser and a NOW SERVING display stuck on its last number.',
      trolley: 'A tea trolley left by a volunteer, urn still warm.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const WIDE = 11, DEEP = 9, TALL = 3.0;
    const { art: s, world } = diorama(context, {
      background: '#98a2ae', floor: '#6f7a7d', width: WIDE, depth: DEEP, maxHeight: 2.3, radius: 1.35, pitch: 38, yaw: 35,
      slots: [[0.5, 1.0], [-2.7, 0.3], [3.2, -0.6], [-2.4, 2.9], [3.3, 2.6], [0.3, -1.6]],
    });
    // Night: the daylight rig is dimmed and tinted toward tube-light green-white.
    s.root.traverse((node) => {
      const light = node as THREE.Light;
      if (!light.isLight) return;
      if ((light as THREE.HemisphereLight).isHemisphereLight) { light.intensity = 0.86; light.color.set('#e2efee'); (light as THREE.HemisphereLight).groundColor.set('#6c7780'); }
      else if (light.castShadow) { light.intensity = 1.1; light.color.lerp(new THREE.Color('#eef6ea'), 0.6); }
      else light.intensity = 0.35;
    });

    const [stripeHex, department] = DEPARTMENTS[a.beyond];
    const stripe = new THREE.Color(stripeHex).lerp(new THREE.Color('#8f8a80'), mood.wear * 0.25);
    const [wallHex, dadoHex] = { green: ['#d3e2d2', '#7fa58c'], magnolia: ['#ebe2c8', '#e2d6b6'], blue: ['#d2e2ec', '#8fb2cc'], peach: ['#f0d6c0', '#c98a6a'] }[a.walls];
    const wall = s.material(wallHex), dado = s.material(dadoHex, { roughness: 0.4 });
    const section = s.material('#59605f'), white = s.material('#f1f1ec'), steel = s.material('#b9bfc0', { metalness: 0.6, roughness: 0.35 });
    const dark = s.material('#2a2e31'), timber = s.material('#b98a55', { roughness: 0.5 });
    const X0 = -WIDE / 2, Z0 = -DEEP / 2;
    const BACK = Z0 + 0.2, LEFT = X0 + 0.2; // inner wall faces
    const doorX = 2.3;
    const panels: P3[] = [[-2.6, TALL + 0.1, -1.6], [2.4, TALL + 0.1, -1.6], [-2.6, TALL + 0.1, 2.2], [2.4, TALL + 0.1, 2.2]];
    const warmIndex = Math.floor(random() * 4);
    const warmHue = new THREE.Color('#ffc978').lerp(new THREE.Color('#ff9a45'), mood.warmth);
    const coolHue = new THREE.Color('#eaf6ff').lerp(new THREE.Color('#f4f8e6'), mood.warmth);

    // ---- Floor -----------------------------------------------------------------------------
    const FW = 1100, FH = 900;
    const px = (x: number) => ((x - X0) / WIDE) * FW, pz = (z: number) => ((z - Z0) / DEEP) * FH;
    const floorMap = paint(FW, FH, (ctx) => {
      const base = { marbled: '#a9b5ab', speckled: '#dcd6c2', blue: '#9fb0be', checker: '#d8cdb0' }[a.floor];
      ctx.fillStyle = base; ctx.fillRect(0, 0, FW, FH);
      if (a.floor === 'checker') {
        ctx.fillStyle = '#8a6a4a';
        for (let i = 0; i < 22; i++) for (let j = 0; j < 18; j++) if ((i + j) % 2) ctx.fillRect(i * 50, j * 50, 50, 50);
        ctx.strokeStyle = 'rgba(40,30,20,0.25)';
        for (let i = 0; i <= 22; i++) { ctx.beginPath(); ctx.moveTo(i * 50, 0); ctx.lineTo(i * 50, FH); ctx.stroke(); }
        for (let j = 0; j <= 18; j++) { ctx.beginPath(); ctx.moveTo(0, j * 50); ctx.lineTo(FW, j * 50); ctx.stroke(); }
      } else if (a.floor === 'marbled') {
        for (let i = 0; i < 260; i++) {
          ctx.strokeStyle = `rgba(${random() < 0.5 ? '240,246,238' : '90,110,100'},${0.08 + random() * 0.12})`;
          ctx.lineWidth = 2 + random() * 5;
          const x = random() * FW, y = random() * FH;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 40, y + random() * 30 - 15, x + 90, y + random() * 40 - 20, x + 140 + random() * 60, y + random() * 30 - 15); ctx.stroke();
        }
      } else {
        for (let i = 0; i < 5000; i++) { ctx.fillStyle = `rgba(${random() < 0.7 ? '50,55,60' : '250,250,245'},${0.2 + random() * 0.3})`; ctx.fillRect(random() * FW, random() * FH, 2, 2); }
      }
      // Way-finding: the main stripe turns along the back wall and goes under the doors; a
      // second, thinner line peels off toward the side.
      const line = (points: [number, number][], hue: string, width: number) => {
        ctx.strokeStyle = hue; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
        ctx.beginPath(); points.forEach(([x, z], i) => (i ? ctx.lineTo(px(x), pz(z)) : ctx.moveTo(px(x), pz(z)))); ctx.stroke();
      };
      const other = Object.values(DEPARTMENTS).map(([hex]) => hex).filter((hex) => hex !== stripeHex)[Math.floor(random() * 5)];
      line([[-4.0, 4.5], [-4.0, -2.75], [5.5, -2.75]], other, 11);
      line([[-4.25, 4.5], [-4.25, -3.0], [doorX, -3.0], [doorX, -4.5]], stripe.getStyle(), 22);
      // Chevrons on the main stripe.
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let x = -3.2; x < doorX - 0.5; x += 1.35) { ctx.beginPath(); ctx.moveTo(px(x), pz(-3.0) - 7); ctx.lineTo(px(x) + 12, pz(-3.0)); ctx.lineTo(px(x), pz(-3.0) + 7); ctx.fill(); }
      // Scuffs, trolley tracks and worn patches.
      for (let i = 0; i < 20 + mood.wear * 120; i++) {
        ctx.strokeStyle = `rgba(40,40,40,${0.04 + random() * 0.1 * (0.4 + mood.wear)})`; ctx.lineWidth = 1 + random() * 3;
        const x = random() * FW, y = random() * FH, bend = random() * 6;
        ctx.beginPath(); ctx.arc(x, y, 20 + random() * 60, bend, bend + 0.4 + random()); ctx.stroke();
      }
      if (mood.wear > 0.45) { ctx.fillStyle = `rgba(70,60,50,${(mood.wear - 0.45) * 0.3})`; ctx.fillRect(px(doorX - 0.9), pz(-4.5), px(doorX + 0.9) - px(doorX - 0.9), 140); }
      // Pools of tube light under each ceiling panel; one of them warm.
      panels.forEach(([x, , z], index) => {
        const glow = ctx.createRadialGradient(px(x), pz(z + 0.2), 20, px(x), pz(z + 0.2), 250);
        const hue = index === warmIndex ? warmHue : coolHue;
        const rgb = `${Math.round(hue.r * 255)},${Math.round(hue.g * 255)},${Math.round(hue.b * 255)}`;
        glow.addColorStop(0, `rgba(${rgb},${index === warmIndex ? 0.6 : 0.34})`);
        glow.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = glow; ctx.fillRect(0, 0, FW, FH);
      });
      // Light from beyond the doors.
      const spill = a.doors === 'ajar' ? 0.75 : a.doors === 'dim' ? 0.15 : a.doors === 'restricted' ? 0.25 : 0.4;
      const beam = ctx.createLinearGradient(0, pz(-4.5), 0, pz(a.doors === 'ajar' ? -0.2 : -2.9));
      beam.addColorStop(0, `rgba(255,244,205,${spill})`);
      beam.addColorStop(1, 'rgba(255,244,205,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      if (a.doors === 'ajar') { ctx.moveTo(px(doorX - 0.85), pz(-4.5)); ctx.lineTo(px(doorX - 0.1), pz(-4.5)); ctx.lineTo(px(doorX + 1.6), pz(-0.2)); ctx.lineTo(px(doorX - 2.3), pz(-0.2)); }
      else { ctx.moveTo(px(doorX - 0.9), pz(-4.5)); ctx.lineTo(px(doorX + 0.9), pz(-4.5)); ctx.lineTo(px(doorX + 1.5), pz(-2.9)); ctx.lineTo(px(doorX - 1.5), pz(-2.9)); }
      ctx.fill();
      if (a.night === 'mopped') {
        const wet = ctx.createRadialGradient(px(-1.6), pz(2.6), 30, px(-1.6), pz(2.6), 330);
        wet.addColorStop(0, 'rgba(255,255,255,0.4)'); wet.addColorStop(0.8, 'rgba(255,255,255,0.22)'); wet.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = wet; ctx.fillRect(0, 0, FW, FH);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 16;
        for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(px(-3.4 + i * 0.6), pz(2.9), 70, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      }
    });
    const vinyl = s.mesh(new THREE.PlaneGeometry(WIDE, DEEP), new THREE.MeshStandardMaterial({ map: floorMap, roughness: a.night === 'mopped' ? 0.25 : 0.42 + mood.wear * 0.3 }), [0, 0.004, 0]);
    vinyl.rotation.x = -Math.PI / 2;
    vinyl.castShadow = false;

    // ---- Walls -----------------------------------------------------------------------------
    const DADO = 1.05, BAND = 2.25;
    // Back wall, full width.
    s.box([WIDE, DADO, 0.2], [0, DADO / 2, Z0 + 0.1], dado);
    s.box([WIDE, TALL - DADO, 0.2], [0, DADO + (TALL - DADO) / 2, Z0 + 0.1], wall);
    // Left wall with openings for the hatch (z -1.9..0.5) and a night window (z 2.2..3.7).
    const leftRun = (z1: number, z2: number, y1: number, y2: number, material: THREE.Material) => s.box([0.2, y2 - y1, z2 - z1], [X0 + 0.1, (y1 + y2) / 2, (z1 + z2) / 2], material);
    leftRun(Z0, DEEP / 2, 0, DADO, dado);
    leftRun(Z0, DEEP / 2, BAND, TALL, wall);
    leftRun(Z0, -1.9, DADO, BAND, wall);
    leftRun(0.5, 2.2, DADO, BAND, wall);
    leftRun(3.7, DEEP / 2, DADO, BAND, wall);
    // Cut edges, skirting and rails.
    s.box([WIDE + 0.02, 0.06, 0.22], [0, TALL + 0.03, Z0 + 0.1], section);
    s.box([0.22, 0.06, DEEP + 0.02], [X0 + 0.1, TALL + 0.03, 0], section);
    s.box([WIDE - 0.2, 0.1, 0.03], [0.1, 0.05, BACK + 0.015], section);
    s.box([0.03, 0.1, DEEP - 0.2], [LEFT + 0.015, 0.05, 0.1], section);
    const rail = a.walls === 'magnolia' ? timber : white;
    s.box([WIDE - 0.2, 0.09, 0.05], [0.1, DADO, BACK + 0.025], rail);
    s.box([0.05, 0.09, 2.5], [LEFT + 0.025, DADO, -3.15], rail);
    s.box([0.05, 0.09, 1.7], [LEFT + 0.025, DADO, 1.35], rail);
    if (a.walls === 'blue') {
      const frieze = s.mesh(new THREE.PlaneGeometry(WIDE - 0.2, 0.34), new THREE.MeshStandardMaterial({ roughness: 0.7, map: paint(1024, 32, (ctx) => {
        ctx.fillStyle = '#f6f1dc'; ctx.fillRect(0, 0, 1024, 32);
        for (let i = 0; i < 24; i++) {
          const x = 20 + i * 42, hue = ['#e0863a', '#6aa84f', '#d55a7a', '#4a86c8', '#e0b83a'][i % 5];
          ctx.fillStyle = hue;
          ctx.beginPath(); ctx.ellipse(x, 18, 11, 7, 0, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.arc(x + 11, 11, 5, 0, 7); ctx.fill();
          ctx.fillRect(x - 7, 22, 3, 7); ctx.fillRect(x + 4, 22, 3, 7);
          if (i % 2) { ctx.fillRect(x + 13, 3, 2, 6); ctx.fillRect(x + 8, 3, 2, 6); } else ctx.fillRect(x - 15, 14, 6, 2);
        }
      }) }), [0.1, 1.42, BACK + 0.004]);
      frieze.castShadow = false;
    }
    // Damp stain and a patched square of plaster as the place wears.
    if (mood.wear > 0.4) {
      const stain = s.mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshStandardMaterial({ color: '#8a7a55', transparent: true, opacity: (mood.wear - 0.4) * 0.4, depthWrite: false }), [4.3, 2.6, BACK + 0.004]);
      stain.scale.set(1.4, 0.7, 1);
      stain.castShadow = false;
      s.box([0.5, 0.4, 0.006], [-0.6 + random(), 1.75, BACK + 0.003], s.material('#f3f1e8'));
    }

    // ---- Double doors ----------------------------------------------------------------------
    const beyond = new THREE.Color('#fff2c8');
    const lit = a.doors === 'dim' ? 0.35 : a.doors === 'restricted' ? 0.7 : 1.25;
    s.box([2.06, 2.22, 0.06], [doorX, 1.11, BACK + 0.03], white);
    s.box([1.84, 2.1, 0.02], [doorX, 1.05, BACK + 0.062], new THREE.MeshStandardMaterial({ color: beyond, emissive: beyond, emissiveIntensity: a.doors === 'ajar' ? 1.2 : 0.2 }));
    const leafPaint = s.material(new THREE.Color(dadoHex).lerp(new THREE.Color('#d8dcd8'), 0.55), { roughness: 0.45 });
    const porthole = (dim: boolean) => new THREE.MeshStandardMaterial({ color: dim ? '#3a4650' : '#fff6d6', emissive: dim ? '#1a2630' : beyond, emissiveIntensity: dim ? 0.3 : lit, roughness: 0.2 });
    for (const side of [-1, 1]) {
      const leaf = new THREE.Group();
      // Hinged on the outer edge.
      leaf.position.set(doorX + side * 0.92, 0, BACK + 0.08);
      s.root.add(leaf);
      const add = (mesh: THREE.Mesh, at: P3) => { leaf.add(mesh); mesh.position.set(...at); return mesh; };
      add(s.box([0.9, 2.08, 0.05], [0, 0, 0], leafPaint), [-side * 0.46, 1.05, 0]);
      add(s.box([0.9, 0.3, 0.012], [0, 0, 0], steel), [-side * 0.46, 0.16, 0.03]);
      add(s.box([0.12, 0.4, 0.012], [0, 0, 0], steel), [-side * 0.82, 1.1, 0.03]);
      const glass = add(s.cylinder(0.19, 0.19, 0.02, [0, 0, 0], porthole(a.doors === 'dim' && side > 0), 28), [-side * 0.46, 1.58, 0.028]);
      glass.rotation.x = Math.PI / 2;
      glass.castShadow = false;
      add(s.ring(0.2, 0.022, [0, 0, 0], steel), [-side * 0.46, 1.58, 0.036]);
      if (!(a.doors === 'dim' && side > 0)) {
        const halo = add(s.mesh(new THREE.CircleGeometry(0.42, 28), new THREE.MeshStandardMaterial({ color: beyond, emissive: beyond, emissiveIntensity: lit * 0.8, transparent: true, opacity: 0.2 * Math.min(1, lit), depthWrite: false })), [-side * 0.46, 1.58, 0.045]);
        halo.castShadow = false;
      }
      if (a.doors === 'ajar' && side < 0) leaf.rotation.y = -1.0 - random() * 0.3;
    }
    // Department sign and arrow over the doors.
    s.box([2.2, 0.36, 0.05], [doorX, 2.48, BACK + 0.03], s.material(stripe));
    s.label(`${department}  >`, 2.1, 0.3, [doorX, 2.48, BACK + 0.058], '#ffffff', stripe.getStyle());
    const warnMaterial = new THREE.MeshStandardMaterial({ color: '#e0352a', emissive: '#ff2a1a', emissiveIntensity: a.doors === 'restricted' ? 1.6 : 0.03 });
    if (a.doors === 'restricted') {
      s.box([0.9, 0.2, 0.07], [doorX, 2.84, BACK + 0.04], warnMaterial);
      const sign = s.label('NO ENTRY', 0.84, 0.15, [doorX, 2.84, BACK + 0.078], '#ffffff', '#c9261d');
      (sign.material as THREE.MeshStandardMaterial).emissive.set('#ff5a4a');
      (sign.material as THREE.MeshStandardMaterial).emissiveMap = (sign.material as THREE.MeshStandardMaterial).map;
    }
    // Hand-gel dispenser and a light switch by the frame.
    s.box([0.13, 0.24, 0.1], [doorX + 1.4, 1.3, BACK + 0.05], white);
    s.box([0.1, 0.08, 0.11], [doorX + 1.4, 1.22, BACK + 0.05], s.material('#8fd6e0'));
    s.box([0.16, 0.03, 0.14], [doorX + 1.4, 1.1, BACK + 0.07], steel);
    // Wall-end bed bumper and a fire call point.
    s.box([0.1, 0.1, 0.04], [doorX - 1.35, 1.4, BACK + 0.02], s.material('#d5362a'));

    // ---- Wall clock ------------------------------------------------------------------------
    const [clockHour, clockMinute] = { late: [11, 50], small: [3, 10], dawn: [5, 40], stopped: [Math.floor(random() * 12), Math.floor(random() * 60)] }[a.hour];
    const clockAt: P3 = [-0.35, 2.42, BACK + 0.02];
    const R = 0.3;
    s.cylinder(R + 0.03, R + 0.03, 0.05, clockAt, dark, 36).rotation.x = Math.PI / 2;
    const face = s.mesh(new THREE.CircleGeometry(R, 40), new THREE.MeshStandardMaterial({ roughness: 0.6, emissive: '#ffffff', emissiveIntensity: 0.15, map: paint(256, 256, (ctx) => {
      ctx.fillStyle = '#fbfbf4'; ctx.fillRect(0, 0, 256, 256);
      ctx.translate(128, 128); ctx.fillStyle = '#111';
      for (let i = 0; i < 60; i++) { ctx.save(); ctx.rotate((i / 60) * Math.PI * 2); ctx.fillRect(i % 5 ? -1.5 : -4, -120, i % 5 ? 3 : 8, i % 5 ? 8 : 18); ctx.restore(); }
      ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let n = 1; n <= 12; n++) ctx.fillText(String(n), Math.sin((n / 12) * Math.PI * 2) * 84, -Math.cos((n / 12) * Math.PI * 2) * 84 + 2);
    }) }), [clockAt[0], clockAt[1], clockAt[2] + 0.027]);
    face.castShadow = false;
    const hand = (length: number, width: number, angle: number, material: THREE.Material, lift: number) => {
      const pivot = new THREE.Group();
      const blade = new THREE.Mesh(new THREE.BoxGeometry(width, length, 0.004), material);
      blade.position.y = length * 0.4;
      pivot.add(blade);
      pivot.position.set(clockAt[0], clockAt[1], clockAt[2] + 0.03 + lift);
      pivot.rotation.z = -angle;
      s.root.add(pivot);
      return pivot;
    };
    hand(R * 0.55, 0.03, ((clockHour + clockMinute / 60) / 12) * Math.PI * 2, dark, 0);
    hand(R * 0.85, 0.02, (clockMinute / 60) * Math.PI * 2, dark, 0.005);
    const startSecond = Math.floor(random() * 60);
    const secondHand = hand(R * 0.9, 0.007, (startSecond / 60) * Math.PI * 2, s.material('#c9261d'), 0.01);

    // ---- Pinboard --------------------------------------------------------------------------
    const boardX = -3.1, boardY = 1.85;
    s.box([2.3, 1.2, 0.04], [boardX, boardY, BACK + 0.02], timber);
    s.box([2.18, 1.08, 0.02], [boardX, boardY, BACK + 0.035], s.material('#b58c5a', { roughness: 1 }));
    const pin = (x: number, y: number, w: number, h: number, draw: (ctx: CanvasRenderingContext2D, W: number, H: number) => void, tilt = 0) => {
      const W = 96, H = Math.round((96 * h) / w);
      const sheet = s.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ roughness: 0.85, map: paint(W, H, (ctx) => draw(ctx, W, H)) }), [boardX + x, boardY + y, BACK + 0.048 + random() * 0.006]);
      sheet.rotation.z = tilt;
      sheet.castShadow = false;
    };
    const lines = (ctx: CanvasRenderingContext2D, W: number, H: number, from: number) => { ctx.fillStyle = '#555'; for (let y = from; y < H - 8; y += 9) ctx.fillRect(8, y, (W - 16) * (0.5 + random() * 0.5), 3); };
    const posterHues = ['#2a8fb8', '#d5622a', '#3aa66a', '#8b4a9c', '#d5202a', '#e0a526', '#1f4a7a'];
    if (a.pinboard === 'posters') {
      const n = 6 + Math.round(mood.density * 5);
      for (let i = 0; i < n; i++) {
        const hue = posterHues[Math.floor(random() * posterHues.length)], w = 0.3 + random() * 0.18;
        pin(-0.9 + (i / (n - 1)) * 1.8 + (random() - 0.5) * 0.15, (random() - 0.5) * 0.5, w, w * 1.38, (ctx, W, H) => {
          ctx.fillStyle = random() < 0.5 ? hue : '#fbfaf2'; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = hue; ctx.fillRect(0, 0, W, H * 0.3);
          ctx.fillStyle = '#fff'; ctx.fillRect(8, 10, W - 30, 9); ctx.fillRect(8, 24, W - 46, 6);
          ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(W / 2, H * 0.58, W * 0.2, 0, 7); ctx.fill();
          lines(ctx, W, H, H * 0.8);
        }, (random() - 0.5) * 0.12);
      }
    } else if (a.pinboard === 'thanks') {
      const n = 7 + Math.round(mood.density * 6);
      for (let i = 0; i < n; i++) {
        const drawing = random() < 0.45, w = drawing ? 0.36 : 0.22 + random() * 0.08;
        pin(-0.9 + random() * 1.8, (random() - 0.5) * 0.66, w, drawing ? w * 0.72 : w * 1.3, (ctx, W, H) => {
          ctx.fillStyle = drawing ? '#fbfaf2' : ['#f6c8d2', '#fbe9a8', '#cfe6f4', '#d9efc8', '#fbfaf2'][Math.floor(random() * 5)]; ctx.fillRect(0, 0, W, H);
          ctx.lineWidth = 4; ctx.lineCap = 'round';
          if (drawing) {
            ctx.strokeStyle = '#f2b918'; ctx.beginPath(); ctx.arc(W - 16, 14, 9, 0, 7); ctx.stroke();
            ctx.strokeStyle = '#3aa64a'; ctx.beginPath(); ctx.moveTo(2, H - 8); ctx.lineTo(W - 2, H - 10); ctx.stroke();
            for (let k = 0; k < 3; k++) { ctx.strokeStyle = posterHues[Math.floor(random() * 7)]; const x = 16 + k * 22; ctx.beginPath(); ctx.arc(x, H - 42, 7, 0, 7); ctx.moveTo(x, H - 35); ctx.lineTo(x, H - 16); ctx.moveTo(x - 8, H - 28); ctx.lineTo(x + 8, H - 28); ctx.stroke(); }
          } else {
            ctx.fillStyle = '#d5362a'; ctx.beginPath(); ctx.moveTo(W / 2, 46); ctx.bezierCurveTo(W / 2 - 30, 22, W / 2 - 14, 4, W / 2, 20); ctx.bezierCurveTo(W / 2 + 14, 4, W / 2 + 30, 22, W / 2, 46); ctx.fill();
            ctx.fillStyle = '#444'; ctx.font = 'italic bold 15px serif'; ctx.textAlign = 'center'; ctx.fillText('Thank you', W / 2, 66);
            lines(ctx, W, H, 78);
          }
        }, (random() - 0.5) * 0.3);
      }
    } else if (a.pinboard === 'bare') {
      pin(-0.55, 0.1, 0.42, 0.58, (ctx, W, H) => { ctx.fillStyle = '#fbfaf2'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#1f4a7a'; ctx.fillRect(0, 0, W, 20); lines(ctx, W, H, 30); }, 0.02);
      const holes = Array.from({ length: 40 }, () => ({ at: [boardX + (random() - 0.5) * 2, boardY + (random() - 0.5) * 0.95, BACK + 0.046] as P3, size: 1 }));
      s.scatter(new THREE.CircleGeometry(0.012, 6), new THREE.MeshStandardMaterial({ color: '#6b4c2a' }), holes).castShadow = false;
      pin(0.6, -0.25, 0.2, 0.14, (ctx, W, H) => { ctx.fillStyle = '#f6ef9a'; ctx.fillRect(0, 0, W, H); lines(ctx, W, H, 10); }, -0.15);
    } else {
      pin(-0.72, 0.02, 0.62, 0.86, (ctx, W, H) => {
        ctx.fillStyle = '#fbfaf2'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = '#444'; ctx.lineWidth = 2;
        ctx.strokeRect(10, 24, W - 20, H - 50); ctx.strokeRect(10, 24, 30, 40); ctx.strokeRect(40, 24, 30, 40); ctx.strokeRect(10, 64, W - 20, 20);
        ctx.fillStyle = '#3aa64a'; ctx.fillRect(14, 68, 12, 10); ctx.fillStyle = '#d5362a'; ctx.beginPath(); ctx.arc(64, 100, 5, 0, 7); ctx.fill();
        ctx.fillStyle = '#d5362a'; ctx.fillRect(0, 0, W, 16);
      });
      pin(0.05, 0.12, 0.5, 0.66, (ctx, W, H) => {
        ctx.fillStyle = '#fbfaf2'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = '#888';
        for (let r = 0; r < 12; r++) for (let c = 0; c < 6; c++) { ctx.strokeRect(6 + c * 14, 18 + r * 9, 14, 9); if (random() < 0.5 * (1 - mood.wear * 0.6)) { ctx.fillStyle = '#1f3e8a'; ctx.fillRect(9 + c * 14, 21 + r * 9, 7, 3); } }
        ctx.fillStyle = '#222'; ctx.fillRect(6, 5, 50, 7);
      }, 0.03);
      pin(0.72, -0.05, 0.44, 0.6, (ctx, W, H) => { ctx.fillStyle = '#eef3f6'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#1f4a7a'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('VISITING', 10, 18); ctx.fillText('2 - 8 PM', 10, 36); lines(ctx, W, H, 50); }, -0.04);
    }

    // ---- Fixed seats under the pinboard ----------------------------------------------------
    const seatHue = s.material(new THREE.Color(dadoHex).offsetHSL(0.5, 0.05, -0.12), { roughness: 0.5 });
    s.box([2.5, 0.05, 0.07], [boardX, 0.36, BACK + 0.36], steel);
    for (const x of [-1.15, 1.15]) { s.box([0.05, 0.36, 0.05], [boardX + x, 0.18, BACK + 0.36], steel); s.box([0.05, 0.03, 0.5], [boardX + x, 0.015, BACK + 0.4], steel); }
    for (let i = 0; i < 4; i++) {
      const x = boardX - 0.93 + i * 0.62;
      s.box([0.54, 0.07, 0.46], [x, 0.44, BACK + 0.4], seatHue);
      s.box([0.54, 0.4, 0.06], [x, 0.74, BACK + 0.14], seatHue).rotation.x = -0.12;
    }

    // ---- Reception hatch in the left wall --------------------------------------------------
    const hz1 = -1.9, hz2 = 0.5, hzc = (hz1 + hz2) / 2, hw = hz2 - hz1;
    const officeLit = a.hatch === 'half' || a.hatch === 'open';
    const officeGlow = new THREE.Color('#ffe9b8');
    // A sliver of the office beyond: floor, far wall, desk, monitor and chair.
    s.box([1.7, 0.2, hw + 0.4], [X0 - 0.85, -0.1, hzc], s.material('#6f6a62'));
    s.box([0.16, TALL, hw + 0.4], [X0 - 1.62, TALL / 2, hzc], new THREE.MeshStandardMaterial({ color: '#d9d0b8', emissive: officeGlow, emissiveIntensity: officeLit ? 0.28 : 0.03, roughness: 0.8 }));
    for (let i = 0; i < 14; i++) s.box([0.22, 0.3 + random() * 0.06, 0.07], [X0 - 1.45, 2.42, hz1 + 0.25 + i * 0.105 + (i > 8 ? 0.5 : 0)], s.material(['#2a4f86', '#8a2f2f', '#2f6a4a', '#c9b36a', '#3a3f45'][Math.floor(random() * 5)]));
    s.box([0.3, 0.04, hw + 0.2], [X0 - 1.42, 2.25, hzc], timber);
    s.box([1.7, TALL, 0.14], [X0 - 0.85, TALL / 2, hz1 - 0.13], wall);
    s.box([0.62, 0.05, hw - 0.1], [X0 - 0.36, 1.0, hzc], timber);
    s.box([0.5, 0.95, 0.06], [X0 - 0.42, 0.5, hz1 + 0.1], white);
    s.box([0.5, 0.95, 0.06], [X0 - 0.42, 0.5, hz2 - 0.1], white);
    const screen = new THREE.MeshStandardMaterial({ color: '#9fd0ff', emissive: '#7fbfff', emissiveIntensity: 1.3 });
    s.box([0.05, 0.3, 0.44], [X0 - 0.5, 1.3, hzc - 0.35], dark);
    s.box([0.01, 0.25, 0.39], [X0 - 0.47, 1.3, hzc - 0.35], screen);
    s.box([0.04, 0.14, 0.04], [X0 - 0.52, 1.1, hzc - 0.35], dark);
    s.box([0.14, 0.02, 0.38], [X0 - 0.3, 1.035, hzc - 0.35], dark);
    if (officeLit) {
      const lampShade = s.lathe([[0.03, 0.12], [0.1, 0]], new THREE.MeshStandardMaterial({ color: '#2f6a4a', side: THREE.DoubleSide, emissive: '#ffd98a', emissiveIntensity: 0.6 }), [X0 - 0.42, 1.32, hzc + 0.7]);
      lampShade.castShadow = false;
      s.cylinder(0.012, 0.012, 0.3, [X0 - 0.42, 1.18, hzc + 0.7], dark, 8);
      s.cylinder(0.07, 0.07, 0.02, [X0 - 0.42, 1.04, hzc + 0.7], dark, 12);
    }
    const chairTurn = a.hatch === 'open' ? 0.9 + random() : random() * 0.4;
    const chairX = X0 - (a.hatch === 'open' ? 1.05 : 0.95), chairZ = hzc + (a.hatch === 'open' ? 0.45 : 0.0);
    s.cylinder(0.24, 0.24, 0.07, [chairX, 0.5, chairZ], dark, 16);
    s.cylinder(0.03, 0.03, 0.46, [chairX, 0.25, chairZ], steel, 8);
    s.cylinder(0.26, 0.26, 0.03, [chairX, 0.02, chairZ], dark, 5);
    const chairBack = s.box([0.06, 0.5, 0.42], [chairX - Math.cos(chairTurn) * 0.24, 0.84, chairZ + Math.sin(chairTurn) * 0.24], dark);
    chairBack.rotation.y = chairTurn;
    if (a.hatch === 'open') s.box([0.3, 0.05, 0.44], [chairX - 0.2, 0.9, chairZ + 0.15], s.material('#5a6f8f', { roughness: 0.95 })).rotation.set(0.2, chairTurn, 0.5);
    // Frame, counter shelf, shutter box and shutter.
    s.box([0.3, 0.06, hw + 0.1], [LEFT + 0.05, DADO, hzc], timber);
    s.box([0.24, 0.07, 0.07], [X0 + 0.1, (DADO + BAND) / 2 + 0.6, hz1], white).scale.set(1, (BAND - DADO) / 0.07, 1);
    s.box([0.24, 0.07, 0.07], [X0 + 0.1, (DADO + BAND) / 2 + 0.6, hz2], white).scale.set(1, (BAND - DADO) / 0.07, 1);
    for (const node of s.root.children.slice(-2)) node.position.y = (DADO + BAND) / 2;
    s.box([0.26, 0.22, hw + 0.14], [LEFT + 0.03, BAND + 0.02, hzc], steel);
    const shutterBottom = a.hatch === 'shut' ? DADO + 0.04 : a.hatch === 'open' ? BAND - 0.2 : mix(1.55, 1.75, random());
    const shutterHeight = BAND - shutterBottom;
    const slats = paint(32, 128, (ctx) => {
      for (let y = 0; y < 128; y += 8) { const g = ctx.createLinearGradient(0, y, 0, y + 8); g.addColorStop(0, '#d9dedf'); g.addColorStop(0.7, '#a9b0b2'); g.addColorStop(1, '#6f7678'); ctx.fillStyle = g; ctx.fillRect(0, y, 32, 8); }
    });
    slats.wrapT = THREE.RepeatWrapping; slats.repeat.set(1, shutterHeight / 0.9);
    const shutterMaterial = new THREE.MeshStandardMaterial({ map: slats, metalness: 0.4, roughness: 0.45 });
    s.box([0.05, shutterHeight, hw - 0.04], [LEFT - 0.04, shutterBottom + shutterHeight / 2, hzc], shutterMaterial);
    s.box([0.07, 0.05, hw - 0.04], [LEFT - 0.04, shutterBottom, hzc], steel);
    // Warm light through the gap.
    if (a.hatch !== 'shut') {
      const gap = s.mesh(new THREE.PlaneGeometry(hw - 0.1, shutterBottom - DADO - 0.05), new THREE.MeshStandardMaterial({ color: officeGlow, emissive: officeGlow, emissiveIntensity: officeLit ? 0.9 : 0.05, transparent: true, opacity: officeLit ? 0.3 : 0.12, depthWrite: false, side: THREE.DoubleSide }), [LEFT - 0.1, (DADO + shutterBottom) / 2 + 0.02, hzc]);
      gap.rotation.y = Math.PI / 2;
      gap.castShadow = false;
    }
    const leftLabel = (text: string, w: number, h: number, y: number, z: number, ink: string, paper: string, tilt = 0) => {
      const label = s.label(text, w, h, [LEFT + 0.006, y, z], ink, paper);
      label.rotation.set(0, Math.PI / 2, tilt, 'YXZ');
      label.castShadow = false;
      return label;
    };
    leftLabel('RECEPTION', 1.5, 0.26, BAND + 0.42, hzc, '#ffffff', '#1f4a7a').position.x = LEFT + 0.012;
    if (a.hatch === 'shut') leftLabel('BACK IN 10 MINS', 0.6, 0.3, 1.62, hzc + 0.2, '#1f3e8a', '#fbfaf2', (random() - 0.5) * 0.15).position.x = LEFT + 0.0;
    else leftLabel('PLEASE RING', 0.44, 0.1, DADO - 0.14, hzc - 0.6, '#222222', '#f6ef9a');
    // Bell, pen on a chain and a box of forms on the counter shelf.
    s.lathe([[0.07, 0], [0.065, 0.03], [0.03, 0.055], [0, 0.06]], steel, [LEFT + 0.1, DADO + 0.03, hzc - 0.6]);
    s.cylinder(0.008, 0.008, 0.03, [LEFT + 0.1, DADO + 0.1, hzc - 0.6], dark, 6);
    s.box([0.2, 0.08, 0.3], [LEFT + 0.08, DADO + 0.07, hzc + 0.55], s.material('#4a6fa8'));
    s.box([0.18, 0.02, 0.28], [LEFT + 0.08, DADO + 0.115, hzc + 0.55], white);

    // ---- Night window further along the left wall ------------------------------------------
    const wz = 2.95, dawn = a.hour === 'dawn' ? 0.6 : 0;
    const sky = new THREE.Color('#1b2a4a').lerp(new THREE.Color('#d98a6a'), dawn * 0.6);
    s.box([0.06, BAND - DADO, 1.5], [X0 + 0.06, (DADO + BAND) / 2, wz], new THREE.MeshStandardMaterial({ color: sky, emissive: sky, emissiveIntensity: 0.6, roughness: 0.1 }));
    s.box([0.24, 0.06, 1.6], [X0 + 0.1, DADO, wz], white);
    s.box([0.24, 0.06, 1.6], [X0 + 0.1, BAND, wz], white);
    s.box([0.22, BAND - DADO, 0.05], [X0 + 0.1, (DADO + BAND) / 2, wz], white);
    // A sodium street lamp and a few lit windows outside.
    const lampGlow = new THREE.MeshStandardMaterial({ color: '#ffb760', emissive: '#ffa030', emissiveIntensity: 1.6 });
    s.box([0.02, 0.08, 0.08], [X0 + 0.1, 1.95, wz + 0.4], lampGlow).castShadow = false;
    for (let i = 0; i < 5; i++) s.box([0.02, 0.05, 0.05], [X0 + 0.1, 1.3 + random() * 0.4, wz - 0.65 + random() * 0.5], new THREE.MeshStandardMaterial({ color: '#ffe9a8', emissive: '#ffe08a', emissiveIntensity: 1 })).castShadow = false;
    const blindDrop = mix(0.2, 0.75, random());
    const blindMap = slats.clone(); blindMap.repeat.set(1, blindDrop * 2.2); blindMap.needsUpdate = true;
    s.box([0.03, (BAND - DADO) * blindDrop, 1.46], [LEFT - 0.03, BAND - ((BAND - DADO) * blindDrop) / 2, wz], new THREE.MeshStandardMaterial({ map: blindMap, color: '#f1eee0', roughness: 0.7 })).rotation.x = (random() - 0.5) * mood.wear * 0.06;
    // Radiator under the window.
    s.box([0.1, 0.6, 1.3], [LEFT + 0.07, 0.48, wz], white);
    for (let i = 0; i < 9; i++) s.box([0.02, 0.5, 0.03], [LEFT + 0.125, 0.48, wz - 0.56 + i * 0.14], s.material('#d9d9d2'));

    // ---- Far corner ------------------------------------------------------------------------
    const cx = X0 + 0.85, cz = Z0 + 0.75;
    let flickerScreen: THREE.MeshStandardMaterial | null = null;
    if (a.corner === 'vending') {
      const hue = new THREE.Color(['#c9261d', '#1f4a9c', '#2f7a4a'][Math.floor(random() * 3)]);
      s.box([0.95, 1.9, 0.8], [cx + 0.05, 0.95, cz], s.material(hue, { roughness: 0.4 }));
      const front = s.mesh(new THREE.PlaneGeometry(0.62, 1.2), new THREE.MeshStandardMaterial({ roughness: 0.3, emissive: '#ffffff', emissiveIntensity: 0.9, map: paint(128, 256, (ctx) => {
        ctx.fillStyle = '#f4f7fb'; ctx.fillRect(0, 0, 128, 256);
        for (let row = 0; row < 6; row++) { ctx.fillStyle = '#9aa4ac'; ctx.fillRect(0, 38 + row * 40, 128, 4); for (let col = 0; col < 5; col++) { if (random() < mood.wear * 0.5) continue; ctx.fillStyle = ['#d5362a', '#2a6fd0', '#f2c21a', '#3aa64a', '#f08a1e', '#6a3a1e'][Math.floor(random() * 6)]; ctx.fillRect(6 + col * 25, 10 + row * 40, 16, 28); } }
      }) }), [cx - 0.08, 1.2, cz + 0.405]);
      front.castShadow = false;
      flickerScreen = front.material as THREE.MeshStandardMaterial;
      (flickerScreen as THREE.MeshStandardMaterial).emissiveMap = flickerScreen.map;
      s.box([0.2, 0.5, 0.02], [cx + 0.37, 1.3, cz + 0.405], dark);
      s.box([0.6, 0.18, 0.03], [cx - 0.08, 0.3, cz + 0.405], dark);
    } else if (a.corner === 'plant') {
      s.cylinder(0.26, 0.2, 0.42, [cx, 0.21, cz], s.material('#a8623f', { roughness: 0.8 }), 18);
      s.cylinder(0.035, 0.05, 1.1, [cx, 0.9, cz], s.material('#6a5a3a'), 8);
      const leaf = s.material(new THREE.Color('#3f7a44').lerp(new THREE.Color('#9a9462'), mood.wear * 0.7), { side: THREE.DoubleSide, roughness: 0.6 });
      for (let i = 0; i < 16; i++) {
        const blade = s.ball([0.09, 0.5, 0.015], [cx, 0.7 + random() * 0.8, cz], leaf, 8);
        blade.rotation.set(0, random() * 6, 0);
        blade.rotateZ(0.5 + random() * 0.9 + mood.wear * 0.4);
        blade.translateY(0.45);
      }
    } else if (a.corner === 'tank') {
      s.box([1.1, 0.75, 0.5], [cx + 0.1, 0.375, cz], timber);
      const water = new THREE.MeshStandardMaterial({ color: '#4fb6c9', emissive: '#3fd0e0', emissiveIntensity: 0.9, roughness: 0.1 });
      s.box([1.0, 0.5, 0.42], [cx + 0.1, 1.02, cz], water);
      flickerScreen = water;
      s.box([1.04, 0.06, 0.46], [cx + 0.1, 1.3, cz], dark);
      s.box([1.04, 0.04, 0.46], [cx + 0.1, 0.77, cz], dark);
      for (let i = 0; i < 6; i++) s.ball([0.05, 0.028, 0.012], [cx - 0.3 + random() * 0.8, 0.9 + random() * 0.3, cz + 0.215], new THREE.MeshStandardMaterial({ color: ['#ff8a1e', '#ffd21a', '#f4f4f0'][i % 3], emissive: '#ff8a1e', emissiveIntensity: 0.4 }), 8);
    } else if (a.corner === 'toys') {
      const mat = s.mesh(new THREE.PlaneGeometry(1.7, 1.5), new THREE.MeshStandardMaterial({ roughness: 0.9, map: paint(128, 112, (ctx) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { ctx.fillStyle = ['#e5352b', '#2a6fd0', '#f6c21a', '#2f9e4a'][(i + j * 3) % 4]; ctx.fillRect(i * 32, j * 28, 32, 28); } ctx.fillStyle = `rgba(160,150,130,${mood.wear * 0.5})`; ctx.fillRect(0, 0, 128, 112); }) }), [cx + 0.35, 0.012, cz + 0.4]);
      mat.rotation.x = -Math.PI / 2;
      s.cylinder(0.32, 0.32, 0.04, [cx + 0.2, 0.42, cz + 0.2], s.material('#f6c21a'), 20);
      s.cylinder(0.04, 0.04, 0.42, [cx + 0.2, 0.21, cz + 0.2], white, 8);
      for (let i = 0; i < 2; i++) { s.box([0.24, 0.03, 0.24], [cx + 0.75 - i * 1.0, 0.25, cz + 0.6 + i * 0.3], s.material(['#e5352b', '#2a6fd0'][i])); s.box([0.2, 0.25, 0.2], [cx + 0.75 - i * 1.0, 0.125, cz + 0.6 + i * 0.3], white); }
      for (let i = 0; i < 8 + mood.density * 8; i++) s.box([0.09, 0.07, 0.09], [cx - 0.3 + random() * 1.4, 0.05, cz + random() * 1.0], s.material(['#e5352b', '#2a6fd0', '#f6c21a', '#2f9e4a'][i % 4])).rotation.y = random() * 3;
    } else if (a.corner === 'tv') {
      s.box([1.0, 0.6, 0.07], [cx + 0.6, 2.35, BACK + 0.12], dark).rotation.x = 0.18;
      const news = new THREE.MeshStandardMaterial({ roughness: 0.2, emissive: '#ffffff', emissiveIntensity: 1.0, map: paint(128, 72, (ctx) => {
        ctx.fillStyle = '#27456f'; ctx.fillRect(0, 0, 128, 72);
        ctx.fillStyle = '#d9b89a'; ctx.beginPath(); ctx.ellipse(40, 34, 13, 17, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#3a3f55'; ctx.fillRect(18, 50, 44, 22);
        ctx.fillStyle = '#c9261d'; ctx.fillRect(0, 58, 128, 14); ctx.fillStyle = '#fff'; ctx.fillRect(6, 62, 90, 5); ctx.fillStyle = '#6fa0d0'; ctx.fillRect(70, 10, 48, 34);
      }) });
      news.emissiveMap = news.map;
      const picture = s.mesh(new THREE.PlaneGeometry(0.92, 0.52), news, [cx + 0.6, 2.35, BACK + 0.162]);
      picture.rotation.x = 0.18;
      picture.castShadow = false;
      flickerScreen = news;
      s.box([0.1, 0.3, 0.1], [cx + 0.6, 2.4, BACK + 0.05], steel);
    }
    // Fire extinguisher: present in every version of the room.
    s.cylinder(0.075, 0.075, 0.45, [X0 + 0.32, 0.9, 1.0], s.material('#d5362a', { roughness: 0.35 }), 14);
    s.cylinder(0.03, 0.05, 0.1, [X0 + 0.32, 1.17, 1.0], dark, 10);
    s.box([0.02, 0.22, 0.16], [LEFT + 0.012, 1.55, 1.0], s.material('#d5362a'));

    // ---- What the night left ---------------------------------------------------------------
    if (a.night === 'mopped') {
      const bx = -3.2, bz = 3.3;
      s.box([0.36, 0.3, 0.5], [bx, 0.22, bz], s.material('#e0c21a', { roughness: 0.5 }));
      s.box([0.3, 0.02, 0.44], [bx, 0.33, bz], s.material('#5a6a70', { roughness: 0.1 }));
      for (const dx of [-0.14, 0.14]) for (const dz of [-0.2, 0.2]) s.cylinder(0.035, 0.035, 0.03, [bx + dx, 0.035, bz + dz], dark, 8).rotation.z = Math.PI / 2;
      s.rod([bx + 0.05, 0.3, bz - 0.1], [bx + 0.5, 1.5, bz - 0.5], 0.014, timber);
      s.box([0.2, 0.3, 0.24], [bx, 0.5, bz - 0.14], s.material('#e0c21a'));
      s.ball([0.13, 0.07, 0.13], [bx + 0.06, 0.35, bz - 0.1], s.material('#d9d6c8', { roughness: 1 }), 8);
      const yellow = s.material('#f2c81a', { roughness: 0.5 });
      for (const lean of [-1, 1]) {
        s.box([0.3, 0.62, 0.014], [-1.2, 0.3, 3.0 + lean * 0.1], yellow).rotation.x = lean * -0.32;
        const mark = s.label('WET FLOOR', 0.26, 0.14, [-1.2, 0.4, 3.0 + lean * 0.08], '#1a1a1a', '#f2c81a');
        mark.rotation.x = lean * -0.32;
        if (lean < 0) mark.rotation.y = Math.PI;
      }
    } else if (a.night === 'vigil') {
      const y = 0.475, z = BACK + 0.4;
      s.box([0.5, 0.13, 0.36], [boardX - 0.93, y + 0.065, z], s.material('#f3f2ec', { roughness: 0.95 })).rotation.y = 0.15;
      const blanket = s.material(new THREE.Color('#7fa7c9').lerp(new THREE.Color('#d7b98c'), mood.warmth * 0.7), { roughness: 0.97 });
      s.box([0.9, 0.08, 0.44], [boardX - 0.15, y + 0.04, z + 0.02], blanket).rotation.y = -0.06;
      s.box([0.5, 0.42, 0.06], [boardX + 0.2, 0.25, z + 0.27], blanket).rotation.x = 0.1;
      for (let i = 0; i < 3 + mood.density * 5; i++) {
        const cup = s.cylinder(0.04, 0.03, 0.1, [boardX + 0.6 + random() * 0.9, 0.05, BACK + 0.75 + random() * 0.5], s.material('#f4efe0'), 10);
        if (random() < 0.4) { cup.rotation.z = Math.PI / 2; cup.position.y = 0.04; cup.rotation.y = random() * 3; }
      }
      s.box([0.26, 0.02, 0.34], [boardX + 0.93, y + 0.012, z], s.material('#e6e2d2')).rotation.y = 0.3;
      for (const side of [-1, 1]) s.box([0.1, 0.07, 0.27], [boardX - 0.5 + side * 0.07, 0.035, BACK + 0.95], s.material('#3b2c22', { roughness: 0.5 })).rotation.y = side * 0.1;
    } else if (a.night === 'tickets') {
      s.box([0.9, 0.42, 0.08], [0.95, 2.45, BACK + 0.04], dark);
      const number = String(10 + Math.floor(random() * 89));
      const display = s.label(number, 0.5, 0.3, [1.08, 2.45, BACK + 0.085], '#ff4b2a', '#190a08');
      (display.material as THREE.MeshStandardMaterial).emissive.set('#ffffff');
      (display.material as THREE.MeshStandardMaterial).emissiveMap = (display.material as THREE.MeshStandardMaterial).map;
      (display.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2;
      s.label('NOW', 0.26, 0.12, [0.66, 2.45, BACK + 0.085], '#d9d9d2', '#2a2e31');
      const tx = X0 + 1.0, tz = 1.1;
      s.cylinder(0.2, 0.24, 0.04, [tx, 0.02, tz], dark, 16);
      s.cylinder(0.025, 0.025, 1.1, [tx, 0.57, tz], steel, 8);
      s.box([0.24, 0.3, 0.16], [tx, 1.2, tz], s.material('#d5362a', { roughness: 0.4 }));
      s.label('TAKE A NUMBER', 0.22, 0.09, [tx, 1.27, tz + 0.082], '#ffffff', '#b3201a');
      s.box([0.05, 0.14, 0.005], [tx, 1.04, tz + 0.06], white).rotation.x = 0.2;
      for (let i = 0; i < 6 + mood.density * 10; i++) s.box([0.05, 0.003, 0.08], [tx - 0.4 + random() * 2.6, 0.008, tz - 0.6 + random() * 2.2], white).rotation.y = random() * 3;
    } else if (a.night === 'trolley') {
      const tx = 4.3, tz = -3.2;
      for (const y of [0.3, 0.85]) s.box([0.5, 0.03, 0.9], [tx, y, tz], steel);
      for (const dx of [-0.23, 0.23]) for (const dz of [-0.42, 0.42]) { s.cylinder(0.012, 0.012, 0.86, [tx + dx, 0.48, tz + dz], steel, 6); s.cylinder(0.045, 0.045, 0.03, [tx + dx, 0.045, tz + dz], dark, 8).rotation.z = Math.PI / 2; }
      s.cylinder(0.14, 0.14, 0.36, [tx, 1.05, tz - 0.2], steel, 16);
      s.cylinder(0.15, 0.15, 0.03, [tx, 1.24, tz - 0.2], dark, 16);
      s.box([0.03, 0.03, 0.06], [tx - 0.15, 0.94, tz - 0.2], dark);
      s.box([0.02, 0.02, 0.02], [tx - 0.145, 1.1, tz - 0.2], new THREE.MeshStandardMaterial({ color: '#ff5a2a', emissive: '#ff4a1a', emissiveIntensity: 1.5 }));
      for (let i = 0; i < 8; i++) s.cylinder(0.04, 0.03, 0.08, [tx - 0.12 + (i % 3) * 0.12, 0.91, tz + 0.12 + Math.floor(i / 3) * 0.11], white, 10);
      s.box([0.3, 0.1, 0.2], [tx, 0.37, tz], s.material('#c98a3a', { roughness: 0.8 }));
      s.box([0.2, 0.16, 0.14], [tx, 0.4, tz + 0.28], s.material('#3a6fa8'));
    }
    // A little general litter as the room fills up and wears down.
    for (let i = 0; i < Math.round(mood.density * mood.wear * 10); i++) s.box([0.1, 0.004, 0.14], [-4 + random() * 8.5, 0.008, -2 + random() * 6], white).rotation.y = random() * 3;

    // ---- Ceiling: a cut-away grid with flat fluorescent panels -------------------------------
    const tubes: { material: THREE.MeshStandardMaterial; base: number; flicker: boolean }[] = [];
    const flickerIndex = (warmIndex + 1 + Math.floor(random() * 3)) % 4;
    panels.forEach(([x, y, z], index) => {
      const hue = index === warmIndex ? warmHue : coolHue;
      const dead = mood.wear > 0.75 && index === flickerIndex;
      const base = dead ? 0.15 : index === warmIndex ? 1.5 : 1.25;
      const material = new THREE.MeshStandardMaterial({ color: hue, emissive: hue, emissiveIntensity: base, transparent: true, opacity: index === warmIndex ? 0.96 : 0.86, depthWrite: false });
      const panel = s.mesh(new THREE.BoxGeometry(1.5, 0.04, 0.75), material, [x, y, z]);
      panel.castShadow = panel.receiveShadow = false;
      // A dark housing and drop rods so the panel reads as a fitting hung over the cut-away.
      for (const dx of [-0.77, 0.77]) { const bar = s.box([0.05, 0.07, 0.84], [x + dx, y, z], section); bar.castShadow = false; }
      for (const dz of [-0.4, 0.4]) { const bar = s.box([1.59, 0.07, 0.05], [x, y, z + dz], section); bar.castShadow = false; }
      for (const dx of [-0.6, 0.6]) { const rod = s.box([0.012, 0.3, 0.012], [x + dx, y + 0.18, z], section); rod.castShadow = false; }
      tubes.push({ material, base, flicker: index === flickerIndex && !dead });
    });
    // T-bar ceiling grid stubs along the two walls suggest the rest of the ceiling.
    for (let i = 0; i < 9; i++) { const bar = s.box([0.5, 0.025, 0.03], [X0 + 0.45, TALL - 0.005, Z0 + 0.6 + i * 1.0], white); bar.castShadow = false; }
    for (let i = 0; i < 10; i++) { const bar = s.box([0.03, 0.025, 0.5], [X0 + 0.9 + i * 1.05, TALL - 0.005, Z0 + 0.45], white); bar.castShadow = false; }
    // One warm lamp and the spill from the doors actually light the cast.
    const [wx, , wzp] = panels[warmIndex];
    const warmLamp = new THREE.PointLight(warmHue, 14, 7.5, 1.6);
    warmLamp.position.set(wx, TALL - 0.3, wzp);
    s.root.add(warmLamp);
    const doorLamp = new THREE.PointLight(beyond, a.doors === 'ajar' ? 9 : a.doors === 'dim' ? 1.5 : 4, 6, 1.6);
    doorLamp.position.set(doorX, 1.5, BACK + 0.7);
    s.root.add(doorLamp);

    const stopped = a.hour === 'stopped';
    const buzz = mix(0.0, 1, Math.max(mood.energy, mood.wear * 0.8));
    world.update = (_dt, time) => {
      if (!stopped) secondHand.rotation.z = -((startSecond + Math.floor(time)) / 60) * Math.PI * 2;
      for (const tube of tubes) {
        if (!tube.flicker) continue;
        // A failing starter: mostly steady, with short stuttering dropouts.
        const stutter = Math.sin(time * 37) * Math.sin(time * 5.3) > mix(0.98, 0.35, buzz) ? 0.25 : 1;
        tube.material.emissiveIntensity = tube.base * stutter;
      }
      if (flickerScreen) flickerScreen.emissiveIntensity = 0.85 + Math.sin(time * 2.3) * 0.12 + (a.corner === 'tv' ? Math.sin(time * 11) * 0.15 : 0);
      if (a.doors === 'restricted') warnMaterial.emissiveIntensity = 1.2 + Math.sin(time * 3) * 0.5;
    };
    return world;
  },
});
